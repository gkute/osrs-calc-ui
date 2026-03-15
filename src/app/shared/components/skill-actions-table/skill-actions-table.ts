import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkillDataService } from '../../../core/services/skill-data.service';
import { GrandExchangeService } from '../../../core/services/grand-exchange.service';
import { ImageService } from '../../../core/services/image.service';
import { SkillAction } from '../../../core/models/osrs.models';

type SortCol = 'name' | 'category' | 'levelRequired' | 'experience' | 'members' | 'matCost' | 'output' | 'profit' | 'gpPerXp' | 'notes' | 'actionsNeeded' | 'total';

@Component({
  selector: 'app-skill-actions-table',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './skill-actions-table.html',
  styleUrl: './skill-actions-table.scss',
})
export class SkillActionsTable implements OnChanges {
  @Input() skillName = '';
  @Input() currentLevel = 1;
  @Input() currentXp = 0;
  @Input() targetLevel = 2;
  @Input() targetXp = 0;
  @Input() xpBonusMultiplier = 1.0;
  @Input() goldsmiithGauntlets = false;
  @Input() completedQuests: Set<string> = new Set();

  private readonly skillDataService = inject(SkillDataService);
  private readonly geService = inject(GrandExchangeService);
  private readonly imageService = inject(ImageService);

  actions = signal<SkillAction[]>([]);
  prices = signal<Record<number, number>>({});
  itemImages = signal<Map<number, string>>(new Map());
  loading = signal(false);
  pricesLoading = signal(false);
  selectedCategory = signal('');
  sortCol = signal<SortCol>('levelRequired');
  sortAsc = signal(true);
  showMaterials = signal(true);
  showOutput = signal(true);
  showProfit = signal(true);

  get categories(): string[] {
    const cats = new Set(this.actions().map(a => a.category).filter(Boolean));
    return Array.from(cats).sort();
  }

  get hasIngredients(): boolean {
    return this.actions().some(a => (a.ingredients ?? []).length > 0);
  }

  get hasOutput(): boolean {
    return this.actions().some(a => a.outputItemId != null || a.itemId != null);
  }

  get hasProfit(): boolean {
    return this.hasIngredients && this.hasOutput;
  }

  get hasGpData(): boolean {
    return this.hasIngredients || this.hasOutput;
  }

  get filteredActions(): SkillAction[] {
    let acts = this.actions();
    const cat = this.selectedCategory();
    if (cat) acts = acts.filter(a => a.category === cat);
    acts = acts.filter(a => !this.isQuestLocked(a));

    const col = this.sortCol();
    const asc = this.sortAsc();
    const xpNeeded = Math.max(0, this.targetXp - this.currentXp);

    return [...acts].sort((a, b) => {
      let valA: number | string;
      let valB: number | string;

      switch (col) {
        case 'name': valA = a.name; valB = b.name; break;
        case 'category': valA = a.category ?? ''; valB = b.category ?? ''; break;
        case 'experience': valA = a.experience ?? 0; valB = b.experience ?? 0; break;
        case 'members': valA = a.members ? 1 : 0; valB = b.members ? 1 : 0; break;
        case 'notes': valA = a.notes ?? ''; valB = b.notes ?? ''; break;
        case 'matCost': valA = this.getMatCost(a) ?? (asc ? 1e15 : -1e15); valB = this.getMatCost(b) ?? (asc ? 1e15 : -1e15); break;
        case 'output': valA = this.getOutputPrice(a) ?? (asc ? 1e15 : -1e15); valB = this.getOutputPrice(b) ?? (asc ? 1e15 : -1e15); break;
        case 'profit': valA = this.getProfit(a) ?? (asc ? 1e15 : -1e15); valB = this.getProfit(b) ?? (asc ? 1e15 : -1e15); break;
        case 'gpPerXp': valA = this.getGpPerXp(a) ?? (asc ? 1e15 : -1e15); valB = this.getGpPerXp(b) ?? (asc ? 1e15 : -1e15); break;
        case 'total':
          valA = this.getTotal(a) ?? (asc ? 1e15 : -1e15);
          valB = this.getTotal(b) ?? (asc ? 1e15 : -1e15);
          break;
          valA = this.getEffectiveXp(a) > 0 ? Math.ceil(xpNeeded / this.getEffectiveXp(a)) : (asc ? 1e15 : -1);
          valB = this.getEffectiveXp(b) > 0 ? Math.ceil(xpNeeded / this.getEffectiveXp(b)) : (asc ? 1e15 : -1);
          break;
        default: valA = a.levelRequired; valB = b.levelRequired; break;
      }

      if (typeof valA === 'string') {
        return asc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      }
      return asc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['skillName'] && this.skillName) {
      this.loadActions();
    }
  }

  sortBy(col: SortCol): void {
    if (this.sortCol() === col) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortCol.set(col);
      this.sortAsc.set(true);
    }
  }

  sortIcon(col: SortCol): string {
    if (this.sortCol() !== col) return '';
    return this.sortAsc() ? ' ▲' : ' ▼';
  }

  getEffectiveXp(action: SkillAction): number {
    const base = action.experience ?? 0;
    if (this.goldsmiithGauntlets && action.name === 'Gold bar') return 56.2;
    // Ensouled Heads are not affected by altar bonuses
    if (action.category === 'Ensouled Head') return base;
    return base * this.xpBonusMultiplier;
  }

  getActionsNeeded(action: SkillAction): number | null {
    const xpNeeded = Math.max(0, this.targetXp - this.currentXp);
    const xp = this.getEffectiveXp(action);
    if (xp <= 0) return null;
    return Math.ceil(xpNeeded / xp);
  }

  getMatCost(action: SkillAction): number | null {
    const ingredients = action.ingredients ?? [];
    if (ingredients.length === 0) return null;
    let total = 0;
    const p = this.prices();
    for (const ing of ingredients) {
      if (ing.itemId != null && p[ing.itemId] != null) {
        total += p[ing.itemId] * ing.quantity;
      } else if (ing.itemId != null) {
        return null;
      }
    }
    return total;
  }

  getOutputPrice(action: SkillAction): number | null {
    // itemId is only treated as output when there are no ingredients (it represents the produced item).
    // If ingredients exist, itemId is the icon/consumed item — output must come from outputItemId.
    const outId = action.outputItemId ?? ((action.ingredients ?? []).length === 0 ? action.itemId : undefined);
    if (outId == null) return null;
    const p = this.prices();
    if (p[outId] == null) return null;
    const price = p[outId];
    const tax = price >= 100 ? Math.floor(price * 0.02) : 1;
    return price - tax;
  }

  getProfit(action: SkillAction): number | null {
    const mat = this.getMatCost(action);
    const out = this.getOutputPrice(action);
    if (mat == null || out == null) return null;
    return out - mat;
  }

  getGpPerXp(action: SkillAction): number | null {
    const xp = action.experience ?? 0;
    if (xp <= 0) return null;
    const profit = this.getProfit(action);
    if (profit != null) return profit / xp;
    // Only outputs (no ingredients) → net income, positive/green
    const out = this.getOutputPrice(action);
    if (out != null && (action.ingredients ?? []).length === 0) return out / xp;
    // Only mats (no output) → cost, negative/red
    const mat = this.getMatCost(action);
    if (mat != null && action.outputItemId == null) return -mat / xp;
    return null;
  }

  getTotal(action: SkillAction): number | null {
    const actions = this.getActionsNeeded(action);
    const gpPerXp = this.getGpPerXp(action);
    const xp = action.experience ?? 0;
    if (actions == null || gpPerXp == null || xp <= 0) return null;
    return gpPerXp * xp * actions;
  }

  formatCompact(value: number): string {
    const abs = Math.abs(value);
    let formatted: string;
    if (abs >= 1_000_000_000) {
      formatted = (value / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '') + 'B';
    } else if (abs >= 1_000_000) {
      formatted = (value / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
    } else if (abs >= 1_000) {
      formatted = (value / 1_000).toFixed(1).replace(/\.?0+$/, '') + 'k';
    } else {
      formatted = value.toFixed(0);
    }
    return value >= 0 ? `+${formatted}` : formatted;
  }


  isQuestLocked(action: SkillAction): boolean {
    return !!action.questRequirement && !this.completedQuests.has(action.questRequirement);
  }

  profitClass(profit: number | null): string {
    if (profit == null) return '';
    return profit >= 0 ? 'profit-positive' : 'profit-negative';
  }

  formatProfit(profit: number): string {
    if (profit >= 0) return `+${profit.toLocaleString()}`;
    return profit.toLocaleString();
  }

  getItemImageUri(itemId: number | undefined): string | null {
    if (itemId == null) return null;
    return this.itemImages().get(itemId) ?? null;
  }

  private loadActions(): void {
    this.loading.set(true);
    this.skillDataService.getActions(this.skillName).subscribe({
      next: (actions) => {
        this.actions.set(actions);
        this.loading.set(false);
        this.loadPrices(actions);
        this.loadImages(actions);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadPrices(actions: SkillAction[]): void {
    const ids = this.collectItemIds(actions);
    if (ids.length === 0) return;
    this.pricesLoading.set(true);
    this.geService.getPricesBatch(ids).subscribe({
      next: (p) => { this.prices.set(p); this.pricesLoading.set(false); },
      error: () => this.pricesLoading.set(false),
    });
  }

  private loadImages(actions: SkillAction[]): void {
    const ids = this.collectItemIds(actions);
    for (const id of ids) {
      if (!this.itemImages().has(id)) {
        this.imageService.getItemImage(id).then((dataUri) => {
          const updated = new Map(this.itemImages());
          updated.set(id, dataUri);
          this.itemImages.set(updated);
        }).catch(() => {});
      }
    }
  }

  private collectItemIds(actions: SkillAction[]): number[] {
    const ids = new Set<number>();
    for (const a of actions) {
      if (a.itemId != null) ids.add(a.itemId);
      if (a.outputItemId != null) ids.add(a.outputItemId);
      for (const ing of a.ingredients ?? []) {
        if (ing.itemId != null) ids.add(ing.itemId);
      }
    }
    return Array.from(ids);
  }
}

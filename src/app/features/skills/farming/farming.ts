import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { SkillActionsTable } from '../../../shared/components/skill-actions-table/skill-actions-table';
import { SkillDataService } from '../../../core/services/skill-data.service';
import { PlayerStateService } from '../../../core/services/player-state.service';
import { GrandExchangeService } from '../../../core/services/grand-exchange.service';
import { FarmingPatches, FarmingPatch, SkillAction } from '../../../core/models/osrs.models';

interface RunPlanEntry {
  category: string;
  seedName: string;
  accessiblePatches: number;
  xpPerRun: number;
  runsPerDay: number;
  xpPerDay: number;
  saplingItemId?: number;
  paymentItemId?: number;
  paymentItem?: string;
  paymentPerPatch: number;
  saplingPrice: number;
  paymentPrice: number;
}

const RUN_CATEGORIES: { key: string; hasDropdown: boolean }[] = [
  { key: 'Herb',       hasDropdown: true  },
  { key: 'Tree',       hasDropdown: true  },
  { key: 'Fruit Tree', hasDropdown: true  },
  { key: 'Hardwood',   hasDropdown: true  },
  { key: 'Calquat',    hasDropdown: false },
  { key: 'Crystal',    hasDropdown: false },
  { key: 'Celastrus',  hasDropdown: false },
  { key: 'Redwood',    hasDropdown: false },
];

@Component({
  selector: 'app-farming',
  imports: [SkillActionsTable, FormsModule, DecimalPipe],
  templateUrl: './farming.html',
  styleUrl: './farming.scss',
})
export class Farming implements OnInit, OnChanges {
  @Input() currentLevel = 1;
  @Input() currentXp = 0;
  @Input() targetLevel = 2;
  @Input() targetXp = 0;

  private readonly skillDataService = inject(SkillDataService);
  private readonly geService = inject(GrandExchangeService);
  readonly playerState = inject(PlayerStateService);

  patches = signal<FarmingPatches | null>(null);
  quests = signal<string[]>([]);
  farmingActions = signal<SkillAction[]>([]);
  prices = signal<Record<number, number>>({});
  pricesLoading = signal(false);

  showFarmRun = false;
  showPatchDetails = false;

  selectedHerb = '';
  selectedTree = '';
  selectedFruitTree = '';
  selectedHardwood = '';

  readonly runCategories = RUN_CATEGORIES;

  ngOnInit(): void {
    this.skillDataService.getFarmingPatches().subscribe({
      next: (p) => this.patches.set(p),
      error: () => {},
    });
    this.skillDataService.getSkillQuests('farming').subscribe({
      next: (q) => this.quests.set(q),
      error: () => {},
    });
    this.skillDataService.getActions('farming').subscribe({
      next: (a) => {
        this.farmingActions.set(a);
        this.setDefaultSelections();
      },
      error: () => {},
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentLevel'] && this.farmingActions().length > 0) {
      this.setDefaultSelections();
    }
  }

  private setDefaultSelections(): void {
    const getBest = (cat: string) => {
      const avail = this.farmingActions().filter(
        a => a.category === cat && a.levelRequired <= this.currentLevel
      );
      avail.sort((a, b) => b.levelRequired - a.levelRequired);
      return avail[0]?.name ?? '';
    };
    this.selectedHerb = getBest('Herb');
    this.selectedTree = getBest('Tree');
    this.selectedFruitTree = getBest('Fruit Tree');
    this.selectedHardwood = getBest('Hardwood');
  }

  toggleQuest(quest: string): void {
    this.playerState.toggleQuest(quest);
  }

  isQuestComplete(quest: string): boolean {
    return this.playerState.completedQuests().has(quest);
  }

  isPatchAccessible(patch: FarmingPatch): boolean {
    if (this.currentLevel < patch.farmingLevelRequired) return false;
    if (patch.questRequired && !this.playerState.completedQuests().has(patch.questRequired)) return false;
    return true;
  }

  accessibleCount(patches: FarmingPatch[]): number {
    return patches.reduce((sum, p) => sum + (this.isPatchAccessible(p) ? (p.patchCount ?? 1) : 0), 0);
  }

  getAvailableActions(category: string): SkillAction[] {
    return this.farmingActions()
      .filter(a => a.category === category && a.levelRequired <= this.currentLevel)
      .sort((a, b) => b.levelRequired - a.levelRequired);
  }

  getSelectedAction(patchType: string): SkillAction | null {
    const actions = this.farmingActions();
    switch (patchType) {
      case 'Herb':       return actions.find(a => a.name === this.selectedHerb) ?? null;
      case 'Tree':       return actions.find(a => a.name === this.selectedTree) ?? null;
      case 'Fruit Tree': return actions.find(a => a.name === this.selectedFruitTree) ?? null;
      case 'Hardwood':   return actions.find(a => a.name === this.selectedHardwood) ?? null;
      case 'Calquat':    return actions.find(a => a.name === 'Calquat tree'   && a.levelRequired <= this.currentLevel) ?? null;
      case 'Crystal':    return actions.filter(a => a.category === 'Crystal'  && a.levelRequired <= this.currentLevel).sort((a, b) => b.levelRequired - a.levelRequired)[0] ?? null;
      case 'Celastrus':  return actions.find(a => a.name === 'Celastrus tree' && a.levelRequired <= this.currentLevel) ?? null;
      case 'Redwood':    return actions.find(a => a.name === 'Redwood tree'   && a.levelRequired <= this.currentLevel) ?? null;
      default: return null;
    }
  }

  getAccessiblePatchCount(patchType: string): number {
    const p = this.patches();
    if (!p) return 0;
    switch (patchType) {
      case 'Herb':       return this.accessibleCount(p.herbPatches);
      case 'Tree':       return this.accessibleCount(p.treePatches);
      case 'Fruit Tree': return this.accessibleCount(p.fruitTreePatches);
      case 'Hardwood':   return this.accessibleCount(p.hardwoodPatches);
      default:
        return p.specialPatches
          .filter(sp => sp.patchType === patchType && this.isPatchAccessible(sp))
          .reduce((sum, sp) => sum + (sp.patchCount ?? 1), 0);
    }
  }

  parseGrowthHours(growthTime: string | undefined): number {
    if (!growthTime) return 0;
    const parts = growthTime.split(':');
    if (parts.length >= 3) {
      return parseInt(parts[0]) + parseInt(parts[1]) / 60 + parseInt(parts[2]) / 3600;
    }
    return 0;
  }

  getRunsPerDay(patchType: string, growthHours: number): number {
    switch (patchType) {
      case 'Herb':       return 2;
      case 'Tree':       return growthHours > 0 ? Math.min(2, Math.floor(24 / growthHours)) : 0;
      case 'Fruit Tree': return 1;
      case 'Hardwood':   return growthHours > 0 ? 24 / growthHours : 0;
      case 'Calquat':    return 1;
      case 'Crystal':    return 1;
      case 'Celastrus':  return 1;
      case 'Redwood':    return growthHours > 0 ? 24 / growthHours : 0;
      default:           return growthHours > 0 ? Math.min(2, Math.floor(24 / growthHours)) : 0;
    }
  }

  get runPlanEntries(): RunPlanEntry[] {
    const p = this.prices();
    const entries: RunPlanEntry[] = [];
    for (const cat of RUN_CATEGORIES) {
      const accessible = this.getAccessiblePatchCount(cat.key);
      if (accessible === 0) continue;
      const action = this.getSelectedAction(cat.key);
      if (!action) continue;
      const xpPerPatch = (action.plantXp ?? 0) + (action.harvestXp ?? 0);
      if (xpPerPatch <= 0) continue;
      const growthHours = this.parseGrowthHours(action.growthTime);
      const runsPerDay = this.getRunsPerDay(cat.key, growthHours);
      entries.push({
        category: cat.key,
        seedName: action.name,
        accessiblePatches: accessible,
        xpPerRun: xpPerPatch * accessible,
        runsPerDay,
        xpPerDay: xpPerPatch * accessible * runsPerDay,
        saplingItemId: action.saplingItemId,
        paymentItemId: action.paymentItemId,
        paymentItem: action.payment,
        paymentPerPatch: action.paymentQuantity ?? 0,
        saplingPrice:  action.saplingItemId  ? (p[action.saplingItemId]  ?? 0) : 0,
        paymentPrice:  action.paymentItemId  ? (p[action.paymentItemId]  ?? 0) : 0,
      });
    }
    return entries;
  }

  get totalDailyXp(): number {
    return this.runPlanEntries.reduce((sum, e) => sum + e.xpPerDay, 0);
  }

  get daysToTarget(): number {
    const xpNeeded = Math.max(0, this.targetXp - this.currentXp);
    return this.totalDailyXp > 0 ? xpNeeded / this.totalDailyXp : 0;
  }

  totalRunsNeeded(entry: RunPlanEntry): number {
    return Math.ceil(this.daysToTarget * entry.runsPerDay);
  }

  totalSeedsNeeded(entry: RunPlanEntry): number {
    return this.totalRunsNeeded(entry) * entry.accessiblePatches;
  }

  totalPaymentNeeded(entry: RunPlanEntry): number {
    return entry.paymentItem ? this.totalSeedsNeeded(entry) * entry.paymentPerPatch : 0;
  }

  totalSaplingCost(entry: RunPlanEntry): number {
    return this.totalSeedsNeeded(entry) * entry.saplingPrice;
  }

  totalPaymentCost(entry: RunPlanEntry): number {
    return this.totalPaymentNeeded(entry) * entry.paymentPrice;
  }

  totalCost(entry: RunPlanEntry): number {
    return this.totalSaplingCost(entry) + this.totalPaymentCost(entry);
  }

  get grandTotal(): number {
    return this.runPlanEntries.reduce((sum, e) => sum + this.totalCost(e), 0);
  }

  paymentDisplay(entry: RunPlanEntry): string {
    return entry.paymentItem ? `${entry.paymentPerPatch}x ${entry.paymentItem}` : '—';
  }

  formatRunFreq(runsPerDay: number): string {
    if (runsPerDay >= 2) return `${runsPerDay.toFixed(0)}× daily`;
    if (runsPerDay >= 1) return '1× daily';
    if (runsPerDay > 0) return `Every ${(1 / runsPerDay).toFixed(1)} days`;
    return '—';
  }

  formatGp(value: number): string {
    if (value === 0) return '—';
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  }

  gpClass(value: number): string {
    if (value === 0) return '';
    return value > 0 ? 'gp-green' : 'gp-negative';
  }

  onSeedChanged(): void {
    this.loadFarmRunPrices();
  }

  toggleFarmRun(): void {
    this.showFarmRun = !this.showFarmRun;
    if (this.showFarmRun && Object.keys(this.prices()).length === 0) {
      this.loadFarmRunPrices();
    }
  }

  private loadFarmRunPrices(): void {
    const itemIds = new Set<number>();
    for (const cat of RUN_CATEGORIES) {
      const action = this.getSelectedAction(cat.key);
      if (action?.saplingItemId) itemIds.add(action.saplingItemId);
      if (action?.paymentItemId) itemIds.add(action.paymentItemId);
    }
    if (itemIds.size === 0) return;
    this.pricesLoading.set(true);
    this.geService.getPricesBatch(Array.from(itemIds)).subscribe({
      next: (p) => { this.prices.set(p); this.pricesLoading.set(false); },
      error: () => this.pricesLoading.set(false),
    });
  }
}


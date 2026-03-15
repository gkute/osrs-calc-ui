import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SkillDataService } from '../../../core/services/skill-data.service';
import { OutfitDefinition } from '../../../core/models/osrs.models';

@Component({
  selector: 'app-outfit-bonus-panel',
  imports: [FormsModule],
  templateUrl: './outfit-bonus-panel.html',
  styleUrl: './outfit-bonus-panel.scss',
})
export class OutfitBonusPanel implements OnInit {
  @Input() skillName = '';
  @Output() bonusChange = new EventEmitter<number>();

  private readonly skillDataService = inject(SkillDataService);

  outfit = signal<OutfitDefinition | null>(null);
  pieceChecked = signal<boolean[]>([]);

  ngOnInit(): void {
    this.skillDataService.getSkillOutfit(this.skillName).subscribe({
      next: (def) => {
        this.outfit.set(def);
        this.pieceChecked.set(def.pieces.map(() => false));
      },
      error: () => {},
    });
  }

  get totalBonus(): number {
    const def = this.outfit();
    if (!def) return 0;
    const checked = this.pieceChecked();
    const allChecked = checked.every(v => v);
    const pieceBonus = def.pieces.reduce((sum, p, i) => sum + (checked[i] ? p.bonusPercent : 0), 0);
    const setBonus = allChecked && def.fullSetBonusPercent > 0 ? def.fullSetBonusPercent : 0;
    return pieceBonus + setBonus;
  }

  onPieceChange(index: number, checked: boolean): void {
    const updated = [...this.pieceChecked()];
    updated[index] = checked;
    this.pieceChecked.set(updated);
    this.bonusChange.emit(1 + this.totalBonus / 100);
  }
}

import { Component, Input, signal } from '@angular/core';
import { SkillActionsTable } from '../../../shared/components/skill-actions-table/skill-actions-table';
import { OutfitBonusPanel } from '../../../shared/components/outfit-bonus-panel/outfit-bonus-panel';

@Component({
  selector: 'app-woodcutting',
  imports: [SkillActionsTable, OutfitBonusPanel],
  templateUrl: './woodcutting.html',
  styleUrl: './woodcutting.scss',
})
export class Woodcutting {
  @Input() currentLevel = 1;
  @Input() currentXp = 0;
  @Input() targetLevel = 2;
  @Input() targetXp = 0;

  outfitMultiplier = signal(1.0);
}

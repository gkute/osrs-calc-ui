import { Component, Input, signal } from '@angular/core';
import { SkillActionsTable } from '../../../shared/components/skill-actions-table/skill-actions-table';
import { OutfitBonusPanel } from '../../../shared/components/outfit-bonus-panel/outfit-bonus-panel';

@Component({
  selector: 'app-firemaking',
  imports: [SkillActionsTable, OutfitBonusPanel],
  templateUrl: './firemaking.html',
  styleUrl: './firemaking.scss',
})
export class Firemaking {
  @Input() currentLevel = 1;
  @Input() currentXp = 0;
  @Input() targetLevel = 2;
  @Input() targetXp = 0;

  outfitMultiplier = signal(1.0);
}

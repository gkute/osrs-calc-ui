import { Component, Input } from '@angular/core';
import { SkillActionsTable } from '../../../shared/components/skill-actions-table/skill-actions-table';

@Component({
  selector: 'app-herblore',
  imports: [SkillActionsTable],
  templateUrl: './herblore.html',
  styleUrl: './herblore.scss',
})
export class Herblore {
  @Input() currentLevel = 1;
  @Input() currentXp = 0;
  @Input() targetLevel = 2;
  @Input() targetXp = 0;
}

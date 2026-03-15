import { Component, Input } from '@angular/core';
import { SkillActionsTable } from '../../../shared/components/skill-actions-table/skill-actions-table';

@Component({
  selector: 'app-sailing',
  imports: [SkillActionsTable],
  templateUrl: './sailing.html',
  styleUrl: './sailing.scss',
})
export class Sailing {
  @Input() currentLevel = 1;
  @Input() currentXp = 0;
  @Input() targetLevel = 2;
  @Input() targetXp = 0;
}

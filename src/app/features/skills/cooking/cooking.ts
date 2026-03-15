import { Component, Input } from '@angular/core';
import { SkillActionsTable } from '../../../shared/components/skill-actions-table/skill-actions-table';

@Component({
  selector: 'app-cooking',
  imports: [SkillActionsTable],
  templateUrl: './cooking.html',
  styleUrl: './cooking.scss',
})
export class Cooking {
  @Input() currentLevel = 1;
  @Input() currentXp = 0;
  @Input() targetLevel = 2;
  @Input() targetXp = 0;
}

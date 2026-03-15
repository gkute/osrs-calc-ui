import { Component, Input } from '@angular/core';
import { SkillActionsTable } from '../../../shared/components/skill-actions-table/skill-actions-table';

@Component({
  selector: 'app-crafting',
  imports: [SkillActionsTable],
  templateUrl: './crafting.html',
  styleUrl: './crafting.scss',
})
export class Crafting {
  @Input() currentLevel = 1;
  @Input() currentXp = 0;
  @Input() targetLevel = 2;
  @Input() targetXp = 0;
}

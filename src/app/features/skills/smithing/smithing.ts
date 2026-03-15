import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SkillActionsTable } from '../../../shared/components/skill-actions-table/skill-actions-table';
import { SkillDataService } from '../../../core/services/skill-data.service';
import { PlayerStateService } from '../../../core/services/player-state.service';

@Component({
  selector: 'app-smithing',
  imports: [SkillActionsTable, FormsModule],
  templateUrl: './smithing.html',
  styleUrl: './smithing.scss',
})
export class Smithing implements OnInit {
  @Input() currentLevel = 1;
  @Input() currentXp = 0;
  @Input() targetLevel = 2;
  @Input() targetXp = 0;

  private readonly skillDataService = inject(SkillDataService);
  readonly playerState = inject(PlayerStateService);
  goldsmiithGauntlets = signal(false);
  showBonuses = true;
  quests = signal<string[]>([]);


  ngOnInit(): void {
    this.skillDataService.getSkillQuests('smithing').subscribe({
      next: (q) => this.quests.set(q),
      error: () => {},
    });
  }

  toggleQuest(quest: string): void {
    this.playerState.toggleQuest(quest);
  }

  isQuestComplete(quest: string): boolean {
    return this.playerState.completedQuests().has(quest);
  }
}

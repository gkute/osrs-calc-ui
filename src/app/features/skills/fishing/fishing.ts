import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SkillActionsTable } from '../../../shared/components/skill-actions-table/skill-actions-table';
import { OutfitBonusPanel } from '../../../shared/components/outfit-bonus-panel/outfit-bonus-panel';
import { SkillDataService } from '../../../core/services/skill-data.service';
import { PlayerStateService } from '../../../core/services/player-state.service';

@Component({
  selector: 'app-fishing',
  imports: [SkillActionsTable, OutfitBonusPanel, FormsModule],
  templateUrl: './fishing.html',
  styleUrl: './fishing.scss',
})
export class Fishing implements OnInit {
  @Input() currentLevel = 1;
  @Input() currentXp = 0;
  @Input() targetLevel = 2;
  @Input() targetXp = 0;

  private readonly skillDataService = inject(SkillDataService);
  readonly playerState = inject(PlayerStateService);
  outfitMultiplier = signal(1.0);
  quests = signal<string[]>([]);


  ngOnInit(): void {
    this.skillDataService.getSkillQuests('fishing').subscribe({
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

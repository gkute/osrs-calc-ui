import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SkillActionsTable } from '../../../shared/components/skill-actions-table/skill-actions-table';
import { SkillDataService } from '../../../core/services/skill-data.service';
import { PrayerBonus } from '../../../core/models/osrs.models';

@Component({
  selector: 'app-prayer',
  imports: [SkillActionsTable, FormsModule],
  templateUrl: './prayer.html',
  styleUrl: './prayer.scss',
})
export class Prayer implements OnInit {
  @Input() currentLevel = 1;
  @Input() currentXp = 0;
  @Input() targetLevel = 2;
  @Input() targetXp = 0;

  private readonly skillDataService = inject(SkillDataService);

  prayerBonuses = signal<PrayerBonus[]>([]);
  selectedBonusMultiplier = signal(1.0);
  showBonuses = true;

  ngOnInit(): void {
    this.skillDataService.getPrayerBonuses().subscribe({
      next: (bonuses) => this.prayerBonuses.set(bonuses),
      error: () => {},
    });
  }
}

import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { PlayerService } from '../../core/services/player.service';
import { PlayerStateService } from '../../core/services/player-state.service';
import { ImageService } from '../../core/services/image.service';
import { HiscoreEntry } from '../../core/models/osrs.models';

@Component({
  selector: 'app-home',
  imports: [FormsModule, DatePipe, DecimalPipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly playerService = inject(PlayerService);
  private readonly imageService = inject(ImageService);
  private readonly router = inject(Router);
  readonly playerState = inject(PlayerStateService);

  searchName = '';
  loading = signal(false);
  error = signal<string | null>(null);
  skillIcons = signal<Map<string, string>>(new Map());

  ngOnInit(): void {
    const existing = this.playerState.skills();
    if (existing.length > 0) {
      this.searchName = this.playerState.playerName();
      this.loadSkillIcons(existing.map(e => e.skillName));
    }
  }

  get orderedSkills(): HiscoreEntry[] {
    const all = this.playerState.skills();
    return [
      ...all.filter(s => s.skillName !== 'Overall'),
      ...all.filter(s => s.skillName === 'Overall'),
    ];
  }

  lookup(): void {
    const name = this.searchName.trim();
    if (!name) return;

    this.loading.set(true);
    this.error.set(null);

    this.playerService.getPlayer(name).subscribe({
      next: (entries: HiscoreEntry[]) => {
        this.playerState.setPlayer(name, entries);
        this.loading.set(false);
        this.loadSkillIcons(entries.map(e => e.skillName));
      },
      error: () => {
        this.error.set(`Player "${name}" not found.`);
        this.loading.set(false);
      },
    });
  }

  private loadSkillIcons(skillNames: string[]): void {
    for (const name of skillNames) {
      if (!this.skillIcons().has(name)) {
        this.imageService.getSkillIcon(name).then((dataUri) => {
            const updated = new Map(this.skillIcons());
            updated.set(name, dataUri);
            this.skillIcons.set(updated);
          }).catch(() => {});
      }
    }
  }

  openCalculator(skill: HiscoreEntry): void {
    this.router.navigate(['/skills', skill.skillName.toLowerCase()], {
      queryParams: {
        level: skill.level,
        xp: skill.experience,
        rank: skill.rank,
      },
    });
  }
}

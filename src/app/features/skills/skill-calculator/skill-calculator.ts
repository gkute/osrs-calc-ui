import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TitleCasePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { combineLatest } from 'rxjs';
import { ImageService } from '../../../core/services/image.service';
import { PlayerStateService } from '../../../core/services/player-state.service';
import { Agility } from '../agility/agility';
import { Construction } from '../construction/construction';
import { Cooking } from '../cooking/cooking';
import { Crafting } from '../crafting/crafting';
import { Farming } from '../farming/farming';
import { Firemaking } from '../firemaking/firemaking';
import { Fishing } from '../fishing/fishing';
import { Fletching } from '../fletching/fletching';
import { Herblore } from '../herblore/herblore';
import { Hunter } from '../hunter/hunter';
import { Magic } from '../magic/magic';
import { Mining } from '../mining/mining';
import { Prayer } from '../prayer/prayer';
import { Runecrafting } from '../runecrafting/runecrafting';
import { Sailing } from '../sailing/sailing';
import { Smithing } from '../smithing/smithing';
import { Thieving } from '../thieving/thieving';
import { Woodcutting } from '../woodcutting/woodcutting';

// OSRS XP table (level 1-99, then virtual levels 100-126, index 127 = 200m max)
const XP_TABLE: number[] = (() => {
  const table = [0, 0]; // index 0 unused, level 1 = 0 xp
  for (let level = 2; level <= 126; level++) {
    let xp = 0;
    for (let i = 1; i < level; i++) {
      xp += Math.floor(i + 300 * Math.pow(2, i / 7));
    }
    table.push(Math.floor(xp / 4));
  }
  table.push(200_000_000); // index 127 = 200m XP cap
  return table;
})();

const MAX_VIRTUAL_LEVEL = 127;
const MAX_XP = 200_000_000;

function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level >= MAX_VIRTUAL_LEVEL) return MAX_XP;
  return XP_TABLE[level];
}

function getLevelForXp(xp: number): number {
  if (xp >= MAX_XP) return MAX_VIRTUAL_LEVEL;
  for (let lvl = MAX_VIRTUAL_LEVEL; lvl >= 1; lvl--) {
    if (xp >= XP_TABLE[lvl]) return lvl;
  }
  return 1;
}

function isVirtualLevel(level: number): boolean {
  return level > 99;
}

@Component({
  selector: 'app-skill-calculator',
  imports: [
    TitleCasePipe, DecimalPipe, FormsModule,
    Agility, Construction, Cooking, Crafting,
    Farming, Firemaking, Fishing, Fletching,
    Herblore, Hunter, Magic, Mining,
    Prayer, Runecrafting, Sailing, Smithing,
    Thieving, Woodcutting,
  ],
  templateUrl: './skill-calculator.html',
  styleUrl: './skill-calculator.scss',
})
export class SkillCalculator implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly imageService = inject(ImageService);
  readonly playerState = inject(PlayerStateService);

  readonly skill = signal<string>('');
  readonly currentRank = signal<number>(0);
  currentLevel = signal<number>(1);
  currentXp = signal<number>(0);
  targetLevel = signal<number>(2);
  targetXp = signal<number>(getXpForLevel(2));
  skillIconUri = signal<string | null>(null);

  readonly xpNeeded = computed(() => {
    const needed = this.targetXp() - this.currentXp();
    return needed > 0 ? needed : 0;
  });

  readonly progressPercent = computed(() => {
    const target = this.targetXp();
    if (target <= 0) return 100;
    return Math.min(100, (this.currentXp() / target) * 100);
  });

  readonly maxXp = MAX_XP;
  readonly maxLevel = MAX_VIRTUAL_LEVEL;
  readonly isVirtualLevel = isVirtualLevel;

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, queryParams]) => {
      const skillName = params.get('skill') ?? '';
      this.skill.set(skillName);
      this.loadIcon(skillName);

      const rawLevel = queryParams.get('level');
      const rawXp = queryParams.get('xp');
      const rawRank = queryParams.get('rank');

      // Fall back to PlayerStateService when no query params (e.g. navigated from navbar)
      let level: number;
      let xp: number;
      let rank: number;
      if (!rawLevel && !rawXp && skillName) {
        const entry = this.playerState.skills().find(s => s.skillName.toLowerCase() === skillName.toLowerCase());
        level = entry?.level ?? 1;
        xp = entry?.experience ?? 0;
        rank = entry?.rank ?? 0;
      } else {
        level = parseInt(rawLevel ?? '1', 10);
        xp = parseInt(rawXp ?? '0', 10);
        rank = parseInt(rawRank ?? '0', 10);
      }

      const clampedLevel = Math.max(1, Math.min(MAX_VIRTUAL_LEVEL, isNaN(level) ? 1 : level));
      const clampedXp = isNaN(xp) ? getXpForLevel(clampedLevel) : Math.min(xp, MAX_XP);

      this.currentLevel.set(clampedLevel);
      this.currentXp.set(clampedXp);
      this.currentRank.set(isNaN(rank) ? 0 : rank);

      const tl = Math.min(MAX_VIRTUAL_LEVEL, clampedLevel + 1);
      this.targetLevel.set(tl);
      this.targetXp.set(getXpForLevel(tl));
    });
  }

  private loadIcon(skillName: string): void {
    if (!skillName) return;
    const name = skillName.charAt(0).toUpperCase() + skillName.slice(1);
    this.imageService.getSkillIcon(name).then((dataUri) => this.skillIconUri.set(dataUri)).catch(() => {});
  }

  onCurrentLevelChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 1 && val <= MAX_VIRTUAL_LEVEL) {
      this.currentLevel.set(val);
      this.currentXp.set(getXpForLevel(val));
      if (this.targetLevel() <= val) {
        const tl = Math.min(MAX_VIRTUAL_LEVEL, val + 1);
        this.targetLevel.set(tl);
        this.targetXp.set(getXpForLevel(tl));
      }
    }
  }

  onCurrentXpChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 0) {
      this.currentXp.set(Math.min(val, MAX_XP));
      this.currentLevel.set(getLevelForXp(val));
      if (this.targetLevel() <= this.currentLevel()) {
        const tl = Math.min(MAX_VIRTUAL_LEVEL, this.currentLevel() + 1);
        this.targetLevel.set(tl);
        this.targetXp.set(getXpForLevel(tl));
      }
    }
  }

  onTargetLevelChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 1 && val <= MAX_VIRTUAL_LEVEL) {
      this.targetLevel.set(val);
      this.targetXp.set(getXpForLevel(val));
    }
  }

  onTargetXpChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 0) {
      this.targetXp.set(Math.min(val, MAX_XP));
      this.targetLevel.set(getLevelForXp(val));
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getXpForLevel = getXpForLevel;
}
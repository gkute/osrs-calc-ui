import { Injectable, signal, computed, effect } from '@angular/core';
import { HiscoreEntry } from '../models/osrs.models';

const LS_KEY = 'osrs-player-state';

interface PersistedState {
  playerName: string;
  skills: HiscoreEntry[];
  lastUpdated: string | null;
  completedQuests: string[];
}

@Injectable({ providedIn: 'root' })
export class PlayerStateService {
  readonly playerName = signal<string>('');
  readonly skills = signal<HiscoreEntry[]>([]);
  readonly lastUpdated = signal<Date | null>(null);
  readonly completedQuests = signal<Set<string>>(new Set());

  readonly skillLevels = computed<Record<string, number>>(() =>
    Object.fromEntries(this.skills().map(s => [s.skillName, s.level]))
  );

  constructor() {
    this.loadFromStorage();
    effect(() => {
      // Track all signals so the effect re-runs when any changes
      const state: PersistedState = {
        playerName: this.playerName(),
        skills: this.skills(),
        lastUpdated: this.lastUpdated()?.toISOString() ?? null,
        completedQuests: Array.from(this.completedQuests()),
      };
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    });
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const state: PersistedState = JSON.parse(raw);
      if (state.playerName) this.playerName.set(state.playerName);
      if (state.skills?.length) this.skills.set(state.skills);
      if (state.lastUpdated) this.lastUpdated.set(new Date(state.lastUpdated));
      if (state.completedQuests?.length) this.completedQuests.set(new Set(state.completedQuests));
    } catch {
      // ignore corrupt storage
    }
  }

  setPlayer(name: string, skills: HiscoreEntry[]): void {
    this.playerName.set(name);
    this.skills.set(skills);
    this.lastUpdated.set(new Date());
  }

  getSkillLevel(skillName: string): number {
    return this.skillLevels()[skillName] ?? 0;
  }

  toggleQuest(questName: string): void {
    const quests = new Set(this.completedQuests());
    if (quests.has(questName)) {
      quests.delete(questName);
    } else {
      quests.add(questName);
    }
    this.completedQuests.set(quests);
  }

  clear(): void {
    this.playerName.set('');
    this.skills.set([]);
    this.lastUpdated.set(null);
    this.completedQuests.set(new Set());
    localStorage.removeItem(LS_KEY);
  }
}

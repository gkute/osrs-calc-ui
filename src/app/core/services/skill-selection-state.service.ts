import { Injectable, signal } from '@angular/core';

export interface SkillSelectionState {
  completedQuests: Set<string>;
  outfitPieces: Record<string, boolean>;
  toggles: Record<string, boolean>;
  selections: Record<string, string>;
  selectedBonus?: string;
}

@Injectable({ providedIn: 'root' })
export class SkillSelectionStateService {
  private readonly _states = new Map<string, ReturnType<typeof signal<SkillSelectionState>>>();

  getState(skillName: string) {
    if (!this._states.has(skillName)) {
      this._states.set(
        skillName,
        signal<SkillSelectionState>({
          completedQuests: new Set(),
          outfitPieces: {},
          toggles: {},
          selections: {},
        })
      );
    }
    return this._states.get(skillName)!;
  }

  updateState(skillName: string, patch: Partial<SkillSelectionState>): void {
    const stateSignal = this.getState(skillName);
    stateSignal.update(current => ({ ...current, ...patch }));
  }

  toggleQuest(skillName: string, quest: string): void {
    const stateSignal = this.getState(skillName);
    stateSignal.update(current => {
      const quests = new Set(current.completedQuests);
      if (quests.has(quest)) quests.delete(quest);
      else quests.add(quest);
      return { ...current, completedQuests: quests };
    });
  }

  setToggle(skillName: string, key: string, value: boolean): void {
    const stateSignal = this.getState(skillName);
    stateSignal.update(current => ({
      ...current,
      toggles: { ...current.toggles, [key]: value },
    }));
  }

  setOutfitPiece(skillName: string, key: string, value: boolean): void {
    const stateSignal = this.getState(skillName);
    stateSignal.update(current => ({
      ...current,
      outfitPieces: { ...current.outfitPieces, [key]: value },
    }));
  }

  setSelection(skillName: string, key: string, value: string): void {
    const stateSignal = this.getState(skillName);
    stateSignal.update(current => ({
      ...current,
      selections: { ...current.selections, [key]: value },
    }));
  }
}

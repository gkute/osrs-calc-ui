import { TestBed } from '@angular/core/testing';
import { SkillSelectionStateService } from './skill-selection-state.service';

describe('SkillSelectionStateService', () => {
  let service: SkillSelectionStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SkillSelectionStateService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('getState creates initial empty state for new skill', () => {
    const state = service.getState('Farming')();
    expect(state.completedQuests.size).toBe(0);
    expect(state.outfitPieces).toEqual({});
    expect(state.toggles).toEqual({});
    expect(state.selections).toEqual({});
  });

  it('getState returns the same signal for the same skill', () => {
    const a = service.getState('Mining');
    const b = service.getState('Mining');
    expect(a).toBe(b);
  });

  it('states are isolated between different skills', () => {
    service.setToggle('Farming', 'birdHouse', true);
    expect(service.getState('Mining')().toggles['birdHouse']).toBeUndefined();
  });

  it('toggleQuest adds quest when not present', () => {
    service.toggleQuest('Farming', 'Fairytale II');
    expect(service.getState('Farming')().completedQuests.has('Fairytale II')).toBe(true);
  });

  it('toggleQuest removes quest when already present', () => {
    service.toggleQuest('Farming', 'Fairytale II');
    service.toggleQuest('Farming', 'Fairytale II');
    expect(service.getState('Farming')().completedQuests.has('Fairytale II')).toBe(false);
  });

  it('setToggle sets a named toggle to the given value', () => {
    service.setToggle('Agility', 'seersBankTeleport', true);
    expect(service.getState('Agility')().toggles['seersBankTeleport']).toBe(true);
  });

  it('setToggle can set a toggle to false', () => {
    service.setToggle('Agility', 'seersBankTeleport', true);
    service.setToggle('Agility', 'seersBankTeleport', false);
    expect(service.getState('Agility')().toggles['seersBankTeleport']).toBe(false);
  });

  it('setOutfitPiece sets an outfit piece to true', () => {
    service.setOutfitPiece('Farming', 'head', true);
    expect(service.getState('Farming')().outfitPieces['head']).toBe(true);
  });

  it('setSelection sets a selection value', () => {
    service.setSelection('Cooking', 'location', 'rogues den');
    expect(service.getState('Cooking')().selections['location']).toBe('rogues den');
  });

  it('updateState merges a partial update', () => {
    service.setToggle('Herblore', 'imbuedHeart', true);
    service.updateState('Herblore', { selectedBonus: '10%' });
    const state = service.getState('Herblore')();
    expect(state.toggles['imbuedHeart']).toBe(true);
    expect(state.selectedBonus).toBe('10%');
  });
});

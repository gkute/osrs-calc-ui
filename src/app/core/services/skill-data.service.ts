import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SkillAction, FarmingPatches, OutfitDefinition, PrayerBonus } from '../models/osrs.models';

@Injectable({ providedIn: 'root' })
export class SkillDataService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getSkillNames(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/skills`);
  }

  getExperienceTable(): Observable<Record<number, number>> {
    return this.http.get<Record<number, number>>(
      `${this.base}/skills/experience-table`
    );
  }

  getActions(skill: string): Observable<SkillAction[]> {
    return this.http.get<SkillAction[]>(
      `${this.base}/skills/${encodeURIComponent(skill)}/actions`
    );
  }

  getSkillQuests(skill: string): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.base}/skills/${encodeURIComponent(skill)}/quests`
    );
  }

  getFarmingPatches(): Observable<FarmingPatches> {
    return this.http.get<FarmingPatches>(`${this.base}/skills/farming/patches`);
  }

  getSkillOutfit(skill: string): Observable<OutfitDefinition> {
    return this.http.get<OutfitDefinition>(
      `${this.base}/skills/${encodeURIComponent(skill)}/outfit`
    );
  }

  getPrayerBonuses(): Observable<PrayerBonus[]> {
    return this.http.get<PrayerBonus[]>(`${this.base}/skills/prayer/bonuses`);
  }
}

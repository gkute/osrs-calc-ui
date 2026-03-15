import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HiscoreEntry } from '../models/osrs.models';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getPlayer(playerName: string): Observable<HiscoreEntry[]> {
    return this.http.get<HiscoreEntry[]>(
      `${this.base}/player/${encodeURIComponent(playerName)}`
    );
  }
}

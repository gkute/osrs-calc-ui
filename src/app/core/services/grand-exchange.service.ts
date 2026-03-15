import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GrandExchangeService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Returns all GE prices (large payload — use batch when possible). */
  getAllPrices(): Observable<Record<number, number>> {
    return this.http.get<Record<number, number>>(`${this.base}/prices`);
  }

  getPrice(itemId: number): Observable<number> {
    return this.http.get<number>(`${this.base}/prices/${itemId}`);
  }

  getPricesBatch(itemIds: number[]): Observable<Record<number, number>> {
    return this.http.post<Record<number, number>>(
      `${this.base}/prices/batch`,
      itemIds
    );
  }
}

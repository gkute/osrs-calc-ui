import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IconCacheService } from './icon-cache.service';

@Injectable({ providedIn: 'root' })
export class ImageService {
  private readonly http = inject(HttpClient);
  private readonly iconCache = inject(IconCacheService);
  private readonly base = environment.apiBaseUrl;

  async getItemImage(itemId: number): Promise<string> {
    const key = `item:${itemId}`;
    const cached = await this.iconCache.get(key);
    if (cached) return cached;
    const result = await firstValueFrom(
      this.http.get<{ dataUri: string }>(`${this.base}/images/item/${itemId}`)
    );
    await this.iconCache.set(key, result.dataUri);
    return result.dataUri;
  }

  async getItemImagesBatch(itemIds: number[]): Promise<Map<number, string>> {
    const result = new Map<number, string>();
    if (itemIds.length === 0) return result;

    const checks = await Promise.all(
      itemIds.map(async id => ({ id, cached: await this.iconCache.get(`item:${id}`) }))
    );

    for (const { id, cached } of checks) {
      if (cached) result.set(id, cached);
    }

    const uncached = checks.filter(c => !c.cached).map(c => c.id);
    if (uncached.length === 0) return result;

    const params = new HttpParams().set('ids', uncached.join(','));
    const response = await firstValueFrom(
      this.http.get<Record<string, string | null>>(`${this.base}/images/items/batch`, { params })
    );

    await Promise.all(
      Object.entries(response).map(async ([idStr, dataUri]) => {
        const id = parseInt(idStr, 10);
        if (dataUri) {
          await this.iconCache.set(`item:${id}`, dataUri);
          result.set(id, dataUri);
        }
      })
    );

    return result;
  }

  async getSkillIcon(skillName: string): Promise<string> {
    const key = `skill:${skillName}`;
    const cached = await this.iconCache.get(key);
    if (cached) return cached;
    const result = await firstValueFrom(
      this.http.get<{ dataUri: string }>(`${this.base}/images/skill/${encodeURIComponent(skillName)}`)
    );
    await this.iconCache.set(key, result.dataUri);
    return result.dataUri;
  }
}

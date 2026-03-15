import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

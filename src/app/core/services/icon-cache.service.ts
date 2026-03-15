import { Injectable } from '@angular/core';

const DB_NAME = 'osrs-icon-cache';
const DB_VERSION = 1;
const STORE_NAME = 'icons';

@Injectable({ providedIn: 'root' })
export class IconCacheService {
  private db: IDBDatabase | null = null;
  private readonly ready: Promise<IDBDatabase>;

  constructor() {
    this.ready = this.openDb();
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async get(key: string): Promise<string | null> {
    const db = await this.ready;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => resolve(null);
    });
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.ready;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
}

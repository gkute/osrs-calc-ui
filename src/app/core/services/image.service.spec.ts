import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ImageService } from './image.service';
import { IconCacheService } from './icon-cache.service';

// The service defers the HTTP call behind two microtask levels (Promise.all → inner awaits).
// Awaiting twice lets those microtasks drain so the request is visible to HttpTestingController.
const flush = () => Promise.resolve().then(() => Promise.resolve());

describe('ImageService', () => {
  let service: ImageService;
  let httpTesting: HttpTestingController;

  const store = new Map<string, string>();
  const mockCache = {
    get: (key: string) => Promise.resolve(store.get(key) ?? null),
    set: (key: string, value: string) => { store.set(key, value); return Promise.resolve(); },
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    store.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: IconCacheService, useValue: mockCache },
      ],
    });
    service = TestBed.inject(ImageService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
  });

  it('returns empty map for empty input', async () => {
    const result = await service.getItemImagesBatch([]);
    expect(result.size).toBe(0);
  });

  it('returns all items from cache when fully cached', async () => {
    store.set('item:1', 'data:image/gif;base64,aaa');
    store.set('item:2', 'data:image/gif;base64,bbb');

    const result = await service.getItemImagesBatch([1, 2]);

    expect(result.size).toBe(2);
    expect(result.get(1)).toBe('data:image/gif;base64,aaa');
    expect(result.get(2)).toBe('data:image/gif;base64,bbb');
  });

  it('fetches uncached items from the batch API', async () => {
    const promise = service.getItemImagesBatch([1]);
    await flush();

    const req = httpTesting.expectOne(r => r.url.includes('/images/items/batch'));
    req.flush({ '1': 'data:image/gif;base64,fetched' });

    const result = await promise;
    expect(result.get(1)).toBe('data:image/gif;base64,fetched');
  });

  it('stores fetched items in the icon cache', async () => {
    const promise = service.getItemImagesBatch([42]);
    await flush();

    const req = httpTesting.expectOne(r => r.url.includes('/images/items/batch'));
    req.flush({ '42': 'data:image/gif;base64,stored' });
    await promise;

    expect(store.get('item:42')).toBe('data:image/gif;base64,stored');
  });

  it('only requests uncached item IDs', async () => {
    store.set('item:1', 'data:image/gif;base64,cached');

    const promise = service.getItemImagesBatch([1, 2]);
    await flush();

    const req = httpTesting.expectOne(r => r.url.includes('/images/items/batch'));
    expect(req.request.params.get('ids')).toBe('2');
    req.flush({ '2': 'data:image/gif;base64,fetched' });

    const result = await promise;
    expect(result.get(1)).toBe('data:image/gif;base64,cached');
    expect(result.get(2)).toBe('data:image/gif;base64,fetched');
  });

  it('omits items with null response from the result', async () => {
    const promise = service.getItemImagesBatch([1, 2]);
    await flush();

    const req = httpTesting.expectOne(r => r.url.includes('/images/items/batch'));
    req.flush({ '1': 'data:image/gif;base64,ok', '2': null });

    const result = await promise;
    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(false);
  });
});

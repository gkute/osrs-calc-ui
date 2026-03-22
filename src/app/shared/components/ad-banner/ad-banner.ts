import { Component, Input, afterNextRender } from '@angular/core';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

@Component({
  selector: 'app-ad-banner',
  templateUrl: './ad-banner.html',
  styleUrl: './ad-banner.scss',
})
export class AdBanner {
  /** AdSense ad-slot ID for this unit. Replace with real slot ID once approved. */
  @Input() adSlot = 'XXXXXXXXXX';
  @Input() adFormat: 'auto' | 'rectangle' | 'horizontal' = 'auto';

  readonly publisherId = 'ca-pub-8643064861827878';

  constructor() {
    afterNextRender(() => {
      // Only push when the slot looks like a real ID (all digits); skip placeholders
      if (!/^\d+$/.test(this.adSlot)) return;
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    });
  }
}

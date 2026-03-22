import { Component, Input, afterNextRender, ElementRef, ViewChild } from '@angular/core';

declare global {
  interface Window {
    adsbygoogle: unknown[];
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

  @ViewChild('adContainer') adContainer!: ElementRef<HTMLElement>;

  constructor() {
    afterNextRender(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // AdSense not yet loaded (e.g. blocked by ad blocker or pending approval)
      }
    });
  }
}

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Herblore } from './herblore';

describe('Herblore', () => {
  let component: Herblore;
  let fixture: ComponentFixture<Herblore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Herblore],
    }).compileComponents();

    fixture = TestBed.createComponent(Herblore);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

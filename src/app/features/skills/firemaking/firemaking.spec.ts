import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Firemaking } from './firemaking';

describe('Firemaking', () => {
  let component: Firemaking;
  let fixture: ComponentFixture<Firemaking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Firemaking],
    }).compileComponents();

    fixture = TestBed.createComponent(Firemaking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

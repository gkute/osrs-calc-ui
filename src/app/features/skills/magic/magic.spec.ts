import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Magic } from './magic';

describe('Magic', () => {
  let component: Magic;
  let fixture: ComponentFixture<Magic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Magic],
    }).compileComponents();

    fixture = TestBed.createComponent(Magic);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

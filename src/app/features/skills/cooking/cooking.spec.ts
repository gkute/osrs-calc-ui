import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cooking } from './cooking';

describe('Cooking', () => {
  let component: Cooking;
  let fixture: ComponentFixture<Cooking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cooking],
    }).compileComponents();

    fixture = TestBed.createComponent(Cooking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fishing } from './fishing';

describe('Fishing', () => {
  let component: Fishing;
  let fixture: ComponentFixture<Fishing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fishing],
    }).compileComponents();

    fixture = TestBed.createComponent(Fishing);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Farming } from './farming';

describe('Farming', () => {
  let component: Farming;
  let fixture: ComponentFixture<Farming>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Farming],
    }).compileComponents();

    fixture = TestBed.createComponent(Farming);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

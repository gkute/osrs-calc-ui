import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Runecrafting } from './runecrafting';

describe('Runecrafting', () => {
  let component: Runecrafting;
  let fixture: ComponentFixture<Runecrafting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Runecrafting],
    }).compileComponents();

    fixture = TestBed.createComponent(Runecrafting);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

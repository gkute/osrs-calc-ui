import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Agility } from './agility';

describe('Agility', () => {
  let component: Agility;
  let fixture: ComponentFixture<Agility>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Agility],
    }).compileComponents();

    fixture = TestBed.createComponent(Agility);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

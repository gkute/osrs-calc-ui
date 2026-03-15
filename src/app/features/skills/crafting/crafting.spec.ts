import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Crafting } from './crafting';

describe('Crafting', () => {
  let component: Crafting;
  let fixture: ComponentFixture<Crafting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Crafting],
    }).compileComponents();

    fixture = TestBed.createComponent(Crafting);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

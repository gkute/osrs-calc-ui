import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Woodcutting } from './woodcutting';

describe('Woodcutting', () => {
  let component: Woodcutting;
  let fixture: ComponentFixture<Woodcutting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Woodcutting],
    }).compileComponents();

    fixture = TestBed.createComponent(Woodcutting);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkillCalculator } from './skill-calculator';

describe('SkillCalculator', () => {
  let component: SkillCalculator;
  let fixture: ComponentFixture<SkillCalculator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillCalculator],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillCalculator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

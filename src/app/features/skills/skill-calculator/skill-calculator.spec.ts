import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SkillCalculator } from './skill-calculator';

describe('SkillCalculator', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillCalculator],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SkillCalculator);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

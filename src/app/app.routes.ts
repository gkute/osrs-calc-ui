import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { SkillCalculator } from './features/skills/skill-calculator/skill-calculator';

export const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'skills/:skill',
    component: SkillCalculator,
  },
  { path: '**', redirectTo: '' },
];

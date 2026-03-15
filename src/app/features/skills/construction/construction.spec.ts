import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Construction } from './construction';

describe('Construction', () => {
  let component: Construction;
  let fixture: ComponentFixture<Construction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Construction],
    }).compileComponents();

    fixture = TestBed.createComponent(Construction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

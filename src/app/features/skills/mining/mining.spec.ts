import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mining } from './mining';

describe('Mining', () => {
  let component: Mining;
  let fixture: ComponentFixture<Mining>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mining],
    }).compileComponents();

    fixture = TestBed.createComponent(Mining);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

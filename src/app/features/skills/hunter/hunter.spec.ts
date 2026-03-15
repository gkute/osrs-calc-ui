import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Hunter } from './hunter';

describe('Hunter', () => {
  let component: Hunter;
  let fixture: ComponentFixture<Hunter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hunter],
    }).compileComponents();

    fixture = TestBed.createComponent(Hunter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Thieving } from './thieving';

describe('Thieving', () => {
  let component: Thieving;
  let fixture: ComponentFixture<Thieving>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Thieving],
    }).compileComponents();

    fixture = TestBed.createComponent(Thieving);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

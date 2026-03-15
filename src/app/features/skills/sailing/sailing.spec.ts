import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sailing } from './sailing';

describe('Sailing', () => {
  let component: Sailing;
  let fixture: ComponentFixture<Sailing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sailing],
    }).compileComponents();

    fixture = TestBed.createComponent(Sailing);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

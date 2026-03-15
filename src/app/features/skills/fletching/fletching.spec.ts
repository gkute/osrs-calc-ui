import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fletching } from './fletching';

describe('Fletching', () => {
  let component: Fletching;
  let fixture: ComponentFixture<Fletching>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fletching],
    }).compileComponents();

    fixture = TestBed.createComponent(Fletching);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

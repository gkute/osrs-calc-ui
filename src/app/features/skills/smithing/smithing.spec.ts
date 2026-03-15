import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Smithing } from './smithing';

describe('Smithing', () => {
  let component: Smithing;
  let fixture: ComponentFixture<Smithing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Smithing],
    }).compileComponents();

    fixture = TestBed.createComponent(Smithing);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

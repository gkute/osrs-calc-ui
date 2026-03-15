import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Prayer } from './prayer';

describe('Prayer', () => {
  let component: Prayer;
  let fixture: ComponentFixture<Prayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Prayer],
    }).compileComponents();

    fixture = TestBed.createComponent(Prayer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

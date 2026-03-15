import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecialPatchTable } from './special-patch-table';

describe('SpecialPatchTable', () => {
  let component: SpecialPatchTable;
  let fixture: ComponentFixture<SpecialPatchTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpecialPatchTable],
    }).compileComponents();

    fixture = TestBed.createComponent(SpecialPatchTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

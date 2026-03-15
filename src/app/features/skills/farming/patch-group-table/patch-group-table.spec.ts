import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatchGroupTable } from './patch-group-table';

describe('PatchGroupTable', () => {
  let component: PatchGroupTable;
  let fixture: ComponentFixture<PatchGroupTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatchGroupTable],
    }).compileComponents();

    fixture = TestBed.createComponent(PatchGroupTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

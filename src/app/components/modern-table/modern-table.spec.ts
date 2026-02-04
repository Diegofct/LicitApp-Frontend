import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModernTable } from './modern-table';

describe('ModernTable', () => {
  let component: ModernTable;
  let fixture: ComponentFixture<ModernTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModernTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModernTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

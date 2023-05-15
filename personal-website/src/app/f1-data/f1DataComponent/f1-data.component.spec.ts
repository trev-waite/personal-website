import { ComponentFixture, TestBed } from '@angular/core/testing';

import { F1DataComponent } from './f1-data.component';

describe('F1DataComponent', () => {
  let component: F1DataComponent;
  let fixture: ComponentFixture<F1DataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ F1DataComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(F1DataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

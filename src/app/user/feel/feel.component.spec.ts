import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FeelComponent } from './feel.component';

describe('FeelComponent', () => {
  let component: FeelComponent;
  let fixture: ComponentFixture<FeelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FeelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

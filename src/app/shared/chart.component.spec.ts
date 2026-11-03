import { TestBed } from '@angular/core/testing';
import { Component, ViewChild } from '@angular/core';
import ChartComponent from './chart.component';

@Component({
  standalone: true,
  imports: [ChartComponent],
  template: `
    <app-chart
      [type]="type"
      [labels]="labels"
      [datasets]="datasets"
    ></app-chart>
  `,
})
class TestHostComponent {
  type: 'doughnut' | 'bar' = 'doughnut';
  labels: string[] = [];
  datasets: { label: string; data: number[]; backgroundColor: string | string[] }[] = [];
  @ViewChild(ChartComponent) chartComponent?: ChartComponent;
}

describe('ChartComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();
  });

  it('should create the chart component', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.type = 'doughnut';
    fixture.componentInstance.labels = ['Kategorie 1', 'Kategorie 2'];
    fixture.componentInstance.datasets = [
      { label: 'Test', data: [100, 200], backgroundColor: ['#ff0000', '#00ff00'] },
    ];
    fixture.detectChanges();
    expect(fixture.componentInstance.chartComponent).toBeTruthy();
  });

  it('should render a canvas element', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.type = 'bar';
    fixture.componentInstance.labels = ['Jan', 'Feb'];
    fixture.componentInstance.datasets = [
      { label: 'Monate', data: [50, 60], backgroundColor: '#03a9f4' },
    ];
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('canvas')).toBeTruthy();
  });

  it('should accept doughnut type input', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.type = 'doughnut';
    fixture.componentInstance.labels = ['A', 'B'];
    fixture.componentInstance.datasets = [
      { label: 'D', data: [10, 20], backgroundColor: ['#ccc', '#ddd'] },
    ];
    fixture.detectChanges();
    expect(fixture.componentInstance.chartComponent?.type()).toBe('doughnut');
  });

  it('should accept bar type input', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.type = 'bar';
    fixture.componentInstance.labels = ['A', 'B'];
    fixture.componentInstance.datasets = [
      { label: 'D', data: [10, 20], backgroundColor: ['#ccc', '#ddd'] },
    ];
    fixture.detectChanges();
    expect(fixture.componentInstance.chartComponent?.type()).toBe('bar');
  });

  it('should destroy chart on ngOnDestroy', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.type = 'doughnut';
    fixture.componentInstance.labels = ['X'];
    fixture.componentInstance.datasets = [
      { label: 'L', data: [1], backgroundColor: '#fff' },
    ];
    fixture.detectChanges();
    expect(() => fixture.destroy()).not.toThrow();
  });
});

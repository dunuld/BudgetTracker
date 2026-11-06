import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import TrendComponent from './trend.component';
import type { TrendReport } from '../../../../shared/api-types';

describe('TrendComponent', () => {
  let httpMock: HttpTestingController;

  const createMockTrendReport = (): TrendReport => ({
    from: '2024-01',
    to: '2024-03',
    categories: [
      { id: 1, name: 'Lebensmittel', color: '#4caf50', kind: 'expense' },
      { id: 2, name: 'Miete', color: '#f44336', kind: 'expense' },
    ],
    months: [
      {
        month: '2024-01',
        totals: [
          { categoryId: 1, totalCents: -50000 },
          { categoryId: 2, totalCents: -80000 },
        ],
      },
      {
        month: '2024-02',
        totals: [
          { categoryId: 1, totalCents: -45000 },
          { categoryId: 2, totalCents: -80000 },
        ],
      },
      {
        month: '2024-03',
        totals: [
          { categoryId: 1, totalCents: -55000 },
          { categoryId: 2, totalCents: -80000 },
        ],
      },
    ],
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrendComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(TrendComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    httpMock.expectOne((req) => req.url.includes('api/reports/trend')).flush({} as TrendReport);
  });

  it('should show loading state initially', () => {
    const fixture = TestBed.createComponent(TrendComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.loading')?.textContent).toContain('Lade Daten');
    httpMock.expectOne((req) => req.url.includes('api/reports/trend')).flush({} as TrendReport);
  });

  it('should display trend report with chart and table', async () => {
    const fixture = TestBed.createComponent(TrendComponent);
    fixture.detectChanges();

    const mockReport = createMockTrendReport();
    httpMock.expectOne((req) => req.url.includes('api/reports/trend')).flush(mockReport);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-chart')).toBeTruthy();
    expect(compiled.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('should display month columns in table', async () => {
    const fixture = TestBed.createComponent(TrendComponent);
    fixture.detectChanges();

    const mockReport = createMockTrendReport();
    httpMock.expectOne((req) => req.url.includes('api/reports/trend')).flush(mockReport);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const headers = compiled.querySelectorAll('thead th');
    expect(headers.length).toBe(4);
  });

  it('should show empty message when API error', async () => {
    const fixture = TestBed.createComponent(TrendComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((req) => req.url.includes('api/reports/trend'))
      .error(new ProgressEvent('error'));
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty')?.textContent).toContain('Wählen Sie einen Zeitraum');
  });

  it('should handle from/to month changes', () => {
    const fixture = TestBed.createComponent(TrendComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url.includes('api/reports/trend')).flush({} as TrendReport);

    component.fromMonth.set('2024-01');
    component.toMonth.set('2024-06');
    expect(component.fromMonth()).toBe('2024-01');
    expect(component.toMonth()).toBe('2024-06');
  });

  it('should format month label correctly', () => {
    const fixture = TestBed.createComponent(TrendComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url.includes('api/reports/trend')).flush({} as TrendReport);

    expect(component.formatMonthLabel('2024-01')).toBe('Januar 2024');
    expect(component.formatMonthLabel('2024-12')).toBe('Dezember 2024');
  });

  it('should format euro amounts', () => {
    const fixture = TestBed.createComponent(TrendComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url.includes('api/reports/trend')).flush({} as TrendReport);

    expect(component.formatEuro(100000)).toContain('1.000,00');
    expect(component.formatEuro(-4599)).toContain('-45,99');
  });

  it('should format month category total', () => {
    const fixture = TestBed.createComponent(TrendComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url.includes('api/reports/trend')).flush({} as TrendReport);

    const month = { month: '2024-01', totals: [{ categoryId: 1, totalCents: -50000 }] };
    expect(component.formatMonthCategoryTotal(month, 1)).toContain('-500,00');
    expect(component.formatMonthCategoryTotal(month, 999)).toBe('—');
  });

  it('should handle API error gracefully', async () => {
    const fixture = TestBed.createComponent(TrendComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((req) => req.url.includes('api/reports/trend'))
      .error(new ProgressEvent('error'));
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.report()).toBeNull();
  });

  it('should build chart datasets from report', async () => {
    const fixture = TestBed.createComponent(TrendComponent);
    fixture.detectChanges();

    const mockReport = createMockTrendReport();
    httpMock.expectOne((req) => req.url.includes('api/reports/trend')).flush(mockReport);
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const datasets = component.chartDatasets();
    expect(datasets.length).toBe(2);
    expect(datasets[0].label).toBe('Lebensmittel');
    expect(datasets[0].data.length).toBe(3);
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import SettingsComponent from './settings.component';
import type { Category, Rule, Statement } from '../../../../shared/api-types';

describe('SettingsComponent', () => {
  let httpMock: HttpTestingController;

  const createMockCategories = (): Category[] => [
    { id: 1, name: 'Lebensmittel', color: '#4caf50', kind: 'expense', sort: 1, isDefault: false },
    { id: 2, name: 'Miete', color: '#f44336', kind: 'expense', sort: 2, isDefault: false },
    { id: 4, name: 'Sonstiges', color: '#9e9e9e', kind: 'expense', sort: 99, isDefault: true },
  ];

  const createMockRules = (): Rule[] => [
    { id: 1, categoryId: 1, field: 'counterparty', matchType: 'contains', pattern: 'REWE', priority: 1 },
    { id: 2, categoryId: 2, field: 'purpose', matchType: 'contains', pattern: 'Miete', priority: 2 },
  ];

  const createMockStatements = (): Statement[] => [
    {
      id: 1,
      bank: 'TestBank',
      iban: 'DE12345678901234567890',
      year: 2024,
      month: 1,
      openingCents: 500000,
      closingCents: 380000,
      fileName: 'auszug.pdf',
      importedAt: '2024-01-15T10:00:00Z',
      transactionCount: 25,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
  });

  it('should display the settings heading', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('Einstellungen');
    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
  });

  it('should display all three tabs', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const tabs = compiled.querySelectorAll('.tab');
    expect(tabs.length).toBe(3);
    expect(tabs[0]?.textContent).toContain('Kategorien');
    expect(tabs[1]?.textContent).toContain('Regeln');
    expect(tabs[2]?.textContent).toContain('Auszüge');
    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
  });

  it('should show categories tab by default', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.activeTab()).toBe('categories');
    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
  });

  it('should switch to rules tab', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);

    component.activeTab.set('rules');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('rules');
  });

  it('should switch to statements tab', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);

    component.activeTab.set('statements');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('statements');
  });

  it('should display categories in table', async () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();

    const cats = createMockCategories();
    httpMock.expectOne(req => req.url.includes('api/categories')).flush(cats);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
  });

  it('should display rules in table', async () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const cats = createMockCategories();
    const rules = createMockRules();
    httpMock.expectOne(req => req.url.includes('api/categories')).flush(cats);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush(rules);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    component.activeTab.set('rules');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('should display statements in table', async () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const statements = createMockStatements();
    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush(statements);
    await fixture.whenStable();
    fixture.detectChanges();

    component.activeTab.set('statements');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
  });

  it('should show empty message for statements tab', async () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    component.activeTab.set('statements');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty')?.textContent).toContain('Noch keine Auszüge');
  });

  it('should return category name for given id', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const cats = createMockCategories();
    component.categories.set(cats);

    httpMock.expectOne(req => req.url.includes('api/categories')).flush(cats);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);

    expect(component.categoryName(1)).toBe('Lebensmittel');
    expect(component.categoryName(999)).toBe('ID: 999');
  });

  it('should return kind label for expense', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.kindLabel('expense')).toBe('Ausgabe');
    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
  });

  it('should return kind label for income', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.kindLabel('income')).toBe('Einnahme');
    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
  });

  it('should return kind label for transfer', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.kindLabel('transfer')).toBe('Umbuchung');
    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
  });

  it('should return field label for counterparty', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.fieldLabel('counterparty')).toBe('Empfänger');
    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
  });

  it('should return field label for purpose', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.fieldLabel('purpose')).toBe('Verwendungszweck');
    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
  });

  it('should return field label for any', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.fieldLabel('any')).toBe('Beides');
    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
  });

  it('should format month year label', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.monthYearLabel(2024, 1)).toBe('Jan 2024');
    expect(component.monthYearLabel(2024, 12)).toBe('Dez 2024');
    httpMock.expectOne(req => req.url.includes('api/categories')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
  });

  it('should handle API error', async () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();

    httpMock.expectOne(req => req.url.includes('api/categories')).error(new ProgressEvent('error'));
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.errorMsg()).toBeTruthy();
  });

  it('should show default badge for default category', async () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();

    const cats = createMockCategories();
    httpMock.expectOne(req => req.url.includes('api/categories')).flush(cats);
    httpMock.expectOne(req => req.url.includes('api/rules')).flush([]);
    httpMock.expectOne(req => req.url.includes('api/statements')).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.badge')?.textContent).toContain('Standard');
  });
});

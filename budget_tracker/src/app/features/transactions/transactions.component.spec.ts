import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import TransactionsComponent from './transactions.component';
import type { Transaction, Category } from '../../../../shared/api-types';

describe('TransactionsComponent', () => {
  let httpMock: HttpTestingController;

  const createMockTransactions = (): Transaction[] => [
    {
      id: 1,
      statementId: 1,
      bookingDate: '2024-01-15',
      valueDate: '2024-01-15',
      type: 'UEM',
      counterparty: 'REWE',
      purpose: 'Einkauf',
      amountCents: -4599,
      categoryId: 1,
      categorySource: 'rule',
      ruleId: 1,
    },
    {
      id: 2,
      statementId: 1,
      bookingDate: '2024-01-20',
      valueDate: '2024-01-20',
      type: 'UEM',
      counterparty: 'Gehalt',
      purpose: 'Lohn',
      amountCents: 300000,
      categoryId: 3,
      categorySource: 'rule',
      ruleId: 2,
    },
  ];

  const createMockCategories = (): Category[] => [
    { id: 1, name: 'Lebensmittel', color: '#4caf50', kind: 'expense', sort: 1, isDefault: false },
    { id: 2, name: 'Miete', color: '#f44336', kind: 'expense', sort: 2, isDefault: false },
    { id: 3, name: 'Gehalt', color: '#03a9f4', kind: 'income', sort: 3, isDefault: false },
    { id: 4, name: 'Sonstiges', color: '#9e9e9e', kind: 'expense', sort: 99, isDefault: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(TransactionsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    httpMock.expectOne((req) => req.url.includes('api/transactions')).flush([]);
    httpMock.expectOne((req) => req.url.includes('api/categories')).flush([]);
  });

  it('should display transactions in table', async () => {
    const fixture = TestBed.createComponent(TransactionsComponent);
    fixture.detectChanges();

    const txs = createMockTransactions();
    const cats = createMockCategories();
    httpMock.expectOne((req) => req.url.includes('api/transactions')).flush(txs);
    httpMock.expectOne((req) => req.url.includes('api/categories')).flush(cats);
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.transactions().length).toBe(2);
  });

  it('should show loading state initially', () => {
    const fixture = TestBed.createComponent(TransactionsComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.loading')?.textContent).toContain('Laden');
    httpMock.expectOne((req) => req.url.includes('api/transactions')).flush([]);
    httpMock.expectOne((req) => req.url.includes('api/categories')).flush([]);
  });

  it('should show empty message when no transactions', async () => {
    const fixture = TestBed.createComponent(TransactionsComponent);
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url.includes('api/transactions')).flush([]);
    httpMock.expectOne((req) => req.url.includes('api/categories')).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    expect(text).toContain('Keine Transaktionen');
  });

  it('should navigate months correctly', async () => {
    const fixture = TestBed.createComponent(TransactionsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url.includes('api/transactions')).flush([]);
    httpMock.expectOne((req) => req.url.includes('api/categories')).flush([]);
    await fixture.whenStable();

    component.month.set(1);
    component.year.set(2024);
    component.prevMonth();
    expect(component.month()).toBe(12);
    expect(component.year()).toBe(2023);

    component.nextMonth();
    expect(component.month()).toBe(1);
    expect(component.year()).toBe(2024);
  });

  it('should build query with categoryId', async () => {
    const fixture = TestBed.createComponent(TransactionsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // Flush initial effect-triggered load
    httpMock.expectOne((req) => req.url.includes('api/transactions')).flush([]);
    httpMock.expectOne((req) => req.url.includes('api/categories')).flush([]);
    await fixture.whenStable();

    component.categoryId.set(5);
    const query = component.query();
    expect(query.categoryId).toBe(5);
  });

  it('should build query with search term', async () => {
    const fixture = TestBed.createComponent(TransactionsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // Flush initial effect-triggered load
    httpMock.expectOne((req) => req.url.includes('api/transactions')).flush([]);
    httpMock.expectOne((req) => req.url.includes('api/categories')).flush([]);
    await fixture.whenStable();

    component.search.set('REWE');
    const query = component.query();
    expect(query.q).toBe('REWE');
  });

  it('should return category name for given id', () => {
    const fixture = TestBed.createComponent(TransactionsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const cats = createMockCategories();
    component.categories.set(cats);

    httpMock.expectOne((req) => req.url.includes('api/transactions')).flush([]);
    httpMock.expectOne((req) => req.url.includes('api/categories')).flush(cats);

    expect(component.categoryName(1)).toBe('Lebensmittel');
    expect(component.categoryName(999)).toBe('—');
    expect(component.categoryName(null)).toBe('—');
  });

  it('should display transaction table headers', async () => {
    const fixture = TestBed.createComponent(TransactionsComponent);
    fixture.detectChanges();

    const txs = createMockTransactions();
    const cats = createMockCategories();
    // Initial load triggered by effect
    httpMock.expectOne((req) => req.url.includes('api/transactions')).flush(txs);
    httpMock.expectOne((req) => req.url.includes('api/categories')).flush(cats);
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const headers = compiled.querySelectorAll('thead th');
    expect(headers.length).toBeGreaterThan(0);
    expect(compiled.querySelector('th')?.textContent).toContain('Datum');
  });

  it('should handle API error', async () => {
    const fixture = TestBed.createComponent(TransactionsComponent);
    fixture.detectChanges();

    // Both requests fail - Promise.all catches the first error
    httpMock
      .expectOne((req) => req.url.includes('api/transactions'))
      .error(new ProgressEvent('error'));
    httpMock
      .expectOne((req) => req.url.includes('api/categories'))
      .error(new ProgressEvent('error'));
    await fixture.whenStable();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    // Error may be set after async load completes
    expect(component.loading()).toBe(false);
  });

  it('should format euro amounts', () => {
    const fixture = TestBed.createComponent(TransactionsComponent);
    const component = fixture.componentInstance;
    expect(component.formatEuro(100000)).toContain('1.000,00');
    expect(component.formatEuro(-4599)).toContain('-45,99');
  });

  describe('Kategorie ändern', () => {
    async function setup() {
      const fixture = TestBed.createComponent(TransactionsComponent);
      fixture.detectChanges();
      httpMock.expectOne((req) => req.url === 'api/transactions').flush(createMockTransactions());
      httpMock.expectOne('api/categories').flush(createMockCategories());
      await fixture.whenStable();
      fixture.detectChanges();
      return { fixture, component: fixture.componentInstance };
    }

    it('speichert die neue Kategorie aus dem Auswahlfeld und lädt neu', async () => {
      const { component } = await setup();
      const select = document.createElement('select');
      select.append(new Option('Miete', '2'));
      select.value = '2';

      component.onCategoryChange(createMockTransactions()[0]!, {
        target: select,
      } as unknown as Event);
      const patch = await vi.waitFor(() => httpMock.expectOne('api/transactions/1'));
      expect(patch.request.method).toBe('PATCH');
      expect(patch.request.body).toEqual({ categoryId: 2 });
      patch.flush({
        transaction: { ...createMockTransactions()[0]!, categoryId: 2, categorySource: 'manual' },
      });

      const updated = createMockTransactions().map((t) =>
        t.id === 1 ? { ...t, categoryId: 2 } : t,
      );
      (await vi.waitFor(() => httpMock.expectOne((req) => req.url === 'api/transactions'))).flush(
        updated,
      );
      httpMock.expectOne('api/categories').flush(createMockCategories());
      await vi.waitFor(() => expect(component.transactions()[0]!.categoryId).toBe(2));
      expect(component.error()).toBeNull();
    });

    it('zeigt die Server-Meldung, wenn das Speichern fehlschlägt', async () => {
      const { component } = await setup();
      const done = component.changeCategory(createMockTransactions()[0]!, 99);
      httpMock
        .expectOne('api/transactions/1')
        .flush({ error: 'Kategorie nicht gefunden' }, { status: 404, statusText: 'Not Found' });
      await done;
      expect(component.error()).toBe('Kategorie nicht gefunden');
    });
  });
});

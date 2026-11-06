import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Request abonnieren, Methode/URL/Body prüfen und beantworten. */
  function expectRequest(
    call: () => { subscribe: () => unknown },
    method: string,
    url: string,
    body?: unknown,
  ) {
    call().subscribe();
    const req = http.expectOne(url);
    expect(req.request.method).toBe(method);
    if (body !== undefined) expect(req.request.body).toEqual(body);
    req.flush(null);
  }

  it.each<[string, () => { subscribe: () => unknown }, string, string, unknown?]>([
    ['listStatements', () => api.listStatements(), 'GET', 'api/statements'],
    ['deleteStatement', () => api.deleteStatement(3), 'DELETE', 'api/statements/3'],
    ['listCategories', () => api.listCategories(), 'GET', 'api/categories'],
    [
      'createCategory',
      () => api.createCategory({ name: 'A', color: '#000000', kind: 'expense' }),
      'POST',
      'api/categories',
      { name: 'A', color: '#000000', kind: 'expense' },
    ],
    [
      'updateCategory',
      () => api.updateCategory(5, { color: '#ffffff' }),
      'PATCH',
      'api/categories/5',
      { color: '#ffffff' },
    ],
    ['deleteCategory', () => api.deleteCategory(5), 'DELETE', 'api/categories/5'],
    ['listRules', () => api.listRules(), 'GET', 'api/rules'],
    [
      'createRule',
      () => api.createRule({ categoryId: 1, field: 'any', matchType: 'contains', pattern: 'X' }),
      'POST',
      'api/rules',
      { categoryId: 1, field: 'any', matchType: 'contains', pattern: 'X' },
    ],
    [
      'updateRule',
      () => api.updateRule(7, { priority: 5 }),
      'PATCH',
      'api/rules/7',
      { priority: 5 },
    ],
    ['deleteRule', () => api.deleteRule(7), 'DELETE', 'api/rules/7'],
    ['reapplyRules', () => api.reapplyRules(), 'POST', 'api/rules/reapply', {}],
    [
      'patchTransaction',
      () => api.patchTransaction(9, { categoryId: 2 }),
      'PATCH',
      'api/transactions/9',
      { categoryId: 2 },
    ],
  ])('%s', (_name, call, method, url, body) => expectRequest(call, method, url, body));

  it('importStatement sendet die Datei als FormData, optional mit replace', () => {
    const file = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' });

    api.importStatement(file).subscribe();
    const first = http.expectOne('api/statements');
    expect(first.request.method).toBe('POST');
    expect((first.request.body as FormData).get('file')).toBeInstanceOf(File);
    first.flush(null);

    api.importStatement(file, true).subscribe();
    http.expectOne('api/statements?replace=true').flush(null);
  });

  it('listTransactions übergibt nur gesetzte Filter', () => {
    api.listTransactions({ year: 2026, month: 3, categoryId: 4, q: 'rewe' }).subscribe();
    const full = http.expectOne((req) => req.url === 'api/transactions');
    expect(full.request.params.toString()).toBe('year=2026&month=3&categoryId=4&q=rewe');
    full.flush([]);

    api.listTransactions({}).subscribe();
    const empty = http.expectOne((req) => req.url === 'api/transactions');
    expect(empty.request.params.keys()).toEqual([]);
    empty.flush([]);
  });

  it('Reports übergeben ihre Parameter', () => {
    api.monthlyReport(2026, 11).subscribe();
    const monthly = http.expectOne((req) => req.url === 'api/reports/monthly');
    expect(monthly.request.params.toString()).toBe('year=2026&month=11');
    monthly.flush(null);

    api.trendReport('2026-01', '2026-12').subscribe();
    const trend = http.expectOne((req) => req.url === 'api/reports/trend');
    expect(trend.request.params.toString()).toBe('from=2026-01&to=2026-12');
    trend.flush(null);
  });
});

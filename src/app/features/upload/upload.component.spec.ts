import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import UploadComponent from './upload.component';
import type { ImportResult } from '../../../../shared/api-types';

describe('UploadComponent', () => {
  let httpMock: HttpTestingController;

  const createMockImportResult = (): ImportResult => ({
    statement: {
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
    periodFrom: '2024-01-01',
    periodTo: '2024-01-31',
    transactionCount: 25,
    uncategorizedCount: 3,
    sumCents: -120000,
    balanceOk: true,
    warnings: [],
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(UploadComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the upload heading', () => {
    const fixture = TestBed.createComponent(UploadComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('PDF hochladen');
  });

  it('should display the drop zone label', () => {
    const fixture = TestBed.createComponent(UploadComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.drop-zone')?.textContent).toContain('PDF-Kontoauszug');
  });

  it('should handle successful file upload', async () => {
    const fixture = TestBed.createComponent(UploadComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const mockResult = createMockImportResult();
    const file = new File(['dummy'], 'auszug.pdf', { type: 'application/pdf' });

    const uploadPromise = component.upload(file);
    const req = httpMock.expectOne(req => req.url.includes('api/statements'));
    req.flush(mockResult);
    await uploadPromise;
    fixture.detectChanges();

    expect(component.result()).toBeTruthy();
    expect(component.result()!.transactionCount).toBe(25);
    expect(component.uploading()).toBe(false);
  });

  it('should show loading state during upload', () => {
    const fixture = TestBed.createComponent(UploadComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const file = new File(['dummy'], 'auszug.pdf', { type: 'application/pdf' });
    expect(component.uploading()).toBe(false);

    component.upload(file);
    fixture.detectChanges();
    expect(component.uploading()).toBe(true);

    httpMock.expectOne(req => req.url.includes('api/statements')).flush(createMockImportResult());
  });

  it('should handle upload error', async () => {
    const fixture = TestBed.createComponent(UploadComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const file = new File(['dummy'], 'auszug.pdf', { type: 'application/pdf' });

    const uploadPromise = component.upload(file);
    const req = httpMock.expectOne(req => req.url.includes('api/statements'));
    req.error(new ProgressEvent('error'));
    await uploadPromise;
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(component.uploading()).toBe(false);
  });

  it('should display import result details', async () => {
    const fixture = TestBed.createComponent(UploadComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const mockResult = createMockImportResult();
    const file = new File(['dummy'], 'auszug.pdf', { type: 'application/pdf' });

    const uploadPromise = component.upload(file);
    const req = httpMock.expectOne(req => req.url.includes('api/statements'));
    req.flush(mockResult);
    await uploadPromise;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.result')?.textContent).toContain('Import erfolgreich');
    expect(compiled.querySelector('.result')?.textContent).toContain('25');
  });

  it('should show balance warning when balanceOk is false', async () => {
    const fixture = TestBed.createComponent(UploadComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const mockResult = createMockImportResult();
    mockResult.balanceOk = false;
    const file = new File(['dummy'], 'auszug.pdf', { type: 'application/pdf' });

    const uploadPromise = component.upload(file);
    const req = httpMock.expectOne(req => req.url.includes('api/statements'));
    req.flush(mockResult);
    await uploadPromise;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.warning')?.textContent).toContain('Saldo-Differenz');
  });

  it('should display warnings', async () => {
    const fixture = TestBed.createComponent(UploadComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const mockResult = createMockImportResult();
    mockResult.warnings = ['Warnung 1', 'Warnung 2'];
    const file = new File(['dummy'], 'auszug.pdf', { type: 'application/pdf' });

    const uploadPromise = component.upload(file);
    const req = httpMock.expectOne(req => req.url.includes('api/statements'));
    req.flush(mockResult);
    await uploadPromise;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const warnings = compiled.querySelectorAll('.warnings .warning');
    expect(warnings.length).toBe(2);
  });

  it('should set file name', () => {
    const fixture = TestBed.createComponent(UploadComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.fileName.set('test-auszug.pdf');
    expect(component.fileName()).toBe('test-auszug.pdf');
  });

  it('should format euro amounts', () => {
    const fixture = TestBed.createComponent(UploadComponent);
    const component = fixture.componentInstance;
    // formatEuro uses Intl.NumberFormat which produces non-breaking space before €
    expect(component.formatEuro(100000)).toContain('1.000,00');
    expect(component.formatEuro(-4599)).toContain('-45,99');
  });
});

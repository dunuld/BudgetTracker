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

  it('ruft den Health-Check relativ zum Ingress-Pfad ab', () => {
    let version: string | undefined;
    api.health().subscribe((res) => (version = res.version));

    const req = http.expectOne('api/health');
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'ok', version: '0.1.0' });
    expect(version).toBe('0.1.0');
  });
});

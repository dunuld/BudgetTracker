import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import HomeComponent from './home.component';

describe('HomeComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function render() {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    return {
      fixture,
      text: () => {
        fixture.detectChanges();
        return (fixture.nativeElement as HTMLElement).querySelector('.status')?.textContent ?? '';
      },
    };
  }

  it('zeigt die Backend-Version an', () => {
    const { text } = render();
    expect(text()).toContain('Verbinde');
    http.expectOne('api/health').flush({ status: 'ok', version: '0.1.0' });
    expect(text()).toContain('Version 0.1.0');
  });

  it('zeigt die Fehlermeldung des Servers an', () => {
    const { text } = render();
    http
      .expectOne('api/health')
      .flush({ error: 'Kaputt' }, { status: 500, statusText: 'Server Error' });
    expect(text()).toContain('Kaputt');
  });
});

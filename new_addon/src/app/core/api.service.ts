import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { HealthResponse } from '../../../shared/api-types';

/** Zugriff auf die REST-API; Pfade relativ, damit sie unter dem HA-Ingress-Pfad funktionieren. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  health() {
    return this.http.get<HealthResponse>('api/health');
  }
}

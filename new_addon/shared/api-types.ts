/** Gemeinsame DTOs von Frontend (src/) und Backend (server/). */

export interface HealthResponse {
  status: 'ok';
  version: string;
}

export interface ApiError {
  error: string;
  /** Maschinenlesbarer Code, z. B. `NOT_FOUND` */
  code?: string;
}

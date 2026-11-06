import { Component, inject, signal } from '@angular/core';
import { apiErrorMessage } from '../../core/api-error';
import { ApiService } from '../../core/api.service';

/** Startseite – Platzhalter, der die Verbindung zum Backend anzeigt. */
@Component({
  selector: 'app-home',
  template: `
    <h2>Neues Add-on</h2>
    <div class="app-card">
      @if (error()) {
        <p class="status error" role="alert">{{ error() }}</p>
      } @else if (version()) {
        <p class="status ok">Backend erreichbar – Version {{ version() }}</p>
      } @else {
        <p class="status">Verbinde mit dem Backend …</p>
      }
      <p>Hier entsteht die Oberfläche des Add-ons.</p>
    </div>
  `,
  styles: `
    .status {
      margin-top: 0;
      color: var(--app-text-secondary);
    }
    .status.ok {
      color: var(--app-success-text);
    }
    .status.error {
      color: var(--app-error-text);
    }
  `,
})
export default class HomeComponent {
  private readonly api = inject(ApiService);

  readonly version = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    this.api.health().subscribe({
      next: (res) => this.version.set(res.version),
      error: (err: unknown) => this.error.set(apiErrorMessage(err, 'Backend nicht erreichbar')),
    });
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { ApiService } from '../../core/api.service';
import { formatEuro } from '../../core/format';
import type { ImportResult } from '../../../../shared/api-types';

@Component({
  selector: 'app-upload',
  imports: [],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css',
})
export default class UploadComponent {
  private api = inject(ApiService);

  uploading = signal(false);
  result = signal<ImportResult | null>(null);
  error = signal<string | null>(null);
  fileName = signal('');

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.fileName.set(file.name);
    this.result.set(null);
    this.error.set(null);
    await this.upload(file);
  }

  async upload(file: File) {
    this.uploading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.api.importStatement(file));
      this.result.set(result);
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Upload fehlgeschlagen');
      // Duplikat (409) – anbieten, den bestehenden Auszug zu ersetzen
      if (err instanceof HttpErrorResponse && err.status === 409) {
        if (confirm(`${msg}\n\nBestehenden Auszug ersetzen?`)) {
          try {
            const result = await firstValueFrom(this.api.importStatement(file, true));
            this.result.set(result);
          } catch (err2: unknown) {
            this.error.set(apiErrorMessage(err2, 'Ersetzen fehlgeschlagen'));
          }
        } else {
          this.error.set(msg);
        }
      } else {
        this.error.set(msg);
      }
    } finally {
      this.uploading.set(false);
    }
  }

  formatEuro = formatEuro;
}

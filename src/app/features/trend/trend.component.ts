import { Component, computed, signal } from '@angular/core';
import { ApiService } from '../../core/api.service.js';
import { formatMonthYear as fmtMonthYear } from '../../core/format.js';
import ChartComponent from '../../shared/chart.component.js';
import type { Category, TrendMonth, TrendReport } from '../../../../shared/api-types';

@Component({
  selector: 'app-trend',
  standalone: true,
  imports: [ChartComponent],
  template: `
    <h2>Verlauf</h2>
    <div class="range-selector">
      <label>
        Von
        <input type="month" [value]="fromMonth()" (change)="onFromChange($event)" />
      </label>
      <label>
        Bis
        <input type="month" [value]="toMonth()" (change)="onToChange($event)" />
      </label>
      <button class="btn-primary" (click)="load()" [disabled]="loading()">Anzeigen</button>
    </div>

    @if (loading()) {
      <p class="loading">Lade Daten …</p>
    } @else if (report()) {
      @if (chartDatasets().length > 0) {
        <div class="chart-section">
          <app-chart
            [type]="'bar'"
            [labels]="report()!.months.map(m => formatMonthLabel(m.month))"
            [datasets]="chartDatasets()"
            [options]="chartOptions()"
          />
        </div>
      }

      <div class="trend-table">
        <table>
          <thead>
            <tr>
              <th>Kategorie</th>
              @for (month of report()!.months; track month.month) {
                <th class="text-right">{{ formatMonthLabel(month.month) }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (cat of expenseCategories(); track cat.id) {
              <tr>
                <td>
                  <span class="color-dot" [style.background]="cat.color"></span>
                  {{ cat.name }}
                </td>
                @for (month of report()!.months; track month.month) {
                  <td class="text-right">{{ formatMonthCategoryTotal(month, cat.id) }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="empty">Wählen Sie einen Zeitraum aus.</p>
    }
  `,
  styles: `
    .range-selector {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .range-selector label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }
    .btn-primary {
      background: var(--ha-primary-color, #03a9f4);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.4rem 1rem;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: default; }

    .chart-section { margin-bottom: 2rem; }

    .trend-table { margin-bottom: 1rem; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 600px; }
    th, td { padding: 0.6rem 0.8rem; text-align: left; border-bottom: 1px solid #eee; }
    th { font-size: 0.85rem; color: #666; font-weight: 600; white-space: nowrap; }
    .text-right { text-align: right; }
    .color-dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 0.5rem;
      vertical-align: middle;
    }

    .loading, .empty { color: #888; text-align: center; padding: 2rem; }
  `,
})
export default class TrendComponent {
  private readonly api = new ApiService();

  readonly fromMonth = signal(this.defaultFrom());
  readonly toMonth = signal(this.defaultTo());
  readonly loading = signal(false);
  readonly report = signal<TrendReport | null>(null);

  readonly expenseCategories = computed(() => {
    const r = this.report();
    if (!r) return [];
    return r.categories.filter((c) => c.kind === 'expense');
  });

  readonly chartDatasets = computed(() => {
    const cats = this.expenseCategories();
    const months = this.report()?.months ?? [];
    if (months.length === 0) return [];

    return cats.map((cat) => ({
      label: cat.name,
      data: months.map((m) => {
        const total = m.totals.find((t) => t.categoryId === cat.id);
        return total ? Math.abs(total.totalCents) : 0;
      }),
      backgroundColor: cat.color,
    }));
  });

  readonly chartOptions = computed(() => ({
    scales: {
      x: { stacked: true },
      y: { stacked: true, ticks: { callback: (value: number) => this.formatEuroTick(value) } }
    },
    plugins: {
      legend: { display: true, position: 'bottom' as const },
      tooltip: { callbacks: { label: (ctx: any) => this.formatTooltip(ctx) } }
    }
  }));

  constructor() {
    this.load();
  }

  load() {
    const from = this.fromMonth();
    const to = this.toMonth();
    if (!from || !to) return;
    this.loading.set(true);
    this.api.trendReport(from, to).subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.report.set(null);
        this.loading.set(false);
      },
    });
  }

  onFromChange(event: Event) {
    this.fromMonth.set((event.target as HTMLInputElement).value);
  }

  onToChange(event: Event) {
    this.toMonth.set((event.target as HTMLInputElement).value);
  }

  formatMonthLabel(monthStr: string): string {
    const [y, m] = monthStr.split('-').map(Number);
    return fmtMonthYear(y, m);
  }

  formatMonthCategoryTotal(month: TrendMonth, categoryId: number): string {
    const total = month.totals.find((t) => t.categoryId === categoryId);
    if (!total || total.totalCents === 0) return '—';
    return this.formatEuro(total.totalCents);
  }

  formatEuro(cents: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  }

  formatEuroTick(value: number): string {
    if (value === 0) return '0 €';
    if (value >= 100000) return `${(value / 100000).toFixed(1)}k €`;
    if (value >= 10000) return `${(value / 100).toFixed(0)} €`;
    return `${(value / 100).toFixed(0)} €`;
  }

  formatTooltip(context: any): string {
    const value = context.parsed.y;
    return `${context.dataset.label}: ${this.formatEuro(value)}`;
  }

  private defaultFrom(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private defaultTo(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}

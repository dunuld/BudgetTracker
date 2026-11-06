import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service.js';
import { formatEuro as fmtEuro, formatMonthYear as fmtMonthYear } from '../../core/format.js';
import ChartComponent from '../../shared/chart.component.js';
import type { CategoryTotal, MonthlyReport } from '../../../../shared/api-types';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [RouterLink, ChartComponent],
  template: `
    <div class="page-header">
      <h2>Monatsübersicht</h2>
      <div class="month-nav">
        <button class="btn-icon" (click)="prevMonth()" [disabled]="loading()">‹</button>
        <span class="month-label">{{ formatMonthYear(currentYear(), currentMonth()) }}</span>
        <button class="btn-icon" (click)="nextMonth()" [disabled]="loading()">›</button>
      </div>
    </div>

    @if (loading()) {
      <p class="loading">Lade Daten …</p>
    } @else if (report()) {
      <div class="summary-cards">
        <div class="card income">
          <span class="card-label">Einnahmen</span>
          <span class="card-value">{{ formatEuro(report()!.incomeCents) }}</span>
        </div>
        <div class="card expense">
          <span class="card-label">Ausgaben</span>
          <span class="card-value">{{ formatEuro(report()!.expenseCents) }}</span>
        </div>
        <div class="card balance">
          <span class="card-label">Saldo</span>
          <span class="card-value">{{ formatEuro(report()!.balanceCents) }}</span>
        </div>
      </div>

      @if (expenseCategories().length > 0) {
        <div class="chart-section">
          <h3>Ausgaben nach Kategorie</h3>
          <div class="chart-container">
            <app-chart
              [type]="'doughnut'"
              [labels]="expenseCategories().map((c) => c.name)"
              [datasets]="[
                {
                  label: 'Ausgaben',
                  data: expenseCategories().map((c) => abs(c.totalCents)),
                  backgroundColor: expenseCategories().map((c) => c.color),
                },
              ]"
            />
          </div>
        </div>

        <div class="category-table">
          <table>
            <thead>
              <tr>
                <th>Kategorie</th>
                <th class="text-right">Betrag</th>
                <th class="text-right">Buchungen</th>
              </tr>
            </thead>
            <tbody>
              @for (cat of expenseCategories(); track cat.categoryId) {
                <tr
                  class="clickable"
                  routerLink="transactions"
                  [queryParams]="{
                    year: currentYear(),
                    month: currentMonth(),
                    categoryId: cat.categoryId,
                  }"
                >
                  <td>
                    <span class="color-dot" [style.background]="cat.color"></span>
                    {{ cat.name }}
                  </td>
                  <td class="text-right">{{ formatEuro(cat.totalCents) }}</td>
                  <td class="text-right">{{ cat.count }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="empty">Keine Ausgaben für diesen Monat.</p>
      }
    } @else {
      <p class="empty">Keine Daten verfügbar. Laden Sie einen Kontoauszug hoch.</p>
    }
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .page-header h2 {
      margin: 0;
    }
    .month-nav {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .month-label {
      font-size: 1.1rem;
      font-weight: 600;
      min-width: 180px;
      text-align: center;
    }
    .btn-icon {
      background: var(--ha-hover-color, var(--bt-bg-tertiary));
      border: none;
      border-radius: 4px;
      padding: 0.3rem 0.6rem;
      font-size: 1.2rem;
      cursor: pointer;
      color: var(--bt-text);
    }
    .btn-icon:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .card {
      padding: 1rem;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .card.income {
      background: var(--bt-card-income-bg);
    }
    .card.expense {
      background: var(--bt-card-expense-bg);
    }
    .card.balance {
      background: var(--bt-card-balance-bg);
    }
    .card-label {
      font-size: 0.85rem;
      color: var(--bt-text-secondary);
    }
    .card-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--bt-text);
    }

    .chart-section {
      margin-bottom: 2rem;
    }
    .chart-section h3 {
      margin: 0 0 1rem;
    }
    .chart-container {
      max-width: 400px;
      margin: 0 auto;
    }

    .category-table {
      margin-bottom: 1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 0.6rem 0.8rem;
      text-align: left;
      border-bottom: 1px solid var(--bt-border);
    }
    th {
      font-size: 0.85rem;
      color: var(--bt-text-secondary);
      font-weight: 600;
    }
    .text-right {
      text-align: right;
    }
    .clickable {
      cursor: pointer;
    }
    .clickable:hover {
      background: var(--bt-row-hover);
    }
    .color-dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 0.5rem;
      vertical-align: middle;
    }

    .loading,
    .empty {
      color: var(--bt-text-muted);
      text-align: center;
      padding: 2rem;
    }
  `,
})
export default class OverviewComponent {
  private readonly api = new ApiService();

  readonly currentYear = signal(new Date().getFullYear());
  readonly currentMonth = signal(new Date().getMonth() + 1);
  readonly loading = signal(false);
  readonly report = signal<MonthlyReport | null>(null);

  readonly expenseCategories = computed(() => {
    const r = this.report();
    if (!r) return [];
    return r.categories.filter((c) => c.kind === 'expense' && c.totalCents !== 0);
  });

  readonly abs = Math.abs;

  formatEuro(cents: number): string {
    return fmtEuro(cents);
  }

  formatMonthYear(year: number, month: number): string {
    return fmtMonthYear(year, month);
  }

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.monthlyReport(this.currentYear(), this.currentMonth()).subscribe({
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

  prevMonth() {
    let m = this.currentMonth() - 1;
    let y = this.currentYear();
    if (m < 1) {
      m = 12;
      y--;
    }
    this.currentMonth.set(m);
    this.currentYear.set(y);
    this.load();
  }

  nextMonth() {
    let m = this.currentMonth() + 1;
    let y = this.currentYear();
    if (m > 12) {
      m = 1;
      y++;
    }
    this.currentMonth.set(m);
    this.currentYear.set(y);
    this.load();
  }
}

import {
  Component,
  effect,
  input,
  ViewChild,
  ElementRef,
  afterNextRender,
  OnDestroy,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { THEME_CHANGE_EVENT } from '../core/theme.service.js';

Chart.register(...registerables);

function getThemeColors(): { textColor: string; gridColor: string; fontFamily: string } {
  const styles = getComputedStyle(document.documentElement);
  return {
    textColor: styles.getPropertyValue('--bt-chart-text').trim() || '#666',
    gridColor: styles.getPropertyValue('--bt-chart-grid').trim() || 'rgba(0,0,0,0.1)',
    fontFamily: styles.getPropertyValue('--bt-font-family').trim(),
  };
}

@Component({
  selector: 'app-chart',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: `
    :host {
      display: block;
      position: relative;
    }
    canvas {
      max-width: 100%;
    }
  `,
})
export default class ChartComponent implements OnDestroy {
  readonly type = input.required<'doughnut' | 'bar'>();
  readonly labels = input<string[]>([]);
  readonly datasets = input<ChartDataset[]>([]);
  readonly options = input<Record<string, unknown>>({});

  @ViewChild('canvas') canvasEl?: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;
  // Farben neu einlesen, wenn Hell/Dunkel oder das HA-Theme wechselt
  private readonly onThemeChange = () => this.render();

  constructor() {
    window.addEventListener(THEME_CHANGE_EVENT, this.onThemeChange);
    effect(() => {
      this.render();
    });
    afterNextRender(() => {
      this.render();
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener(THEME_CHANGE_EVENT, this.onThemeChange);
    this.chart?.destroy();
  }

  private render() {
    const canvas = this.canvasEl?.nativeElement;
    if (!canvas) return;
    this.chart?.destroy();

    const type = this.type();
    const labels = this.labels();
    const datasets = this.datasets().map((d) => ({
      label: d.label,
      data: d.data,
      backgroundColor: d.backgroundColor,
      borderColor: d.borderColor,
      borderWidth: d.borderWidth ?? 1,
    }));

    const theme = getThemeColors();
    if (theme.fontFamily) Chart.defaults.font.family = theme.fontFamily;

    const options: Record<string, unknown> = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: type === 'doughnut',
          position: 'bottom' as const,
          labels: {
            color: theme.textColor,
          },
        },
      },
      scales:
        type === 'bar'
          ? {
              x: {
                ticks: { color: theme.textColor },
                grid: { color: theme.gridColor },
              },
              y: {
                ticks: { color: theme.textColor },
                grid: { color: theme.gridColor },
              },
            }
          : undefined,
      ...this.options(),
    };

    this.chart = new Chart(canvas, {
      type,
      data: { labels, datasets },
      options,
    });
  }
}

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

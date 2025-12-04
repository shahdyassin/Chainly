import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexFill,
  ApexResponsive,
  ApexNonAxisChartSeries,
  ApexLegend,
  ApexYAxis,
  ApexGrid,
  ApexPlotOptions,
} from 'ng-apexcharts';
import { AuthService } from '../../../../core/services/auth.service';

interface Order {
  id: string;
  publicCode: string;
  status: string;
  createdAt?: string;
}

interface OrdersSummaryResponse {
  deliveredOrders: number;
  totalPlacedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  deliveredChangePercent?: number;
  totalPlacedChangePercent?: number;
  pendingChangePercent?: number;
  cancelledChangePercent?: number;
}

interface OrdersMonthlyStat {
  month: number;
  totalOrders: number;
}

interface MonthlySummaryLine {
  lineName: string;
  defectedPercentage: number;
  defectedCount: number;
  totalCount: number;
}

interface MonthlySummaryResponse {
  defectedPercentage: number;
  lines: MonthlySummaryLine[];
}

interface TopProductResponseItem {
  productName: string;
  inStock: number;
  increasePercent: number;
}

type LineChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  fill: ApexFill;
  grid: ApexGrid;
};

type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  responsive: ApexResponsive[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  colors: string[];
  dataLabels?: ApexDataLabels;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.scss',
  imports: [CommonModule, NgApexchartsModule],
})
export class HomeDashboard implements OnInit {
  userName = '';

  selectedDate: Date | null = null;
  todayLabel = '';

  hasOrders = false;
  hasMonthlyStats = false;
  hasRisingDemands = false;
  hasInsightsData = false;

  orders: Order[] = [];

  deliveredCount = 0;
  totalPlacedCount = 0;
  pendingCount = 0;
  cancelledCount = 0;

  deliveredChangePercent = 0;
  totalPlacedChangePercent = 0;
  pendingChangePercent = 0;
  cancelledChangePercent = 0;

  risingDemands: Array<{
    productName: string;
    stock: number;
    increasePercent: number;
  }> = [];

  overallDefectedPercent = 0;
  productionLines: Array<{
    name: string;
    percent: number;
    text: string;
  }> = [];

  totalOrdersChartOptions: LineChartOptions = {
    series: [{ name: 'Total Orders', data: [] }],
    chart: {
      type: 'bar',
      height: 260,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    xaxis: {
      categories: [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ],
      labels: {
        style: {
          colors: '#9ca3af',
          fontSize: '11px',
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      max: 900,
      tickAmount: 9,
      labels: {
        style: {
          colors: '#d1d5db',
          fontSize: '11px',
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'straight', width: 0 },
    fill: { opacity: 1 },
    grid: {
      borderColor: '#f3f4f6',
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
    },
  };

  insightsDonutOptions: DonutChartOptions = {
    series: [100],
    labels: ['Defected Products'],
    chart: {
      type: 'donut',
      height: 260,
    },
    legend: {
      show: false,
    },
    colors: ['#3CCFCF'],
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: {
              show: true,
              formatter: () => 'Defected Products',
              fontSize: '12px',
              color: '#111827',
            },
            value: {
              show: true,
              formatter: () => '0%',
              fontSize: '16px',
              fontWeight: 600,
              color: '#ef4444',
            },
            total: {
              show: false,
            },
          },
        },
      },
    },
    responsive: [
      {
        breakpoint: 600,
        options: {
          chart: { height: 220 },
        },
      },
    ],
  };

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.userName = this.auth.getCurrentUserName() || 'User';

    const today = new Date();
    this.selectedDate = today;
    this.todayLabel = this.formatDate(today);

    this.loadOrdersList();
    this.loadOrdersSummary();
    this.loadMonthlyStats();
    this.loadMonthlySummary();
    this.loadTopProducts();
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /* ========= API CALLS ========= */

  private loadOrdersList() {
    this.http
      .get<Order[] | { items?: Order[] }>(
        // لو شاكّة إن فيه داتا مش طالعة جرّبي تشيلي status=null & search=null
        'https://chainly.azurewebsites.net/api/Orders?pageNumber=1&pageSize=10'
      )
      .subscribe({
        next: (res) => {
          let items: Order[] = [];

          if (Array.isArray(res)) {
            items = res;
          } else if (res && Array.isArray(res.items)) {
            items = res.items;
          }

          this.orders = items;
          this.hasOrders = this.orders.length > 0;
        },
        error: () => {
          this.orders = [];
          this.hasOrders = false;
        },
      });
  }

  private loadOrdersSummary() {
    this.http
      .get<OrdersSummaryResponse>(
        'https://chainly.azurewebsites.net/api/Orders/summary'
      )
      .subscribe({
        next: (res) => {
          if (!res) return;

          this.deliveredCount = res.deliveredOrders ?? 0;
          this.totalPlacedCount = res.totalPlacedOrders ?? 0;
          this.pendingCount = res.pendingOrders ?? 0;
          this.cancelledCount = res.cancelledOrders ?? 0;

          this.deliveredChangePercent = res.deliveredChangePercent ?? 0;
          this.totalPlacedChangePercent = res.totalPlacedChangePercent ?? 0;
          this.pendingChangePercent = res.pendingChangePercent ?? 0;
          this.cancelledChangePercent = res.cancelledChangePercent ?? 0;
        },
        error: () => {
          this.deliveredCount = 0;
          this.totalPlacedCount = 0;
          this.pendingCount = 0;
          this.cancelledCount = 0;

          this.deliveredChangePercent = 0;
          this.totalPlacedChangePercent = 0;
          this.pendingChangePercent = 0;
          this.cancelledChangePercent = 0;
        },
      });
  }

  private loadMonthlyStats() {
    this.http
      .get<OrdersMonthlyStat[]>(
        'https://chainly.azurewebsites.net/api/Orders/monthly-stats'
      )
      .subscribe({
        next: (res) => {
          const stats = Array.isArray(res) ? res : [];
          const data = new Array(12).fill(0);

          stats.forEach((s) => {
            const idx = (s.month ?? 1) - 1;
            if (idx >= 0 && idx < 12) {
              data[idx] = s.totalOrders ?? 0;
            }
          });

          this.totalOrdersChartOptions = {
            ...this.totalOrdersChartOptions,
            series: [{ name: 'Total Orders', data }],
          };

          this.hasMonthlyStats = data.some((v) => v > 0);
        },
        error: () => {
          const zeros = new Array(12).fill(0);
          this.totalOrdersChartOptions = {
            ...this.totalOrdersChartOptions,
            series: [{ name: 'Total Orders', data: zeros }],
          };
          this.hasMonthlyStats = false;
        },
      });
  }

  private loadMonthlySummary() {
    this.http
      .get<MonthlySummaryResponse>(
        'https://chainly.azurewebsites.net/api/Reports/monthly-summary?pageNumber=1&pageSize=10'
      )
      .subscribe({
        next: (res) => {
          if (!res) {
            this.setInsightsEmpty();
            return;
          }

          const overall = res.defectedPercentage ?? 0;
          this.overallDefectedPercent = overall;
          this.hasInsightsData = overall > 0;

          this.insightsDonutOptions = {
            ...this.insightsDonutOptions,
            series: [100],
            plotOptions: {
              pie: {
                donut: {
                  size: '75%',
                  labels: {
                    show: true,
                    name: {
                      show: true,
                      formatter: () => 'Defected Products',
                      fontSize: '12px',
                      color: '#111827',
                    },
                    value: {
                      show: true,
                      formatter: () => `${overall}%`,
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#ef4444',
                    },
                    total: { show: false },
                  },
                },
              },
            },
          };

          const lines = (res.lines ?? []).slice(0, 2);
          if (!lines.length) {
            this.setInsightsEmpty();
            return;
          }

          this.productionLines = lines.map((l) => ({
            name: l.lineName,
            percent: l.defectedPercentage,
            text: `${l.defectedCount} out of ${l.totalCount} Defected`,
          }));
        },
        error: () => {
          this.setInsightsEmpty();
        },
      });
  }

  private setInsightsEmpty() {
    this.overallDefectedPercent = 0;
    this.hasInsightsData = false;

    this.insightsDonutOptions = {
      ...this.insightsDonutOptions,
      series: [100],
      plotOptions: {
        pie: {
          donut: {
            size: '75%',
            labels: {
              show: true,
              name: {
                show: true,
                formatter: () => 'Defected Products',
                fontSize: '12px',
                color: '#111827',
              },
              value: {
                show: true,
                formatter: () => '0%',
                fontSize: '16px',
                fontWeight: 600,
                color: '#ef4444',
              },
              total: { show: false },
            },
          },
        },
      },
    };

    this.productionLines = [
      {
        name: 'Production Line 01',
        percent: 0,
        text: '0 out of 0 Defected',
      },
    ];
  }

  private loadTopProducts() {
    this.http
      .get<TopProductResponseItem[] | { items?: TopProductResponseItem[] }>(
        'https://chainly.azurewebsites.net/api/Products/top/1'
      )
      .subscribe({
        next: (res) => {
          let items: TopProductResponseItem[] = [];

          if (Array.isArray(res)) {
            items = res;
          } else if (res && Array.isArray(res.items)) {
            items = res.items;
          }

          this.risingDemands = items.map((p) => ({
            productName: p.productName,
            stock: p.inStock,
            increasePercent: p.increasePercent,
          }));

          this.hasRisingDemands = this.risingDemands.length > 0;
        },
        error: () => {
          this.risingDemands = [];
          this.hasRisingDemands = false;
        },
      });
  }

  /* ========= UI HELPERS ========= */

  formatPercent(value: number): string {
    if (value === 0 || value === null || value === undefined) {
      return '0%';
    }
    const fixed = Number(value.toFixed(1));
    return `${fixed}%`;
  }

  openDatePicker(input: HTMLInputElement) {
    if ((input as any).showPicker) {
      (input as any).showPicker();
    } else {
      input.click();
    }
  }

  onDateChange(raw: string) {
    if (!raw) return;
    const d = new Date(raw);
    this.selectedDate = d;
    this.todayLabel = this.formatDate(d);
  }

  onViewAllDemands() {
    this.http
      .get(
        'https://demandforecasting.ambitioussky-2e6e4c68.eastus.azurecontainerapps.io/predict'
      )
      .subscribe();
  }

  onDemandItemClick(item: { productName: string }) {
    this.http
      .post(
        'https://demandforecasting.ambitioussky-2e6e4c68.eastus.azurecontainerapps.io/predict',
        { productName: item.productName }
      )
      .subscribe();
  }
}

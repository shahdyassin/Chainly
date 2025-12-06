import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  HostListener,
} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
  id: number;
  orderId: number;
  code: string;
  lastStatus: any;
  createdAt?: string;
}

interface OrdersListResponse {
  items?: Order[];
  totalPages?: number;
  totalCount?: number;
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
  imports: [CommonModule, NgApexchartsModule, FormsModule],
})
export class HomeDashboard implements OnInit, AfterViewInit {
  userName = '';

  // === Date picker state ===
  selectedDate: Date | null = null;
  todayLabel = '';

  // dropdowns
  isHeaderCalendarOpen = false;
  isInsightsCalendarOpen = false;
  isTotalOrdersCalendarOpen = false;

  calendarYearNum = 0;
  calendarMonthIndex = 0;
  calendarMonthName = '';
  calendarCells: ({ day: number; date: Date } | null)[] = [];

  monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  weekDaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // ===== FLAGS =====
  hasOrders = false;
  hasMonthlyStats = false;
  hasRisingDemands = false;
  hasInsightsData = false;

  // ===== DATA =====
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

  // ===== pagination =====
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // ===============================
  //       SEARCH + FILTER
  // ===============================

  searchText: string = '';
  searchTimeout: any;

  isFilterOpen = false;
  allStatuses: string[] = [];
  selectedStatuses: string[] = [];

  toggleFilterPopup() {
    this.isFilterOpen = !this.isFilterOpen;

    if (this.isFilterOpen && this.allStatuses.length === 0) {
      this.loadStatuses();
    }
  }

  private loadStatuses() {
    this.http
      .get<string[]>(
        'https://chainly.azurewebsites.net/api/Orders/statuses',
        this.getAuthOptions()
      )
      .subscribe({
        next: (res) => {
          this.allStatuses = Array.isArray(res) ? res : [];
        },
      });
  }

  onStatusToggle(status: string, event: any) {
    if (event.target.checked) {
      this.selectedStatuses.push(status);
    } else {
      this.selectedStatuses = this.selectedStatuses.filter((s) => s !== status);
    }
  }

  applyFilters() {
    this.isFilterOpen = false;
    this.loadOrdersList(1, this.searchText, this.selectedStatuses);
  }

  onSearchChange() {
    clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      this.loadOrdersList(1, this.searchText, this.selectedStatuses);
    }, 350);
  }

  // ===============================
  //          CHART OPTIONS
  // ===============================

  totalOrdersChartOptions: LineChartOptions = {
    series: [{ name: 'Total Orders', data: [] }],
    chart: {
      type: 'bar',
      height: 240,
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
      height: 230,
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
            total: { show: false },
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

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private elRef: ElementRef
  ) {}

  ngAfterViewInit(): void {
    this.removeWeirdCharactersInDom();
  }

  private removeWeirdCharactersInDom(): void {
    const badCharRegex = /[\u061C\u200E\u200F\u202A-\u202E\u00B1]/g;

    const walker = document.createTreeWalker(
      this.elRef.nativeElement,
      NodeFilter.SHOW_TEXT
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      if (badCharRegex.test(textNode.data)) {
        textNode.data = textNode.data.replace(badCharRegex, '');
      }
    }
  }

  ngOnInit(): void {
    this.userName = this.auth.getCurrentUserName() || 'User';

    const today = new Date();
    this.selectedDate = today;
    this.todayLabel = this.formatDate(today);
    this.buildCalendar(today.getFullYear(), today.getMonth());

    this.loadOrdersList(this.currentPage);
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

  // Calendar logic =========================

  private buildCalendar(year: number, month: number) {
    this.calendarYearNum = year;
    this.calendarMonthIndex = month;
    this.calendarMonthName = this.monthNames[month];

    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: ({ day: number; date: Date } | null)[] = [];

    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, date: new Date(year, month, d) });
    }

    this.calendarCells = cells;
  }

  toggleCalendar(which: 'header' | 'insights' | 'totalOrders') {
    const wasHeaderOpen = this.isHeaderCalendarOpen;
    const wasInsightsOpen = this.isInsightsCalendarOpen;
    const wasTotalOpen = this.isTotalOrdersCalendarOpen;

    this.isHeaderCalendarOpen = false;
    this.isInsightsCalendarOpen = false;
    this.isTotalOrdersCalendarOpen = false;

    if (which === 'header') this.isHeaderCalendarOpen = !wasHeaderOpen;
    if (which === 'insights') this.isInsightsCalendarOpen = !wasInsightsOpen;
    if (which === 'totalOrders')
      this.isTotalOrdersCalendarOpen = !wasTotalOpen;

    if (
      this.isHeaderCalendarOpen ||
      this.isInsightsCalendarOpen ||
      this.isTotalOrdersCalendarOpen
    ) {
      const base = this.selectedDate || new Date();
      this.buildCalendar(base.getFullYear(), base.getMonth());
    }
  }

  prevMonth() {
    let m = this.calendarMonthIndex - 1;
    let y = this.calendarYearNum;
    if (m < 0) {
      m = 11;
      y--;
    }
    this.buildCalendar(y, m);
  }

  nextMonth() {
    let m = this.calendarMonthIndex + 1;
    let y = this.calendarYearNum;
    if (m > 11) {
      m = 0;
      y++;
    }
    this.buildCalendar(y, m);
  }

  selectCalendarDate(date: Date) {
    this.selectedDate = date;
    this.todayLabel = this.formatDate(date);

    this.isHeaderCalendarOpen = false;
    this.isInsightsCalendarOpen = false;
    this.isTotalOrdersCalendarOpen = false;

    this.removeWeirdCharactersInDom();
  }

  private isSameDate(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  isToday(date: Date): boolean {
    return this.isSameDate(date, new Date());
  }

  isSelected(date: Date): boolean {
    return this.selectedDate
      ? this.isSameDate(date, this.selectedDate)
      : false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('.date-picker-wrapper')) return;
    if (target.closest('.orders-filter-btn')) return;
    if (target.closest('.filter-popup')) return;

    this.isHeaderCalendarOpen = false;
    this.isInsightsCalendarOpen = false;
    this.isTotalOrdersCalendarOpen = false;
    this.isFilterOpen = false;
  }

  // API =========================

  private getAuthOptions() {
    const token = this.auth.getAccessToken?.();
    if (!token) return {};
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  // ===== ORDERS LIST (WITH FILTERS) =====

  private loadOrdersList(
    page: number,
    search: string = '',
    statuses: string[] = []
  ) {
    this.currentPage = page;

    const statusQuery = statuses.length ? statuses.join(',') : '';

    const url =
      `https://chainly.azurewebsites.net/api/Orders?pageNumber=${page}` +
      `&pageSize=${this.pageSize}` +
      `&status=${statusQuery}` +
      `&search=${search}`;

    this.http
      .get<Order[] | OrdersListResponse>(url, this.getAuthOptions())
      .subscribe({
        next: (res) => {
          let items: Order[] = [];
          let totalPages = 1;
          let totalCount = 0;

          if (Array.isArray(res)) {
            items = res;
          } else if (res && Array.isArray(res.items)) {
            items = res.items;
            totalPages = res.totalPages ?? 1;
            totalCount = res.totalCount ?? items.length;
          }

          if (!res || (res as OrdersListResponse).totalPages == null) {
            totalPages = Math.max(
              1,
              Math.ceil(totalCount / this.pageSize)
            );
          }

          this.orders = items;
          this.hasOrders = items.length > 0;
          this.totalPages = Math.max(1, totalPages);
        },
        error: () => {
          this.orders = [];
          this.hasOrders = false;
          this.totalPages = 1;
        },
      });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage)
      return;

    this.loadOrdersList(page, this.searchText, this.selectedStatuses);
  }

  // ===== SUMMARY =====

  private loadOrdersSummary() {
    this.http
      .get<OrdersSummaryResponse>(
        'https://chainly.azurewebsites.net/api/Orders/summary',
        this.getAuthOptions()
      )
      .subscribe({
        next: (res) => {
          if (!res) return;

          this.deliveredCount = res.deliveredOrders ?? 0;
          this.totalPlacedCount = res.totalPlacedOrders ?? 0;
          this.pendingCount = res.pendingOrders ?? 0;
          this.cancelledCount = res.cancelledOrders ?? 0;

          this.deliveredChangePercent =
            res.deliveredChangePercent ?? 0;
          this.totalPlacedChangePercent =
            res.totalPlacedChangePercent ?? 0;
          this.pendingChangePercent =
            res.pendingChangePercent ?? 0;
          this.cancelledChangePercent =
            res.cancelledChangePercent ?? 0;
        },
        error: () => {
          this.deliveredCount =
            this.totalPlacedCount =
            this.pendingCount =
            this.cancelledCount =
              0;

          this.deliveredChangePercent =
            this.totalPlacedChangePercent =
            this.pendingChangePercent =
            this.cancelledChangePercent =
              0;
        },
      });
  }

  // ===== MONTHLY STATS =====

  private loadMonthlyStats() {
    const currentYear = new Date().getFullYear();

    this.http
      .get<OrdersMonthlyStat[]>(
        `https://chainly.azurewebsites.net/api/Orders/monthly-stats?year=${currentYear}`,
        this.getAuthOptions()
      )
      .subscribe({
        next: (res) => {
          const stats = Array.isArray(res) ? res : [];
          const data = new Array(12).fill(0);

          stats.forEach((s) => {
            const idx = (s.month ?? 1) - 1;
            if (idx >= 0 && idx < 12)
              data[idx] = s.totalOrders ?? 0;
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

  // ===== INSIGHTS =====

  private loadMonthlySummary() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const url =
      `https://chainly.azurewebsites.net/api/Reports/monthly-summary?month=${month}&year=${year}&pageNumber=1&pageSize=10`;

    this.http.get<MonthlySummaryResponse>(url, this.getAuthOptions()).subscribe({
      next: (res) => {
        if (!res) {
          this.setInsightsEmpty();
          return;
        }

        const overall = this.normalizeNumber(res.defectedPercentage);
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
        } else {
          this.productionLines = lines.map((l) => ({
            name: l.lineName,
            percent: this.normalizeNumber(l.defectedPercentage),
            text: `${this.normalizeNumber(
              l.defectedCount
            )} out of ${this.normalizeNumber(
              l.totalCount
            )} Defected`,
          }));
        }
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

  // ===== RISING DEMANDS =====

  private loadTopProducts() {
    this.http
      .get<TopProductResponseItem[] | { items?: TopProductResponseItem[] }>(
        'https://chainly.azurewebsites.net/api/Products/top/1',
        this.getAuthOptions()
      )
      .subscribe({
        next: (res) => {
          let items: TopProductResponseItem[] = [];

          if (Array.isArray(res)) items = res;
          else if (res && Array.isArray(res.items))
            items = res.items;

          this.risingDemands = items.map((p) => ({
            productName: String(p.productName || '').replace(
              /[\u061C\u200E\u200F\u202A-\u202E]/g,
              ''
            ),
            stock: this.normalizeNumber(p.inStock),
            increasePercent: this.normalizeNumber(
              p.increasePercent
            ),
          }));

          this.hasRisingDemands =
            this.risingDemands.length > 0;
        },
        error: () => {
          this.risingDemands = [];
          this.hasRisingDemands = false;
        },
      });
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

  // ===== PERCENT HELPERS =====

  getPercentClass(value: number | string | null | undefined): string {
    const num = this.normalizeNumber(value);

    if (!this.hasOrders && !this.hasMonthlyStats)
      return 'neutral';
    if (num > 0) return 'up';
    if (num < 0) return 'down';
    return 'neutral';
  }

  renderPercentNumber(value: number | string | null | undefined): string {
    const num = this.normalizeNumber(value);
    if (!num) return '0';

    const sign = num > 0 ? '+' : num < 0 ? '-' : '';
    return `${sign}${Math.abs(num).toFixed(1)}`;
  }

  renderPercent(value: number | string | null | undefined): string {
    const num = this.normalizeNumber(value);
    if (!num) return '0%';

    const sign = num > 0 ? '+' : num < 0 ? '-' : '';
    return `${sign}${Math.abs(num).toFixed(1)}%`;
  }

  // ===== STATUS HELPERS =====

  private normalizeStatus(status: any): string {
    if (status === null || status === undefined) return '';

    if (typeof status === 'object') {
      return String(
        status.name ??
          status.statusName ??
          status.value ??
          status.text ??
          ''
      ).trim();
    }

    return String(status).trim();
  }

  getStatusLabel(status: any): string {
    const raw = this.normalizeStatus(status);
    const lower = raw.toLowerCase();

    if (lower.includes('pending')) return 'Pending';
    if (lower.includes('intransit')) return 'In Transit';
    if (lower.includes('delivered')) return 'Delivered';
    if (lower.includes('cancelled') || lower.includes('canceled'))
      return 'Cancelled';

    return raw || 'Pending';
  }

  getStatusClass(status: any): string {
    const label = this.getStatusLabel(status).toLowerCase();

    if (label === 'pending') return 'pending';
    if (label === 'in transit') return 'shipped';
    if (label === 'delivered') return 'delivered';
    if (label === 'cancelled') return 'cancelled';

    return 'pending';
  }

  // ===== NORMALIZE NUMBER =====

  private normalizeNumber(value: any): number {
    if (value === null || value === undefined) return 0;

    if (typeof value === 'number') return value;

    const cleaned = String(value).replace(/[^\d.\-]/g, '');
    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? 0 : parsed;
  }
}

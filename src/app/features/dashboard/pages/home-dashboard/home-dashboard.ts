import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  deliveredOrdersChange: number;

  pendingOrders: number;
  pendingOrdersChange: number;

  cancelledOrders: number;
  cancelledOrdersChange: number;

  totalPlacedOrders: number;
  totalPlacedOrdersChange: number;
}

interface OrdersMonthlyStat {
  month: number;
  totalOrders: number;
}
interface OrdersMonthlyStatsResponse {
  year: number;
  monthly: number[];
  years: number[];
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
  id?: number;
  productId?: number;
  product_id?: number;
  productName: string;
  inStock: number;
  increasePercent: number;
}

/** شكل ريسبونس الـ /predict */
interface PredictionResponse {
  product_id: number;
  predicted_change_percentage: number;
  prediction_date: string;
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
  colors: string[];
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

/** option للفلتر */
interface StatusOption {
  key: string;
  apiValue: string;
  label: string;
}

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
  // Header
  headerDate: Date | null = null;
  headerLabel = '';

  // Total Orders
  totalOrdersDate: Date | null = null;
  totalOrdersLabel = '';

  // Insights
  insightsDate: Date | null = null;
  insightsLabel = '';

  isDeleteModalOpen = false;
  orderToDelete: Order | null = null;

  // dropdowns
  isHeaderCalendarOpen = false;
  isInsightsCalendarOpen = false;
  isTotalOrdersCalendarOpen = false;

  /** base URL بتاع demand forecasting */
  private demandApiBase =
    'https://demandforecasting.ambitioussky-2e6e4c68.eastus.azurecontainerapps.io';

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

  // Rising Demands items (مع productId علشان /predict)
  risingDemands: Array<{
    productId: number | string;
    productName: string;
    stock: number;
    increasePercent: number;
  }> = [];

  // Rising Demands slider
  itemsPerRisingSlide = 2;
  risingPageIndex = 0;

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

  get risingPagesTotal(): number {
    return this.risingDemands.length
      ? Math.ceil(this.risingDemands.length / this.itemsPerRisingSlide)
      : 0;
  }

  get risingPagesArray(): number[] {
    return Array.from({ length: this.risingPagesTotal }, (_, i) => i);
  }

  getCurrentRisingSlice() {
    const start = this.risingPageIndex * this.itemsPerRisingSlide;
    const end = start + this.itemsPerRisingSlide;
    return this.risingDemands.slice(start, end);
  }

  prevRisingPage() {
    if (this.risingPageIndex > 0) {
      this.risingPageIndex--;
    }
  }

  nextRisingPage() {
    if (this.risingPageIndex < this.risingPagesTotal - 1) {
      this.risingPageIndex++;
    }
  }

  goToRisingPage(index: number) {
    if (index < 0 || index >= this.risingPagesTotal) return;
    this.risingPageIndex = index;
  }

  // ===============================
  //       SEARCH + FILTER
  // ===============================

  searchText: string = '';
  searchTimeout: any;

  isFilterOpen = false;

  allStatuses: StatusOption[] = [];
  selectedStatusKeys: string[] = [];

  toggleFilterPopup() {
    this.isFilterOpen = !this.isFilterOpen;

    if (this.isFilterOpen && this.allStatuses.length === 0) {
      this.loadStatuses();
    }
  }

  private loadStatuses() {
    this.http
      .get<any[]>(
        'https://chainly.azurewebsites.net/api/Orders/statuses',
        this.getAuthOptions()
      )
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res) ? res : [];

          const map = new Map<string, StatusOption>();

          list.forEach((s) => {
            const key = this.getStatusKeyFromAny(s);
            const label = this.getStatusLabel(s);
            const apiValue = this.getStatusApiValue(s);

            if (!key || !label || !apiValue) return;

            if (!map.has(key)) {
              map.set(key, {
                key,
                apiValue,
                label,
              });
            }
          });

          this.allStatuses = Array.from(map.values());
        },
        error: () => {
          this.allStatuses = [];
        },
      });
  }

  isStatusSelected(key: string): boolean {
    return this.selectedStatusKeys.includes(key);
  }

  onStatusToggle(key: string, event: any) {
    const checked = !!event.target?.checked;

    if (checked) {
      if (!this.selectedStatusKeys.includes(key)) {
        this.selectedStatusKeys.push(key);
      }
    } else {
      this.selectedStatusKeys = this.selectedStatusKeys.filter(
        (k) => k !== key
      );
    }
  }

  applyFilters() {
    this.isFilterOpen = false;
    this.currentPage = 1;
    this.loadOrdersList(1, this.searchText, this.selectedStatusKeys);
  }
  onSearchChange() {
    clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      this.loadOrdersList(1, this.searchText, this.selectedStatusKeys);
    }, 350);
  }

  // ===============================
  //          CHART OPTIONS
  // ===============================

  totalOrdersChartOptions: LineChartOptions = {
    series: [{ name: 'Total Orders', data: [] }],
    chart: {
      type: 'bar',
      height: 350,
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
          fontSize: '13px',
          fontFamily:'Urbanist',
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
          fontSize: '13px',
          fontFamily:'Urbanist',
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
    colors: ['#3EA397'],
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
    private elRef: ElementRef,
    private router: Router
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

    this.headerDate = today;
    this.headerLabel = this.formatDate(today);

    this.totalOrdersDate = today;
    this.totalOrdersLabel = this.formatDate(today);

    this.insightsDate = today;
    this.insightsLabel = this.formatDate(today);

    this.buildCalendar(today.getFullYear(), today.getMonth());

    this.loadOrdersList(this.currentPage);
    this.loadOrdersSummary();
    this.loadMonthlyStats();
    this.loadMonthlySummary();
    this.loadTopProducts(2);
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
    if (which === 'totalOrders') this.isTotalOrdersCalendarOpen = !wasTotalOpen;

    if (
      this.isHeaderCalendarOpen ||
      this.isInsightsCalendarOpen ||
      this.isTotalOrdersCalendarOpen
    ) {
      let base: Date;

      if (this.isHeaderCalendarOpen) {
        base = this.headerDate || new Date();
      } else if (this.isTotalOrdersCalendarOpen) {
        base = this.totalOrdersDate || new Date();
      } else {
        base = this.insightsDate || new Date();
      }

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

  // Header
  selectHeaderDate(date: Date) {
    this.headerDate = date;
    this.headerLabel = this.formatDate(date);

    this.isHeaderCalendarOpen = false;
    this.removeWeirdCharactersInDom();
  }

  // Total Orders
  selectTotalOrdersDate(date: Date) {
    this.totalOrdersDate = date;
    this.totalOrdersLabel = this.formatDate(date);

    this.isTotalOrdersCalendarOpen = false;
    this.removeWeirdCharactersInDom();

    this.loadMonthlyStats(date.getFullYear());
  }

  // Insights
  selectInsightsDate(date: Date) {
    this.insightsDate = date;
    this.insightsLabel = this.formatDate(date);

    this.isInsightsCalendarOpen = false;
    this.removeWeirdCharactersInDom();
  }

  isHeaderSelected(date: Date): boolean {
    return this.headerDate ? this.isSameDate(date, this.headerDate) : false;
  }

  isTotalOrdersSelected(date: Date): boolean {
    return this.totalOrdersDate
      ? this.isSameDate(date, this.totalOrdersDate)
      : false;
  }

  isInsightsSelected(date: Date): boolean {
    return this.insightsDate
      ? this.isSameDate(date, this.insightsDate)
      : false;
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
    page: number = 1,
    search: string = '',
    statusKeys: string[] = []
  ) {
    this.currentPage = page;

    const trimmedSearch = (search || '').trim();
    const encodedSearch = encodeURIComponent(trimmedSearch);

    let url = `https://chainly.azurewebsites.net/api/Orders?pageNumber=1&pageSize=1000&search=${encodedSearch}`;

    this.http
      .get<OrdersListResponse>(url, this.getAuthOptions())
      .subscribe({
        next: (res) => {
          let allItems: Order[] = res?.items || [];

          if (trimmedSearch) {
            const lower = trimmedSearch.toLowerCase();
            allItems = allItems.filter(
              (item) =>
                String(item.orderId).includes(lower) ||
                item.code?.toLowerCase().includes(lower)
            );
          }

          if (statusKeys.length > 0) {
            const wanted = new Set(statusKeys);
            allItems = allItems.filter((item) => {
              const key = this.getStatusKeyFromAny(item.lastStatus);
              return wanted.has(key);
            });
          }

          const start = (page - 1) * this.pageSize;
          const end = start + this.pageSize;
          this.orders = allItems.slice(start, end);

          this.totalPages = Math.ceil(allItems.length / this.pageSize) || 1;
          this.hasOrders = this.orders.length > 0;

          if (page > this.totalPages && this.totalPages > 0) {
            this.currentPage = this.totalPages;
            this.loadOrdersList(
              this.currentPage,
              this.searchText,
              this.selectedStatusKeys
            );
          }
        },
        error: (err) => {
          console.error('Error:', err);
          this.orders = [];
          this.hasOrders = false;
          this.totalPages = 1;
        },
      });
  }
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage)
      return;
    this.loadOrdersList(page, this.searchText, this.selectedStatusKeys);
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

          this.deliveredChangePercent = res.deliveredOrdersChange ?? 0;
          this.totalPlacedChangePercent = res.totalPlacedOrdersChange ?? 0;
          this.pendingChangePercent = res.pendingOrdersChange ?? 0;
          this.cancelledChangePercent = res.cancelledOrdersChange ?? 0;
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

  private loadMonthlyStats(year?: number) {
    const targetYear =
      year ?? this.totalOrdersDate?.getFullYear() ?? new Date().getFullYear();

    const url = `https://chainly.azurewebsites.net/api/Orders/monthly-stats?year=${targetYear}`;

    this.http
      .get<OrdersMonthlyStatsResponse>(url, this.getAuthOptions())
      .subscribe({
        next: (res) => {
          const data = new Array(12).fill(0);
          const monthly = Array.isArray(res?.monthly) ? res.monthly : [];

          monthly.forEach((value, index) => {
            if (index >= 0 && index < 12) {
              data[index] = this.normalizeNumber(value);
            }
          });

          this.totalOrdersChartOptions = {
            ...this.totalOrdersChartOptions,
            series: [
              {
                name: 'Total Orders',
                data,
              },
            ],
          };

          this.hasMonthlyStats = data.some((v) => v > 0);
        },
        error: (err) => {
          console.error('monthly-stats error', err);
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

    const url = `https://chainly.azurewebsites.net/api/Reports/monthly-summary?month=${month}&year=${year}&pageNumber=1&pageSize=10`;

    this.http
      .get<MonthlySummaryResponse>(url, this.getAuthOptions())
      .subscribe({
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
              )} out of ${this.normalizeNumber(l.totalCount)} Defected`,
            }));
          }
        },
        error: () => this.setInsightsEmpty(),
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

  // تحميل أول N برودكت في البداية
  private loadTopProducts(count: number = 2) {
    const url = `https://chainly.azurewebsites.net/api/Products/top/${count}`;

    this.http
      .get<TopProductResponseItem[] | { items?: TopProductResponseItem[] }>(
        url,
        this.getAuthOptions()
      )
      .subscribe({
        next: (res) => {
          let rawList: any[] = [];

          if (Array.isArray(res)) rawList = res;
          else if (res && Array.isArray(res.items)) rawList = res.items;

          this.risingDemands = this.mapProductsToRising(rawList);
          this.hasRisingDemands = this.risingDemands.length > 0;
          this.risingPageIndex = 0;
        },
        error: () => {
          this.risingDemands = [];
          this.hasRisingDemands = false;
          this.risingPageIndex = 0;
        },
      });
  }

  // "View all" → يجيب أول 10 products من الـ Products
  onViewAllDemands() {
    const url =
      'https://chainly.azurewebsites.net/api/Products?pageNumber=1&pageSize=10&search=';

    this.http
      .get<{ items?: any[] } | any[]>(url, this.getAuthOptions())
      .subscribe({
        next: (res) => {
          let list: any[] = [];

          if (Array.isArray(res)) list = res;
          else if (res && Array.isArray(res.items)) list = res.items;

          this.risingDemands = this.mapProductsToRising(list);
          this.hasRisingDemands = this.risingDemands.length > 0;
          this.risingPageIndex = 0;
        },
        error: (err) => {
          console.error('load products for rising demands error', err);
        },
      });
  }

  // كليك على البرودكت → نداء demand forecasting
  onDemandItemClick(item: { productId: number | string; productName: string }) {
    const body = { product_id: item.productId };

    this.http
      .post<PredictionResponse>(`${this.demandApiBase}/predict`, body)
      .subscribe({
        next: (res) => {
          console.log('Demand forecast result:', res);

          const newPercent = this.normalizeNumber(
            res?.predicted_change_percentage
          );

          // نحدّث نفس العنصر في الـ UI مباشرة
          this.risingDemands = this.risingDemands.map((p) =>
            p.productId === item.productId
              ? { ...p, increasePercent: newPercent }
              : p
          );
        },
        error: (err) => {
          console.error('Demand forecast error:', err);
        },
      });
  }

  // ===== PERCENT HELPERS =====

   getPercentClass(value: number | string | null | undefined): string {
    const num = this.normalizeNumber(value);

    if (!this.hasOrders && !this.hasMonthlyStats) return 'neutral';
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

  /** هيلبر مخصوص لرزينج ديماندز عشان الأيقونة واللون */
   getDemandTrendClass(value: number | string | null | undefined): string {
    const num = this.normalizeNumber(value);
    if (num > 0) return 'demand-up'; // أخضر + أيقونة up
    if (num < 0) return 'demand-down'; // أحمر + أيقونة down
    return 'demand-neutral'; // رمادي
  }

   getDemandDirection(value: number | string | null | undefined): 'increase' | 'decrease' | 'stable' {
    const num = this.normalizeNumber(value);
    if (num > 0) return 'increase';
    if (num < 0) return 'decrease';
    return 'stable';
  }

   getDemandAbsPercent(value: number | string | null | undefined): string {
    const num = this.normalizeNumber(value);
    return Math.abs(num).toFixed(1);
  }

  /** ✅ الجملة الكاملة اللي تحت التريند من غير إشارة السالب */
  getDemandSentence(value: number | string | null | undefined): string {
    const direction = this.getDemandDirection(value);

    if (direction === 'stable') {
      return 'The demand is expected to remain stable tomorrow';
    }

    const percent = this.getDemandAbsPercent(value); // دايمًا رقم موجب
    return `The demand is expected to ${direction} by ${percent}% tomorrow`;
  }

  // ===== STATUS HELPERS =====

  private normalizeStatus(status: any): string {
    if (status === null || status === undefined) return '';

    if (typeof status === 'object') {
      return String(
        status.label ??
          status.name ??
          status.statusName ??
          status.text ??
          status.title ??
          ''
      ).trim();
    }

    return String(status).trim();
  }

  private getStatusKeyFromAny(status: any): string {
    if (!status) return 'unknown';

    let text = '';

    if (typeof status === 'object') {
      text = (
        status.label ||
        status.name ||
        status.text ||
        status.title ||
        status.status ||
        status.statusName ||
        ''
      )
        .toString()
        .trim();
    } else {
      text = String(status).trim();
    }

    const clean = text.toLowerCase().replace(/[^a-z]/g, '').trim();

    if (clean.includes('intransit') || clean.includes('transit'))
      return 'intransit';
    if (clean.includes('pending')) return 'pending';
    if (clean.includes('deliver')) return 'delivered';
    if (clean.includes('cancel')) return 'cancelled';
    if (clean.includes('ship')) return 'shipped';

    return 'pending';
  }

  private getStatusApiValue(status: any): string {
    if (!status) return '';

    if (typeof status === 'object') {
      return String(
        status.value ??
          status.id ??
          status.key ??
          status.code ??
          status.statusId ??
          status.status ??
          status.name ??
          status.label ??
          ''
      ).trim();
    }

    return String(status).trim();
  }

  getStatusLabel(status: any): string {
    const raw = this.normalizeStatus(status);
    const lower = raw.toLowerCase();

    if (lower.includes('pending')) return 'Pending';
    if (lower.includes('intransit')) return 'InTransit';
    if (lower.includes('shipped')) return 'Shipped';
    if (lower.includes('delivered')) return 'Delivered';
    if (lower.includes('cancelled') || lower.includes('canceled'))
      return 'Cancelled';

    return raw || 'Pending';
  }

  getStatusClass(status: any): string {
    const key = this.getStatusKeyFromAny(status);

    if (key === 'pending') return 'pending';
    if (key === 'intransit') return 'intransit';
    if (key === 'shipped') return 'shipped';
    if (key === 'delivered') return 'delivered';
    if (key === 'cancelled') return 'cancelled';

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

  private mapProductsToRising(
    list: any[]
  ): {
    productId: number | string;
    productName: string;
    stock: number;
    increasePercent: number;
  }[] {
    const badCharRegex = /[\u061C\u200E\u200F\u202A-\u202E]/g;

    return (list || []).map((p) => {
      const name = (p.productName ?? p.name ?? p.title ?? '') as string;

      const inStock =
        p.inStock ?? p.stock ?? p.quantityInStock ?? p.currentStock ?? 0;

      const inc =
        p.increasePercent ??
        p.predicted_change_percentage ?? // لو جاية من الـ predict ومخزنة في الـ API
        p.expectedIncreasePercent ??
        p.forecastIncrease ??
        0;

      const id = p.product_id ?? p.productId ?? p.id ?? p.code ?? name;

      return {
        productId: id,
        productName: String(name || '').replace(badCharRegex, ''),
        stock: this.normalizeNumber(inStock),
        increasePercent: this.normalizeNumber(inc),
      };
    });
  }

  // ===== NAVIGATION TO ORDERS TAB =====

  onViewAllOrders() {
    this.router.navigate(['/orders']);
  }

  onViewOrder(order: Order) {
    this.router.navigate(['/orders'], {
      queryParams: { orderId: order.orderId, mode: 'view' },
    });
  }

  onEditOrder(order: Order) {
    this.router.navigate(['/orders'], {
      queryParams: { orderId: order.orderId, mode: 'edit' },
    });
  }

  openDeleteModal(order: Order) {
    this.orderToDelete = order;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.orderToDelete = null;
  }

  confirmDelete() {
    if (!this.orderToDelete) {
      return;
    }

    const orderKey = this.orderToDelete.id;

    this.http
      .delete(`https://chainly.azurewebsites.net/api/Orders/${orderKey}`, {
        ...this.getAuthOptions(),
        responseType: 'text' as 'json',
      })
      .subscribe({
        next: () => {
          this.isDeleteModalOpen = false;
          this.orderToDelete = null;

          this.loadOrdersList(
            this.currentPage,
            this.searchText,
            this.selectedStatusKeys
          );
          this.loadOrdersSummary();
          this.loadMonthlyStats();
        },
        error: (err) => {
          console.error('delete order error', err);
          this.isDeleteModalOpen = false;
          this.orderToDelete = null;
        },
      });
    console.log('orderToDelete', this.orderToDelete);
  }
}

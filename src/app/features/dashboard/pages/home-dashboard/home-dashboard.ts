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
  /** key موحّد نفلتر بيه في الفرونت: pending / intransit / ... */
  key: string;
  /** القيمة الحقيقية اللى بتتبعت للـ API (id / value / status...) */
  apiValue: string;
  /** النص اللى يظهر للمستخدم */
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

  /** كل الستاتس من الـ API */
  allStatuses: StatusOption[] = [];

  /** الـ keys المختارة حالياً (pending / intransit / ...) */
  selectedStatusKeys: string[] = [];

  toggleFilterPopup() {
    this.isFilterOpen = !this.isFilterOpen;

    if (this.isFilterOpen && this.allStatuses.length === 0) {
      this.loadStatuses();
    }
  }

  // نجلب الستاتس من الـ API ونحوّلها لـ {key, apiValue, label}
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
            const key = this.getStatusKeyFromAny(s); // pending / intransit ...
            const label = this.getStatusLabel(s); // Pending / InTransit ...
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

  // ⬆️ Header
  this.headerDate = today;
  this.headerLabel = this.formatDate(today);

  // ⬆️ Total Orders
  this.totalOrdersDate = today;
  this.totalOrdersLabel = this.formatDate(today);

  // ⬆️ Insights
  this.insightsDate = today;
  this.insightsLabel = this.formatDate(today);

  this.buildCalendar(today.getFullYear(), today.getMonth());

  this.loadOrdersList(this.currentPage);
  this.loadOrdersSummary();
  this.loadMonthlyStats();    // يعتمد على totalOrdersDate (هنعدّله تحت)
  this.loadMonthlySummary();  // Insights
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
  if (which === 'totalOrders') this.isTotalOrdersCalendarOpen = !wasTotalOpen;

  if (this.isHeaderCalendarOpen || this.isInsightsCalendarOpen || this.isTotalOrdersCalendarOpen) {
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

  // الجراف يعتمد على سنة Total Orders بس
  this.loadMonthlyStats(date.getFullYear());
}

// Insights (زي ما كتبناه قبل كده)
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
  return this.totalOrdersDate ? this.isSameDate(date, this.totalOrdersDate) : false;
}

isInsightsSelected(date: Date): boolean {
  return this.insightsDate ? this.isSameDate(date, this.insightsDate) : false;
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

  // isSelected(date: Date): boolean {
  //   return this.selectedDate ? this.isSameDate(date, this.selectedDate) : false;
  // }

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

  // نجيب كل الأوردرات بدون أي فلتر status من الـ API عشان نضمن إن كل حاجة تيجي
  let url = `https://chainly.azurewebsites.net/api/Orders?pageNumber=1&pageSize=1000&search=${encodedSearch}`;

  this.http.get<OrdersListResponse>(url, this.getAuthOptions()).subscribe({
    next: (res) => {
      let allItems: Order[] = res?.items || [];

      // 1. فلترة البحث
      if (trimmedSearch) {
        const lower = trimmedSearch.toLowerCase();
        allItems = allItems.filter(item =>
          String(item.orderId).includes(lower) ||
          item.code?.toLowerCase().includes(lower)
        );
      }

      // 2. فلترة الستاتس (الآن شغالة 100% بفضل الدالة الجديدة)
      if (statusKeys.length > 0) {
        const wanted = new Set(statusKeys);
        allItems = allItems.filter(item => {
          const key = this.getStatusKeyFromAny(item.lastStatus);
          return wanted.has(key);
        });
      }

      // 3. Pagination يدوي بعد الفلترة
      const start = (page - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.orders = allItems.slice(start, end);

      this.totalPages = Math.ceil(allItems.length / this.pageSize) || 1;
      this.hasOrders = this.orders.length > 0;

      // لو الصفحة الحالية أكبر من المتاح → نروح للصفحة الأخيرة
      if (page > this.totalPages && this.totalPages > 0) {
        this.currentPage = this.totalPages;
        this.loadOrdersList(this.currentPage, this.searchText, this.selectedStatusKeys);
      }
    },
    error: (err) => {
      console.error('Error:', err);
      this.orders = [];
      this.hasOrders = false;
      this.totalPages = 1;
    }
  });
}
 goToPage(page: number) {
  if (page < 1 || page > this.totalPages || page === this.currentPage) return;
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

        // الأعداد
        this.deliveredCount     = res.deliveredOrders        ?? 0;
        this.totalPlacedCount   = res.totalPlacedOrders      ?? 0;
        this.pendingCount       = res.pendingOrders          ?? 0;
        this.cancelledCount     = res.cancelledOrders        ?? 0;

        // النِسَب (Changes)
        this.deliveredChangePercent   = res.deliveredOrdersChange      ?? 0;
        this.totalPlacedChangePercent = res.totalPlacedOrdersChange    ?? 0;
        this.pendingChangePercent     = res.pendingOrdersChange        ?? 0;
        this.cancelledChangePercent   = res.cancelledOrdersChange      ?? 0;
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

 // ===== MONTHLY STATS =====
private loadMonthlyStats(year?: number) {
  // لو مبعوتش سنة استخدم:
  // 1) selectedDate لو موجودة
  // 2) أو السنة الحالية
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
  // ✅ دايماً الشهر الحالي
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const url =
    `https://chainly.azurewebsites.net/api/Reports/monthly-summary?month=${month}&year=${year}&pageNumber=1&pageSize=10`;

  this.http.get<MonthlySummaryResponse>(url, this.getAuthOptions())
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

 // تحميل الـ top products مرة واحدة عند فتح الصفحة (زي ما هو)
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
        else if (res && Array.isArray(res.items)) items = res.items;

        this.risingDemands = items.map((p) => ({
          productName: String(p.productName || '').replace(
            /[\u061C\u200E\u200F\u202A-\u202E]/g,
            ''
          ),
          stock: this.normalizeNumber(p.inStock),
          increasePercent: this.normalizeNumber(p.increasePercent),
        }));

        this.hasRisingDemands = this.risingDemands.length > 0;
      },
      error: () => {
        this.risingDemands = [];
        this.hasRisingDemands = false;
      },
    });
}

// الزرار "View all" → يعيد نداء نفس الـ API ويلمّ التحديثات
onViewAllDemands() {
  this.loadTopProducts();
}

// كليك على البرودكت → نداء demand forecasting
onDemandItemClick(item: { productName: string }) {
  this.http
    .post(
      'https://demandforecasting.ambitioussky-2e6e4c68.eastus.azurecontainerapps.io/predict',
      { productName: item.productName }
    )
    .subscribe({
      next: (res) => {
        // هنا لو حابة تعملي console.log أو popup بالنتيجة
        console.log('Demand forecast result:', res);
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

  // ===== STATUS HELPERS =====

  /** string موحدة من أي شكل للستاتس */
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

  /** key ثابت نستخدمه في الفلتر: pending / shipped / intransit / delivered / cancelled */
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
    ).toString().trim();
  } else {
    text = String(status).trim();
  }

  const clean = text.toLowerCase().replace(/[^a-z]/g, '').trim();

  // ✅ IMPORTANT: InTransit must come BEFORE shipped
  if (clean.includes('intransit') || clean.includes('transit')) return 'intransit';
  if (clean.includes('pending')) return 'pending';
  if (clean.includes('deliver')) return 'delivered';
  if (clean.includes('cancel')) return 'cancelled';
  if (clean.includes('ship')) return 'shipped';

  return 'pending';
}

  /** القيمة الحقيقية للـ API من كائن الستاتس */
 private getStatusApiValue(status: any): string {
  if (!status) return '';

  if (typeof status === 'object') {
    // جرب كل الحقول الممكنة
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

  if (key === 'pending')   return 'pending';
  if (key === 'intransit') return 'intransit';   // 👈 لوحدها
  if (key === 'shipped')   return 'shipped';     // 👈 لوحدها
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
}

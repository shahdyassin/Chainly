import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../../../core/services/reports.service';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ProductionLinesService, ProductionLine } from '../../../../core/services/production-lines.service';


interface InsightItem {
  reportId: number;
  productionLineName: string;
  totalProducts: number;
  defectiveRatio: number;
  defectiveProducts: number;
  goodRatio: number;
  goodProducts: number;
  startedAt: string;
  endedAt?: string | null;
}

@Component({
  selector: 'app-insights-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './insights-report.html',
  styleUrl: './insights-report.scss',
})
export class InsightsReport implements OnInit {

  private route = inject(ActivatedRoute);
  private reportsService = inject(ReportsService);

  summary: any;

  productionLineId!: number;


  searchText = '';


  insights: InsightItem[] = [];


  pageNumber = 1;
  pageSize = 10;
  totalPages = 1;
  totalCount = 0;


  goodRatio = 0;
  badRatio = 0;


  radius = 80;
  fullCircumference = 2 * Math.PI * this.radius;


  gaugeLength = this.fullCircumference * 0.75;

  goodDash = this.gaugeLength * (this.goodRatio / 100);
  badDash = this.gaugeLength * (this.badRatio / 100);


  lastReportDate: Date | null = null;

  showDeleteModal = false;
  selectedInsight: InsightItem | null = null;


  showFilterModal = false;

  isStartCalendarOpen = false;
  isEndCalendarOpen = false;

  startDateLabel = 'Set Start Date';
  endDateLabel = 'Set End Date';

  startDate: Date | null = null;
  endDate: Date | null = null;

  filterStartDate: string | null = null;
  filterEndDate: string | null = null;

  calendarYearNum = 0;
  calendarMonthIndex = 0;
  calendarMonthName = '';
  calendarCells: ({ day: number; date: Date } | null)[] = [];

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  weekDaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];



  private router = inject(Router);
  private productionLinesService = inject(ProductionLinesService);

  productionLines: ProductionLine[] = [];
  currentIndex = -1;

  readonly ARC_LENGTH = 251.2;

  ngOnInit(): void {

    this.route.paramMap.subscribe(params => {

      this.productionLineId = Number(params.get('id'));


      this.currentIndex = this.productionLines.findIndex(
        x => x.id === this.productionLineId
      );


      if (!this.productionLines.length) {
        this.loadProductionLines();
      } else {
        this.loadInsights();
      }

    });
  }


  loadInsights() {

    this.reportsService
      .getProductionLineReport(
        this.productionLineId,
        this.pageNumber,
        this.pageSize,
        this.filterStartDate ?? undefined,
        this.filterEndDate ?? undefined
      )

      .pipe(
        catchError((err) => {
          return of({
            summary: null,
            items: [],
            totalCount: 0,
            totalPages: 1
          });
        })
      )

      .subscribe((res) => {

        if (!res) return;

        this.summary = res.summary;
        this.insights = res.items || [];

        if (this.insights.length) {

          const sorted = [...this.insights].sort(
            (a, b) =>
              new Date(b.endedAt || b.startedAt).getTime() -
              new Date(a.endedAt || a.startedAt).getTime()
          );

          const latest = sorted[0].endedAt || sorted[0].startedAt;
          this.lastReportDate = this.parseApiDate(latest);
        }

        this.totalCount = res.totalCount ?? 0;
        this.totalPages = res.totalPages ?? 1;

        this.goodRatio = this.summary?.goodRatio ?? 0;
        this.badRatio = this.summary?.defectiveRatio ?? 0;

      });
  }

  loadProductionLines() {
    this.productionLinesService.getAll(1, 1000).subscribe(res => {

      this.productionLines = res.items || [];

      this.currentIndex = this.productionLines.findIndex(
        x => x.id === this.productionLineId
      );

      this.loadInsights();
    });
  }

  goPreviousLine() {
    if (this.currentIndex > 0) {
      const prev = this.productionLines[this.currentIndex - 1];
      this.router.navigate(
        ['/dashboard/production-lines', prev.id, 'report']
      );
    }
  }

  goNextLine() {
    if (this.currentIndex < this.productionLines.length - 1) {
      const next = this.productionLines[this.currentIndex + 1];
      this.router.navigate(
        ['/dashboard/production-lines', next.id, 'report']
      );
    }
  }


  onSearchChange(value: string) {
    this.searchText = value;
    this.pageNumber = 1;
    this.loadInsights();
  }


  formatDate(dateStr: string | null | undefined): string {

    if (!dateStr) return '';

    const cleaned = dateStr.replace('.', '');

    const [datePart, timePart] = cleaned.split(' - ');

    const [day, month, year] = datePart.split(' ');

    const monthMap: any = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };

    let hour = Number(timePart.split(':')[0]);
    let minute = Number(timePart.slice(3, 5));
    const ampm = timePart.slice(5);

    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const date = new Date(
      Number(year),
      monthMap[month],
      Number(day),
      hour,
      minute
    );

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ' - ' +
      date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
  }


  get startIndex(): number {
    return (this.pageNumber - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(
      this.pageNumber * this.pageSize,
      this.totalCount
    );
  }

  get pagesArray(): (number | string)[] {
    const pages: (number | string)[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  isNumber(value: any): boolean {
    return typeof value === 'number';
  }

  goToPage(p: number | string) {
    if (typeof p !== 'number') return;

    if (p < 1 || p > this.totalPages || p === this.pageNumber) return;

    this.pageNumber = p;
    this.loadInsights();
  }

  prevPage() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadInsights();
    }
  }

  nextPage() {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadInsights();
    }
  }

  getStrokeDash(ratio: number): string {
    const filled = (ratio / 100) * this.ARC_LENGTH;
    return `${filled} ${this.ARC_LENGTH}`;
  }

  getStrokeOffset(goodRatio: number): string {
    const offset = (goodRatio / 100) * this.ARC_LENGTH;
    return `-${offset}`;
  }

  openDeleteModal(item: InsightItem) {
    this.selectedInsight = item;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedInsight = null;
  }

  confirmDeleteInsight() {
    if (!this.selectedInsight) return;

    this.reportsService.deleteReport(this.selectedInsight.reportId)
      .subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadInsights();
        }
      });
  }
  parseApiDate(dateStr: string | null | undefined): Date | null {

    if (!dateStr) return null;


    const cleaned = dateStr.replace('.', '');

    const parts = cleaned.split(' - ');

    if (parts.length !== 2) return null;

    const datePart = parts[0];
    const timePart = parts[1];

    const [day, month, year] = datePart.split(' ');

    const monthMap: any = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };

    let [time, ampm] = [timePart.slice(0, 5), timePart.slice(5)];

    let [hour, minute] = time.split(':').map(Number);

    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    return new Date(
      Number(year),
      monthMap[month],
      Number(day),
      hour,
      minute
    );
  }

  toggleCalendar(type: 'start' | 'end') {

    if (type === 'start') {

      this.isStartCalendarOpen = !this.isStartCalendarOpen;
      this.isEndCalendarOpen = false;

      if (this.isStartCalendarOpen) {
        const base = this.startDate ?? new Date();
        this.buildCalendar(base.getFullYear(), base.getMonth());
      }

    } else {

      this.isEndCalendarOpen = !this.isEndCalendarOpen;
      this.isStartCalendarOpen = false;

      if (this.isEndCalendarOpen) {
        const base = this.endDate ?? new Date();
        this.buildCalendar(base.getFullYear(), base.getMonth());
      }

    }
  }

  buildCalendar(year: number, month: number) {

    this.calendarYearNum = year;
    this.calendarMonthIndex = month;
    this.calendarMonthName = this.monthNames[month];

    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: ({ day: number, date: Date } | null)[] = [];

    for (let i = 0; i < startWeekday; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, date: new Date(year, month, d) });
    }

    this.calendarCells = cells;
  }

  prevMonth() {
    let m = this.calendarMonthIndex - 1;
    let y = this.calendarYearNum;

    if (m < 0) { m = 11; y--; }

    this.buildCalendar(y, m);
  }

  nextMonth() {
    let m = this.calendarMonthIndex + 1;
    let y = this.calendarYearNum;

    if (m > 11) { m = 0; y++; }

    this.buildCalendar(y, m);
  }

  selectStartDate(date: Date) {

    if (this.endDate && date > this.endDate) return;

    this.startDate = date;

    const localStart = new Date(date);
    localStart.setHours(0, 0, 0, 0);

    this.filterStartDate = localStart.toISOString();

    this.startDateLabel = this.formatDateDisplay(date);
    this.isStartCalendarOpen = false;
  }

  selectEndDate(date: Date) {

    if (this.startDate && date < this.startDate) return;

    this.endDate = date;

    const localEnd = new Date(date);
    localEnd.setHours(23, 59, 59, 999);

    this.filterEndDate = localEnd.toISOString();

    this.endDateLabel = this.formatDateDisplay(date);
    this.isEndCalendarOpen = false;
  }

  formatDateDisplay(date: Date) {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  applyFilters() {
    this.pageNumber = 1;
    this.loadInsights();
    this.showFilterModal = false;
  }

  get hasActiveFilters(): boolean {
    return (
      this.filterStartDate !== null ||
      this.filterEndDate !== null
    );
  }

  clearFilters() {

    this.filterStartDate = null;
    this.filterEndDate = null;

    this.startDate = null;
    this.endDate = null;

    this.startDateLabel = 'Set Start Date';
    this.endDateLabel = 'Set End Date';

    this.pageNumber = 1;

    this.loadInsights();
  }

  formatLineName(text: string): string {

    if (!text) return '';

    const [name, number] = text.split('_');

    return `<span class="line-name">${name}</span>_<span class="line-number">${number}</span>`;
  }

  hasUnderscore(text: string | undefined): boolean {
    return !!text && text.includes('_');
  }

  getLineName(text: string | undefined): string {
    if (!text) return '';
    return text.split('_')[0];
  }

  getLineNumber(text: string | undefined): string {
    if (!text || !text.includes('_')) return '';
    return text.split('_')[1];
  }
}

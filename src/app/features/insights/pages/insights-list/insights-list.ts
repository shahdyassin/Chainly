import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HostListener } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { InsightsService, ReportItem } from '../../../../core/services/insights.service';
import { ProductionLinesService, ProductionLine } from '../../../../core/services/production-lines.service';

@Component({
  selector: 'app-insights-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './insights-list.html',
  styleUrl: './insights-list.scss',
})
export class InsightsList implements OnInit {

  insights: ReportItem[] = [];

  searchText = '';
  pageNumber = 1;
  pageSize = 10;
  totalPages = 1;
  totalCount = 0;

  loading = false;
  showFilterModal = false;


  selectedProductionLineId: number | null = null;
  filterStartDate: string | null = null;
  filterEndDate: string | null = null;

  showPLDropdown = false;
  productionLines: ProductionLine[] = [];


  isStartCalendarOpen = false;
  isEndCalendarOpen = false;

  startDateLabel = 'Set Start Date';
  endDateLabel = 'Set End Date';

  startDate: Date | null = null;
  endDate: Date | null = null;

  calendarYearNum = 0;
  calendarMonthIndex = 0;
  calendarMonthName = '';
  calendarCells: ({ day: number; date: Date } | null)[] = [];

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  weekDaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  private searchSubject = new Subject<string>();

  constructor(
    private insightsService: InsightsService,
    private productionLinesService: ProductionLinesService
  ) { }

  ngOnInit() {
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(value => {
        this.searchText = value;
        this.pageNumber = 1;
        this.loadInsights();
      });

    this.loadInsights();
    this.loadProductionLines();
  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    const clickedInsideCalendar =
      target.closest('.calendar-dropdown') ||
      target.closest('.date-pill');

    if (!clickedInsideCalendar) {
      this.isStartCalendarOpen = false;
      this.isEndCalendarOpen = false;
    }
  }


  loadInsights() {
    this.loading = true;

    this.insightsService
      .getReports(
        this.pageNumber,
        this.pageSize,
        this.searchText,
        this.selectedProductionLineId,
        this.filterStartDate,
        this.filterEndDate
      )
      .subscribe({
        next: (res) => {
          this.insights = res.items;
          this.totalCount = res.totalCount;
          this.totalPages = res.totalPages;
          this.pageNumber = res.pageNumber;
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  loadProductionLines() {
    this.productionLinesService.getAll(1, 1000)
      .subscribe(res => this.productionLines = res.items);
  }



  onSearchChange(value: string) {
    this.searchSubject.next(value);
  }



  togglePLDropdown() {
    this.showPLDropdown = !this.showPLDropdown;
  }

  selectProductionLine(item: ProductionLine) {
    this.selectedProductionLineId = item.id;
    this.showPLDropdown = false;
  }

  getSelectedProductionLineName(): string {
    const found = this.productionLines.find(x => x.id === this.selectedProductionLineId);
    return found ? found.lineName : 'Select Production Line';
  }



  applyFilters() {
    this.pageNumber = 1;
    this.loadInsights();
    this.showFilterModal = false;
  }



  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.pageNumber = p;
      this.loadInsights();
    }
  }

  nextPage() {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadInsights();
    }
  }

  prevPage() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadInsights();
    }
  }

  get startIndex(): number {
    return (this.pageNumber - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.pageSize, this.totalCount);
  }

  get pagesArray(): (number | string)[] {
    const pages: (number | string)[] = [];

    if (this.totalPages <= 7) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (this.pageNumber > 3) pages.push('...');
      const start = Math.max(2, this.pageNumber - 1);
      const end = Math.min(this.totalPages - 1, this.pageNumber + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (this.pageNumber < this.totalPages - 2) pages.push('...');
      pages.push(this.totalPages);
    }

    return pages;
  }

  isNumber(value: number | string): value is number {
    return typeof value === 'number';
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

    const cells: ({ day: number; date: Date } | null)[] = [];

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

  private formatDateDisplay(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDate(value: string | null): string {
    if (!value) return '';
    return value;
  }

  clearFilters() {

    this.selectedProductionLineId = null;

    this.filterStartDate = null;
    this.filterEndDate = null;

    this.startDate = null;
    this.endDate = null;

    this.startDateLabel = 'Set Start Date';
    this.endDateLabel = 'Set End Date';

    this.pageNumber = 1;

    this.loadInsights();
  }

  get hasActiveFilters(): boolean {
    return (
      this.selectedProductionLineId !== null ||
      this.filterStartDate !== null ||
      this.filterEndDate !== null
    );
  }
}

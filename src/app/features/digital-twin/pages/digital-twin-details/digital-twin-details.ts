import { Component, inject, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DigitalTwinService } from '../../../../core/services/digital-twin.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { Subject, takeUntil } from 'rxjs';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { getDatabase, ref, onChildAdded } from 'firebase/database'

interface Line {
  id: number;
  name: string;
  status: 'Active' | 'Inactive';
  reportId?: number;
}

@Component({
  selector: 'app-digital-twin-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './digital-twin-details.html',
  styleUrls: ['./digital-twin-details.scss']
})
export class DigitalTwinDetails implements OnInit, OnDestroy {
  private digitalTwinService = inject(DigitalTwinService);
  private realtime = inject(RealtimeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private destroy$ = new Subject<void>();
  private currentLineId: number | null = null;
  private realtimeInitialized = false;
  private zone = inject(NgZone);
  private firebase = inject(FirebaseService)


  lines: Line[] = [];
  currentIndex = 0;
  sessionActive = false;
  status = 'Inactive';
  summary: any;
  reports: any[] = [];
  selectedReport: any = null;


  totalProducts = 0;
  flawlessProducts = 0;
  defectedProducts = 0;
  goodRatio = 0;
  badRatio = 0;


  pageNumber = 1;
  pageSize = 5;
  totalCount = 0;
  totalPages = 0;
  ARC_LENGTH = 251.2;


  showDeleteModal = false;
  showFilterModal = false;
  isStartCalendarOpen = false;
  isEndCalendarOpen = false;
  startDateLabel = 'Set Start Date';
  endDateLabel = 'Set End Date';
  startDate: Date | null = null;
  endDate: Date | null = null;


  calendarYearNum = 0;
  calendarMonthIndex = 0;
  calendarMonthName = '';
  calendarCells: ({ day: number, date: Date } | null)[] = [];
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  weekDaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  constructor() {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  async ngOnInit() {

    this.summary = { productionLineName: history.state?.productionLineName };
    const routeId = Number(this.route.snapshot.paramMap.get('id'));
    const stateLines = history.state?.lines;
    if (stateLines?.length) {
      this.lines = stateLines;
      this.initRouting();
    } else {
      this.digitalTwinService.getProductionLines(1, 100, '').subscribe((res: any) => {
        this.lines = res.items.map((item: any) => ({
          id: item.productionLineId,
          name: item.productionLineName,
          status: item.active ? 'Active' : 'Inactive'
        }));
        this.initRouting();
      });
    }

    this.realtime.onProductUpdate$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.zone.run(() => {
          this.flawlessProducts = data.goodCount;
          this.defectedProducts = data.defectCount;
          this.totalProducts = data.totalCount;
          if (data.totalCount > 0) {
            this.goodRatio = Math.round((data.goodCount / data.totalCount) * 100);
            this.badRatio = Math.round((data.defectCount / data.totalCount) * 100);
          }
          this.sendToSimulation(data.isDefect ?? false)
        });
      });
  }

  private initRouting() {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.handleRoute(params);
    });
  }

  async handleRoute(params: any) {
    const routeId = Number(params.get('id'));
    this.currentIndex = this.lines.findIndex(l => l.id === routeId);
    if (this.currentIndex === -1) return;

    const current = this.lines[this.currentIndex];

    const authData = localStorage.getItem('chainly-auth');
    const token = authData ? JSON.parse(authData).token : null;

    if (!token) return;


    this.digitalTwinService
      .getReportsByLine(current.id, 1, 1)
      .subscribe(async (res: any) => {

        console.log("response : ", res.items)

        const runningReport = res.items?.find((r: any) => r.endedAt === null);

        if (runningReport) {

          this.sessionActive = true;
          this.status = 'Active';

          const reportId = runningReport.reportId;

          current.reportId = reportId;
          this.listenToFirebase(reportId.toString())
          localStorage.setItem(`report_${current.id}`, reportId.toString());

          const reportDetails: any = await this.digitalTwinService
            .getReportDetails(reportId)
            .toPromise();

          this.applySummary(reportDetails?.summary ?? reportDetails);

          const productionLineId =
            reportDetails.productionLineId ||
            reportDetails.productionLine?.id;

          await this.realtime.startConnection(token);

          await this.realtime.joinLine(productionLineId);
          this.currentLineId = productionLineId;

          this.loadSessionData();

        } else {

          this.sessionActive = false;
          this.status = 'Inactive';

          localStorage.removeItem(`report_${current.id}`);
        }

      });
  }


  listenToFirebase(reportId: string) {
  const db = getDatabase()
  const reportRef = ref(db, reportId)

  onChildAdded(reportRef, (snapshot) => {
    const data = snapshot.val()

    console.log('firebase Received:', data)

    this.sendToSimulation(data.defect)
  })
}


// testUnity() {
//   (window as any).unityInstance.SendMessage(
//     'BoxSpawner',
//     'ReceiveBox',
//     'true'
//   )
// }



  // listenToRealtime() {
  //
  //   this.realtime.onProductUpdate((data: any) => {
  //     console.log('--- SignalR Message Received ---', data);

  //
  //     this.zone.run(() => {
  //       this.flawlessProducts = data.goodCount;
  //       this.defectedProducts = data.defectCount;
  //       this.totalProducts = data.totalCount;

  //
  //       if (data.totalCount > 0) {
  //         this.goodRatio = Math.round((data.goodCount / data.totalCount) * 100);
  //         this.badRatio = Math.round((data.defectCount / data.totalCount) * 100);
  //       }

  //       console.log('UI Updated with:', {
  //         total: this.totalProducts,
  //         good: this.flawlessProducts,
  //         bad: this.defectedProducts
  //       });
  //     });
  //   });
  // }

  toggleSession() {
    const currentLine = this.lines[this.currentIndex];
    if (!currentLine?.id) return;

    if (!this.sessionActive) {
      this.digitalTwinService.startSession(currentLine.id).subscribe({
        next: async (res: any) => {


          this.sessionActive = true;
          this.status = 'Active';

          const reportId = +res.report_id;
          currentLine.reportId = reportId;
          this.listenToFirebase(reportId.toString())

          localStorage.setItem(`report_${currentLine.id}`, reportId.toString());


          const reportDetails: any = await this.digitalTwinService
            .getReportDetails(reportId)
            .toPromise();

          this.applySummary(reportDetails?.summary ?? reportDetails);

          const productionLineId =
            reportDetails.productionLineId ||
            reportDetails.productionLine?.id;

          const authData = localStorage.getItem('chainly-auth');
          const token = authData ? JSON.parse(authData).token : null;
          if (token) {
            await this.realtime.startConnection(token);
          }


          if (this.currentLineId && this.currentLineId !== productionLineId) {
            await this.realtime.leaveLine(this.currentLineId);
          }


          await this.realtime.joinLine(productionLineId);
          this.currentLineId = productionLineId;

          console.log('JOINED AFTER START:', productionLineId);

          this.loadSessionData();
        }
      });
    } else {
      const reportId = currentLine.reportId || localStorage.getItem(`report_${currentLine.id}`);
      this.digitalTwinService.stopSession(Number(reportId)).subscribe({
        next: async () => {
          this.sessionActive = false;
          this.status = 'Inactive';
          localStorage.removeItem(`report_${currentLine.id}`);
          if (this.currentLineId) {
            await this.realtime.leaveLine(this.currentLineId);
            this.currentLineId = null;
          }
          this.resetStats();
          this.digitalTwinService.updateSessionState(currentLine.id, false);
        }
      });
    }
  }

  loadSessionData() {
    const current = this.lines[this.currentIndex];
    const savedReportId = localStorage.getItem(`report_${current.id}`);
    const resolvedReportId =
      current.reportId ??
      (savedReportId ? Number(savedReportId) : undefined);

    if (resolvedReportId) {
      current.reportId = resolvedReportId;
      this.digitalTwinService.getReportDetails(resolvedReportId).subscribe({
        next: (report: any) => {
          this.applySummary(report?.summary ?? report);
          this.loadReportsPage(current.id, true);
        },
        error: () => {
          this.loadReportsPage(current.id, false);
        }
      });
      return;
    }

    this.loadReportsPage(current.id, false);
  }

  private loadReportsPage(lineId: number, skipSummaryFallback: boolean) {
    this.digitalTwinService.getReportsByLine(lineId, this.pageNumber, this.pageSize)
      .subscribe((res: any) => {
        this.reports = res.items;
        this.totalCount = res.totalCount;
        this.totalPages = res.totalPages;

        if (!skipSummaryFallback) {
          this.applySummary(res.summary);
        }
      });
  }

  private applySummary(summary: any) {
    this.totalProducts = summary?.totalProducts ?? 0;
    this.flawlessProducts = summary?.goodProducts ?? 0;
    this.defectedProducts = summary?.defectiveProducts ?? 0;
    this.goodRatio = summary?.goodRatio ?? 0;
    this.badRatio = summary?.defectiveRatio ?? 0;
  }


  get productionLineName(): string {
    return this.lines[this.currentIndex]?.name || '';
  }

  getLineName(text: string): string {
    return text ? text.split('_')[0] : '';
  }

  getLineNumber(text: string): string {
    return text?.includes('_') ? text.split('_')[1] : '';
  }

  hasUnderscore(text: string): boolean {
    return !!text && text.includes('_');
  }

  getStrokeDash(ratio: number) {
    const filled = (ratio / 100) * this.ARC_LENGTH;
    return `${filled} ${this.ARC_LENGTH}`;
  }

  getStrokeOffset(goodRatio: number) {
    const offset = (goodRatio / 100) * this.ARC_LENGTH;
    return `-${offset}`;
  }


  goPreviousLine() {
    if (this.currentIndex > 0) this.navigateToLine(this.lines[this.currentIndex - 1]);
  }

  goNextLine() {
    if (this.currentIndex < this.lines.length - 1) this.navigateToLine(this.lines[this.currentIndex + 1]);
  }


  get hasPrevActive(): boolean {
    return this.currentIndex > 0;
  }

  get hasNextActive(): boolean { return this.currentIndex < this.lines.length - 1; }

  private navigateToLine(line: any) {
    this.router.navigate(['/dashboard/digital-twin', line.id], {
      state: { productionLineName: line.name, lines: this.lines, status: line.status }
    });
  }


  openDeleteModal(item: any) {
    this.selectedReport = item;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedReport = null;
  }

  confirmDelete() {
    this.closeDeleteModal();
  }

  formatDate(dateStr: any): string {
    if (!dateStr) return '';
    const date = new Date(dateStr.replace('.', ''));
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' - ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }


  get pagedReports() { return this.reports; }
  get startIndex() { return (this.pageNumber - 1) * this.pageSize; }
  get endIndex() { return Math.min(this.pageNumber * this.pageSize, this.totalCount); }
  get pagesArray() { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.pageNumber = p;
    this.loadSessionData();
  }
  prevPage() { if (this.pageNumber > 1) this.goToPage(this.pageNumber - 1); }
  nextPage() { if (this.pageNumber < this.totalPages) this.goToPage(this.pageNumber + 1); }


  toggleCalendar(type: 'start' | 'end') {
    if (type === 'start') { this.isStartCalendarOpen = !this.isStartCalendarOpen; this.isEndCalendarOpen = false; }
    else { this.isEndCalendarOpen = !this.isEndCalendarOpen; this.isStartCalendarOpen = false; }
    const base = new Date();
    this.buildCalendar(base.getFullYear(), base.getMonth());
  }

  buildCalendar(year: number, month: number) {
    this.calendarYearNum = year;
    this.calendarMonthIndex = month;
    this.calendarMonthName = this.monthNames[month];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });
    this.calendarCells = cells;
  }

  prevMonth() { this.calendarMonthIndex === 0 ? this.buildCalendar(this.calendarYearNum - 1, 11) : this.buildCalendar(this.calendarYearNum, this.calendarMonthIndex - 1); }
  nextMonth() { this.calendarMonthIndex === 11 ? this.buildCalendar(this.calendarYearNum + 1, 0) : this.buildCalendar(this.calendarYearNum, this.calendarMonthIndex + 1); }

  selectStartDate(date: Date) { this.startDate = date; this.startDateLabel = date.toLocaleDateString('en-GB'); this.isStartCalendarOpen = false; }
  selectEndDate(date: Date) { this.endDate = date; this.endDateLabel = date.toLocaleDateString('en-GB'); this.isEndCalendarOpen = false; }

  applyFilters() { this.showFilterModal = false; }
  clearFilters() { this.startDate = null; this.endDate = null; this.startDateLabel = 'Set Start Date'; this.endDateLabel = 'Set End Date'; }
  get hasActiveFilters(): boolean { return this.startDate !== null || this.endDate !== null; }

  private resetStats() {
    this.totalProducts = 0; this.flawlessProducts = 0; this.defectedProducts = 0;
    this.goodRatio = 0; this.badRatio = 0; this.reports = [];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();


    const current = this.lines[this.currentIndex];
    if (this.currentLineId) {
      this.realtime.leaveLine(this.currentLineId);
    }
  }

  sendToSimulation(defect: boolean) {
    const currentLine = this.lines[this.currentIndex]
    if (!currentLine?.reportId) {
      console.warn('No reportId')
      return
    }
    const reportId = currentLine.reportId.toString()
    this.firebase.sendBox(reportId, defect)
    if ((window as any).unityInstance) {
      (window as any).unityInstance.SendMessage(
        'BoxSpawner',
        'ReceiveBox',
        defect.toString()
      )
    }
    console.log('Sending to Unity:', defect)
    console.log('unityInstance:', (window as any).unityInstance)
  }

}

import { Component, inject, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'

interface Line {
  id: number
  name: string
  status: 'Active' | 'Inactive'
}

@Component({
  selector: 'app-digital-twin-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './digital-twin-details.html',
  styleUrls: ['./digital-twin-details.scss']
})
export class DigitalTwinDetails implements OnInit {

  status = 'Active'
  ngOnInit() {

    // this.status = history.state?.status || 'Active'

    const stateLines = history.state?.lines as any[]

    if (stateLines) {
      this.lines = stateLines
    } else {
      this.lines = [
        { id: 1, name: 'Production Line 01', status: 'Active' },
        { id: 2, name: 'Production Line 02', status: 'Active' },
        { id: 3, name: 'Production Line 03', status: 'Inactive' },
        { id: 4, name: 'Production Line 04', status: 'Active' },
        { id: 5, name: 'Production Line 05', status: 'Inactive' },
        { id: 6, name: 'Production Line 06', status: 'Active' },
        { id: 7, name: 'Production Line 07', status: 'Inactive' },
        { id: 8, name: 'Production Line 08', status: 'Active' },
        { id: 9, name: 'Production Line 09', status: 'Inactive' },
        { id: 10, name: 'Production Line 10', status: 'Active' },
        { id: 11, name: 'Production Line 11', status: 'Inactive' }
      ];
    }

    this.route.paramMap.subscribe(params => {

      const idParam = params.get('id')

      if (idParam) {

        const id = Number(idParam)

        this.currentIndex = this.lines.findIndex(l => l.id === id)

        if (this.currentIndex !== -1) {
          this.status = this.lines[this.currentIndex].status
        }

      }

    });
  }

  private router = inject(Router)
  private route = inject(ActivatedRoute)

  pageNumber = 1
  pageSize = 5


  showDeleteModal = false
  showFilterModal = false

  isStartCalendarOpen = false
  isEndCalendarOpen = false

  startDateLabel = 'Set Start Date'
  endDateLabel = 'Set End Date'

  startDate: Date | null = null
  endDate: Date | null = null

  calendarYearNum = 0
  calendarMonthIndex = 0
  calendarMonthName = ''

  calendarCells: ({ day: number, date: Date } | null)[] = []

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  weekDaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  selectedReport: any = null

  lines: Line[] = []

  currentIndex = 0

  sessionActive = false

  totalProducts = 300
  flawlessProducts = 210
  defectedProducts = 90

  goodRatio = 70
  badRatio = 30

  ARC_LENGTH = 251.2

  reports = [
    {
      totalProducts: 300,
      defectiveRatio: 30,
      defectiveProducts: 90,
      goodRatio: 70,
      goodProducts: 210,
      startedAt: '10:43 02 Feb',
      endedAt: '10:43 02 Feb'
    }
  ]

  totalCount = this.reports.length
  totalPages = Math.ceil(this.totalCount / this.pageSize)


  openDeleteModal(item: any) {
    this.selectedReport = item
    this.showDeleteModal = true
  }

  closeDeleteModal() {
    this.showDeleteModal = false
    this.selectedReport = null
  }

  confirmDelete() {
    console.log('delete report', this.selectedReport)
    this.closeDeleteModal()
  }

  toggleSession() {
    this.sessionActive = !this.sessionActive
  }

  goPreviousLine() {

    if (this.currentIndex > 0) {
      this.navigateToLine(this.lines[this.currentIndex - 1])
    }

  }

  goNextLine() {

    if (this.currentIndex < this.lines.length - 1) {
      this.navigateToLine(this.lines[this.currentIndex + 1])
    }

  }


  private navigateToLine(line: any) {
    this.router.navigate(['/dashboard/digital-twin', line.id], {
      state: {
        productionLineName: line.name,
        lines: this.lines,
        status: line.status
      }
    });
  }

  get hasPrevActive(): boolean {
    return this.currentIndex > 0
  }

  get hasNextActive(): boolean {
    return this.currentIndex < this.lines.length - 1
  }

  getStrokeDash(ratio: number) {

    const filled = (ratio / 100) * this.ARC_LENGTH

    return `${filled} ${this.ARC_LENGTH}`

  }

  getStrokeOffset(goodRatio: number) {

    const offset = (goodRatio / 100) * this.ARC_LENGTH

    return `-${offset}`

  }

  get productionLineName(): string {

    if (!this.lines.length) return ''

    return this.lines[this.currentIndex]?.name || ''

  }


  get lineText(): string {

    const match = this.productionLineName.match(/(.*?)(\d+)$/)

    return match ? match[1] : this.productionLineName

  }

  get lineNumber(): string {

    const match = this.productionLineName.match(/(\d+)$/)

    return match ? match[1] : ''

  }

  toggleCalendar(type: 'start' | 'end') {

    if (type === 'start') {
      this.isStartCalendarOpen = !this.isStartCalendarOpen
      this.isEndCalendarOpen = false
    } else {
      this.isEndCalendarOpen = !this.isEndCalendarOpen
      this.isStartCalendarOpen = false
    }

    const base = new Date()
    this.buildCalendar(base.getFullYear(), base.getMonth())

  }

  buildCalendar(year: number, month: number) {

    this.calendarYearNum = year
    this.calendarMonthIndex = month
    this.calendarMonthName = this.monthNames[month]

    const firstDay = new Date(year, month, 1)
    const startWeekday = firstDay.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: any[] = []

    for (let i = 0; i < startWeekday; i++) cells.push(null)

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, date: new Date(year, month, d) })
    }

    this.calendarCells = cells
  }

  prevMonth() {
    let m = this.calendarMonthIndex - 1
    let y = this.calendarYearNum
    if (m < 0) { m = 11; y-- }
    this.buildCalendar(y, m)
  }

  nextMonth() {
    let m = this.calendarMonthIndex + 1
    let y = this.calendarYearNum
    if (m > 11) { m = 0; y++ }
    this.buildCalendar(y, m)
  }

  selectStartDate(date: Date) {

    if (this.endDate && date > this.endDate) {
      return
    }

    this.startDate = date
    this.startDateLabel = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    this.isStartCalendarOpen = false
  }

  selectEndDate(date: Date) {

    if (this.startDate && date < this.startDate) {
      return
    }

    this.endDate = date
    this.endDateLabel = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    this.isEndCalendarOpen = false
  }

  applyFilters() {
    console.log('filter', this.startDate, this.endDate)
    this.showFilterModal = false
  }

  clearFilters() {
    this.startDate = null
    this.endDate = null
    this.startDateLabel = 'Set Start Date'
    this.endDateLabel = 'Set End Date'
  }

  get hasActiveFilters(): boolean {
    return this.startDate !== null || this.endDate !== null
  }

  formatDate(dateStr: string | null | undefined): string {

    if (!dateStr) return ''

    const cleaned = dateStr.replace('.', '')

    const [datePart, timePart] = cleaned.split(' ')

    const date = new Date(`${datePart} ${timePart}`)

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ' - ' +
      date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
  }

  get pagedReports() {
    const start = (this.pageNumber - 1) * this.pageSize
    return this.reports.slice(start, start + this.pageSize)
  }

  get startIndex(): number {
    return (this.pageNumber - 1) * this.pageSize
  }

  get endIndex(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalCount)
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1)
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages) return
    this.pageNumber = p
  }

  prevPage() {
    if (this.pageNumber > 1) this.pageNumber--
  }

  nextPage() {
    if (this.pageNumber < this.totalPages) this.pageNumber++
  }
}

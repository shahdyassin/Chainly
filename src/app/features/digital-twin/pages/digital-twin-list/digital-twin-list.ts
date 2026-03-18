import { Component, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms'
import { ProductionLine, ProductionLinesService } from '../../../../core/services/production-lines.service'
import { Router } from '@angular/router'
import { DigitalTwinService } from '../../../../core/services/digital-twin.service'


interface Line {
  name: string
  description?: string
  status: 'Active' | 'Inactive'
  session: boolean
  id?: number
  reportId?: number
  error?: string
}

@Component({
  selector: 'app-digital-twin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './digital-twin-list.html',
  styleUrl: './digital-twin-list.scss'
})
export class DigitalTwinList {
  private router = inject(Router)
  private fb = inject(FormBuilder)
  private api = inject(ProductionLinesService)
  private digitalTwinService = inject(DigitalTwinService)

  errorMessage = ''
  lines: any[] = []
  totalCount = 0
  totalPages = 0
  searchText = ''

  pageNumber = 1
  pageSize = 10

  isAddEditOpen = false
  mode: 'add' | 'edit' = 'add'
  selected: Line | null = null

  form = this.fb.group({
    lineName: [''],
    description: ['']
  })

  ngOnInit() {
    this.loadLines()

    this.digitalTwinService.sessionState$.subscribe(state => {
      if (!state) return

      const line = this.lines.find(l => l.id === state.id)
      if (line) {
        line.session = state.active
        line.status = state.active ? 'Active' : 'Inactive'
      }
    })
  }

  openAdd() {
    this.mode = 'add'
    this.form.reset()
    this.isAddEditOpen = true
  }

  openEdit(line: Line) {
    this.mode = 'edit'
    this.selected = line

    this.form.patchValue({
      lineName: line.name,
      description: line.description || ''
    })

    this.isAddEditOpen = true
  }

  confirmAddEdit() {

    const payload = {
      lineName: this.form.value.lineName!,
      description: this.form.value.description ?? null
    }

    if (this.mode === 'add') {

      this.api.create(payload).subscribe(() => {
        this.isAddEditOpen = false
        this.loadLines()
      })

    } else if (this.selected?.id) {

      this.api.update(this.selected.id, payload).subscribe(() => {
        this.isAddEditOpen = false
        this.loadLines()
      })

    }

  }

  isDeleteOpen = false

  openDelete(line: Line) {
    this.selected = line
    this.isDeleteOpen = true
  }

  confirmDelete() {

    if (this.selected?.id) {

      this.api.delete(this.selected.id).subscribe(() => {
        this.isDeleteOpen = false
        this.loadLines()
      })

    }

  }

  closeAddEdit() {
    this.isAddEditOpen = false
  }

  closeDelete() {
    this.isDeleteOpen = false
  }



  onSearch() {
    this.pageNumber = 1
    this.loadLines()
  }

  nextPage() {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++
      this.loadLines()
    }
  }

  prevPage() {
    if (this.pageNumber > 1) {
      this.pageNumber--
      this.loadLines()
    }
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.pageNumber = p
      this.loadLines()
    }
  }

  toggleSession(line: Line, event: any) {

    const checked = event.target.checked

    line.error = ''

    if (!line.id) return


    if (checked) {

      this.digitalTwinService.startSession(line.id).subscribe({
        next: (res: any) => {
          line.session = true
          line.status = 'Active'

          line.reportId = +res?.report_id

          localStorage.setItem(`report_${line.id}`, line.reportId.toString())

          this.digitalTwinService.updateSessionState(line.id!, true)
        },

        error: (err) => {


          line.error = err?.error || 'Session already running'


          line.session = false
          event.target.checked = false

          line.status = 'Inactive'

          setTimeout(() => {
            line.error = ''
          }, 2000)
        }

      })

    }


    else {

      if (!line.reportId) {

        line.session = true
        event.target.checked = true
        return
      }

      this.digitalTwinService.stopSession(line.reportId).subscribe({

        next: () => {
          line.session = false
          line.status = 'Inactive'

          localStorage.removeItem(`report_${line.id}`)

          this.digitalTwinService.updateSessionState(line.id!, false)

        },

        error: (err) => {


          console.error(err)


          line.session = true
          event.target.checked = true
        }

      })

    }
  }

  loadLines() {

    this.digitalTwinService
      .getProductionLines(this.pageNumber, this.pageSize, this.searchText)
      .subscribe((res: any) => {
        this.lines = res.items.map((item: any) => {

          const savedReportId = localStorage.getItem(`report_${item.productionLineId}`)

          return {
            id: item.productionLineId,
            name: item.productionLineName,
            description: item.productionLineDescription,
            status: item.active ? 'Active' : 'Inactive',
            session: item.active,
            reportId: savedReportId ? +savedReportId : undefined
          }
        })

        this.totalCount = res.totalCount
        this.totalPages = res.totalPages

      })


  }


 openDetails(line: Line) {
  this.router.navigate(
    ['/dashboard/digital-twin', line.id],
    {
      state: {
        productionLineName: line.name,
        lines: this.lines,
        status: line.status,
        session: line.session,
        reportId: line.reportId 
      }
    }
  )
}

}

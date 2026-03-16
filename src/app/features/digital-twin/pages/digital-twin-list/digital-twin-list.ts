import { Component, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms'
import { ProductionLine, ProductionLinesService } from '../../../../core/services/production-lines.service'
import { Router } from '@angular/router'
interface Line {
  name: string
  status: 'Active' | 'Inactive'
  session: boolean
  id?: number
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
      description: ''
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
      })

    } else if (this.selected?.id) {

      this.api.update(this.selected.id, payload).subscribe(() => {
        this.isAddEditOpen = false
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
      })

    }

  }

  closeAddEdit() {
    this.isAddEditOpen = false
  }

  closeDelete() {
    this.isDeleteOpen = false
  }

  get totalPages() {
    return Math.ceil(this.lines.length / this.pageSize)
  }

  get pagedLines() {
    const start = (this.pageNumber - 1) * this.pageSize
    return this.lines.slice(start, start + this.pageSize)
  }

  get startIndex() {
    return (this.pageNumber - 1) * this.pageSize
  }

  get endIndex() {
    return Math.min(this.startIndex + this.pageSize, this.lines.length)
  }

  nextPage() {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++
    }
  }

  prevPage() {
    if (this.pageNumber > 1) {
      this.pageNumber--
    }
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.pageNumber = p
    }
  }

  toggleSession(line: Line) {
    line.session = !line.session
    line.status = line.session ? 'Active' : 'Inactive'
  }

  lines: Line[] = [

    { id: 1, name: 'Production Line 01', status: 'Active', session: true },
    { id: 2, name: 'Production Line 02', status: 'Active', session: true },
    { id: 3, name: 'Production Line 03', status: 'Inactive', session: false },
    { id: 4, name: 'Production Line 04', status: 'Active', session: true },
    { id: 5, name: 'Production Line 05', status: 'Active', session: true },
    { id: 6, name: 'Production Line 06', status: 'Active', session: true },
    { id: 7, name: 'Production Line 07', status: 'Active', session: true },
    { id: 8, name: 'Production Line 08', status: 'Inactive', session: false },
    { id: 9, name: 'Production Line 09', status: 'Active', session: true },
    { id: 10, name: 'Production Line 10', status: 'Active', session: true },
    { id: 11, name: 'Production Line 11', status: 'Active', session: true }

  ]

  openDetails(line: Line) {

    this.router.navigate(
      ['/dashboard/digital-twin', line.id],
      {
        state: {
          productionLineName: line.name,
          lines: this.lines
        }
      }
    )

  }

}

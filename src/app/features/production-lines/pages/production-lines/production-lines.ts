import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProductionLinesService, ProductionLine } from '../../../../core/services/production-lines.service';

@Component({
  selector: 'app-production-lines',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './production-lines.html',
  styleUrl: './production-lines.scss',
})
export class ProductionLines implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ProductionLinesService);

  items: ProductionLine[] = [];
  hasData = false;

  pageNumber = 1;
  pageSize = 10;
  totalPages = 1;
  totalCount = 0;

  searchText = '';
  searchTimeout: any;

  isAddEditOpen = false;
  isDeleteOpen = false;
  mode: 'add' | 'edit' = 'add';
  selected: ProductionLine | null = null;

  form = this.fb.group({
    lineName: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number) {
    this.pageNumber = page;
    this.api.getAll(this.pageNumber, this.pageSize, this.searchText).subscribe({
      next: (res) => {
        this.items = res.items || [];
        this.totalPages = res.totalPages || 1;
        this.totalCount = res.totalCount || 0;
        this.hasData = this.items.length > 0;
      },
      error: () => {
        this.items = [];
        this.totalPages = 1;
        this.totalCount = 0;
        this.hasData = false;
      },
    });
  }

  onSearchChange() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.load(1), 350);
  }

  openAdd() {
    this.mode = 'add';
    this.selected = null;
    this.form.reset({ lineName: '', description: '' });
    this.isAddEditOpen = true;
  }

  openEdit(row: ProductionLine) {
    this.mode = 'edit';
    this.selected = row;
    this.form.reset({ lineName: row.lineName, description: row.description ?? '' });
    this.isAddEditOpen = true;
  }

  closeAddEdit() {
    this.isAddEditOpen = false;
  }

  confirmAddEdit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      lineName: this.form.value.lineName!.trim(),
      description: (this.form.value.description ?? '').trim() || null,
    };

    if (this.mode === 'add') {
      this.api.create(payload).subscribe({
        next: () => {
          this.isAddEditOpen = false;
          this.load(1);
        },
      });
    } else if (this.selected) {
      this.api.update(this.selected.id, payload).subscribe({
        next: () => {
          this.isAddEditOpen = false;
          this.load(this.pageNumber);
        },
      });
    }
  }

  openDelete(row: ProductionLine) {
    this.selected = row;
    this.isDeleteOpen = true;
  }

  closeDelete() {
    this.isDeleteOpen = false;
    this.selected = null;
  }

  confirmDelete() {
    if (!this.selected) return;
    this.api.delete(this.selected.id).subscribe({
      next: () => {
        this.isDeleteOpen = false;
        this.selected = null;
        this.load(this.pageNumber);
      },
      error: () => {
        this.isDeleteOpen = false;
      },
    });
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.pageNumber) return;
    this.load(p);
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}

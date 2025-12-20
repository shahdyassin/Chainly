import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SuppliesService, MaterialItem } from '../../../../core/services/supplies.service';

type PageItem = number | '...';

@Component({
  selector: 'app-supplies-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supplies-list.html',
  styleUrl: './supplies-list.scss',
})
export class SuppliesList implements OnInit {
  private api = inject(SuppliesService);
  private router = inject(Router);

  items: MaterialItem[] = [];
  hasData = false;

  pageNumber = 1;
  pageSize = 10;
  totalPages = 1;
  totalCount = 0;

  searchText = '';
  searchTimeout: any;

  sortOrder: string | undefined = undefined;

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number) {
    this.pageNumber = page;

    this.api.getAll(this.pageNumber, this.pageSize, this.searchText, this.sortOrder).subscribe({
      next: (res) => {
        this.items = res.items ?? [];
        this.totalPages = res.totalPages ?? 1;
        this.totalCount = res.totalCount ?? 0;
        this.hasData = this.items.length > 0;


        const ctx = {
          pageNumber: this.pageNumber,
          pageSize: this.pageSize,
          searchText: this.searchText ?? '',
          sortOrder: this.sortOrder ?? null,
          totalCount: this.totalCount ?? 0,
          totalPages: this.totalPages ?? 1,
          globalIndex: (this.pageNumber - 1) * this.pageSize,
        };
        sessionStorage.setItem('materials_ctx', JSON.stringify(ctx));
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

  toggleSort() {
    if (!this.sortOrder) this.sortOrder = 'asc';
    else if (this.sortOrder === 'asc') this.sortOrder = 'desc';
    else this.sortOrder = undefined;

    this.load(1);
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.pageNumber) return;
    this.load(p);
  }

  get pagesArray(): PageItem[] {
    const total = this.totalPages;
    const current = this.pageNumber;

    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    if (current <= 2) return [1, 2, '...', total - 1, total];
    if (current >= total - 1) return [1, 2, '...', total - 1, total];

    return [1, '...', current, '...', total];
  }

  isNumber(x: PageItem): x is number {
    return typeof x === 'number';
  }

  openMaterial(row: MaterialItem, i: number) {
    const ctx = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      searchText: this.searchText ?? '',
      sortOrder: this.sortOrder ?? null,
      totalCount: this.totalCount ?? 0,
      totalPages: this.totalPages ?? 1,
      globalIndex: (this.pageNumber - 1) * this.pageSize + i,
    };

    sessionStorage.setItem('materials_ctx', JSON.stringify(ctx));
    this.router.navigate(['/dashboard/supplies-list/supplies-info', row.id]);
  }
}

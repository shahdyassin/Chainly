import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SuppliesService, SupplierItem } from '../../../../core/services/supplies.service';

type PageItem = number | '...';
type SortState = 'asc' | 'desc' | undefined;

@Component({
  selector: 'app-supplies-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supplies-info.html',
  styleUrl: './supplies-info.scss',
})
export class SuppliesInfo implements OnInit {
  private api = inject(SuppliesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  materialId = 0;

  materialName = '';
  standardCarbon = '';

  suppliersAll: SupplierItem[] = [];
  suppliersFiltered: SupplierItem[] = [];

  items: SupplierItem[] = [];
  hasData = false;

  pageNumber = 1;
  pageSize = 10;
  totalPages = 1;
  totalCount = 0;

  searchText = '';
  searchTimeout: any;

  sortOrder: SortState = undefined;


  ctx: any = null;
  canPrev = false;
  canNext = false;

  ngOnInit(): void {
    this.readCtx();

    this.route.paramMap.subscribe((p) => {
      const id = Number(p.get('id'));
      this.materialId = Number.isFinite(id) ? id : 0;

      if (!this.materialId) {
        this.router.navigate(['/dashboard/supplies-list']);
        return;
      }


      this.refreshNavState();

      this.loadMaterial();
    });
  }

  private readCtx() {
    const raw = sessionStorage.getItem('materials_ctx');
    this.ctx = raw ? JSON.parse(raw) : null;
  }

  private refreshNavState() {
    this.readCtx();
    const gi = Number(this.ctx?.globalIndex ?? 0);
    const total = Number(this.ctx?.totalCount ?? 0);

    this.canPrev = gi > 0;
    this.canNext = total ? gi < total - 1 : false;
  }

  goNextMaterial() {
    this.readCtx();
    if (!this.ctx) return;

    const gi = Number(this.ctx.globalIndex ?? 0);
    this.gotoByGlobalIndex(gi + 1);
  }

  goPrevMaterial() {
    this.readCtx();
    if (!this.ctx) return;

    const gi = Number(this.ctx.globalIndex ?? 0);
    this.gotoByGlobalIndex(gi - 1);
  }

  private gotoByGlobalIndex(targetIndex: number) {
    this.readCtx();
    if (!this.ctx) return;

    const total = Number(this.ctx.totalCount ?? 0);
    const size = Number(this.ctx.pageSize ?? 10);

    if (targetIndex < 0) return;
    if (total && targetIndex >= total) return;

    const page = Math.floor(targetIndex / size) + 1;
    const offset = targetIndex % size;

    this.api.getAll(page, size, this.ctx.searchText, this.ctx.sortOrder).subscribe({
      next: (res) => {
        const list = res.items ?? [];
        const item = list[offset];
        if (!item) return;


        sessionStorage.setItem(
          'materials_ctx',
          JSON.stringify({
            ...this.ctx,
            pageNumber: page,
            totalPages: res.totalPages ?? this.ctx.totalPages,
            totalCount: res.totalCount ?? this.ctx.totalCount,
            globalIndex: targetIndex,
          })
        );

        this.router.navigate(['/dashboard/supplies-list/supplies-info', item.id]);
      },
    });
  }

  loadMaterial() {
    this.api.getById(this.materialId).subscribe({
      next: (res) => {
        this.materialName = res.item?.name ?? '';
        this.standardCarbon = res.item?.carbonFootprint ?? '';
        this.suppliersAll = res.item?.suppliers ?? [];

        this.applyFilterSortAndPaginate(1);


        this.refreshNavState();
      },
      error: () => {
        this.materialName = '';
        this.standardCarbon = '';
        this.suppliersAll = [];
        this.applyFilterSortAndPaginate(1);
      },
    });
  }

  onSearchChange() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.applyFilterSortAndPaginate(1), 350);
  }

  toggleSort() {
    if (!this.sortOrder) this.sortOrder = 'asc';
    else if (this.sortOrder === 'asc') this.sortOrder = 'desc';
    else this.sortOrder = undefined;

    this.applyFilterSortAndPaginate(1);
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.pageNumber) return;
    this.applyFilterSortAndPaginate(p);
  }

  private applyFilterSortAndPaginate(page: number) {
    this.pageNumber = page;

    const q = (this.searchText ?? '').trim().toLowerCase();

    let list = this.suppliersAll.slice();
    if (q) list = list.filter((s) => (s.name ?? '').toLowerCase().includes(q));

    if (this.sortOrder) {
      list.sort((a, b) => {
        const av = this.parseCarbon(a.carbonFootprint);
        const bv = this.parseCarbon(b.carbonFootprint);
        return this.sortOrder === 'asc' ? av - bv : bv - av;
      });
    }

    this.suppliersFiltered = list;

    this.totalCount = list.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalCount / this.pageSize));

    const start = (this.pageNumber - 1) * this.pageSize;
    this.items = list.slice(start, start + this.pageSize);
    this.hasData = this.items.length > 0;
  }

  private parseCarbon(v: string | null | undefined): number {
    const num = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(num) ? num : 0;
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

  backToList() {
    this.router.navigate(['/dashboard/supplies-list']);
  }

   openSupplier(row: SupplierItem) {
    if (!row?.id) return;
    this.router.navigate(['/dashboard/suppliers/supplier-info', row.id]);
  }
}

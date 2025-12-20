import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { SuppliersService, SupplierDetails, MaterialRow } from '../../../../core/services/suppliers.service';

type PageItem = number | '...';
type SortState = 'asc' | 'desc' | undefined;

@Component({
  selector: 'app-suppliers-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './suppliers-info.html',
  styleUrl: './suppliers-info.scss',
})
export class SuppliersInfo implements OnInit, OnDestroy {
  private api = inject(SuppliersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  supplierId = 0;
  supplier: SupplierDetails | null = null;

  items: MaterialRow[] = [];
  hasData = false;

  pageNumber = 1;
  pageSize = 10;
  totalPages = 1;
  totalCount = 0;

  searchText = '';
  searchTimeout: any;

  sortOrder: SortState = undefined;

  // Prev/Next suppliers ctx
  canPrev = false;
  canNext = false;
  private ctx: any = null;

  // Map modal
  isMapOpen = false;
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      const id = Number(p.get('id'));
      this.supplierId = Number.isFinite(id) ? id : 0;

      if (!this.supplierId) {
        this.router.navigate(['/dashboard/suppliers']);
        return;
      }

      this.pageNumber = 1;
      this.loadSupplier();
      this.updatePrevNext();
    });
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  // ========= Supplier Load =========
  loadSupplier() {
    this.api.getById(this.supplierId, this.pageNumber, this.pageSize, this.searchText).subscribe({
      next: (res) => {
        this.supplier = res.supplier;

        let list = (res.materials?.items ?? []).slice();

        if (this.sortOrder) {
          list.sort((a, b) => {
            const av = this.parseCarbon(a.carbonFootprint);
            const bv = this.parseCarbon(b.carbonFootprint);
            return this.sortOrder === 'asc' ? av - bv : bv - av;
          });
        }

        this.totalPages = res.materials?.totalPages ?? 1;
        this.totalCount = res.materials?.totalCount ?? 0;

        this.items = list;
        this.hasData = this.items.length > 0;
      },
      error: () => {
        this.supplier = null;
        this.items = [];
        this.totalPages = 1;
        this.totalCount = 0;
        this.hasData = false;
      },
    });
  }

  onSearchChange() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.pageNumber = 1;
      this.loadSupplier();
    }, 350);
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.pageNumber) return;
    this.pageNumber = p;
    this.loadSupplier();
  }

  toggleSort() {
    if (!this.sortOrder) this.sortOrder = 'asc';
    else if (this.sortOrder === 'asc') this.sortOrder = 'desc';
    else this.sortOrder = undefined;

    this.loadSupplier();
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

  private parseCarbon(v: string | null | undefined): number {
    const num = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(num) ? num : 0;
  }

  // ========= Header Buttons =========
  editSupplier() {
    console.log('Edit supplier', this.supplierId);
  }

  deleteSupplier() {
    console.log('Delete supplier', this.supplierId);
  }

  // ========= Eye on Material -> Supplies Info (show suppliers who sell it) =========
  viewSupply(row: MaterialRow) {
    // ✅ نخزن ctx بسيط عشان SuppliesInfo (Prev/Next) ما يهنجش لو محتاجه
    sessionStorage.setItem(
      'materials_ctx',
      JSON.stringify({
        pageNumber: 1,
        pageSize: 10,
        searchText: row.name ?? '',
        sortOrder: null,
        totalCount: 0,
        totalPages: 1,
        globalIndex: 0,
      })
    );

    // ✅ نروح لصفحة الماتيريال نفسها اللي بتعرض Suppliers اللي بيبيعوها
    this.router.navigate(['/dashboard/supplies-list/supplies-info', row.id]);
  }

  // ========= Map Modal =========
  openMapExternal() {
    const lat = this.supplier?.latitude;
    const lng = this.supplier?.longitude;
    if (lat == null || lng == null) return;

    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }

  openMapModal() {
    const lat = this.supplier?.latitude;
    const lng = this.supplier?.longitude;
    if (lat == null || lng == null) return;

    this.isMapOpen = true;
    setTimeout(() => this.initOrUpdateMap(true), 0);
  }

  closeMapModal() {
    this.isMapOpen = false;
    this.destroyMap();
  }

  private initOrUpdateMap(fly = false) {
    const lat = this.supplier?.latitude;
    const lng = this.supplier?.longitude;
    if (lat == null || lng == null) return;

    if (!this.map) {
      this.map = L.map('supplier-map', {
        center: [lat, lng],
        zoom: 11,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(this.map);

      this.marker = L.marker([lat, lng]).addTo(this.map);
      this.marker.bindPopup(this.supplier?.name ?? 'Supplier').openPopup();
    } else {
      this.marker?.setLatLng([lat, lng]);
      if (fly) this.map.flyTo([lat, lng], 12);
      else this.map.setView([lat, lng], this.map.getZoom());
    }

    this.map.invalidateSize();
  }

  private destroyMap() {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.marker = null;
    }
  }

  // ========= Next / Prev suppliers =========
  private readCtx() {
    const raw = sessionStorage.getItem('suppliers_ctx');
    this.ctx = raw ? JSON.parse(raw) : null;
  }

  private updatePrevNext() {
    this.readCtx();
    const total = Number(this.ctx?.totalCount ?? 0);
    const gi = Number(this.ctx?.globalIndex ?? 0);

    this.canPrev = gi > 0;
    this.canNext = total ? gi < total - 1 : false;
  }

  goPrevSupplier() {
    this.readCtx();
    if (!this.ctx) return;
    const gi = Number(this.ctx.globalIndex ?? 0);
    this.gotoByGlobalIndex(gi - 1);
  }

  goNextSupplier() {
    this.readCtx();
    if (!this.ctx) return;
    const gi = Number(this.ctx.globalIndex ?? 0);
    this.gotoByGlobalIndex(gi + 1);
  }

  private gotoByGlobalIndex(targetIndex: number) {
    this.readCtx();
    if (!this.ctx) return;

    const total = Number(this.ctx.totalCount ?? 0);
    const size = Number(this.ctx.pageSize ?? 10);

    if (targetIndex < 0 || (total && targetIndex >= total)) return;

    const page = Math.floor(targetIndex / size) + 1;
    const offset = targetIndex % size;

    this.api.getAll(page, size, this.ctx.searchText, this.ctx.sortType).subscribe({
      next: (res) => {
        const list = res.items ?? [];
        const item = list[offset];
        if (!item) return;

        sessionStorage.setItem(
          'suppliers_ctx',
          JSON.stringify({
            ...this.ctx,
            pageNumber: page,
            totalPages: res.totalPages ?? this.ctx.totalPages,
            totalCount: res.totalCount ?? this.ctx.totalCount,
            globalIndex: targetIndex,
          })
        );

        this.router.navigate(['/dashboard/suppliers/supplier-info', item.id]);
      },
    });
  }
}

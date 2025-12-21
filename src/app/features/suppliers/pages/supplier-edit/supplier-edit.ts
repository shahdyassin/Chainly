import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  SuppliersService,
  CreateSupplierPayload,
  MaterialRow,
} from '../../../../core/services/suppliers.service';
import { MapPickerComponent } from '../../../../shared/map-picker/map-picker';

type PageItem = number | '...';
type SortState = 'asc' | 'desc' | undefined;

@Component({
  selector: 'app-supplier-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, MapPickerComponent],
  templateUrl: './supplier-edit.html',
  styleUrl: './supplier-edit.scss',
})
export class SupplierEdit implements OnInit {
  private api = inject(SuppliersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  supplierId = 0;


  name = '';
  facilityType: string | null = null;
  sector: string | null = null;

  latitude: number | null = null;
  longitude: number | null = null;

  locationText = '';
  errorMsg = '';
  saving = false;


  selectedMaterials: { id: number; name: string; carbonFootprint?: string | null }[] = [];


  matSearch = '';
  sortOrder: SortState = undefined;

  pageNumber = 1;
  pageSize = 10;
  totalPages = 1;
  totalCount = 0;


  isMaterialsOpen = false;
  materialsLoading = false;
  materialsSearch = '';


  materialsOptions: { id: number; name: string; carbonFootprint?: string | null }[] = [];


  tempSelected: { id: number; name: string; carbonFootprint?: string | null }[] = [];


  isMapOpen = false;


  tempLocation: { lat: number; lng: number } | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      const id = Number(p.get('id'));
      this.supplierId = Number.isFinite(id) ? id : 0;

      if (!this.supplierId) {
        this.router.navigate(['/dashboard/suppliers']);
        return;
      }

      this.loadSupplierForEdit();
    });
  }


  loadSupplierForEdit() {
    this.errorMsg = '';

    this.api.getById(this.supplierId, 1, 1000, '').subscribe({
      next: (res) => {
        const s = res.supplier;
        if (!s) {
          this.errorMsg = 'Supplier not found.';
          return;
        }

        this.name = s.name ?? '';
        this.facilityType = (s.facilityType ?? null) as any;
        this.sector = (s.sector ?? null) as any;

        this.latitude = s.latitude ?? null;
        this.longitude = s.longitude ?? null;

        this.locationText = (s.location ?? '') as any;


        if (this.latitude != null && this.longitude != null) {
          this.tempLocation = { lat: this.latitude, lng: this.longitude };
        } else {
          this.tempLocation = null;
        }

        const mats = (res.materials?.items ?? []) as MaterialRow[];
        this.selectedMaterials = mats.map((m) => ({
          id: Number(m.id),
          name: String(m.name ?? ''),
          carbonFootprint: m.carbonFootprint ?? null,
        }));

        this.applySelectedFilterSortAndPaginate(1);
      },
      error: () => {
        this.errorMsg = 'Failed to load supplier.';
      },
    });
  }

  confirmChanges() {
    if (this.saving) return;

    const nm = (this.name ?? '').trim();
    if (!nm) {
      this.errorMsg = 'Supplier name is required.';
      return;
    }

    this.errorMsg = '';
    this.saving = true;

    const payload: CreateSupplierPayload = {
      name: nm,
      Latitude: this.latitude ?? null,
      Longitude: this.longitude ?? null,
      facilityType: this.facilityType ?? null,
      sector: this.sector ?? null,
      materialIds: this.selectedMaterials.map((x) => x.id),
    };

    this.api.updateSupplier(this.supplierId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/dashboard/suppliers/supplier-info', this.supplierId]);
      },
      error: () => {
        this.saving = false;
        this.errorMsg = 'Update failed. Please try again.';
      },
    });
  }


  onMatSearchChange() {
    this.applySelectedFilterSortAndPaginate(1);
  }

  toggleSort() {
    if (!this.sortOrder) this.sortOrder = 'asc';
    else if (this.sortOrder === 'asc') this.sortOrder = 'desc';
    else this.sortOrder = undefined;

    this.applySelectedFilterSortAndPaginate(1);
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

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.pageNumber) return;
    this.applySelectedFilterSortAndPaginate(p);
  }

  get pagedMaterials() {
    return this._pagedMaterials;
  }

  private _pagedMaterials: { id: number; name: string; carbonFootprint?: string | null }[] = [];

  private applySelectedFilterSortAndPaginate(page: number) {
    this.pageNumber = page;

    const q = (this.matSearch ?? '').trim().toLowerCase();
    let list = this.selectedMaterials.slice();

    if (q) list = list.filter((x) => (x.name ?? '').toLowerCase().includes(q));

    if (this.sortOrder) {
      list.sort((a, b) => {
        const av = this.parseCarbon(a.carbonFootprint);
        const bv = this.parseCarbon(b.carbonFootprint);
        return this.sortOrder === 'asc' ? av - bv : bv - av;
      });
    }

    this.totalCount = list.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalCount / this.pageSize));

    const start = (this.pageNumber - 1) * this.pageSize;
    this._pagedMaterials = list.slice(start, start + this.pageSize);
  }

  private parseCarbon(v: string | null | undefined): number {
    const num = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(num) ? num : 0;
  }

  get isAllChecked() {
    return !!this.selectedMaterials.length;
  }

  toggleAll(_ev: any) {
  }

  removeMaterial(id: number) {
    this.selectedMaterials = this.selectedMaterials.filter((x) => x.id !== id);
    this.applySelectedFilterSortAndPaginate(1);
  }


  openMaterialsModal() {
    this.isMaterialsOpen = true;

    this.tempSelected = this.selectedMaterials.map((x) => ({
      id: x.id,
      name: x.name,
      carbonFootprint: x.carbonFootprint ?? null,
    }));

    this.loadMaterials();
  }

  closeMaterialsModal() {
    this.isMaterialsOpen = false;
  }

  tempHas(id: number) {
    return this.tempSelected.some((x) => x.id === id);
  }

  tempToggle(m: { id: number; name: string; carbonFootprint?: string | null }) {
    if (this.tempHas(m.id)) {
      this.tempSelected = this.tempSelected.filter((x) => x.id !== m.id);
    } else {
      this.tempSelected = [
        ...this.tempSelected,
        { id: m.id, name: m.name, carbonFootprint: m.carbonFootprint ?? null },
      ];
    }
  }

  tempRemove(id: number) {
    this.tempSelected = this.tempSelected.filter((x) => x.id !== id);
  }

  loadMaterials() {
    this.materialsLoading = true;

    this.api.getMaterials(this.materialsSearch).subscribe({
      next: (list) => {
        this.materialsOptions = (list ?? []).map((x) => ({
          id: x.id,
          name: x.name,
          carbonFootprint: x.carbonFootprint ?? null,
        }));
        this.materialsLoading = false;
      },
      error: () => {
        this.materialsOptions = [];
        this.materialsLoading = false;
      },
    });
  }

  confirmMaterials() {
    const existing = new Map(this.selectedMaterials.map((x) => [x.id, x]));
    const opts = new Map(this.materialsOptions.map((x) => [x.id, x]));

    const merged: { id: number; name: string; carbonFootprint?: string | null }[] = [];

    for (const t of this.tempSelected) {
      const ex = existing.get(t.id);
      const op = opts.get(t.id);

      merged.push({
        id: t.id,
        name: t.name,
        carbonFootprint: ex?.carbonFootprint ?? t.carbonFootprint ?? op?.carbonFootprint ?? null,
      });
    }

    this.selectedMaterials = merged;
    this.closeMaterialsModal();
    this.applySelectedFilterSortAndPaginate(1);
  }


  openMapModal() {
    this.isMapOpen = true;


    if (this.latitude != null && this.longitude != null) {
      this.tempLocation = { lat: this.latitude, lng: this.longitude };
    }
  }

  cancelLocation() {
    this.isMapOpen = false;
  }


  onLocationSelected(loc: { lat: number; lng: number }) {
    this.latitude = loc.lat;
    this.longitude = loc.lng;
    this.tempLocation = loc;

    this.getPlaceName(loc.lat, loc.lng).then((place) => {
      this.locationText = place;
    });
  }


  confirmLocation() {
    if (!this.tempLocation) {
      this.isMapOpen = false;
      return;
    }

    const { lat, lng } = this.tempLocation;
    this.latitude = lat;
    this.longitude = lng;

    this.getPlaceName(lat, lng).then((place) => {
      this.locationText = place;
      this.isMapOpen = false;
    });
  }

  private getPlaceName(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

    return fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then((res) => res.json())
      .then((data) => data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      .catch(() => `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  }


  viewSupply(row: MaterialRow) {
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

    this.router.navigate(['/dashboard/supplies-list/supplies-info', row.id]);
  }
}

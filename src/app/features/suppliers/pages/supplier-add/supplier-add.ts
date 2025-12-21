import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SuppliersService } from '../../../../core/services/suppliers.service';
import { MapPickerComponent } from '../../../../shared/map-picker/map-picker';

type MaterialVM = { id: number; name: string; carbonFootprint?: string | null };

@Component({
  selector: 'app-supplier-add',
  standalone: true,
  imports: [CommonModule, FormsModule, MapPickerComponent],
  templateUrl: './supplier-add.html',
  styleUrl: './supplier-add.scss',
})
export class SupplierAdd implements OnInit {
  private api = inject(SuppliersService);
  private router = inject(Router);


  name = '';
  facility = '';
  sector = '';


  selectedLocationLabel: string = 'Add Location';
  showMap = false;
  tempLocation: { lat: number; lng: number } | null = null;


  supplies: MaterialVM[] = [];


  tableSearch = '';
  sortAsc: boolean | null = null;
  pageNumber = 1;
  pageSize = 5;

  checkedIds = new Set<number>();

  addSuppliesOpen = false;
  suppliesSearch = '';
  materialsLoading = false;
  allMaterials: MaterialVM[] = [];
  selectedMaterialIds = new Set<number>();


  saving = false;
  errorMsg = '';

  ngOnInit(): void {}


  openMap() {
    this.showMap = true;
  }

  cancelLocation() {
    this.showMap = false;
  }

  onLocationSelected(location: { lat: number; lng: number }) {
    this.tempLocation = location;

    this.getPlaceName(location.lat, location.lng).then((place) => {
      this.selectedLocationLabel = place;
    });
  }

  confirmLocation() {
    if (!this.tempLocation) return;

    const { lat, lng } = this.tempLocation;
    this.getPlaceName(lat, lng).then((place) => {
      this.selectedLocationLabel = place;
      this.showMap = false;
    });
  }

  private getPlaceName(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

    return fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then((res) => res.json())
      .then((data) => data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      .catch(() => `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  }


  openAddSupplies() {
    this.addSuppliesOpen = true;
    this.suppliesSearch = '';
    this.selectedMaterialIds = new Set(this.supplies.map((x) => x.id));
    this.loadMaterials();
  }

  closeAddSupplies() {
    this.addSuppliesOpen = false;
  }

  onSuppliesSearchChange() {
    this.loadMaterials();
  }

  toggleMaterial(id: number) {
    if (this.selectedMaterialIds.has(id)) this.selectedMaterialIds.delete(id);
    else this.selectedMaterialIds.add(id);
  }

  removeChip(id: number) {
    this.selectedMaterialIds.delete(id);
  }

  private normalizeCarbon(v: any): string | null {
    if (v == null) return null;
    const s = String(v).trim();
    return s ? s : null;
  }

  confirmAddSupplies() {

    const byId = new Map<number, MaterialVM>();
    for (const m of this.allMaterials) byId.set(m.id, m);
    for (const s of this.supplies) byId.set(s.id, s);

    const next: MaterialVM[] = Array.from(this.selectedMaterialIds).map((id) => {
      const m = byId.get(id);
      return {
        id,
        name: m?.name ?? `#${id}`,
        carbonFootprint: this.normalizeCarbon(m?.carbonFootprint),
      };
    });

    next.sort((a, b) => a.name.localeCompare(b.name));
    this.supplies = next;


    this.checkedIds = new Set<number>();
    this.pageNumber = 1;

    this.closeAddSupplies();
  }

  private loadMaterials() {
    this.materialsLoading = true;

    this.api.getMaterials(this.suppliesSearch).subscribe({
      next: (list: any) => {
        const arr = (list ?? []).map((x: any) => ({
          id: Number(x.id),
          name: String(x.name ?? ''),

          carbonFootprint: this.normalizeCarbon(x.carbonFootprint ?? x.carbonfootprint ?? x.carbon_Footprint),
        })) as MaterialVM[];

        this.allMaterials = arr;
        this.materialsLoading = false;
      },
      error: () => {
        this.allMaterials = [];
        this.materialsLoading = false;
      },
    });
  }

  get filteredMaterials(): MaterialVM[] {
    const q = (this.suppliesSearch ?? '').trim().toLowerCase();
    const arr = q ? this.allMaterials.filter((m) => (m.name ?? '').toLowerCase().includes(q)) : this.allMaterials;

    return [...arr].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  get selectedChips(): MaterialVM[] {
    const map = new Map<number, MaterialVM>();
    for (const x of this.supplies) map.set(x.id, x);
    for (const x of this.allMaterials) map.set(x.id, x);

    const arr = Array.from(this.selectedMaterialIds)
      .map((id) => map.get(id))
      .filter(Boolean) as MaterialVM[];

    arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }


  onTableSearchChange() {
    this.pageNumber = 1;
  }

  toggleSort() {
    if (this.sortAsc === null) this.sortAsc = true;
    else if (this.sortAsc === true) this.sortAsc = false;
    else this.sortAsc = null;

    this.pageNumber = 1;
  }

  get filteredSupplies(): MaterialVM[] {
    const q = (this.tableSearch ?? '').trim().toLowerCase();

    let arr = [...this.supplies];

    if (q) {
      arr = arr.filter((x) => (x.name ?? '').toLowerCase().includes(q));
    }

    if (this.sortAsc === true) arr.sort((a, b) => a.name.localeCompare(b.name));
    if (this.sortAsc === false) arr.sort((a, b) => b.name.localeCompare(a.name));

    return arr;
  }

  get totalPages(): number {
    const total = this.filteredSupplies.length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get startIndex(): number {
    return (this.pageNumber - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.pageSize, this.filteredSupplies.length);
  }

  get pagedSupplies(): MaterialVM[] {
    return this.filteredSupplies.slice(this.startIndex, this.endIndex);
  }

  goToPage(p: any) {
    const n = Number(p);
    if (!Number.isFinite(n)) return;

    const next = Math.max(1, Math.min(this.totalPages, Math.floor(n)));
    this.pageNumber = next;
  }

  toggleRow(id: number) {
    if (this.checkedIds.has(id)) this.checkedIds.delete(id);
    else this.checkedIds.add(id);
  }

  get allChecked(): boolean {
    const rows = this.pagedSupplies;
    if (!rows.length) return false;
    return rows.every((r) => this.checkedIds.has(r.id));
  }

  toggleAll(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const rows = this.pagedSupplies;
    if (!rows.length) return;

    if (checked) for (const r of rows) this.checkedIds.add(r.id);
    else for (const r of rows) this.checkedIds.delete(r.id);
  }

  viewSupply(s: MaterialVM) {
  this.router.navigate(['/dashboard/supplies-list/supplies-info', s.id]);
}



  confirmChanges() {
    if (this.saving) return;
    this.errorMsg = '';

    const payload = {
      name: (this.name ?? '').trim(),
      Latitude: this.tempLocation?.lat ?? null,
      Longitude: this.tempLocation?.lng ?? null,
      facilityType: (this.facility ?? '').trim() || null,
      sector: (this.sector ?? '').trim() || null,
      materialIds: this.supplies.map((x) => x.id),
    };

    if (!payload.name) {
      this.errorMsg = 'Name is required';
      return;
    }

    this.saving = true;

    this.api.createSupplier(payload).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/dashboard/suppliers']);
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg =
          (typeof err?.error === 'string' && err.error) ||
          err?.error?.Message ||
          err?.error?.message ||
          'Failed to save supplier';
      },
    });
  }
}

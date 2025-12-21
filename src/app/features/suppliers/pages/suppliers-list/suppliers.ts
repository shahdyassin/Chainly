import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { SuppliersService, SupplierItem } from '../../../../core/services/suppliers.service';

type PageItem = number | '...';
type UploadState = 'idle' | 'ready' | 'uploading' | 'success' | 'failed';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.scss',
})
export class Suppliers implements OnInit {
  private api = inject(SuppliersService);
  private router = inject(Router);

  items: SupplierItem[] = [];
  hasData = false;

  pageNumber = 1;
  pageSize = 10;
  totalPages = 1;
  totalCount = 0;

  searchText = '';
  searchTimeout: any;

  sortType: string | undefined = undefined;


  isImportOpen = false;
  uploadState: UploadState = 'idle';
  selectedFile: File | null = null;

  uploadProgress = 0;
  uploadErrorMsg = '';
  toastWarning = '';


  importedSummary = {
    suppliers: 0,
    materials: 0,
    relationships: 0,
    total: 0,
  };


  isDeleteOpen = false;
  deleteTarget: SupplierItem | null = null;
  deleting = false;
  deleteError = '';

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number) {
    this.pageNumber = page;

    this.api.getAll(this.pageNumber, this.pageSize, this.searchText, this.sortType ?? null).subscribe({
      next: (res) => {
        this.items = res.items ?? [];
        this.totalPages = res.totalPages ?? 1;
        this.totalCount = res.totalCount ?? 0;
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

  toggleSort() {
    if (!this.sortType) this.sortType = 'asc';
    else if (this.sortType === 'asc') this.sortType = 'desc';
    else this.sortType = undefined;

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


  viewSupplier(row: SupplierItem, i: number) {
    const globalIndex = (this.pageNumber - 1) * this.pageSize + i;

    sessionStorage.setItem(
      'suppliers_ctx',
      JSON.stringify({
        pageNumber: this.pageNumber,
        pageSize: this.pageSize,
        totalPages: this.totalPages,
        totalCount: this.totalCount,
        searchText: this.searchText,
        sortType: this.sortType ?? null,
        globalIndex,
      })
    );

    this.router.navigate(['/dashboard/suppliers/supplier-info', row.id]);
  }


  importFile() {
    this.isImportOpen = true;
    this.uploadState = 'idle';
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.uploadErrorMsg = '';
    this.toastWarning = '';
    this.importedSummary = { suppliers: 0, materials: 0, relationships: 0, total: 0 };
  }

  closeImport() {
    if (this.uploadState === 'uploading') return;
    this.isImportOpen = false;
  }

  onBrowseFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.onFilePicked(file);
    input.value = '';
  }

  onDropFile(ev: DragEvent) {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0] ?? null;
    this.onFilePicked(file);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

  clearSelectedFile() {
    if (this.uploadState === 'uploading') return;
    this.selectedFile = null;
    this.uploadState = 'idle';
    this.uploadProgress = 0;
    this.uploadErrorMsg = '';
    this.toastWarning = '';
  }

  private onFilePicked(file: File | null) {
    this.toastWarning = '';
    this.uploadErrorMsg = '';

    if (!file) return;

    const name = (file.name ?? '').toLowerCase();
    const ok = name.endsWith('.xlsx') || name.endsWith('.xls');

    if (!ok) {

      this.toastWarning = "This file doesn’t match the required specifications. Please upload a valid file";
      this.uploadState = 'failed';
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
    this.uploadState = 'ready';
    this.uploadProgress = 0;
  }

  confirmUpload() {
    if (!this.selectedFile || this.uploadState === 'uploading') return;

    this.uploadState = 'uploading';
    this.uploadProgress = 0;
    this.uploadErrorMsg = '';
    this.toastWarning = '';
    this.importedSummary = { suppliers: 0, materials: 0, relationships: 0, total: 0 };

    this.api.importCompleteExcel(this.selectedFile).subscribe({
      next: (event) => {

        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? 0;
          const loaded = event.loaded ?? 0;
          this.uploadProgress = total ? Math.round((loaded / total) * 100) : 20;
        }


        if (event.type === HttpEventType.Response) {
          this.uploadProgress = 100;

          const body: any = event.body ?? {};
          const data = body?.Data ?? body?.data ?? null;

          this.importedSummary = {
            suppliers: Number(data?.SuppliersImported ?? 0),
            materials: Number(data?.MaterialsImported ?? 0),
            relationships: Number(data?.RelationshipsImported ?? 0),
            total: Number(data?.TotalRecords ?? 0),
          };

          this.uploadState = 'success';

          this.load(1);
        }
      },
      error: (err) => {
        this.uploadState = 'failed';
        this.uploadProgress = 0;
        this.uploadErrorMsg = 'Upload failed';

        const msg =
          (typeof err?.error === 'string' && err.error) ||
          err?.error?.Message ||
          err?.error?.message ||
          'Import failed';


        if (err?.status === 400) {
          this.toastWarning = "This file doesn’t match the required specifications. Please upload a valid file";
        } else {
          this.toastWarning = msg;
        }
      },
    });
  }

  continueAfterSuccess() {
    this.closeImport();
  }


 addSupplier() {
  this.router.navigate(['/dashboard/suppliers/supplier-add']);
}


 editSupplier(row: SupplierItem) {
  this.router.navigate(['/dashboard/suppliers/supplier-edit', row.id]);
}



  openDelete(row: SupplierItem) {
    this.deleteTarget = row;
    this.deleteError = '';
    this.isDeleteOpen = true;
  }

  closeDelete() {
    if (this.deleting) return;
    this.isDeleteOpen = false;
    this.deleteTarget = null;
    this.deleteError = '';
  }

  confirmDelete() {
    if (!this.deleteTarget || this.deleting) return;

    this.deleting = true;
    this.deleteError = '';

    const id = this.deleteTarget.id;

    this.api.delete(id).subscribe({
      next: () => {
        this.deleting = false;
        this.closeDelete();

        const willBeEmpty = this.items.length === 1 && this.pageNumber > 1;
        this.load(willBeEmpty ? this.pageNumber - 1 : this.pageNumber);
      },
      error: (err) => {
        this.deleting = false;
        if (err?.status === 404) this.deleteError = 'Supplier not found (404).';
        else if (err?.status === 401 || err?.status === 403) this.deleteError = 'Not authorized.';
        else this.deleteError = 'Delete failed. Please try again.';
      },
    });
  }

  goToImportPage() {
  this.router.navigate(['/dashboard/suppliers/import-files']);
}

}

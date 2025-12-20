import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { SuppliersService } from '../../../../core/services/suppliers.service';

type UploadState = 'idle' | 'ready' | 'uploading' | 'success' | 'failed';

@Component({
  selector: 'app-suppliers-import-files',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-files.html',
  styleUrl: './import-files.scss',
})
export class ImportFiles {
  private api = inject(SuppliersService);
  private router = inject(Router);

  // collapse UI
  open1 = true;
  open2 = true;
  open3 = true;

  // upload modal state
  isUploadOpen = false;
  uploadState: UploadState = 'idle';
  selectedFile: File | null = null;
  uploadProgress = 0;

  toastWarning = '';
  uploadErrorMsg = '';

  importedSummary = { suppliers: 0, materials: 0, relationships: 0, total: 0 };

  backToSuppliers() {
    this.router.navigate(['/dashboard/suppliers']);
  }

  // open modal
  openUpload() {
    this.isUploadOpen = true;
    this.resetUploadState();
  }

  closeUpload() {
    if (this.uploadState === 'uploading') return;
    this.isUploadOpen = false;
  }

  private resetUploadState() {
    this.uploadState = 'idle';
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.toastWarning = '';
    this.uploadErrorMsg = '';
    this.importedSummary = { suppliers: 0, materials: 0, relationships: 0, total: 0 };
  }

  onBrowseFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pickFile(file);
    input.value = '';
  }

  onDropFile(ev: DragEvent) {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0] ?? null;
    this.pickFile(file);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

  clearSelectedFile() {
    if (this.uploadState === 'uploading') return;
    this.selectedFile = null;
    this.uploadState = 'idle';
    this.uploadProgress = 0;
    this.toastWarning = '';
    this.uploadErrorMsg = '';
  }

  private pickFile(file: File | null) {
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
    this.toastWarning = '';
    this.uploadErrorMsg = '';
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
    // يقفل المودال ويرجع لصفحة Suppliers (هي هتعمل load لوحدها)
    this.closeUpload();
    this.router.navigate(['/dashboard/suppliers']);
  }
}

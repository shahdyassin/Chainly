import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { SuppliersService } from '../../../../core/services/suppliers.service';

type UploadState = 'idle' | 'uploading' | 'success' | 'failed';

type UploadItem = {
  id: string;
  file: File;
  state: UploadState;
  progress: number;


  warningText: string;
};

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

  open1 = true;
  open2 = true;
  open3 = true;
  open4 = true;

  isUploadOpen = false;


  uploadState: 'idle' | 'success' = 'idle';

  uploads: UploadItem[] = [];


  private readonly SPEC_WARNING =
    "This file doesn’t match the required specifications. Please upload a valid file";

  backToSuppliers() {
    this.router.navigate(['/dashboard/suppliers']);
  }

  openUpload() {
    this.isUploadOpen = true;
    this.uploadState = 'idle';
    this.uploads = [];
  }

  closeUpload() {
    if (this.isAnyUploading()) return;
    this.isUploadOpen = false;
  }


  onBrowseFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (file) this.addFile(file);
  }

  onDropFile(ev: DragEvent) {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0] ?? null;
    if (file) this.addFile(file);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

  private addFile(file: File) {
    const name = (file.name ?? '').toLowerCase();
    const ok = name.endsWith('.xlsx') || name.endsWith('.xls');

    const item: UploadItem = {
      id: crypto.randomUUID(),
      file,
      state: ok ? 'idle' : 'failed',
      progress: 0,
      warningText: this.SPEC_WARNING,
    };


    this.uploads = [item];
  }


  removeUpload(item: UploadItem) {
    if (item.state === 'uploading') return;
    this.uploads = this.uploads.filter((x) => x.id !== item.id);
  }

  retryUpload(item: UploadItem) {
    item.state = 'idle';
    item.progress = 0;


    item.warningText = this.SPEC_WARNING;
  }

  confirmUpload() {
    if (!this.uploads.length || this.isAnyUploading()) return;

    const item = this.uploads[0];
    if (!item) return;

    const name = (item.file.name ?? '').toLowerCase();
    const ok = name.endsWith('.xlsx') || name.endsWith('.xls');
    if (!ok) {
      item.state = 'failed';
      item.progress = 0;
      item.warningText = this.SPEC_WARNING;
      return;
    }

    item.state = 'uploading';
    item.progress = 0;

    this.api.importCompleteExcel(item.file).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? 0;
          const loaded = event.loaded ?? 0;
          item.progress = total ? Math.round((loaded / total) * 100) : 10;
        }

        if (event.type === HttpEventType.Response) {
          item.progress = 100;
          item.state = 'success';
          this.uploadState = 'success';
        }
      },
      error: () => {
        item.state = 'failed';
        item.progress = 0;


        item.warningText = this.SPEC_WARNING;
      },
    });
  }

  isAnyUploading() {
    return this.uploads.some((u) => u.state === 'uploading');
  }

  trackByUploadId(_: number, item: UploadItem) {
    return item.id;
  }

  formatSize(bytes: number) {
    if (!bytes && bytes !== 0) return '';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${Math.round(mb)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  }

  continueAfterSuccess() {
    this.closeUpload();
    this.router.navigate(['/dashboard/suppliers']);
  }
}

import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { SuppliersService } from '../../../../core/services/suppliers.service';

type UploadState = 'uploading' | 'uploaded' | 'failed';

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
      id: (crypto as any)?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      file,
      state: ok ? 'uploading' : 'failed',
      progress: 0,
      warningText: ok ? '' : this.SPEC_WARNING,
    };


     this.uploads.unshift(item);

    if (ok) {
      this.uploadOne(item).subscribe();
    }
  }

  removeUpload(item: UploadItem) {
    if (item.state === 'uploading') return;
    this.uploads = this.uploads.filter((x) => x.id !== item.id);
  }

  retryUpload(item: UploadItem) {
    item.state = 'uploading';
    item.progress = 0;
    item.warningText = '';

    this.uploadOne(item).subscribe();
  }

  isAnyUploading() {
    return this.uploads.some((u) => u.state === 'uploading');
  }

  get hasFailedUploads(): boolean {
    return this.uploads.some((x) => x.state === 'failed');
  }

  get allUploaded(): boolean {
    return this.uploads.length > 0 && this.uploads.every((x) => x.state === 'uploaded');
  }

  get canConfirmUpload(): boolean {
    return this.uploads.length > 0 && !this.isAnyUploading() && !this.hasFailedUploads && this.allUploaded;
  }

  confirmUpload() {
    if (!this.canConfirmUpload) return;
    this.uploadState = 'success';
  }

  private uploadOne(item: UploadItem) {
    item.state = 'uploading';
    item.progress = 0;
    item.warningText = '';

    return this.api.importCompleteExcel(item.file).pipe(
      tap((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? item.file.size ?? 1;
          const loaded = event.loaded ?? 0;
          const pct = Math.round((100 * loaded) / total);
          item.progress = Math.max(0, Math.min(100, pct));
        }

        if (event.type === HttpEventType.Response) {
          item.progress = 100;
          item.state = 'uploaded';
        }
      }),
      catchError((err) => {
        this.markFailed(item, err);
        return of(null);
      }),
      finalize(() => {
        if (item.state === 'uploading') {
          this.markFailed(item, null);
        }
      })
    );
  }

  private markFailed(item: UploadItem, err: any) {
    item.state = 'failed';
    item.progress = 0;

    const msg =
      err?.error?.message ??
      err?.error?.errors?.[0] ??
      err?.message ??
      this.SPEC_WARNING;

    item.warningText = String(msg);
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

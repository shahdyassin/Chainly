import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, tap, takeUntil } from 'rxjs/operators';
import { Router, RouterModule } from '@angular/router';
import {
  OrdersService,
  OrderRow,
  OrderStatusTab,
  OrderStatusApi,
} from '../../../../core/services/orders.service';
import { AppEventsService } from '../../../../core/services/app-events.service';

type PageItem = number | '...';

type UploadState = 'uploading' | 'uploaded' | 'failed';

type UploadItem = {
  uid: number;
  file: File;
  state: UploadState;
  progress: number;
  warningText: string;
};

type ImportStep = 'instructions' | 'upload' | 'success';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './orders-list.html',
  styleUrl: './orders-list.scss',
})
export class OrdersList implements OnInit, OnDestroy {
  private ordersApi = inject(OrdersService);
  private events = inject(AppEventsService);
  private router = inject(Router);

  private destroy$ = new Subject<void>();
  private search$ = new Subject<string>();

  searchText = '';
  activeTab: OrderStatusTab = 'all';
  pageNumber = 1;
  pageSize = 10;

  orders: OrderRow[] = [];
  totalCount = 0;
  totalPages = 1;

  tabCounts = {
    all: 0,
    delivered: 0,
    cancelled: 0,
    inTransit: 0,
    pending: 0,
    shipped: 0,
  };

  isImportOpen = false;
  importStep: ImportStep = 'instructions';
  uploads: UploadItem[] = [];
  private uidSeq = 1;

  isDeleteOpen = false;
  deleteTarget: OrderRow | null = null;
  isDeleting = false;

  ngOnInit(): void {

    this.search$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((txt) => {
        this.searchText = txt;
        this.pageNumber = 1;
        this.reloadAll();
      });


    this.reloadAll();


    this.events.ordersChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageNumber = 1;
        this.reloadAll();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }



  onSearchChange(value?: string) {
    this.search$.next(String(value ?? this.searchText ?? '').trim());
  }


  setTab(tab: OrderStatusTab) {
    this.activeTab = tab;
    this.pageNumber = 1;
    this.loadOrders();
  }


  goToPage(p: any) {
    const n = Number(p);
    if (!Number.isFinite(n)) return;

    const next = Math.max(1, Math.min(this.totalPages, Math.floor(n)));
    if (next === this.pageNumber) return;

    this.pageNumber = next;
    this.loadOrders();
  }

  prevPage() {
    if (this.pageNumber === 1) return;
    this.goToPage(this.pageNumber - 1);
  }

  nextPage() {
    if (this.pageNumber === this.totalPages) return;
    this.goToPage(this.pageNumber + 1);
  }


  viewOrder(row: OrderRow) {
    if (!row?.id) return;
    this.router.navigate(['/dashboard/orders', row.id]);
  }


  openDelete(row: OrderRow) {
    this.deleteTarget = row;
    this.isDeleteOpen = true;
  }

  closeDelete() {
    if (this.isDeleting) return;
    this.isDeleteOpen = false;
    this.deleteTarget = null;
  }

  confirmDelete() {
    if (!this.deleteTarget || this.isDeleting) return;

    this.isDeleting = true;
    const id = Number(this.deleteTarget.id);

    this.ordersApi
      .deleteOrder(id)
      .pipe(
        finalize(() => {
          this.isDeleting = false;
          this.isDeleteOpen = false;
          this.deleteTarget = null;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.pageNumber = 1;
          this.reloadAll();
          this.events.notifyOrdersChanged();
        },
        error: (err) => {
          console.error('Delete failed', err);
        },
      });
  }

  toggleAll(_ev: any) {}


  get startIndex(): number {
    return this.totalCount ? (this.pageNumber - 1) * this.pageSize : 0;
  }

  get endIndex(): number {
    if (!this.totalCount) return 0;
    return Math.min(this.startIndex + this.orders.length, this.totalCount);
  }

  get pagedOrders(): OrderRow[] {
    return this.orders;
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

  statusClass(status: string) {
    const k = String(status ?? '').trim().replace(/\s+/g, '').toLowerCase();
    if (k === 'delivered') return 'delivered';
    if (k === 'cancelled' || k === 'canceled') return 'cancelled';
    if (k === 'intransit') return 'intransit';
    if (k === 'pending') return 'pending';
    if (k === 'shipped') return 'shipped';
    return '';
  }


  private reloadAll() {
    this.loadOrders();
    this.loadTabCounts();
  }

  private loadOrders() {
    const apiStatus = this.mapTabToApiStatus(this.activeTab);

    this.ordersApi
      .getOrders({
        pageNumber: this.pageNumber,
        pageSize: this.pageSize,
        status: apiStatus,
        search: this.searchText,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.orders = res.items ?? [];

          this.totalCount = res.totalCount ?? 0;
          this.totalPages = res.totalPages ?? 1;


          if (this.pageNumber > this.totalPages) {
            this.pageNumber = this.totalPages;
          }
        },
        error: () => {
          this.orders = [];
          this.totalCount = 0;
          this.totalPages = 1;
        },
      });
  }

  private filterByActiveTab(items: OrderRow[]): OrderRow[] {
    if (this.activeTab === 'all') return items;

    const need = this.mapTabToApiStatus(this.activeTab);
    if (!need) return items;

    const needKey = String(need).trim().toLowerCase();
    return items.filter(
      (x) => String(x.status ?? '').trim().toLowerCase() === needKey
    );
  }

  private loadTabCounts() {
    const q = this.searchText;

    this.ordersApi
      .getOrders({ pageNumber: 1, pageSize: 500, search: q }) 
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      )
      .subscribe((res: any) => {
        if (!res) {
          this.tabCounts = {
            all: 0,
            delivered: 0,
            cancelled: 0,
            inTransit: 0,
            pending: 0,
            shipped: 0,
          };
          return;
        }

        const list: OrderRow[] = res.items ?? [];

        const normalize = (s: any) =>
          String(s ?? '').trim().replace(/\s+/g, '').toLowerCase();

        const countBy = (key: string) =>
          list.filter((x) => normalize(x.status) === normalize(key)).length;

        this.tabCounts = {
          all: list.length,
          delivered: countBy('Delivered'),
          cancelled: countBy('Cancelled'),
          inTransit: countBy('InTransit'),
          pending: countBy('Pending'),
          shipped: countBy('Shipped'),
        };
      });
  }


  private mapTabToApiStatus(tab: OrderStatusTab): OrderStatusApi {
    if (tab === 'delivered') return 'Delivered';
    if (tab === 'cancelled') return 'Cancelled';
    if (tab === 'inTransit') return 'InTransit';
    if (tab === 'pending') return 'Pending';
    if (tab === 'shipped') return 'Shipped';
    return null;
  }


  openImport() {
    this.isImportOpen = true;
    this.importStep = 'instructions';
    this.uploads = [];
  }

  closeImport() {
    if (this.isAnyUploading()) return;
    this.isImportOpen = false;
  }

  openUploadStep() {
    this.importStep = 'upload';
  }

  continueAfterSuccess() {
    this.isImportOpen = false;
    this.importStep = 'instructions';
    this.uploads = [];
    this.reloadAll();
  }


  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  onDropFile(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();

    const files: File[] = Array.from(ev.dataTransfer?.files ?? []).filter(
      (f): f is File => f instanceof File
    );

    this.addFiles(files);
  }

  onBrowseFile(ev: any) {
    const files: File[] = Array.from((ev?.target?.files ?? []) as FileList).filter(
      (f): f is File => f instanceof File
    );

    this.addFiles(files);
    ev.target.value = '';
  }

  private addFiles(files: File[]) {
    if (!files.length) return;

    for (const f of files) {
      const name = (f.name || '').toLowerCase();
      const ok = name.endsWith('.xlsx') || name.endsWith('.xls');

      const item: UploadItem = {
        uid: this.uidSeq++,
        file: f,
        state: ok ? 'uploading' : 'failed',
        progress: 0,
        warningText: ok ? '' : `This file doesn't match the required specifications. Please upload a valid file`,
      };

      this.uploads.unshift(item);

      if (ok) {
        this.uploadOne(item).subscribe();
      }
    }
  }

  removeUpload(item: UploadItem) {
    this.uploads = this.uploads.filter((x) => x.uid !== item.uid);
  }

  retryUpload(item: UploadItem) {
    item.state = 'uploading';
    item.progress = 0;
    item.warningText = '';
    this.uploadOne(item).subscribe();
  }

  isAnyUploading() {
    return this.uploads.some((x) => x.state === 'uploading');
  }

  confirmUpload() {
    if (!this.canConfirmUpload) return;

    this.importStep = 'success';
    this.pageNumber = 1;
    this.reloadAll();
    this.events.notifyOrdersChanged();
  }

  private uploadOne(item: UploadItem) {
    item.state = 'uploading';
    item.progress = 0;
    item.warningText = '';

    return this.ordersApi.importOrders(item.file).pipe(
      tap((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? item.file.size ?? 1;
          const pct = Math.round((100 * (event.loaded ?? 0)) / total);
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
          item.state = 'failed';
          item.progress = 0;
          if (!item.warningText) item.warningText = 'Upload failed';
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
      `This file doesn't match the required specifications. Please upload a valid file`;

    item.warningText = String(msg);
  }

  trackByUploadId(_: number, x: UploadItem) {
    return x.uid;
  }

  formatSize(bytes: number) {
    const n = Number(bytes ?? 0);
    if (!n) return '0 B';
    const kb = n / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;

    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    if (mb >= 1) return `${mb.toFixed(0)} MB`;
    if (kb >= 1) return `${kb.toFixed(0)} KB`;
    return `${n} B`;
  }

  get hasFailedUploads(): boolean {
    return this.uploads.some((x) => x.state === 'failed');
  }

  get allUploadsDone(): boolean {
    return this.uploads.length > 0 && this.uploads.every((x) => x.state === 'uploaded');
  }

  get canConfirmUpload(): boolean {
    return this.uploads.length > 0 && !this.isAnyUploading() && !this.hasFailedUploads && this.allUploadsDone;
  }



  goEdit(row: OrderRow) {
    if (!row?.id) return;
    this.router.navigate(['/dashboard/orders', row.id, 'edit']);
  }

}

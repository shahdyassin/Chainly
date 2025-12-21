import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { forkJoin, from, of } from 'rxjs';
import { catchError, concatMap, finalize, tap } from 'rxjs/operators';
import {
  OrdersService,
  OrderRow,
  OrderStatusTab,
  OrderStatusApi,
} from '../../../../core/services/orders.service';
import { AppEventsService } from '../../../../core/services/app-events.service';

type PageItem = number | '...';

type UploadState = 'idle' | 'uploading' | 'failed';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './orders-list.html',
  styleUrl: './orders-list.scss',
})
export class OrdersList implements OnInit {
  private ordersApi = inject(OrdersService);
  private events = inject(AppEventsService);


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
    this.reloadAll();

    this.events.ordersChanged$.subscribe(() => {
      this.pageNumber = 1;
      this.reloadAll();
    });
  }


  onSearchChange() {
    this.pageNumber = 1;
    this.reloadAll();
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
    console.log('View order', row);
  }

  editOrder(row: OrderRow) {
    console.log('Edit order', row);
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
        })
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
    this.loadTabCounts();
    this.loadOrders();
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
      .subscribe({
        next: (res) => {
          const filtered = this.filterByActiveTab(res.items ?? []);
          this.orders = filtered;

          this.totalCount = res.totalCount ?? 0;
          this.totalPages = res.totalPages ?? 1;

          if (this.pageNumber > this.totalPages) {
            this.pageNumber = this.totalPages;
            this.loadOrders();
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

    const reqAll = this.ordersApi.getOrders({ pageNumber: 1, pageSize: 1, search: q });
    const reqDelivered = this.ordersApi.getOrders({ pageNumber: 1, pageSize: 1, status: 'Delivered', search: q });
    const reqCancelled = this.ordersApi.getOrders({ pageNumber: 1, pageSize: 1, status: 'Cancelled', search: q });
    const reqInTransit = this.ordersApi.getOrders({ pageNumber: 1, pageSize: 1, status: 'InTransit', search: q });
    const reqPending = this.ordersApi.getOrders({ pageNumber: 1, pageSize: 1, status: 'Pending', search: q });
    const reqShipped = this.ordersApi.getOrders({ pageNumber: 1, pageSize: 1, status: 'Shipped', search: q });

    forkJoin({
      all: reqAll,
      delivered: reqDelivered,
      cancelled: reqCancelled,
      inTransit: reqInTransit,
      pending: reqPending,
      shipped: reqShipped,
    }).subscribe({
      next: (x) => {
        this.tabCounts = {
          all: x.all.totalCount ?? 0,
          delivered: x.delivered.totalCount ?? 0,
          cancelled: x.cancelled.totalCount ?? 0,
          inTransit: x.inTransit.totalCount ?? 0,
          pending: x.pending.totalCount ?? 0,
          shipped: x.shipped.totalCount ?? 0,
        };
      },
      error: () => {
        this.tabCounts = { all: 0, delivered: 0, cancelled: 0, inTransit: 0, pending: 0, shipped: 0 };
      },
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

      this.uploads.unshift({
        uid: this.uidSeq++,
        file: f,
        state: ok ? 'idle' : 'failed',
        progress: 0,
        warningText: ok ? '' : `This file doesn't match the required specifications. Please upload a valid file`,
      });
    }
  }

  removeUpload(item: UploadItem) {
    this.uploads = this.uploads.filter((x) => x.uid !== item.uid);
  }

  retryUpload(item: UploadItem) {
    item.state = 'idle';
    item.progress = 0;
    item.warningText = '';
  }

  isAnyUploading() {
    return this.uploads.some((x) => x.state === 'uploading');
  }

  confirmUpload() {
    if (!this.uploads.length) return;

    const queue = this.uploads.filter((x) => x.state === 'idle');
    if (!queue.length) return;

    let anyFailed = false;

    from(queue)
      .pipe(
        concatMap((item) =>
          this.uploadOne(item).pipe(
            catchError((err) => {
              anyFailed = true;
              this.markFailed(item, err);
              return of(null);
            })
          )
        ),
        finalize(() => {
          const hasUploading = this.uploads.some((x) => x.state === 'uploading');
          const hasFailed = this.uploads.some((x) => x.state === 'failed');

          if (!hasUploading && !hasFailed && !anyFailed && this.uploads.length) {
            this.importStep = 'success';
          }
        })
      )
      .subscribe();
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
          item.state = 'idle';

          this.pageNumber = 1;
          this.reloadAll();
          this.events.notifyOrdersChanged();
        }
      }),
      finalize(() => {
        if (item.state === 'uploading') item.state = 'idle';
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
}

import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, map, catchError, throwError, of } from 'rxjs';

const API_BASE = 'https://chainly.azurewebsites.net';

export type OrderStatusTab =
  | 'all'
  | 'delivered'
  | 'cancelled'
  | 'inTransit'
  | 'pending'
  | 'shipped';

export type OrderStatusApi =
  | 'Delivered'
  | 'Cancelled'
  | 'InTransit'
  | 'Pending'
  | 'Shipped'
  | null;

export type OrderRow = {
  id: number;
  companyOrderId: number;
  orderId: string;
  publicCode: string;
  status: string;
};

export type OrdersPagedResponse = {
  items: OrderRow[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type TrackingRow = {
  status: string;
  location: string;
  scannedBy: string;
  notes: string;
  date: string;
};

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private http = inject(HttpClient);


  getOrders(args: {
    pageNumber: number;
    pageSize: number;
    status?: OrderStatusApi;
    search?: string;
  }): Observable<OrdersPagedResponse> {
    const { pageNumber, pageSize, status, search } = args;

    let params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    if (status) params = params.set('status', status);

    const q = String(search ?? '').trim();
    if (q) params = params.set('search', q);

    return this.http
      .get<any>(`${API_BASE}/api/Orders`, { params })
      .pipe(map((res) => this.normalizePagedResponse(res)));
  }


  getOrderById(id: number): Observable<OrderRow> {
    if (!id || id <= 0) return throwError(() => new Error('Invalid order ID'));

    return this.getOrders({ pageNumber: 1, pageSize: 99999 }).pipe(
      map((res) => {
        const found = (res.items ?? []).find((x) => x.id === id);
        if (!found) throw new Error('Order not found');
        return found;
      })
    );
  }


  getOrderTracking(companyOrderId: number): Observable<TrackingRow[]> {
    if (!companyOrderId || companyOrderId <= 0) {
      return throwError(() => new Error('Invalid companyOrderId'));
    }

    return this.http
      .get<any>(`${API_BASE}/api/Orders/${companyOrderId}/tracking`)
      .pipe(
        map((res) => {

          const root = res?.data ?? res?.result ?? res ?? {};
          const list = root?.trackings ?? root?.Trackings ?? [];

          const arr = Array.isArray(list) ? list : [];

          return arr.map((x: any) => ({
            status: String(x?.status ?? x?.Status ?? '').trim(),
            location: String(x?.location ?? x?.Location ?? '').trim(),
            scannedBy: String(x?.scannedBy ?? x?.ScannedBy ?? '').trim(),
            notes: String(x?.notes ?? x?.Notes ?? '').trim(),
            date: String(x?.date ?? x?.Date ?? x?.createdAt ?? '').trim(),
          })) as TrackingRow[];
        }),
        catchError(() => of([]))
      );
  }


  importOrders(file: File): Observable<HttpEvent<any>> {
    const form = new FormData();
    form.append('file', file);

    return this.http.post<any>(`${API_BASE}/api/Orders/import`, form, {
      reportProgress: true,
      observe: 'events',
    });
  }


getOrderIdsForNav(search: string = ''): Observable<number[]> {
  return this.getOrders({
    pageNumber: 1,
    pageSize: 99999,
    search,
  }).pipe(map((res) => (res.items ?? []).map((x) => x.id)));
}



  deleteOrder(id: number): Observable<any> {
    if (!id || id <= 0) return throwError(() => new Error('Invalid order ID'));

    const orderId = String(id);

    const primary$ = this.http.delete(`${API_BASE}/api/Orders/${orderId}`, {
      responseType: 'text',
    });

    const fallbackQuery$ = this.http.delete(`${API_BASE}/api/Orders`, {
      params: new HttpParams().set('id', orderId),
      responseType: 'text',
    });

    const fallbackDeletePath$ = this.http.delete(
      `${API_BASE}/api/Orders/delete/${orderId}`,
      { responseType: 'text' }
    );

    return primary$.pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404 || err.status === 400 || err.status === 405) {
          return fallbackQuery$.pipe(catchError(() => fallbackDeletePath$));
        }
        return throwError(() => err);
      })
    );
  }


  private normalizePagedResponse(res: any): OrdersPagedResponse {
    const root = res?.data ?? res?.result ?? res ?? {};

    const itemsRaw =
      root?.items ??
      root?.Items ??
      root?.orders ??
      root?.Orders ??
      root?.value ??
      [];

    const arr = Array.isArray(itemsRaw) ? itemsRaw : [];

    const items: OrderRow[] = arr.map((x: any) => {
      return {
        id: Number(x?.id ?? x?.Id ?? 0),
        companyOrderId: Number(x?.companyOrderId ?? x?.CompanyOrderId ?? x?.orderId ?? x?.OrderId ?? 0),
        orderId: String(x?.orderId ?? x?.OrderId ?? '').trim(),
        publicCode: String(x?.publicCode ?? x?.PublicCode ?? x?.code ?? x?.Code ?? '').trim(),
        status: String(x?.status ?? x?.Status ?? x?.lastStatus ?? x?.LastStatus ?? '').trim(),
      };
    });

    return {
      items,
      pageNumber: Number(root?.pageNumber ?? 1),
      pageSize: Number(root?.pageSize ?? 10),
      totalCount: Number(root?.totalCount ?? items.length),
      totalPages: Number(root?.totalPages ?? 1),
    };
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpEvent, HttpErrorResponse } from '@angular/common/http';
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
  orderId: string;
  publicCode: string;
  status: 'Delivered' | 'Cancelled' | 'InTransit' | 'Pending' | 'Shipped' | string;
};

export type OrdersPagedResponse = {
  items: OrderRow[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
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


  importOrders(file: File): Observable<HttpEvent<any>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<any>(`${API_BASE}/api/Orders/import`, form, {
      reportProgress: true,
      observe: 'events',
    });
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


    const fallbackDeletePath$ = this.http.delete(`${API_BASE}/api/Orders/delete/${orderId}`, {
      responseType: 'text',
    });

    return primary$.pipe(
      catchError((err: HttpErrorResponse) => {

        if (err.status === 404 || err.status === 400 || err.status === 405) {
          return fallbackQuery$.pipe(
            catchError(() => fallbackDeletePath$)
          );
        }
        return throwError(() => err);
      })
    );
  }


  private normalizeStatus(raw: any): string {
    const s = String(raw ?? '').trim();
    const k = s.replace(/\s+/g, '').toLowerCase();
    if (k === 'delivered') return 'Delivered';
    if (k === 'cancelled' || k === 'canceled') return 'Cancelled';
    if (k === 'intransit') return 'InTransit';
    if (k === 'pending') return 'Pending';
    if (k === 'shipped') return 'Shipped';
    return s;
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
      const id = Number(x?.id ?? x?.Id ?? 0);
      const orderIdVal =
        x?.orderId ?? x?.OrderId ?? x?.orderID ?? x?.OrderID ?? '';
      const codeVal =
        x?.code ?? x?.Code ?? x?.publicCode ?? x?.PublicCode ?? '';
      const stRaw =
        x?.lastStatus ??
        x?.LastStatus ??
        x?.status ??
        x?.Status ??
        '';
      return {
        id,
        orderId: String(orderIdVal).trim(),
        publicCode: String(codeVal).trim(),
        status: this.normalizeStatus(stRaw),
      };
    });

    const pageNumber = Number(root?.pageNumber ?? root?.PageNumber ?? 1);
    const pageSize = Number(
      root?.pageSize ??
        root?.PageSize ??
        (items.length > 0 ? items.length : 10)
    );
    const totalCount = Number(
      root?.totalCount ??
        root?.TotalCount ??
        root?.count ??
        root?.Count ??
        items.length
    );
    const totalPages = Number(
      root?.totalPages ??
        root?.TotalPages ??
        (pageSize ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1)
    );

    return {
      items,
      pageNumber: Number.isFinite(pageNumber) ? pageNumber : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 10,
      totalCount: Number.isFinite(totalCount) ? totalCount : items.length,
      totalPages: Number.isFinite(totalPages) ? totalPages : 1,
    };
  }
}

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
  id: number;
  status: string;
  location: string;
  scannedBy: string;
  notes: string;
  date: string;
  latitude?: number;
  longitude?: number;
};

export type UpdateOrderPayload = {
  companyOrderId: number;
  code: string;
  phone?: string | null;
  email?: string | null;
  status?: number | null;
};

export type UpdateTrackingPayload = {
  latitude: number;
  longitude: number;
  status: number;
  notes: string;
};

export type TrackingApiResponse = {
  id: number;
  companyOrderId: number;
  code: string;
  email?: string | null;
  phone?: string | null;
  status?: number | string | null;
  trackings: TrackingRow[];
};

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private http = inject(HttpClient);
  private SAFE_MAX = 500;

  getOrders(args: {
    pageNumber: number;
    pageSize: number;
    status?: OrderStatusApi;
    search?: string;
  }): Observable<OrdersPagedResponse> {
    const { pageNumber, pageSize, status, search } = args;

    const safeSize = Math.min(Number(pageSize || 10), this.SAFE_MAX);

    let params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(safeSize));

    if (status) params = params.set('status', status);

    const q = String(search ?? '').trim();
    if (q) params = params.set('search', q);

    return this.http
      .get<any>(`${API_BASE}/api/Orders`, { params })
      .pipe(map((res) => this.normalizePagedResponse(res)));
  }

  
  getOrderById(id: number): Observable<OrderRow> {
    if (!id || id <= 0) return throwError(() => new Error('Invalid order ID'));

    return this.http.get<any>(`${API_BASE}/api/Orders/${id}`).pipe(
      map((res) => {
        const root = res?.data ?? res?.result ?? res ?? {};

        const companyId = Number(root?.companyOrderId ?? root?.CompanyOrderId ?? root?.OrderId ?? 0);

        return {
          id: Number(root?.id ?? root?.Id ?? 0),
          companyOrderId: companyId,
          orderId: String(companyId || ''),
          publicCode: String(root?.publicCode ?? root?.PublicCode ?? root?.Code ?? '').trim(),
          status: String(root?.status ?? root?.Status ?? root?.LastStatus ?? '').trim() || 'Pending',
        } as OrderRow;
      })
    );
  }

  getOrderWithTracking(orderId: number): Observable<TrackingApiResponse> {
    if (!orderId || orderId <= 0) {
      return of({
        id: 0,
        companyOrderId: 0,
        code: '',
        email: null,
        phone: null,
        status: null,
        trackings: [],
      });
    }

    return this.http
      .get<any>(`${API_BASE}/api/Orders/${orderId}/tracking`)
      .pipe(
        map((res) => {
          const root = res?.data ?? res?.result ?? res ?? {};
          const trackingsRaw = Array.isArray(root?.trackings) ? root.trackings : [];

          const trackings: TrackingRow[] = trackingsRaw.map((x: any) => ({
            id: Number(x?.id ?? 0),
            status: String(x?.status ?? '').trim(),
            location: String(x?.location ?? '').trim(),
            scannedBy: String(x?.updatedBy?.fullName ?? '').trim(),
            notes: String(x?.notes ?? '').trim(),
            date: String(x?.timestamp ?? '').trim(),
            latitude: Number(x?.latitude ?? 0),
            longitude: Number(x?.longitude ?? 0),
          }));

          return {
            id: Number(root?.id ?? 0),
            companyOrderId: Number(root?.companyOrderId ?? 0),
            code: String(root?.code ?? '').trim(),
            email: root?.email ?? null,
            phone: root?.phone ?? null,
            status: root?.status ?? null,
            trackings,
          } as TrackingApiResponse;
        }),

        catchError((err) => {
          if (err?.status === 404) {
            return of({
              id: 0,
              companyOrderId: orderId,
              code: '',
              email: null,
              phone: null,
              status: null,
              trackings: [],
            } as TrackingApiResponse);
          }
          return throwError(() => err);
        })
      );
  }

  updateOrder(orderId: string | number, payload: UpdateOrderPayload): Observable<any> {
    return this.http.put(`${API_BASE}/api/Orders/${orderId}`, payload, {
      responseType: 'text'
    });
  }

  updateTracking(trackingId: number, payload: UpdateTrackingPayload): Observable<any> {
    return this.http.put(`${API_BASE}/api/Orders/tracking/${trackingId}`, payload, {
      responseType: 'text'
    });
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

  getOrderIdsForNav(search: string = ''): Observable<number[]> {
    return this.getOrders({
      pageNumber: 1,
      pageSize: this.SAFE_MAX,
      search,
    }).pipe(map((res) => (res.items ?? []).map((x) => x.id)));
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
      const lastStatus = String(x?.LastStatus ?? x?.lastStatus ?? '').trim();
      const companyId = Number(x?.OrderId ?? x?.orderId ?? 0);

      return {
        id: Number(x?.Id ?? x?.id ?? 0),
        companyOrderId: companyId,
        orderId: String(companyId || ''),
        publicCode: String(x?.Code ?? x?.code ?? '').trim(),
        status: lastStatus || 'Pending',
      } as OrderRow;
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

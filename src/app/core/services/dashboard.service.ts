import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Order {
  id: number;
  orderId: number;
  code: string;
  lastStatus: any;
  createdAt?: string;
}

export interface OrdersListResponse {
  items?: Order[];
  totalPages?: number;
  totalCount?: number;
}

export interface OrdersSummaryResponse {
  deliveredOrders: number;
  deliveredOrdersChange: number;
  pendingOrders: number;
  pendingOrdersChange: number;
  cancelledOrders: number;
  cancelledOrdersChange: number;
  totalPlacedOrders: number;
  totalPlacedOrdersChange: number;
}

export interface OrdersMonthlyStatsResponse {
  year: number;
  monthly: number[];
  years: number[];
}

export interface MonthlySummaryLine {
  productionLineId: number;
  productionLineName: string;
  totalProducts: number;
  defectiveProductsCount: number;
  nonDefectiveProductsCount: number;
}

export interface MonthlySummaryResponse {
  totalProducts: number;
  defectiveProducts: number;
  nonDefectiveProducts: number;
  month: number;
  year: number;
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  items: MonthlySummaryLine[];
}

export interface TopProductResponseItem {
  id?: number;
  productId?: number;
  product_id?: number;
  productName: string;
  inStock: number;
  increasePercent: number;
}

export interface PredictionResponse {
  product_id: number;
  predicted_change_percentage: number;
  prediction_date: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apiBase = 'https://chainly.azurewebsites.net/api';
  private demandApiBase =
    'https://demandforecasting.ambitioussky-2e6e4c68.eastus.azurecontainerapps.io';

  constructor(private http: HttpClient) {}


  getOrdersList(pageSize = 1000, search = ''): Observable<OrdersListResponse> {
    const encoded = encodeURIComponent((search || '').trim());
    const url = `${this.apiBase}/Orders?pageNumber=1&pageSize=${pageSize}&search=${encoded}`;
    return this.http.get<OrdersListResponse>(url);
  }

  getOrdersSummary(): Observable<OrdersSummaryResponse> {
    return this.http.get<OrdersSummaryResponse>(`${this.apiBase}/Orders/summary`);
  }

  getOrdersMonthlyStats(year: number): Observable<OrdersMonthlyStatsResponse> {
    return this.http.get<OrdersMonthlyStatsResponse>(
      `${this.apiBase}/Orders/monthly-stats?year=${year}`
    );
  }

  getMonthlySummary(month: number, year: number, pageNumber = 1, pageSize = 10) {
    const url = `${this.apiBase}/Reports/monthly-summary?month=${month}&year=${year}&pageNumber=${pageNumber}&pageSize=${pageSize}`;
    return this.http.get<MonthlySummaryResponse>(url);
  }


  getTopProducts(count = 2) {
    return this.http.get<TopProductResponseItem[] | { items?: TopProductResponseItem[] }>(
      `${this.apiBase}/Products/top/${count}`
    );
  }

  getAllProductsForRisingDemands(pageNumber = 1, pageSize = 10, search = '') {
    const encoded = encodeURIComponent((search || '').trim());
    const url = `${this.apiBase}/Products?pageNumber=${pageNumber}&pageSize=${pageSize}&search=${encoded}`;
    return this.http.get<any[] | { items?: any[] }>(url);
  }


  predictDemand(productId: number | string) {
    return this.http.post<PredictionResponse>(`${this.demandApiBase}/predict`, {
      product_id: productId,
    });
  }


  deleteOrder(orderId: number) {
    return this.http.delete(`${this.apiBase}/Orders/${orderId}`, {
      responseType: 'text' as 'json',
    });
  }

  
  getOrderStatuses() {
    return this.http.get<any[]>(`${this.apiBase}/Orders/statuses`);
  }
}

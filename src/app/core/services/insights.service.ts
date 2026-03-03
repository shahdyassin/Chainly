import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReportsResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  items: ReportItem[];
}

export interface ReportItem {
  reportId: number;
  totalProducts: number;
  goodProducts: number;
  defectiveProducts: number;
  goodRatio: number;
  defectiveRatio: number;
  startedAt: string;
  endedAt: string | null;
  productionLineId: number;
  productionLineName: string;
}

@Injectable({
  providedIn: 'root'
})
export class InsightsService {

  private baseUrl = 'https://chainly.azurewebsites.net/api/Reports';

  constructor(private http: HttpClient) { }

  getReports(
    pageNumber: number,
    pageSize: number,
    search?: string,
    productionLineId?: number | null,
    startDate?: string | null,
    endDate?: string | null
  ): Observable<ReportsResponse> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    if (productionLineId) {
      params = params.set('productionLineId', productionLineId);
    }

    if (startDate) {
      params = params.set('startDate', startDate);
    }

    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<ReportsResponse>(this.baseUrl, { params });
  }
}

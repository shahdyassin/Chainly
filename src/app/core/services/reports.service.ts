import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductionLineReportSummary {
  productionLineId: number;
  productionLineName: string;
  goodProducts: number;
  defectiveProducts: number;
  totalProducts: number;
  goodRatio: number;
  defectiveRatio: number;
}

export interface ProductionLineReportItem {
  reportId: number;
  productionLineName: string;
  totalProducts: number;
  defectiveRatio: number;
  defectiveProducts: number;
  goodRatio: number;
  goodProducts: number;
  startedAt: string;
  endedAt?: string | null;
}

export interface ProductionLineReportResponse {
  summary: ProductionLineReportSummary;
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  items: ProductionLineReportItem[];
}

@Injectable({ providedIn: 'root' })
export class ReportsService {

  private baseUrl =
    'https://chainly.azurewebsites.net/api/Reports';

  constructor(private http: HttpClient) { }

  getProductionLineReport(
    productionLineId: number,
    pageNumber: number,
    pageSize: number,
    startDate?: string,
    endDate?: string
  ): Observable<ProductionLineReportResponse> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (startDate) {
      params = params.set('startDate', startDate);
    }

    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<ProductionLineReportResponse>(
      `${this.baseUrl}/production-line/${productionLineId}`,
      { params }
    );
  }

  deleteReport(reportId: number) {
    return this.http.delete(
      `${this.baseUrl}/${reportId}`
    );
  }
}

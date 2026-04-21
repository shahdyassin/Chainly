import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductionLine {
  id: number;
  lineName: string;
  description: string | null;

  maximumSpeed?: number;
  ratedPower?: number;
  maximumTemperature?: number;
  maximumCurrent?: number;
}

export interface PagedResponse<T> {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  items: T[];
}

@Injectable({ providedIn: 'root' })
export class ProductionLinesService {
  private baseUrl = 'https://chainly.azurewebsites.net/api/ProductionLines';

  constructor(private http: HttpClient) {}

getAll(
  pageNumber: number,
  pageSize: number,
  search?: string
): Observable<PagedResponse<ProductionLine>> {

  const cleaned = (search ?? '').trim();

  const params = new HttpParams()
    .set('pageNumber', String(pageNumber))
    .set('pageSize', String(pageSize))

    .set('search', cleaned);

  return this.http.get<PagedResponse<ProductionLine>>(this.baseUrl, { params });
}



create(body: any): Observable<any> {
  return this.http.post(this.baseUrl, body);
}

update(id: number, body: any): Observable<any> {
  return this.http.put(`${this.baseUrl}/${id}`, body);
}

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, { responseType: 'text' as 'json' });
  }
}

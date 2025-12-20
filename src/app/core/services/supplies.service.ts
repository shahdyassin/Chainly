import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MaterialItem {
  id: number;
  name: string;
  carbonFootprint: string;
}

export interface SupplierItem {
  id: number;
  name: string;
  carbonFootprint: string;
}

export interface PagedResponse<T> {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  items: T[];
}

export interface MaterialDetailsResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  item: {
    name: string;
    carbonFootprint: string;
    suppliers: SupplierItem[];
  };
}

@Injectable({ providedIn: 'root' })
export class SuppliesService {
  private baseUrl = 'https://chainly.azurewebsites.net/api/Materials';

  constructor(private http: HttpClient) {}

  getAll(
    pageNumber: number,
    pageSize: number,
    search?: string,
    sortOrder?: string
  ): Observable<PagedResponse<MaterialItem>> {
    const cleaned = (search ?? '').trim();

    let params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    if (cleaned) params = params.set('search', cleaned);
    if (sortOrder) params = params.set('sortOrder', sortOrder);

    return this.http.get<PagedResponse<MaterialItem>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<MaterialDetailsResponse> {
    return this.http.get<MaterialDetailsResponse>(`${this.baseUrl}/${id}`);
  }
}

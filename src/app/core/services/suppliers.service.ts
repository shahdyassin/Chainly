import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface SupplierItem {
  id: number;
  name: string;
  distance: string;
  location: string;
}

export interface SuppliersResponse {
  items: SupplierItem[];
  totalPages: number;
  totalCount: number;
}

export interface SupplierDetails {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  facilityType?: string | null;
  sector?: string | null;
  distance?: string | null;
  location?: string | null;
}

export interface MaterialRow {
  id: number;
  name: string;
  carbonFootprint?: string | null;
}

export interface Paged<T> {
  items: T[];
  totalPages: number;
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface SupplierByIdResponse {
  supplier: SupplierDetails | null;
  materials: Paged<MaterialRow>;
}

// ✅ backend response
export interface ImportCompleteExcelResponse {
  message?: string; // في C# اسمها Message (هنعمل map تحت)
  Message?: string;
  data?: any;
  Data?: {
    SuppliersImported: number;
    MaterialsImported: number;
    RelationshipsImported: number;
    TotalRecords: number;
    CompanyId: number;
  };
}

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private baseUrl = 'https://chainly.azurewebsites.net';
  constructor(private http: HttpClient) {}

  getAll(pageNumber: number, pageSize: number, searchText?: string, sortType?: string | null): Observable<SuppliersResponse> {
    let params = new HttpParams().set('pageNumber', String(pageNumber)).set('pageSize', String(pageSize));

    const search = (searchText ?? '').trim();
    if (search) params = params.set('search', search);

    if (sortType) params = params.set('sortType', String(sortType));

    return this.http.get<any>(`${this.baseUrl}/api/Suppliers`, { params }).pipe(
      map((r) => ({
        items: (r?.items ?? r?.Items ?? []) as SupplierItem[],
        totalPages: Number(r?.totalPages ?? r?.TotalPages ?? 1),
        totalCount: Number(r?.totalCount ?? r?.TotalCount ?? 0),
      }))
    );
  }

  getById(id: number, pageNumber: number, pageSize: number, searchText?: string): Observable<SupplierByIdResponse> {
    let params = new HttpParams().set('pageNumber', String(pageNumber)).set('pageSize', String(pageSize));

    const search = (searchText ?? '').trim();
    if (search) params = params.set('search', search);

    return this.http.get<any>(`${this.baseUrl}/api/Suppliers/${id}`, { params }).pipe(
      map((r) => {
        const sup = r?.supplier ?? r?.Supplier ?? null;
        const mats = r?.materials ?? r?.Materials ?? {};

        return {
          supplier: sup
            ? ({
                id: Number(sup.id),
                name: String(sup.name ?? ''),
                latitude: sup.latitude ?? null,
                longitude: sup.longitude ?? null,
                facilityType: sup.facilityType ?? null,
                sector: sup.sector ?? null,
                distance: sup.distance ?? null,
                location: sup.location ?? sup.Location ?? null,
              } as SupplierDetails)
            : null,
          materials: {
            items: (mats.items ?? mats.Items ?? []) as MaterialRow[],
            totalPages: Number(mats.totalPages ?? mats.TotalPages ?? 1),
            totalCount: Number(mats.totalCount ?? mats.TotalCount ?? 0),
            pageNumber: Number(mats.pageNumber ?? mats.PageNumber ?? pageNumber),
            pageSize: Number(mats.pageSize ?? mats.PageSize ?? pageSize),
          },
        };
      })
    );
  }

  // ✅ DELETE
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/Suppliers/${id}`);
  }

  // ✅ IMPORT (with progress events)
  importCompleteExcel(file: File): Observable<HttpEvent<ImportCompleteExcelResponse>> {
    const form = new FormData();
    form.append('file', file); // لازم اسمها file زي الباك

    const req = new HttpRequest('POST', `${this.baseUrl}/api/Suppliers/import-complete-excel`, form, {
      reportProgress: true,
      responseType: 'json',
    });

    return this.http.request<ImportCompleteExcelResponse>(req);
  }
}

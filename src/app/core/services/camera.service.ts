import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Camera {
  id: number;
  productionLineName: string;
  cameraSource: string;
}

export interface CamerasResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  items: Camera[];
}

@Injectable({ providedIn: 'root' })
export class CamerasService {

  private baseUrl = 'https://chainly.azurewebsites.net/api/Cameras';

  constructor(private http: HttpClient) { }

  getCameras(
    pageNumber: number,
    pageSize: number,
    search: string = '',
    productionLineId?: number
  ): Observable<CamerasResponse> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (search)
      params = params.set('search', search);

    if (productionLineId)
      params = params.set('productionLineId', productionLineId);

    return this.http.get<CamerasResponse>(this.baseUrl, { params });
  }


  createCamera(data: { productionLineId: number; cameraSource: string }) {
    return this.http.post(this.baseUrl, data);
  }

  updateCamera(
    cameraId: number,
    data: { productionLineId: number; cameraSource: string }
  ) {
    return this.http.put(`${this.baseUrl}/${cameraId}`, data);
  }

  deleteCamera(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}

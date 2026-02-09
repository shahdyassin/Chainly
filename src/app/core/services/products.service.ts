import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Product {
  id: number;
  name: string;
  stock: number;
}

export interface ProductsResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  items: Product[];
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private baseUrl = 'https://chainly.azurewebsites.net/api/Products';

  constructor(private http: HttpClient) { }

  getProducts(
    pageNumber: number,
    pageSize: number,
    search: string = '',
    sortByStock: 'asc' | 'desc' | '' = '',
    minStock?: number,
    maxStock?: number
  ): Observable<ProductsResponse> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (search) params = params.set('search', search);
    if (sortByStock) params = params.set('sortByStock', sortByStock);
    if (minStock !== undefined) params = params.set('minStock', minStock);
    if (maxStock !== undefined) params = params.set('maxStock', maxStock);

    return this.http.get<ProductsResponse>(this.baseUrl, { params });
  }
  predictDemand(productId: number) {
    return this.http.post(
      'https://demandforecasting.ambitioussky-2e6e4c68.eastus.azurecontainerapps.io/predict',
      { product_id: productId }
    );
  }



  deleteProduct(productId: number) {
    return this.http.delete(`${this.baseUrl}/${productId}`, {
      responseType: 'text' as 'json'
    });
  }


  importProducts(file: File){
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/import`, formData);
  }
}

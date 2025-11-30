import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private baseUrl = 'https://chainly.azurewebsites.net/api';

  constructor(private http: HttpClient) {}


  getOrders(page: number = 1, size: number = 10): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/Orders?pageNumber=${page}&pageSize=${size}&status=null&search=null`
    );
  }


  getUserProfile(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/Users/${userId}`);
  }


  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Dashboard/Stats`);
  }

  
  getForecasting(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Forecasting`);
  }
}

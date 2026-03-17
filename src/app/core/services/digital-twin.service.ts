import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root'
})
export class DigitalTwinService {

  private http = inject(HttpClient)

  private baseUrl = 'https://chainly.azurewebsites.net/api/Reports/production-lines'

  getProductionLines(pageNumber = 1, pageSize = 10, search = ''): Observable<any> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize)

    if (search) {
      params = params.set('search', search)
    }

    return this.http.get(this.baseUrl, { params })

  }

}

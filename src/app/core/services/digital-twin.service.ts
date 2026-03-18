import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable, BehaviorSubject } from 'rxjs'

@Injectable({
  providedIn: 'root'
})
export class DigitalTwinService {

  private http = inject(HttpClient)

  private baseUrl = 'https://chainly.azurewebsites.net/api/Reports'


  private sessionState = new BehaviorSubject<{ id: number, active: boolean } | null>(null)
  sessionState$ = this.sessionState.asObservable()


  getProductionLines(pageNumber = 1, pageSize = 10, search = ''): Observable<any> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize)

    if (search) {
      params = params.set('search', search)
    }

    return this.http.get(`${this.baseUrl}/production-lines`, { params })
  }


  startSession(lineId: number) {
    return this.http.post(
      `${this.baseUrl}/start-session`,
      null,
      {
        params: { productionLineId: lineId }
      }
    );
  }

  stopSession(reportId: number) {
    return this.http.post(`${this.baseUrl}/${reportId}/close-session`, {})
  }

  updateSessionState(id: number, active: boolean) {
    this.sessionState.next({ id, active })
  }

  getReportDetails(reportId: number) {
    return this.http.get(`${this.baseUrl}/${reportId}`)
  }
  getReportsByLine(lineId: number, pageNumber = 1, pageSize = 10, startDate?: string, endDate?: string) {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize)

    if (startDate) params = params.set('startDate', startDate)
    if (endDate) params = params.set('endDate', endDate)


    return this.http.get(`${this.baseUrl}/production-line/${lineId}`, { params })
  }
}

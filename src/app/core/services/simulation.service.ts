import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductionLine {
  id: number;
  lineName: string;
  maximumSpeed?: number | null;
  ratedPower?: number | null;
  maximumTemperature?: number | null;
  maximumCurrent?: number | null;
}

export interface SimulationRequest {
  productionLineId: number | null;
  maximumSpeed: number | null;
  ratedPower: number | null;
  maximumTemperature: number | null;
  maximumCurrent: number | null;
  throughput: number;
  environmentalTemperature: number;
  operatingTime: number;
  demand: number;
}

export interface SimulationResponse {
  simulation: {
    effectiveThroughput: number;
    load: number;
    production: number;
    temperature: number;
    isOk: boolean;
  };

  aiAnalysis: string;
}

@Injectable({
  providedIn: 'root'
})
export class SimulationService {

  private baseUrl = 'https://chainly.azurewebsites.net/api/Simulation';

  constructor(private http: HttpClient) { }

  getProductionLines(): Observable<any> {
    return this.http.get(
      `https://chainly.azurewebsites.net/api/ProductionLines?pageNumber=1&pageSize=100`
    );
  }

  runSimulation(body: SimulationRequest): Observable<SimulationResponse> {
    return this.http.post<SimulationResponse>(
      `${this.baseUrl}/simulate`,
      body
    );
  }

  createProductionLine(body: any): Observable<any> {
    return this.http.post(
      'https://chainly.azurewebsites.net/api/ProductionLines',
      body
    );
  }
}

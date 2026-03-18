import * as signalR from '@microsoft/signalr';
import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, firstValueFrom } from 'rxjs';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private connection: signalR.HubConnection | null = null;

  private isConnected$ = new BehaviorSubject<boolean>(false);
  private productUpdate$ = new Subject<any>();

  async startConnection(token: string) {
    console.log('startConnection called, already connected:', !!this.connection);
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`https://localhost:7063/hubs/reports`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();


    this.connection.on('ProductCountUpdated', (data) => {
      console.log('SignalR Raw Data:', data);
      this.productUpdate$.next(data);
    });

    try {
      await this.connection.start();
      console.log('SignalR Connected!');
      this.isConnected$.next(true);
    } catch (err) {
      console.error('SignalR Connection Error:', err);
      this.isConnected$.next(false);
    }
  }


  private async ensureConnected() {
    if (this.isConnected$.value) return;
    await firstValueFrom(this.isConnected$.pipe(filter(v => v === true)));
  }

  async joinLine(lineId: number) {
    await this.ensureConnected();
    return this.connection?.invoke('JoinProductionLineGroup', lineId);
  }

  async leaveLine(lineId: number) {
    if (!this.connection || !this.isConnected$.value) return;
    return this.connection.invoke('LeaveProductionLineGroup', lineId);
  }

  onProductUpdate$(): Observable<any> {
    return this.productUpdate$.asObservable();
  }

  async stopConnection() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      this.isConnected$.next(false);
    }
  }
}

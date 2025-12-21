import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppEventsService {
  private ordersChangedSubject = new Subject<void>();
  ordersChanged$ = this.ordersChangedSubject.asObservable();

  notifyOrdersChanged() {
    this.ordersChangedSubject.next();
  }
}

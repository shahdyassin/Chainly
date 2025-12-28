import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HostListener } from '@angular/core';
import {
  Subject,
  switchMap,
  map,
  EMPTY,
  Observable,
  expand,
  takeWhile,
} from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OrdersService, OrderRow } from '../../../../core/services/orders.service';
import { FormsModule } from '@angular/forms';
import { MapPickerComponent } from '../../../../shared/map-picker/map-picker';

type TrackingItem = {
  id: number;
  status: string;
  location: string;
  scannedBy: string;
  notes: string;
  date: Date | null;
  latitude?: number;
  longitude?: number;
  isEditing?: boolean;
};

@Component({
  selector: 'app-order-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MapPickerComponent],
  templateUrl: './order-edit.html',
  styleUrl: './order-edit.scss',
})
export class OrderEdit implements OnInit, OnDestroy {
  private api = inject(OrdersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  orderIdNum = 0;
  order: OrderRow | null = null;

  form = {
    companyOrderId: '',
    publicCode: '',
    status: 'Pending',
  };

  trackings: TrackingItem[] = [];
  isSaving = false;

  showMap = false;
  tempLocation: { lat: number; lng: number } | null = null;
  activeTrackingIndex: number | null = null;

  openedCalendarIndex: number | null = null;

  trackingYearNum = new Date().getFullYear();
  trackingMonthIndex = new Date().getMonth();

  weekDaysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  trackingCalendarCells: any[] = [];

  calendarPos: { top: number; left: number } | null = null;


  private originalCompanyOrderId = 0;


  private currentTrackingCompanyId = 0;



  ngOnInit() {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((pm) => {
          const id = Number(pm.get('id') || 0);
          this.orderIdNum = id;
          return this.fetchOrderByInternalId(id);
        })
      )
      .subscribe({
        next: (o) => {
          if (!o) return;

          this.order = o;


          this.originalCompanyOrderId =
            Number(o.companyOrderId ?? 0) ||
            Number((o as any).OrderId ?? 0) ||
            Number((o as any).orderId ?? 0);


          this.currentTrackingCompanyId = this.originalCompanyOrderId;


          this.form.companyOrderId = String(this.currentTrackingCompanyId);
          this.form.publicCode = o.publicCode || '';
          this.form.status = o.status || 'Pending';

          if (!this.currentTrackingCompanyId || this.currentTrackingCompanyId <= 0) {
            console.warn('Invalid trackingId:', this.currentTrackingCompanyId);
            return;
          }

          console.log('TRACKING REQUEST ID:', this.currentTrackingCompanyId);

          this.api
            .getOrderWithTracking(this.currentTrackingCompanyId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (res: any) => {
                console.log('TRACKING RESPONSE:', res);


                const realCompanyId = Number(res?.companyOrderId ?? 0);

                if (realCompanyId > 0) {
                  this.currentTrackingCompanyId = realCompanyId;
                  this.form.companyOrderId = String(realCompanyId);

                  if (this.order) {
                    this.order.companyOrderId = realCompanyId;
                  }
                }

                const realCode = String(res?.code ?? '').trim();
                if (realCode) this.form.publicCode = realCode;

                const list = Array.isArray(res?.trackings) ? res.trackings : [];

                this.trackings = list
                  .map((x: any) => ({
                    id: Number(x.id),
                    status: String(x.status ?? '').trim(),
                    location: String(x.location ?? '').trim(),
                    scannedBy: String(
                      x.updatedBy?.fullName ??
                        x.updatedBy?.name ??
                        x.scannedBy ??
                        x.user?.fullName ??
                        x.user?.name ??
                        ''
                    ).trim(),
                    notes: String(x.notes ?? '').trim(),
                    date: this.parseTrackingDate(String(x.timestamp ?? '').trim()),
                    latitude: Number(x.latitude ?? 0),
                    longitude: Number(x.longitude ?? 0),
                    isEditing: false,
                  }))
                  .reverse();
              },
              error: (err) => {
                console.error('Tracking fetch error:', err);
                this.trackings = [];
              },
            });
        },
        error: () => {
          this.order = null;
          this.trackings = [];
        },
      });
  }


private isPollingTracking = false;

private refreshTrackingUntilUpdated(trackingId: number, expectedNotes: string) {
  let tries = 0;

  const poll = () => {
    if (this.isPollingTracking) return;
    this.isPollingTracking = true;

    tries++;

    this.api.getOrderWithTracking(this.currentTrackingCompanyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.isPollingTracking = false;

          const list = Array.isArray(res?.trackings) ? res.trackings : [];

          const updated = list.find((x: any) => Number(x.id) === trackingId);
          const notesNow = String(updated?.notes ?? '').trim();

          if (notesNow === expectedNotes.trim()) {
            this.trackings = list
              .map((x: any) => ({
                id: Number(x.id),
                status: String(x.status ?? '').trim(),
                location: String(x.location ?? '').trim(),
                scannedBy: String(
                  x.updatedBy?.fullName ??
                  x.updatedBy?.name ??
                  x.scannedBy ??
                  x.user?.fullName ??
                  x.user?.name ??
                  ''
                ).trim(),
                notes: String(x.notes ?? '').trim(),
                date: this.parseTrackingDate(String(x.timestamp ?? '').trim()),
                latitude: Number(x.latitude ?? 0),
                longitude: Number(x.longitude ?? 0),
                isEditing: false,
              }))
              .reverse();

            console.log("✅ Polling success after tries:", tries);
            return;
          }

          if (tries < 6) {
            setTimeout(poll, 450);
          } else {
            console.warn("⚠️ Polling ended without seeing update");
            this.trackings = list.map((x: any) => ({
              id: Number(x.id),
              status: String(x.status ?? '').trim(),
              location: String(x.location ?? '').trim(),
              scannedBy: String(
                x.updatedBy?.fullName ??
                x.updatedBy?.name ??
                x.scannedBy ??
                x.user?.fullName ??
                x.user?.name ??
                ''
              ).trim(),
              notes: String(x.notes ?? '').trim(),
              date: this.parseTrackingDate(String(x.timestamp ?? '').trim()),
              latitude: Number(x.latitude ?? 0),
              longitude: Number(x.longitude ?? 0),
              isEditing: false,
            })).reverse();
          }
        },
        error: (err) => {
          this.isPollingTracking = false;
          console.error("Refresh tracking failed", err);
        },
      });
  };

  poll();
}



  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

@HostListener('document:click', ['$event'])
closeCalendarOutside(event: MouseEvent) {
  this.openedCalendarIndex = null;
}



saveOrder() {
  if (!this.order || this.isSaving) return;

  this.isSaving = true;

  const newCompanyId = Number(this.form.companyOrderId);
  const oldCompanyId = this.originalCompanyOrderId;

  const payload = {
    companyOrderId: newCompanyId,
    code: String(this.form.publicCode || '').trim(),
    phone: "",
    email: "",
    status: this.mapStatusToNumber(this.form.status),
  };


  this.api.updateOrder(oldCompanyId, payload).subscribe({
    next: () => {
      console.log("✅ Order Updated Successfully");


      this.api.getOrderWithTracking(newCompanyId).subscribe({
        next: (res: any) => {
          console.log("✅ Fresh Tracking Data Received", res);


          this.originalCompanyOrderId = newCompanyId;


          this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate(['/dashboard/orders', this.orderIdNum]);
          });
        },
        error: (err) => {
          console.error("❌ Error fetching new tracking", err);

          this.router.navigate(['/dashboard/orders', this.orderIdNum]);
          this.isSaving = false;
        }
      });
    },
    error: (err) => {
      console.error("❌ Update Order Failed", err);
      this.isSaving = false;
    }
  });
}



  private mapStatusToNumber(status: string): number {
    const s = String(status || '').trim().toLowerCase();
    if (s === 'pending') return 0;
    if (s === 'shipped') return 1;
    if (s === 'intransit' || s === 'in transit') return 2;
    if (s === 'delivered') return 3;
    if (s === 'cancelled' || s === 'canceled') return 4;
    return 0;
  }

  startEditing(index: number) {
    this.trackings = this.trackings.map((t, i) => ({
      ...t,
      isEditing: i === index,
    }));
  }

  finishEditing(index: number) {
    const t = this.trackings[index];
    if (!t) return;
    this.openedCalendarIndex = null;

    const payload = {
      latitude: Number(t.latitude ?? 0),
      longitude: Number(t.longitude ?? 0),
      status: this.mapStatusToNumber(t.status),
      notes: t.notes,
    };

const expectedNotes = t.notes;

this.api.updateTracking(t.id, payload).subscribe({
  next: () => {
        t.isEditing = false;
    console.log("Tracking updated ✅");
    this.refreshTrackingUntilUpdated(t.id, expectedNotes);
  },
  error: (err) => console.error("Update tracking error:", err),
});


  }

  private fetchOrderByInternalId(id: number): Observable<OrderRow | null> {
    const pageSize = 100;
    let pageNumber = 1;

    return this.api.getOrders({ pageNumber, pageSize }).pipe(
      expand((res) => {
        const found = (res.items ?? []).find((x) => x.id === id);
        if (found) return EMPTY;

        pageNumber++;
        if (pageNumber > res.totalPages) return EMPTY;

        return this.api.getOrders({ pageNumber, pageSize });
      }),
      map((res) => (res.items ?? []).find((x) => x.id === id) ?? null),
      takeWhile((order) => order === null, true)
    );
  }

  private parseTrackingDate(raw: string): Date | null {
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }


  statusClass(status: string) {
    const k = String(status ?? '').trim().replace(/\s+/g, '').toLowerCase();
    if (k === 'delivered') return 'delivered';
    if (k === 'cancelled' || k === 'canceled') return 'cancelled';
    if (k === 'intransit') return 'intransit';
    if (k === 'pending') return 'pending';
    if (k === 'shipped') return 'shipped';
    return '';
  }

  statusIcon(status: string) {
    const k = String(status ?? '').trim().replace(/\s+/g, '').toLowerCase();
    if (k === 'pending') return '/icons/orders/pending.svg';
    if (k === 'shipped') return '/icons/orders/shipped.svg';
    if (k === 'intransit') return '/icons/orders/intransit.svg';
    if (k === 'delivered') return '/icons/orders/confirm.svg';
    if (k === 'cancelled' || k === 'canceled')
      return '/icons/orders/cancelled.svg';
    return '/icons/orders/pending.svg';
  }

  updateTrackingDate(t: TrackingItem, raw: string | Date | null) {
    if (!raw) {
      t.date = null;
      return;
    }
    if (raw instanceof Date) {
      t.date = raw;
      return;
    }
    const d = new Date(raw);
    t.date = isNaN(d.getTime()) ? null : d;
  }

  formatDisplayDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  async openMapForTracking(index: number) {
    if (!this.trackings[index]?.isEditing) return;

    this.activeTrackingIndex = index;
    this.tempLocation = null;
    this.showMap = true;

    const address = this.trackings[index]?.location?.trim();
    if (!address) return;

    const coords = await this.geocodeAddress(address);
    if (!coords) return;

    this.tempLocation = coords;

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('map:setCenter', { detail: coords }));
    }, 400);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('map:setCenter', { detail: coords }));
    }, 900);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('map:setCenter', { detail: coords }));
    }, 1500);
  }

  cancelMap() {
    this.showMap = false;
    this.activeTrackingIndex = null;
    this.tempLocation = null;
  }

  onLocationSelected(location: { lat: number; lng: number }) {
    this.tempLocation = location;
  }

  async confirmMapLocation() {
    if (this.activeTrackingIndex == null || !this.tempLocation) return;

    const { lat, lng } = this.tempLocation;
    const label = await this.getPlaceName(lat, lng);

    const t = this.trackings[this.activeTrackingIndex];
    t.location = label;
    t.latitude = lat;
    t.longitude = lng;

    this.cancelMap();
  }

  private getPlaceName(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

    return fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then((res) => res.json())
      .then((data) => data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      .catch(() => `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  }

  private geocodeAddress(address: string) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    return fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.length) return null;
        return {
          lat: Number(data[0].lat),
          lng: Number(data[0].lon),
        };
      })
      .catch(() => null);
  }

  get trackingMonthName(): string {
    return new Date(this.trackingYearNum, this.trackingMonthIndex)
      .toLocaleString('en', { month: 'short' })
      .toUpperCase();
  }

  toggleCalendar(i: number, ev?: MouseEvent) {
    this.openedCalendarIndex = this.openedCalendarIndex === i ? null : i;

    if (this.openedCalendarIndex !== null && ev) {
      const btn = (ev.target as HTMLElement).closest('.date-ico-btn') as HTMLElement;

      if (btn) {
        const rect = btn.getBoundingClientRect();
        const calendarWidth = 260;
        const gap = 8;

const vw = window.innerWidth;
const vh = window.innerHeight;

let left = rect.right - calendarWidth;
let top = rect.bottom + gap;


if (left + calendarWidth > vw - 12) {
  left = vw - calendarWidth - 12;
}


if (left < 12) {
  left = 12;
}


const calendarHeight = 280;
if (top + calendarHeight > vh - 12) {
  top = rect.top - calendarHeight - gap;
}

this.calendarPos = { top, left };

      }
    }
    this.generateTrackingCalendar();
  }

  generateTrackingCalendar() {
    const first = new Date(this.trackingYearNum, this.trackingMonthIndex, 1);
    const last = new Date(this.trackingYearNum, this.trackingMonthIndex + 1, 0);

    const startDay = first.getDay();
    const totalDays = last.getDate();

    const cells: any[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);

    for (let d = 1; d <= totalDays; d++) {
      cells.push({
        day: d,
        date: new Date(this.trackingYearNum, this.trackingMonthIndex, d),
      });
    }

    while (cells.length % 7 !== 0) cells.push(null);
    this.trackingCalendarCells = cells;
  }

  prevMonthTracking() {
    this.trackingMonthIndex--;
    if (this.trackingMonthIndex < 0) {
      this.trackingMonthIndex = 11;
      this.trackingYearNum--;
    }
    this.generateTrackingCalendar();
  }

  nextMonthTracking() {
    this.trackingMonthIndex++;
    if (this.trackingMonthIndex > 11) {
      this.trackingMonthIndex = 0;
      this.trackingYearNum++;
    }
    this.generateTrackingCalendar();
  }

  isToday(date: Date): boolean {
    const now = new Date();
    return date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
  }

  isTrackingSelected(current: any, cellDate: Date): boolean {
    if (!current) return false;
    const d = new Date(current);
    return d.getFullYear() === cellDate.getFullYear() &&
      d.getMonth() === cellDate.getMonth() &&
      d.getDate() === cellDate.getDate();
  }

  selectTrackingDate(t: TrackingItem, date: Date, i: number) {
    if (!t.isEditing) return;
    t.date = date;
    this.updateTrackingDate(t, date);
    this.openedCalendarIndex = null;
  }
}

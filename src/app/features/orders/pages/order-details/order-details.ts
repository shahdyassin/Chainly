import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, switchMap, map, of } from 'rxjs';
import { finalize, takeUntil, catchError } from 'rxjs/operators';
import { OrdersService, OrderRow } from '../../../../core/services/orders.service';

type TrackingItem = {
  status: string;
  location: string;
  scannedBy: string;
  notes: string;
  date: Date | null;
  latitude?: number;
  longitude?: number;
};

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-details.html',
  styleUrl: './order-details.scss',
})
export class OrderDetails implements OnInit, OnDestroy {
  private api = inject(OrdersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  orderIdNum = 0;
  order: OrderRow | null = null;

  trackings: TrackingItem[] = [];
  reversedTrackings: TrackingItem[] = [];

  allOrderIds: number[] = [];
  currentIndex = -1;

  isDeleteOpen = false;
  isDeleting = false;

  // ✅ map
  isMapOpen = false;
  currentMapLocation: { lat: number; lng: number; address: string } | null =
    null;
  private map: any = null;
  private marker: any = null;

  // ✅✅✅ Smart Tracking Fetch (NO ERRORS, NO 404 spam)
 private getTrackingSmart(o: OrderRow) {
  const stored = localStorage.getItem(`order_tracking_id_${o.id}`);
  const storedId = Number(stored ?? 0);

  const companyId = Number(o.companyOrderId ?? 0);
  const orderId = Number(o.orderId ?? 0);

  // ✅ خلي candidates بس أرقام صحيحة ومش صفر
  const candidates = [storedId, companyId]
    .filter((x) => Number.isFinite(x) && x > 0);

  if (!candidates.length) return of(null);

  const tryOne = (i: number): any =>
    this.api.getOrderWithTracking(candidates[i]).pipe(
      catchError((err) => {
        // ✅ لو 404 جرب الرقم اللي بعده
        if (i + 1 < candidates.length) return tryOne(i + 1);
        return of(null);
      })
    );

  return tryOne(0);
}



  ngOnInit() {
    // ✅ keep ids for prev/next nav
    this.api
      .getOrderIdsForNav('')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ids: number[]) => {
          this.allOrderIds = ids ?? [];
          this.currentIndex = this.allOrderIds.indexOf(this.orderIdNum);
        },
      });

    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((pm) => {
          const id = Number(pm.get('id') || 0);
          this.orderIdNum = id;
          this.currentIndex = this.allOrderIds.indexOf(id);

          this.order = null;
          this.trackings = [];
          this.reversedTrackings = [];

          return this.api.getOrders({ pageNumber: 1, pageSize: 500 }).pipe(
            map((res) => {
              const arr = res.items ?? [];
              return arr.find((x) => x.id === id) ?? null;
            }),
            switchMap((o) => {
              this.order = o;

              if (!o) return of(null);

              console.log('ORDER FOUND:', o);

              // ✅ smart tracking
              return this.getTrackingSmart(o);
            })
          );
        })
      )
      .subscribe({
        next: (res: any) => {
          if (!res) {
            this.trackings = [];
            this.reversedTrackings = [];
            return;
          }

const bestTrackingId = Number(res.companyOrderId ?? 0);

if (bestTrackingId > 0 && this.order) {
  localStorage.setItem(
    `order_tracking_id_${this.order.id}`,
    String(bestTrackingId)
  );
}



          const trackings = Array.isArray(res.trackings) ? res.trackings : [];
          const last = trackings.length ? trackings[trackings.length - 1] : null;

          // ✅ update UI from tracking response
          if (this.order) {
           this.order.companyOrderId = Number(res.companyOrderId ?? this.order.companyOrderId ?? 0);

            this.order.publicCode = String(res.code ?? this.order.publicCode ?? '-');

            this.order.status = String(last?.status ?? this.order.status ?? 'Pending');

          }

         this.trackings = trackings.map((x: any) => ({
  status: String(x.status ?? '').trim(),
  location: String(x.location ?? '').trim(),

  // ✅ اسم الشخص من أي مصدر
  scannedBy: String(
    x.updatedBy?.fullName ??
    x.updatedBy?.name ??
    x.scannedBy ??
    x.user?.fullName ??
    x.user?.name ??
    ''
  ).trim(),

  notes: String(x.notes ?? '').trim(),

  // ✅ التاريخ من أي مصدر
  date: this.parseTrackingDate(
    String(
      x.timestamp ??
      x.date ??
      x.updatedAt ??
      x.createdAt ??
      ''
    ).trim()
  ),

  latitude: Number(x.latitude ?? 0),
  longitude: Number(x.longitude ?? 0),
}));


          this.reversedTrackings = this.trackings.slice().reverse();
        },
        error: (err) => {
          console.error(err);
          this.order = null;
          this.trackings = [];
          this.reversedTrackings = [];
        },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private parseTrackingDate(raw: string): Date | null {
    if (!raw) return null;

    const match = raw.match(
      /(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})\s*-\s*(\d{1,2}):(\d{2})(AM|PM)/i
    );

    if (!match) {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }

    const day = Number(match[1]);
    const monthName = match[2].toLowerCase().slice(0, 3);
    const year = Number(match[3]);
    let hour = Number(match[4]);
    const minute = Number(match[5]);
    const ampm = match[6].toUpperCase();

    const months: any = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };

    const month = months[monthName];
    if (month === undefined) return null;

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    return new Date(year, month, day, hour, minute);
  }

  // ✅ nav
  canPrev() {
    return this.currentIndex > 0;
  }

  canNext() {
    return this.currentIndex >= 0 && this.currentIndex < this.allOrderIds.length - 1;
  }

  prevOrder() {
    if (!this.canPrev()) return;
    const id = this.allOrderIds[this.currentIndex - 1];
    this.router.navigate(['/dashboard/orders', id]);
  }

  nextOrder() {
    if (!this.canNext()) return;
    const id = this.allOrderIds[this.currentIndex + 1];
    this.router.navigate(['/dashboard/orders', id]);
  }

  // ✅ delete
  openDelete() {
    this.isDeleteOpen = true;
  }

  closeDelete() {
    if (this.isDeleting) return;
    this.isDeleteOpen = false;
  }

  confirmDelete() {
    if (!this.order || this.isDeleting) return;

    this.isDeleting = true;
    const id = Number(this.order.id);

    this.api
      .deleteOrder(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isDeleting = false;
          this.isDeleteOpen = false;
        })
      )
      .subscribe({
        next: () => this.router.navigate(['/dashboard/orders']),
        error: (err) => console.error('Delete failed', err),
      });
  }

  // ✅ status helpers
  statusClass(status: string) {
    const k = String(status ?? '').trim().replace(/\s+/g, '').toLowerCase();
    if (k === 'delivered') return 'delivered';
    if (k === 'cancelled' || k === 'canceled') return 'cancelled';
    if (k === 'intransit') return 'intransit';
    if (k === 'pending') return 'pending';
    if (k === 'shipped') return 'shipped';
    return '';
  }

  getStatusIcon(status: string): string {
    const s = this.statusClass(status);
    return `/icons/orders/${s || 'pending'}.svg`;
  }

  // ✅ map
  openMap(t: TrackingItem) {
    if (!t.location) return;

    if (t.latitude && t.longitude) {
      this.currentMapLocation = { lat: t.latitude, lng: t.longitude, address: t.location };
      this.showMap();
      return;
    }

    const coordMatch = t.location.match(/([\d.]+),\s*([\d.]+)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      this.currentMapLocation = { lat, lng, address: t.location };
      this.showMap();
      return;
    }

    this.getCoordsFromAddress(t.location).then((coords) => {
      if (coords) {
        this.currentMapLocation = { ...coords, address: t.location };
        this.showMap();
      } else {
        alert('Could not find location on map');
      }
    });
  }

  private showMap() {
    this.isMapOpen = true;
    setTimeout(() => this.initMap(), 50);
  }

  closeMap() {
    this.isMapOpen = false;
    this.currentMapLocation = null;
    if (this.marker) this.marker.remove();
    if (this.map) this.map.remove();
    this.map = null;
    this.marker = null;
  }

  private async getCoordsFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.error('Geocoding failed', e);
    }
    return null;
  }

  private initMap() {
    if (!this.currentMapLocation) return;

    import('leaflet').then((L) => {
      const container = document.getElementById('order-tracking-map');
      if (!container) return;

      container.innerHTML = '';

      this.map = L.map('order-tracking-map').setView(
        [this.currentMapLocation!.lat, this.currentMapLocation!.lng],
        15
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map);

      this.marker = L.marker([this.currentMapLocation!.lat, this.currentMapLocation!.lng])
        .addTo(this.map)
        .bindPopup(`<b>${this.currentMapLocation!.address}</b>`)
        .openPopup();

      setTimeout(() => this.map.invalidateSize(), 200);
    });
  }

  goEdit() {
    if (!this.orderIdNum) return;
    this.router.navigate(['/dashboard/orders', this.orderIdNum, 'edit']);
  }
}

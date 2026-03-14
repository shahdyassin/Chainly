import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, switchMap, map, of, EMPTY, Observable } from 'rxjs';
import { finalize, takeUntil, catchError, takeWhile, expand } from 'rxjs/operators';
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


  isMapOpen = false;
  currentMapLocation: { lat: number; lng: number; address: string } | null = null;
  private map: any = null;
  private marker: any = null;

  ngOnInit() {
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

          return this.fetchOrderByInternalId(id).pipe(
            switchMap((o) => {
              this.order = o;

              if (!o) return of(null);

            //  console.log('ORDER FOUND:', o);


              return this.api.getOrderWithTracking(o.companyOrderId).pipe(
                catchError(() => of(null))
              );
            })
          );
        })
      )
      .subscribe({
        next: (res: any) => {
          if (!res || !this.order) {
            this.trackings = [];
            this.reversedTrackings = [];
            return;
          }

          const realCompanyId = Number(res?.companyOrderId ?? 0);


          this.order.companyOrderId = realCompanyId || this.order.companyOrderId || 0;
          this.order.publicCode = String(res?.code ?? this.order.publicCode ?? '-');
          this.order.status = String(
            res?.trackings?.length
              ? res.trackings[res.trackings.length - 1]?.status
              : this.order.status ?? 'Pending'
          );

          const rawTrackings =
  res?.trackings ??
  res?.Trackings ??
  res?.data?.trackings ??
  res?.data?.Trackings ??
  res?.result?.trackings ??
  res?.result?.Trackings ??
  [];

const trackingsArr = Array.isArray(rawTrackings) ? rawTrackings : [];

this.trackings = trackingsArr.map((x: any) => ({
  status: String(x.status ?? x.Status ?? '').trim(),
  location: String(x.location ?? x.Location ?? '').trim(),
  scannedBy: String(
    x.updatedBy?.fullName ??
    x.updatedBy?.FullName ??
    x.updatedBy?.name ??
    x.scannedBy ??
    x.user?.fullName ??
    x.user?.name ??
    ''
  ).trim(),
  notes: String(x.notes ?? x.Notes ?? '').trim(),
  date: this.parseTrackingDate(
    String(
      x.timestamp ??
      x.Timestamp ??
      x.date ??
      x.Date ??
      x.createdAt ??
      x.CreatedAt ??
      ''
    ).trim()
  ),
  latitude: Number(x.latitude ?? x.Latitude ?? 0),
  longitude: Number(x.longitude ?? x.Longitude ?? 0),
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

  goEdit() {
    if (!this.orderIdNum) return;
    this.router.navigate(['/dashboard/orders', this.orderIdNum, 'edit']);
  }


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
}

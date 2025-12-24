import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, switchMap } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { OrdersService, OrderRow } from '../../../../core/services/orders.service';

type TrackingItem = {
  status: string;
  location: string;
  scannedBy: string;
  notes: string;
  date: string;
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

          return this.api.getOrderById(id);
        })
      )
      .subscribe({
        next: (o) => {
          this.order = o;

          const cid = Number(o?.companyOrderId ?? 0);
          if (!cid) {
            this.trackings = [];
            return;
          }

          this.api
            .getOrderTracking(cid)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (list) => {
                this.trackings = (list ?? []).map((x: any) => ({
                  status: String(x.status ?? '').trim(),
                  location: String(x.location ?? '').trim(),
                  scannedBy: String(x.scannedBy ?? '').trim(),
                  notes: String(x.notes ?? '').trim(),
                  date: String(x.date ?? '').trim(),
                }));
              },
              error: () => (this.trackings = []),
            });
        },
        error: () => {
          this.order = null;
          this.trackings = [];
        },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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


  openMap(t: TrackingItem) {
    if (!t.location) return;

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

    setTimeout(() => {
      this.initMap();
    }, 50);
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


      setTimeout(() => {
        this.map.invalidateSize();
      }, 200);
    });
  }
}

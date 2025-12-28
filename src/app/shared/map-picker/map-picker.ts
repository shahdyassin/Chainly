import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import '../../../leaflet-marker-fix';

@Component({
  selector: 'app-map-picker',
  standalone: true,
  templateUrl: './map-picker.html',
  styleUrls: ['./map-picker.scss'],
  imports: [
    CommonModule
  ]
})
export class MapPickerComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: true })
  mapContainer!: ElementRef<HTMLDivElement>;

  @Output() locationSelected = new EventEmitter<{ lat: number; lng: number }>();

  private map!: L.Map;
  private marker: L.Marker | null = null;

  searchError = '';

  ngAfterViewInit(): void {
    this.initMap();

    window.addEventListener('map:setCenter', (e: any) => {
  const coords = e.detail;
  if (!coords) return;

  const latlng: L.LatLngExpression = [coords.lat, coords.lng];

  this.map.setView(latlng, 15);
  this.setMarker(latlng);
  this.emitLocation(latlng);
});

  }

  private initMap() {
    const defaultCenter: L.LatLngExpression = [30.0444, 31.2357];

    this.map = L.map(this.mapContainer.nativeElement).setView(defaultCenter, 13);

    L.tileLayer('https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=0e99ae334bed4b85b7f75ff56a8d1226', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);


   if (navigator.geolocation && !this.marker) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      
      if (this.marker) return;

      const userLoc: L.LatLngExpression = [
        pos.coords.latitude,
        pos.coords.longitude,
      ];

      this.map.setView(userLoc, 14);
      this.setMarker(userLoc);
      this.emitLocation(userLoc);
    },
    () => {}
  );
}



    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const latlng: L.LatLngExpression = [e.latlng.lat, e.latlng.lng];
      this.setMarker(latlng);
      this.emitLocation(latlng);
    });
  }

  private setMarker(latlng: L.LatLngExpression) {
    if (this.marker) {
      this.marker.setLatLng(latlng);
    } else {
      this.marker = L.marker(latlng).addTo(this.map);
    }
  }

  private emitLocation(latlng: L.LatLngExpression) {
    const [lat, lng] = latlng as [number, number];
    this.locationSelected.emit({ lat, lng });
  }


  searchPlace(query: string) {
    this.searchError = '';

    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}`;

    fetch(url, {
      headers: {

        'Accept': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((results) => {
        if (!results || !results.length) {
          this.searchError = 'Location not found.';
          return;
        }

        const first = results[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);

        if (Number.isNaN(lat) || Number.isNaN(lon)) {
          this.searchError = 'Invalid location data.';
          return;
        }

        const latlng: L.LatLngExpression = [lat, lon];
        this.map.setView(latlng, 15);
        this.setMarker(latlng);
        this.emitLocation(latlng);
      })
      .catch(() => {
        this.searchError = 'Error while searching. Please try again.';
      });
  }
}


import * as L from 'leaflet';

const iconRetinaUrl = '/leaflet/marker-icon-2x.png';
const iconUrl      = '/leaflet/marker-icon.png';
const shadowUrl    = '/leaflet/marker-shadow.png';


const DefaultIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});


L.Marker.prototype.options.icon = DefaultIcon;

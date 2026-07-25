import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import styles from './PostLocationMap.module.scss';

const pinIcon = L.divIcon({
  className: styles.pinIcon,
  html: renderToStaticMarkup(<MapPin size={28} fill="#ff5b2e" color="#fff" strokeWidth={1.5} />),
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

interface Props {
  latitude: number;
  longitude: number;
}

// Read-only preview map for a post's saved location — no click-to-pin like
// LocationPicker, just a marker centered on the coordinates already saved.
export default function PostLocationMap({ latitude, longitude }: Props) {
  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        className={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}

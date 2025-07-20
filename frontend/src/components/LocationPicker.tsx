import { useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import styles from './LocationPicker.module.scss';

const DEFAULT_CENTER: [number, number] = [21.0285, 105.8542]; // Hà Nội

const pinIcon = L.divIcon({
  className: styles.pinIcon,
  html: '📍',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

interface Props {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  onClear: () => void;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({ latitude, longitude, onChange, onClear }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const hasPin = latitude != null && longitude != null;
  const center: [number, number] = hasPin ? [latitude, longitude] : DEFAULT_CENTER;

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Trình duyệt không hỗ trợ lấy vị trí hiện tại.');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onChange(lat, lng);
        mapRef.current?.setView([lat, lng], 15);
        setLocating(false);
      },
      () => {
        setLocationError('Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập vị trí hoặc ghim thủ công trên bản đồ.');
        setLocating(false);
      },
    );
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.actions}>
        <button type="button" className={styles.actionButton} onClick={useCurrentLocation} disabled={locating}>
          📍 {locating ? 'Đang lấy vị trí...' : 'Dùng vị trí hiện tại'}
        </button>
        {hasPin && (
          <button type="button" className={styles.clearButton} onClick={onClear}>
            Xóa vị trí
          </button>
        )}
      </div>
      {locationError && <p className={styles.error}>{locationError}</p>}
      <div className={styles.mapContainer}>
        <MapContainer ref={mapRef} center={center} zoom={hasPin ? 15 : 12} className={styles.map}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onChange={onChange} />
          {hasPin && <Marker position={center} icon={pinIcon} />}
        </MapContainer>
      </div>
      {hasPin && (
        <p className={styles.coords}>
          Đã chọn: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      )}
      {!hasPin && <p className={styles.hint}>Nhấn vào bản đồ để ghim vị trí.</p>}
    </div>
  );
}

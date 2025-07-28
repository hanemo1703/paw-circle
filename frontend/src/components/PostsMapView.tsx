import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { api, toAssetUrl } from '../lib/api';
import { BADGE_CLASS, BADGE_LABEL, PostItem } from './PostList';
import styles from './PostsMapView.module.scss';

const DEFAULT_CENTER: [number, number] = [16.047079, 108.20623]; // Vietnam-ish centroid
const DEFAULT_ZOOM = 5;

// Approximates each type's badge color (see globals.scss badge-* classes /
// _variables.scss) — hardcoded hex since this renders through L.divIcon's
// static HTML, matching how PostLocationMap/LocationPicker already hardcode
// their single pin color instead of importing SCSS vars.
const PIN_COLOR: Record<PostItem['type'], string> = {
  LOST: '#d64545',
  SUPPLY: '#3b82c4',
  ADOPTION: '#2f6f4e',
  TRADE: '#ff5b2e',
};

const pinIcons: Record<string, L.DivIcon> = Object.fromEntries(
  Object.entries(PIN_COLOR).map(([type, color]) => [
    type,
    L.divIcon({
      className: styles.pinIcon,
      html: renderToStaticMarkup(<MapPin size={28} fill={color} color="#fff" strokeWidth={1.5} />),
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    }),
  ]),
);

interface Props {
  posts: PostItem[];
}

export default function PostsMapView({ posts }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const [resolvedCoords, setResolvedCoords] = useState<Record<string, { latitude: number; longitude: number }>>({});

  const withCoords = posts
    .map((post) => ({ ...post, ...(resolvedCoords[post.id] ?? {}) }))
    .filter((post): post is PostItem & { latitude: number; longitude: number } => post.latitude != null && post.longitude != null);

  const withoutCoordsIds = posts
    .filter((post) => {
      const merged = { ...post, ...(resolvedCoords[post.id] ?? {}) };
      return merged.latitude == null || merged.longitude == null;
    })
    .map((post) => post.id);

  const withoutCoordsKey = withoutCoordsIds.slice().sort().join(',');

  useEffect(() => {
    if (withoutCoordsIds.length === 0) return;
    let cancelled = false;
    api
      .post('/posts/geocode-missing', { ids: withoutCoordsIds.slice(0, 8) })
      .then((resolved: { id: string; latitude: number; longitude: number }[]) => {
        if (cancelled || !resolved || resolved.length === 0) return;
        setResolvedCoords((prev) => {
          const next = { ...prev };
          for (const r of resolved) {
            next[r.id] = { latitude: r.latitude, longitude: r.longitude };
          }
          return next;
        });
      })
      .catch(() => {
        // Best-effort — legacy posts without a resolvable address just stay off the map.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withoutCoordsKey]);

  const locatableKey = withCoords
    .map((p) => p.id)
    .sort()
    .join(',');

  useEffect(() => {
    if (!mapRef.current || withCoords.length === 0) return;
    if (withCoords.length === 1) {
      mapRef.current.setView([withCoords[0].latitude, withCoords[0].longitude], 14);
    } else {
      const bounds = L.latLngBounds(withCoords.map((p) => [p.latitude, p.longitude] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locatableKey]);

  if (withCoords.length === 0) {
    return (
      <div className={styles.emptyState}>
        <MapPin size={36} strokeWidth={1.5} />
        <p>Không có tin nào xác định được vị trí để hiển thị trên bản đồ.</p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.mapContainer}>
        <MapContainer ref={mapRef} center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className={styles.map}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {withCoords.map((post) => (
            <Marker key={post.id} position={[post.latitude, post.longitude]} icon={pinIcons[post.type]}>
              <Popup>
                <div className={styles.popup}>
                  <img
                    className={styles.popupThumb}
                    src={post.images && post.images.length > 0 ? toAssetUrl(post.images[0]) : '/logo.jpg'}
                    alt={post.title}
                  />
                  <div className={styles.popupBody}>
                    <span className={BADGE_CLASS[post.type]}>{BADGE_LABEL[post.type]}</span>
                    <p className={styles.popupTitle}>{post.title}</p>
                    {post.address && <p className={styles.popupAddress}>{post.address}</p>}
                    <Link href={`/posts/${post.id}`} className={styles.popupLink}>
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {withoutCoordsIds.length > 0 && (
        <p className={styles.note}>{withoutCoordsIds.length} bài đăng chưa xác định được vị trí trên bản đồ.</p>
      )}
    </div>
  );
}

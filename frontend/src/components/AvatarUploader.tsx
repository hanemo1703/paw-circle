import { useRef, useState } from 'react';
import { api, toAssetUrl } from '../lib/api';
import styles from './AvatarUploader.module.scss';

const VIEWPORT = 240; // on-screen crop viewport, in css px (square)
const OUTPUT = 320; // exported avatar size, in px (square)
const MAX_ZOOM_MULTIPLIER = 3;
const MAX_SIZE_MB = 5;

interface AvatarUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  accessToken?: string;
}

interface Offset {
  x: number;
  y: number;
}

interface CropSession {
  src: string;
  size: { width: number; height: number };
  minScale: number;
  scale: number;
  offset: Offset;
}

export default function AvatarUploader({ value, onChange, accessToken }: AvatarUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Cropper state — only populated while a file is being cropped
  const [crop, setCrop] = useState<CropSession | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragState = useRef<{ startX: number; startY: number; origin: Offset } | null>(null);

  function clampOffset(next: Offset, s: number, size: { width: number; height: number }): Offset {
    const halfW = (size.width * s) / 2;
    const halfH = (size.height * s) / 2;
    const maxX = Math.max(0, halfW - VIEWPORT / 2);
    const maxY = Math.max(0, halfH - VIEWPORT / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function openCropper(file: File) {
    if (!file.type.startsWith('image/') || file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Ảnh không hợp lệ hoặc quá ${MAX_SIZE_MB}MB.`);
      return;
    }
    setError(null);
    const src = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      const size = { width: probe.naturalWidth, height: probe.naturalHeight };
      const cover = Math.max(VIEWPORT / size.width, VIEWPORT / size.height);
      setCrop({ src, size, minScale: cover, scale: cover, offset: { x: 0, y: 0 } });
    };
    probe.src = src;
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) openCropper(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) openCropper(file);
  }

  function closeCropper() {
    if (crop) URL.revokeObjectURL(crop.src);
    setCrop(null);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!crop) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: crop.offset };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current || !crop) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const next = { x: dragState.current.origin.x + dx, y: dragState.current.origin.y + dy };
    setCrop((prev) => (prev ? { ...prev, offset: clampOffset(next, prev.scale, prev.size) } : prev));
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function handleZoomChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!crop) return;
    const nextScale = Number(e.target.value);
    setCrop((prev) =>
      prev ? { ...prev, scale: nextScale, offset: clampOffset(prev.offset, nextScale, prev.size) } : prev,
    );
  }

  async function handleConfirm() {
    if (!imgRef.current || !crop) return;
    setUploading(true);
    setError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể xử lý ảnh.');
      const ratio = OUTPUT / VIEWPORT;
      ctx.translate(OUTPUT / 2, OUTPUT / 2);
      ctx.translate(crop.offset.x * ratio, crop.offset.y * ratio);
      ctx.scale(crop.scale * ratio, crop.scale * ratio);
      ctx.drawImage(imgRef.current, -crop.size.width / 2, -crop.size.height / 2);

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('Không thể xử lý ảnh.');

      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');
      const res = await api.postForm('/users/avatar', formData, accessToken);
      onChange(res.url);
      closeCropper();
    } catch (err: any) {
      setError(err.message || 'Tải ảnh lên thất bại.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <img className={styles.preview} src={toAssetUrl(value) || '/logo.jpg'} alt="Ảnh đại diện" />
        <div className={styles.dropOverlay}>Kéo thả hoặc chọn ảnh</div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handleFileInput}
      />
      {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}

      {crop && (
        <div className={styles.overlay} onClick={closeCropper}>
          <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.panelTitle}>Chỉnh ảnh đại diện</h3>
            <div
              className={styles.viewport}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <img
                ref={imgRef}
                src={crop.src}
                alt=""
                draggable={false}
                className={styles.cropImage}
                style={{
                  width: crop.size.width * crop.scale,
                  height: crop.size.height * crop.scale,
                  transform: `translate(-50%, -50%) translate(${crop.offset.x}px, ${crop.offset.y}px)`,
                }}
              />
            </div>
            <input
              type="range"
              min={crop.minScale}
              max={crop.minScale * MAX_ZOOM_MULTIPLIER}
              step={(crop.minScale * MAX_ZOOM_MULTIPLIER - crop.minScale) / 100 || 0.01}
              value={crop.scale}
              onChange={handleZoomChange}
              className={styles.zoomSlider}
            />
            {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
            <div className={styles.panelActions}>
              <button type="button" className="btn btn-outline" onClick={closeCropper} disabled={uploading}>
                Hủy
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={uploading}>
                {uploading ? 'Đang tải lên...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

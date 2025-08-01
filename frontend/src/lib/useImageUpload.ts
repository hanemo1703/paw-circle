import { useEffect, useRef, useState } from 'react';

function isValidImageFile(file: File, maxSizeMB: number): boolean {
  return file.type.startsWith('image/') && file.size <= maxSizeMB * 1024 * 1024;
}

interface UseImageUploadOptions {
  maxFiles: number;
  maxSizeMB: number;
  existing?: string[];
}

export function useImageUpload({ maxFiles, maxSizeMB, existing = [] }: UseImageUploadOptions) {
  const [existingImages, setExistingImages] = useState<string[]>(existing);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const imagePreviewsRef = useRef<string[]>([]);
  imagePreviewsRef.current = imagePreviews;

  useEffect(() => {
    return () => {
      imagePreviewsRef.current.forEach((src) => URL.revokeObjectURL(src));
    };
  }, []);

  const totalCount = existingImages.length + imageFiles.length;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';

    const rejected: string[] = [];
    const accepted = picked.filter((file) => {
      if (!isValidImageFile(file, maxSizeMB)) {
        rejected.push(file.name);
        return false;
      }
      return true;
    });

    const merged = [...imageFiles, ...accepted];
    const remainingSlots = maxFiles - existingImages.length;
    const truncated = merged.length > remainingSlots;
    const finalFiles = merged.slice(0, Math.max(remainingSlots, 0));

    if (rejected.length > 0) {
      setImageError(`Đã bỏ qua ảnh không hợp lệ hoặc quá ${maxSizeMB}MB: ${rejected.join(', ')}`);
    } else if (truncated) {
      setImageError(`Chỉ được chọn tối đa ${maxFiles} ảnh.`);
    } else {
      setImageError(null);
    }

    const acceptedCount = finalFiles.length - imageFiles.length;
    const newPreviews = accepted.slice(0, Math.max(acceptedCount, 0)).map((file) => URL.createObjectURL(file));

    setImageFiles(finalFiles);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeExisting = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNew = (index: number) => {
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImageError(null);
  };

  return {
    existingImages,
    imageFiles,
    imagePreviews,
    imageError,
    totalCount,
    handleFilesSelected,
    removeExisting,
    removeNew,
  };
}

interface UseSingleImageUploadOptions {
  maxSizeMB: number;
  existing?: string;
  invalidMessage?: string;
}

export function useSingleImageUpload({ maxSizeMB, existing, invalidMessage }: UseSingleImageUploadOptions) {
  const [existingImage, setExistingImage] = useState<string | undefined>(existing);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const imagePreviewRef = useRef<string | null>(null);
  imagePreviewRef.current = imagePreview;

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    };
  }, []);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isValidImageFile(file, maxSizeMB)) {
      setImageError(invalidMessage ?? `Ảnh không hợp lệ hoặc vượt quá ${maxSizeMB}MB.`);
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageError(null);
  };

  const remove = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setExistingImage(undefined);
    setImageError(null);
  };

  return { existingImage, imageFile, imagePreview, imageError, handleFileSelected, remove };
}

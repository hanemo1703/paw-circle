import { useEffect, useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import { Plus, X } from 'lucide-react';
import { api, toAssetUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Dropdown from '../../../components/Dropdown';
import styles from '../new/index.module.scss';

const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE_MB = 5;
const OTHER_BANK_VALUE = 'OTHER';

type CampaignStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
type PosterType = 'INDIVIDUAL' | 'ORGANIZATION';
type CampaignCategory = 'FOOD_SUPPLIES' | 'MEDICAL' | 'OTHER';

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Đang gây quỹ' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
  { value: 'CANCELLED', label: 'Đã đóng' },
];

const CATEGORY_OPTIONS: { value: CampaignCategory; label: string }[] = [
  { value: 'FOOD_SUPPLIES', label: 'Thức ăn - Cát mèo' },
  { value: 'MEDICAL', label: 'Y tế - chữa bệnh' },
  { value: 'OTHER', label: 'Khác' },
];

interface Campaign {
  id: string;
  status: CampaignStatus;
  posterType: PosterType;
  organizationLink?: string;
  category: CampaignCategory;
  categoryOther?: string;
  title: string;
  description: string;
  images: string[];
  targetAmount?: number;
  deadline?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  qrImageUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  pickupAddress?: string;
  creatorId: string;
}

interface FormValues {
  status: CampaignStatus;
  posterType: PosterType;
  organizationLink: string;
  category: CampaignCategory;
  categoryOther: string;
  title: string;
  description: string;
  targetAmount: string;
  deadline: string;
  bankNameOption: string;
  bankNameOther: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  contactPhone: string;
  contactEmail: string;
  pickupAddress: string;
}

interface Props {
  campaign: Campaign | null;
}

export default function EditCampaignPage({ campaign }: Props) {
  const router = useRouter();
  const { isAuthenticated, user, accessToken } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [existingImages, setExistingImages] = useState<string[]>(campaign?.images ?? []);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [existingQrImage, setExistingQrImage] = useState<string | undefined>(campaign?.qrImageUrl);
  const [qrImageFile, setQrImageFile] = useState<File | null>(null);
  const [qrImagePreview, setQrImagePreview] = useState<string | null>(null);
  const [qrImageError, setQrImageError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bankOptions, setBankOptions] = useState<string[]>([]);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewsRef = useRef<string[]>([]);
  imagePreviewsRef.current = imagePreviews;
  const qrImagePreviewRef = useRef<string | null>(null);
  qrImagePreviewRef.current = qrImagePreview;

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      status: campaign?.status ?? 'ACTIVE',
      posterType: campaign?.posterType ?? 'INDIVIDUAL',
      organizationLink: campaign?.organizationLink ?? '',
      category: campaign?.category ?? 'FOOD_SUPPLIES',
      categoryOther: campaign?.categoryOther ?? '',
      title: campaign?.title ?? '',
      description: campaign?.description ?? '',
      targetAmount: campaign?.targetAmount != null ? String(campaign.targetAmount) : '',
      deadline: campaign?.deadline ? campaign.deadline.slice(0, 10) : '',
      bankNameOption: '',
      bankNameOther: '',
      bankAccountNumber: campaign?.bankAccountNumber ?? '',
      bankAccountHolder: campaign?.bankAccountHolder ?? '',
      contactPhone: campaign?.contactPhone ?? '',
      contactEmail: campaign?.contactEmail ?? '',
      pickupAddress: campaign?.pickupAddress ?? '',
    },
  });

  const posterType = watch('posterType');
  const category = watch('category');
  const bankNameOption = watch('bankNameOption');

  useEffect(() => {
    setCheckingAuth(false);
  }, []);

  // Bank list loads async — once it's in, resolve the campaign's existing free-text
  // bankName to a matching dropdown option, or to "Khác" with the text preserved.
  useEffect(() => {
    api
      .get('/donations/banks')
      .then((banks: string[]) => {
        setBankOptions(banks);
        if (campaign?.bankName) {
          if (banks.includes(campaign.bankName)) {
            setValue('bankNameOption', campaign.bankName);
          } else {
            setValue('bankNameOption', OTHER_BANK_VALUE);
            setValue('bankNameOther', campaign.bankName);
          }
        }
      })
      .catch(() => {
        // Bank list unreachable — fall back to "Khác" so the existing value isn't lost
        if (campaign?.bankName) {
          setValue('bankNameOption', OTHER_BANK_VALUE);
          setValue('bankNameOther', campaign.bankName);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (checkingAuth) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (campaign && user && campaign.creatorId !== user.id) {
      router.replace(`/donations/${campaign.id}`);
    }
  }, [checkingAuth, isAuthenticated, campaign, user, router]);

  useEffect(() => {
    return () => {
      imagePreviewsRef.current.forEach((src) => URL.revokeObjectURL(src));
      if (qrImagePreviewRef.current) URL.revokeObjectURL(qrImagePreviewRef.current);
    };
  }, []);

  if (!campaign) {
    return (
      <div className={styles.wrapper}>
        <p>Không tìm thấy chiến dịch.</p>
      </div>
    );
  }

  const isOwner = !!user && campaign.creatorId === user.id;

  if (checkingAuth || !isAuthenticated || !isOwner) {
    return null;
  }

  const totalImages = existingImages.length + imageFiles.length;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';

    const rejected: string[] = [];
    const accepted = picked.filter((file) => {
      if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        rejected.push(file.name);
        return false;
      }
      return true;
    });

    const merged = [...imageFiles, ...accepted];
    const remainingSlots = MAX_IMAGES - existingImages.length;
    const truncated = merged.length > remainingSlots;
    const finalFiles = merged.slice(0, Math.max(remainingSlots, 0));

    if (rejected.length > 0) {
      setImageError(`Đã bỏ qua ảnh không hợp lệ hoặc quá ${MAX_IMAGE_SIZE_MB}MB: ${rejected.join(', ')}`);
    } else if (truncated) {
      setImageError(`Chỉ được chọn tối đa ${MAX_IMAGES} ảnh.`);
    } else {
      setImageError(null);
    }

    const acceptedCount = finalFiles.length - imageFiles.length;
    const newPreviews = accepted.slice(0, Math.max(acceptedCount, 0)).map((file) => URL.createObjectURL(file));

    setImageFiles(finalFiles);
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImageError(null);
  };

  const handleQrFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setQrImageError(`Ảnh QR không hợp lệ hoặc vượt quá ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }
    if (qrImagePreview) URL.revokeObjectURL(qrImagePreview);
    setQrImageFile(file);
    setQrImagePreview(URL.createObjectURL(file));
    setQrImageError(null);
  };

  const removeQrImage = () => {
    if (qrImagePreview) URL.revokeObjectURL(qrImagePreview);
    setQrImageFile(null);
    setQrImagePreview(null);
    setExistingQrImage(undefined);
    setQrImageError(null);
  };

  const onSubmit = handleSubmit(async (data) => {
    const bankNamePreview = data.bankNameOption === OTHER_BANK_VALUE ? data.bankNameOther.trim() : data.bankNameOption;
    const bankFilledCount = [bankNamePreview, data.bankAccountNumber.trim(), data.bankAccountHolder.trim()].filter(
      Boolean,
    ).length;
    const hasAnyQrImage = !!qrImageFile || !!existingQrImage;
    if (bankFilledCount > 0 && bankFilledCount < 3) {
      setFundingError('Vui lòng điền đầy đủ cả 3 thông tin: ngân hàng, số tài khoản, chủ tài khoản.');
      return;
    }
    if (bankFilledCount < 3 && !hasAnyQrImage) {
      setFundingError('Vui lòng cung cấp ảnh QR nhận ủng hộ hoặc đầy đủ thông tin ngân hàng để nhận ủng hộ.');
      return;
    }
    setFundingError(null);

    let uploadedUrls: string[] = [];
    if (imageFiles.length > 0) {
      setUploadingImages(true);
      try {
        const formData = new FormData();
        imageFiles.forEach((file) => formData.append('images', file));
        const res = await api.postForm('/donations/campaigns/upload-images', formData, accessToken || undefined);
        uploadedUrls = res.urls;
      } catch (err: any) {
        setUploadingImages(false);
        setError('root', { message: err.message || 'Tải ảnh lên thất bại.' });
        return;
      }
      setUploadingImages(false);
    }

    let qrImageUrl = existingQrImage ?? '';
    if (qrImageFile) {
      setUploadingImages(true);
      try {
        const qrFormData = new FormData();
        qrFormData.append('images', qrImageFile);
        const res = await api.postForm('/donations/campaigns/upload-images', qrFormData, accessToken || undefined);
        qrImageUrl = res.urls[0];
      } catch (err: any) {
        setUploadingImages(false);
        setError('root', { message: err.message || 'Tải ảnh QR thất bại.' });
        return;
      }
      setUploadingImages(false);
    }

    try {
      await api.patch(
        `/donations/campaigns/${campaign.id}`,
        {
          status: data.status,
          posterType: data.posterType,
          ...(data.posterType === 'ORGANIZATION' ? { organizationLink: data.organizationLink.trim() } : {}),
          category: data.category,
          ...(data.category === 'OTHER' ? { categoryOther: data.categoryOther.trim() } : {}),
          title: data.title,
          description: data.description,
          images: [...existingImages, ...uploadedUrls],
          ...(data.targetAmount ? { targetAmount: Number(data.targetAmount) } : {}),
          ...(data.deadline ? { deadline: new Date(data.deadline).toISOString() } : {}),
          bankName: bankNamePreview,
          bankAccountNumber: data.bankAccountNumber.trim(),
          bankAccountHolder: data.bankAccountHolder.trim(),
          qrImageUrl,
          ...(data.contactPhone.trim() ? { contactPhone: data.contactPhone.trim() } : {}),
          ...(data.contactEmail.trim() ? { contactEmail: data.contactEmail.trim() } : {}),
          ...(data.pickupAddress.trim() ? { pickupAddress: data.pickupAddress.trim() } : {}),
        },
        accessToken || undefined,
      );
      router.push(`/donations/${campaign.id}`);
    } catch (err: any) {
      setError('root', { message: err.message });
    }
  });

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/donations/campaigns/${campaign.id}`, accessToken || undefined);
      router.push('/donations');
    } catch (err: any) {
      setDeleting(false);
      setConfirmDeleteOpen(false);
      setError('root', { message: err.message || 'Xóa chiến dịch thất bại.' });
    }
  };

  return (
    <div className={styles.wrapper}>
      {confirmDeleteOpen && (
        <ConfirmDialog
          title="Xóa chiến dịch?"
          message="Bạn có chắc chắn muốn xóa chiến dịch này? Hành động này không thể hoàn tác."
          confirmText="Xóa chiến dịch"
          danger
          confirming={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}

      <div className={styles.backRow}>
        <Link href={`/donations/${campaign.id}`} className={styles.backLink}>
          ‹ Quay lại chiến dịch
        </Link>
      </div>
      <h1 className={styles.title}>Chỉnh sửa chiến dịch</h1>

      <form onSubmit={onSubmit} className={styles.card}>
        <div className={styles.field}>
          <label>
            Trạng thái chiến dịch<span className={styles.requiredMark}>*</span>
          </label>
          <div className={styles.radioRow}>
            {STATUS_OPTIONS.map((opt) => (
              <label key={opt.value} className={styles.radioChip}>
                <input type="radio" value={opt.value} {...register('status')} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label>
            Bạn đăng với vai trò<span className={styles.requiredMark}>*</span>
          </label>
          <div className={styles.radioRow}>
            <label className={styles.radioChip}>
              <input type="radio" value="INDIVIDUAL" {...register('posterType')} />
              Cá nhân
            </label>
            <label className={styles.radioChip}>
              <input type="radio" value="ORGANIZATION" {...register('posterType')} />
              Tổ chức / mái ấm
            </label>
          </div>
          {posterType === 'ORGANIZATION' && (
            <>
              <label htmlFor="organizationLink" style={{ marginTop: 12 }}>
                Link tổ chức / mái ấm<span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="organizationLink"
                placeholder="Facebook, website hoặc trang xác thực của tổ chức"
                {...register('organizationLink', {
                  validate: (value) =>
                    posterType !== 'ORGANIZATION' || !!value.trim() || 'Vui lòng nhập link tổ chức.',
                })}
              />
              {errors.organizationLink && (
                <p style={{ color: 'red', fontSize: 13 }}>{errors.organizationLink.message}</p>
              )}
            </>
          )}
        </div>

        <div className={styles.field}>
          <label>
            Loại chiến dịch<span className={styles.requiredMark}>*</span>
          </label>
          <div className={styles.radioRow}>
            {CATEGORY_OPTIONS.map((opt) => (
              <label key={opt.value} className={styles.radioChip}>
                <input type="radio" value={opt.value} {...register('category')} />
                {opt.label}
              </label>
            ))}
          </div>
          {category === 'OTHER' && (
            <>
              <input
                placeholder="Nhập loại chiến dịch"
                style={{ marginTop: 12 }}
                {...register('categoryOther', {
                  validate: (value) => category !== 'OTHER' || !!value.trim() || 'Vui lòng nhập loại chiến dịch.',
                })}
              />
              {errors.categoryOther && <p style={{ color: 'red', fontSize: 13 }}>{errors.categoryOther.message}</p>}
            </>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="title">
            Tên chiến dịch<span className={styles.requiredMark}>*</span>
          </label>
          <input id="title" {...register('title', { required: 'Vui lòng nhập tên chiến dịch.' })} />
          {errors.title && <p style={{ color: 'red', fontSize: 13 }}>{errors.title.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="description">
            Mô tả chi tiết<span className={styles.requiredMark}>*</span>
          </label>
          <textarea id="description" rows={5} {...register('description', { required: 'Vui lòng nhập mô tả.' })} />
          {errors.description && <p style={{ color: 'red', fontSize: 13 }}>{errors.description.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="images">
            Hình ảnh minh chứng <span className={styles.optionalHint}>(không bắt buộc, tối đa {MAX_IMAGES} ảnh)</span>
          </label>
          <input
            id="images"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className={styles.hiddenFileInput}
            disabled={isSubmitting || uploadingImages || totalImages >= MAX_IMAGES}
            onChange={handleFilesSelected}
          />
          {imageError && <p style={{ color: 'red', fontSize: 13 }}>{imageError}</p>}
          <div className={styles.imageGrid}>
            {existingImages.map((img, idx) => (
              <div key={img} className={styles.imageTile}>
                <img src={toAssetUrl(img)} alt={`Ảnh ${idx + 1}`} />
                <button
                  type="button"
                  className={styles.imageRemoveBtn}
                  onClick={() => removeExistingImage(idx)}
                  aria-label="Xóa ảnh"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {imagePreviews.map((src, idx) => (
              <div key={src} className={styles.imageTile}>
                <img src={src} alt={`Ảnh mới ${idx + 1}`} />
                <button
                  type="button"
                  className={styles.imageRemoveBtn}
                  onClick={() => removeNewImage(idx)}
                  aria-label="Xóa ảnh"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {totalImages < MAX_IMAGES && (
              <button
                type="button"
                className={styles.imageAddTile}
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || uploadingImages}
                aria-label="Thêm ảnh"
              >
                <Plus size={22} />
              </button>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="targetAmount">
            Số tiền mong muốn (đ) <span className={styles.optionalHint}>(không bắt buộc)</span>
          </label>
          <input id="targetAmount" type="number" min={0} {...register('targetAmount')} />
        </div>

        <div className={styles.field}>
          <label htmlFor="deadline">
            Thời hạn chiến dịch <span className={styles.optionalHint}>(không bắt buộc)</span>
          </label>
          <input id="deadline" type="date" {...register('deadline')} />
        </div>

        <div className={styles.field}>
          <label>Thông tin nhận ủng hộ</label>
          <div className={styles.bankFields}>
            <Controller
              name="bankNameOption"
              control={control}
              render={({ field }) => (
                <Dropdown
                  placeholder="-- Chọn ngân hàng --"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    ...bankOptions.map((b) => ({ value: b, label: b })),
                    { value: OTHER_BANK_VALUE, label: 'Khác' },
                  ]}
                  clearable
                />
              )}
            />
            {bankNameOption === OTHER_BANK_VALUE && (
              <input placeholder="Nhập tên ngân hàng / ví điện tử" {...register('bankNameOther')} />
            )}
            <input placeholder="Số tài khoản" {...register('bankAccountNumber')} />
            <input placeholder="Chủ tài khoản" {...register('bankAccountHolder')} />
          </div>
          <p className={styles.hint}>Nếu điền, cần đủ cả 3: ngân hàng, số tài khoản và chủ tài khoản.</p>
        </div>

        <div className={styles.field}>
          <label htmlFor="qrImage">
            Ảnh QR nhận ủng hộ <span className={styles.optionalHint}>(không bắt buộc)</span>
          </label>
          <input
            id="qrImage"
            ref={qrFileInputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenFileInput}
            disabled={isSubmitting || uploadingImages}
            onChange={handleQrFileSelected}
          />
          {qrImageError && <p style={{ color: 'red', fontSize: 13 }}>{qrImageError}</p>}
          {qrImagePreview || existingQrImage ? (
            <div className={styles.qrTile}>
              <img src={qrImagePreview ?? toAssetUrl(existingQrImage)} alt="Ảnh QR" />
              <button
                type="button"
                className={styles.imageRemoveBtn}
                onClick={removeQrImage}
                aria-label="Xóa ảnh QR"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.qrTile}
              style={{ borderStyle: 'dashed' }}
              onClick={() => qrFileInputRef.current?.click()}
              disabled={isSubmitting || uploadingImages}
              aria-label="Thêm ảnh QR"
            >
              <Plus size={22} />
            </button>
          )}
          <p className={styles.hint}>
            Ảnh mã QR chuyển khoản/ví điện tử để người ủng hộ quét trực tiếp. Cần có ảnh QR hoặc đầy đủ thông tin
            ngân hàng ở trên (có cả hai thì càng tốt).
          </p>
        </div>

        {fundingError && <p style={{ color: 'red', fontSize: 13 }}>{fundingError}</p>}

        <div className={styles.field}>
          <label>
            Thông tin liên hệ trực tiếp <span className={styles.optionalHint}>(không bắt buộc)</span>
          </label>
          <div className={styles.bankFields}>
            <input placeholder="Số điện thoại / Zalo" {...register('contactPhone')} />
            <input placeholder="Email (không bắt buộc)" {...register('contactEmail')} />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="pickupAddress">
            Địa chỉ nhận đồ <span className={styles.optionalHint}>(không bắt buộc)</span>
          </label>
          <input id="pickupAddress" {...register('pickupAddress')} />
        </div>

        {errors.root && <p style={{ color: 'red', fontSize: 14 }}>{errors.root.message}</p>}
        <button
          type="submit"
          className={`btn btn-primary ${styles.submit}`}
          disabled={isSubmitting || uploadingImages}
        >
          {uploadingImages ? 'Đang tải ảnh...' : isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>

        <button type="button" className={styles.dangerLink} onClick={() => setConfirmDeleteOpen(true)}>
          Xóa chiến dịch
        </button>
      </form>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = ctx.params?.id as string;
  try {
    const campaign = await api.get(`/donations/campaigns/${id}`);
    return { props: { campaign } };
  } catch {
    return { props: { campaign: null } };
  }
};

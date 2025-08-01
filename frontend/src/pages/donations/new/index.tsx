import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import { Plus, X } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useImageUpload, useSingleImageUpload } from '../../../lib/useImageUpload';
import Dropdown from '../../../components/Dropdown';
import styles from './index.module.scss';

const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE_MB = 5;
const OTHER_BANK_VALUE = 'OTHER';

type PosterType = 'INDIVIDUAL' | 'ORGANIZATION';
type CampaignCategory = 'FOOD_SUPPLIES' | 'MEDICAL' | 'OTHER';

const CATEGORY_OPTIONS: { value: CampaignCategory; label: string }[] = [
  { value: 'FOOD_SUPPLIES', label: 'Thức ăn - Cát mèo' },
  { value: 'MEDICAL', label: 'Y tế - chữa bệnh' },
  { value: 'OTHER', label: 'Khác' },
];

interface FormValues {
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
  confirmed: boolean;
}

const DEFAULT_VALUES: FormValues = {
  posterType: 'INDIVIDUAL',
  organizationLink: '',
  category: 'FOOD_SUPPLIES',
  categoryOther: '',
  title: '',
  description: '',
  targetAmount: '',
  deadline: '',
  bankNameOption: '',
  bankNameOther: '',
  bankAccountNumber: '',
  bankAccountHolder: '',
  contactPhone: '',
  contactEmail: '',
  pickupAddress: '',
  confirmed: false,
};

export default function NewCampaignPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const gallery = useImageUpload({ maxFiles: MAX_IMAGES, maxSizeMB: MAX_IMAGE_SIZE_MB });
  const [uploadingImages, setUploadingImages] = useState(false);
  const qrImage = useSingleImageUpload({
    maxSizeMB: MAX_IMAGE_SIZE_MB,
    invalidMessage: `Ảnh QR không hợp lệ hoặc vượt quá ${MAX_IMAGE_SIZE_MB}MB.`,
  });
  const [bankOptions, setBankOptions] = useState<string[]>([]);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES });

  const posterType = watch('posterType');
  const category = watch('category');
  const bankNameOption = watch('bankNameOption');

  useEffect(() => {
    api
      .get('/donations/banks')
      .then((banks: string[]) => setBankOptions(banks))
      .catch(() => {
        // Bank list unreachable — dropdown just falls back to "Khác" free text
      });
  }, []);

  useEffect(() => {
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (!checkingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [checkingAuth, isAuthenticated, router]);

  if (checkingAuth || !isAuthenticated) {
    return null;
  }

  const onSubmit = handleSubmit(async (data) => {
    const bankNamePreview = data.bankNameOption === OTHER_BANK_VALUE ? data.bankNameOther.trim() : data.bankNameOption;
    const bankFilledCount = [bankNamePreview, data.bankAccountNumber.trim(), data.bankAccountHolder.trim()].filter(
      Boolean,
    ).length;
    if (bankFilledCount > 0 && bankFilledCount < 3) {
      setFundingError('Vui lòng điền đầy đủ cả 3 thông tin: ngân hàng, số tài khoản, chủ tài khoản.');
      return;
    }
    if (bankFilledCount < 3 && !qrImage.imageFile) {
      setFundingError('Vui lòng cung cấp ảnh QR nhận ủng hộ hoặc đầy đủ thông tin ngân hàng để nhận ủng hộ.');
      return;
    }
    setFundingError(null);

    let uploadedUrls: string[] = [];
    if (gallery.imageFiles.length > 0) {
      setUploadingImages(true);
      try {
        const formData = new FormData();
        gallery.imageFiles.forEach((file) => formData.append('images', file));
        const res = await api.postForm('/donations/campaigns/upload-images', formData, accessToken || undefined);
        uploadedUrls = res.urls;
      } catch (err: any) {
        setUploadingImages(false);
        setError('root', { message: err.message || 'Tải ảnh lên thất bại.' });
        return;
      }
      setUploadingImages(false);
    }

    let qrImageUrl: string | undefined;
    if (qrImage.imageFile) {
      setUploadingImages(true);
      try {
        const qrFormData = new FormData();
        qrFormData.append('images', qrImage.imageFile);
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
      const campaign = await api.post(
        '/donations/campaigns',
        {
          posterType: data.posterType,
          ...(data.posterType === 'ORGANIZATION' ? { organizationLink: data.organizationLink.trim() } : {}),
          category: data.category,
          ...(data.category === 'OTHER' ? { categoryOther: data.categoryOther.trim() } : {}),
          title: data.title,
          description: data.description,
          ...(uploadedUrls.length ? { images: uploadedUrls } : {}),
          ...(data.targetAmount ? { targetAmount: Number(data.targetAmount) } : {}),
          ...(data.deadline ? { deadline: new Date(data.deadline).toISOString() } : {}),
          ...(bankNamePreview ? { bankName: bankNamePreview } : {}),
          ...(data.bankAccountNumber.trim() ? { bankAccountNumber: data.bankAccountNumber.trim() } : {}),
          ...(data.bankAccountHolder.trim() ? { bankAccountHolder: data.bankAccountHolder.trim() } : {}),
          ...(qrImageUrl ? { qrImageUrl } : {}),
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

  return (
    <div className={styles.wrapper}>
      <div className={styles.backRow}>
        <Link href="/donations" className={styles.backLink}>
          ‹ Quay lại danh sách chiến dịch
        </Link>
      </div>
      <h1 className={styles.title}>Tạo chiến dịch gây quỹ</h1>

      <div className={styles.disclaimer}>
        ⚠ PetConnect không xác minh danh tính hoặc mục đích của chiến dịch. Người ủng hộ tự chịu trách nhiệm khi
        quyết định đóng góp. Chiến dịch có dấu hiệu lừa đảo sẽ bị gỡ khi có báo cáo.
      </div>

      <form onSubmit={onSubmit} className={styles.card}>
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
          <input
            id="title"
            placeholder="VD: Cứu trợ 20 bé mèo hoang bị bỏ rơi"
            {...register('title', { required: 'Vui lòng nhập tên chiến dịch.' })}
          />
          {errors.title && <p style={{ color: 'red', fontSize: 13 }}>{errors.title.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="description">
            Mô tả chi tiết<span className={styles.requiredMark}>*</span>
          </label>
          <textarea
            id="description"
            rows={5}
            placeholder="Hoàn cảnh, số tiền cần, kế hoạch sử dụng..."
            {...register('description', { required: 'Vui lòng nhập mô tả.' })}
          />
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
            disabled={isSubmitting || uploadingImages}
            onChange={gallery.handleFilesSelected}
          />
          {gallery.imageError && <p style={{ color: 'red', fontSize: 13 }}>{gallery.imageError}</p>}
          <div className={styles.imageGrid}>
            {gallery.imagePreviews.map((src, idx) => (
              <div key={src} className={styles.imageTile}>
                <img src={src} alt={`Ảnh ${idx + 1}`} />
                <button
                  type="button"
                  className={styles.imageRemoveBtn}
                  onClick={() => gallery.removeNew(idx)}
                  aria-label="Xóa ảnh"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {gallery.imagePreviews.length < MAX_IMAGES && (
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
          <input id="targetAmount" type="number" min={0} placeholder="VD: 70000000" {...register('targetAmount')} />
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
            onChange={qrImage.handleFileSelected}
          />
          {qrImage.imageError && <p style={{ color: 'red', fontSize: 13 }}>{qrImage.imageError}</p>}
          {qrImage.imagePreview ? (
            <div className={styles.qrTile}>
              <img src={qrImage.imagePreview} alt="Ảnh QR" />
              <button
                type="button"
                className={styles.imageRemoveBtn}
                onClick={qrImage.remove}
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
          <p className={styles.hint}>
            Dùng để người ủng hộ liên hệ trực tiếp nếu họ muốn hỗ trợ theo cách khác ngoài chuyển khoản.
          </p>
        </div>

        <div className={styles.field}>
          <label htmlFor="pickupAddress">
            Địa chỉ nhận đồ <span className={styles.optionalHint}>(không bắt buộc)</span>
          </label>
          <input
            id="pickupAddress"
            placeholder="Địa chỉ nếu bạn muốn nhận hiện vật, đồ ăn, vật dụng..."
            {...register('pickupAddress')}
          />
          <p className={styles.hint}>Dành cho người muốn ủng hộ trực tiếp bằng thức ăn, đồ dùng thay vì chuyển khoản.</p>
        </div>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            {...register('confirmed', { required: 'Vui lòng xác nhận thông tin trước khi đăng chiến dịch.' })}
          />
          Tôi xác nhận thông tin trên là đúng sự thật và đồng ý rằng PetConnect không chịu trách nhiệm nếu chiến dịch
          có nội dung sai lệch hoặc gian dối.
        </label>
        {errors.confirmed && <p style={{ color: 'red', fontSize: 13 }}>{errors.confirmed.message}</p>}

        {errors.root && <p style={{ color: 'red', fontSize: 14 }}>{errors.root.message}</p>}
        <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={isSubmitting || uploadingImages}>
          {uploadingImages ? 'Đang tải ảnh...' : isSubmitting ? 'Đang đăng...' : 'Đăng chiến dịch'}
        </button>
      </form>
    </div>
  );
}

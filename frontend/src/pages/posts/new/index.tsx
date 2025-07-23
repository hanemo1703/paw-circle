import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter } from 'next/router';
import { MapPin } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { PostItem } from '../../../components/PostList';
import Dropdown from '../../../components/Dropdown';
import styles from './index.module.scss';

const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE_MB = 5;

const LocationPicker = dynamic(() => import('../../../components/LocationPicker'), { ssr: false });

type PostType = PostItem['type'];
// Users can only create these types through this form (FOUND is view-only elsewhere)
type CreatableType = Exclude<PostType, 'FOUND'>;

const TYPE_OPTIONS: CreatableType[] = ['LOST', 'ADOPTION', 'MARKETPLACE', 'TRADE'];

const TYPE_LABEL: Record<CreatableType, string> = {
  LOST: 'Tìm boss lạc',
  ADOPTION: 'Tuyển sen/Tìm sen',
  MARKETPLACE: 'Cho tặng đồ dùng',
  TRADE: 'Mua bán boss',
};

const LABEL_TO_TYPE: Record<string, CreatableType> = TYPE_OPTIONS.reduce(
  (acc, t) => ({ ...acc, [TYPE_LABEL[t]]: t }),
  {} as Record<string, CreatableType>,
);

const REDIRECT_PATH: Record<CreatableType, string> = {
  LOST: '/lost-found',
  ADOPTION: '/adoption',
  MARKETPLACE: '/marketplace',
  TRADE: '/trade',
};

function parseType(value: unknown): CreatableType {
  return value === 'LOST' || value === 'ADOPTION' || value === 'MARKETPLACE' || value === 'TRADE'
    ? value
    : 'LOST';
}

type SpeciesOption = 'CAT' | 'DOG' | 'OTHER';

const SPECIES_OPTIONS: SpeciesOption[] = ['CAT', 'DOG', 'OTHER'];

const SPECIES_LABEL: Record<SpeciesOption, string> = {
  CAT: 'Mèo',
  DOG: 'Chó',
  OTHER: 'Khác',
};

const SPECIES_DROPDOWN_OPTIONS = SPECIES_OPTIONS.map((s) => ({ value: s, label: SPECIES_LABEL[s] }));

type GenderOption = 'MALE' | 'FEMALE' | 'UNKNOWN';

const GENDER_OPTIONS: GenderOption[] = ['MALE', 'FEMALE', 'UNKNOWN'];

const GENDER_LABEL: Record<GenderOption, string> = {
  MALE: 'Đực',
  FEMALE: 'Cái',
  UNKNOWN: 'Chưa rõ',
};

const GENDER_DROPDOWN_OPTIONS = GENDER_OPTIONS.map((g) => ({ value: g, label: GENDER_LABEL[g] }));

const PROVINCES_API_URL = 'https://provinces.open-api.vn/api/v2/p/';

interface Ward {
  code: number;
  name: string;
}

interface Province {
  code: number;
  name: string;
  wards: Ward[];
}

function normalizeLocationName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(tinh|thanh pho|tp|quan|huyen|thi xa|phuong|xa|thi tran)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeLocationName(a);
  const nb = normalizeLocationName(b);
  return !!na && !!nb && (na.includes(nb) || nb.includes(na));
}

interface PetRowValues {
  species: SpeciesOption;
  speciesOther: string;
  breed: string;
  color: string;
  age: string;
  gender: GenderOption;
  size: string;
}

function makeDefaultPetRow(): PetRowValues {
  return {
    species: 'CAT',
    speciesOther: '',
    breed: '',
    color: '',
    age: '',
    gender: 'UNKNOWN',
    size: '',
  };
}

interface FormValues {
  typeText: string;
  species: SpeciesOption;
  speciesOther: string;
  breed: string;
  color: string;
  size: string;
  gender: GenderOption;
  collarDescription: string;
  pets: PetRowValues[];
  title: string;
  description: string;
  provinceCode: string;
  wardCode: string;
  detailAddress: string;
  price: string;
  latitude: string;
  longitude: string;
}

const DEFAULT_VALUES: FormValues = {
  typeText: TYPE_LABEL.LOST,
  species: 'CAT',
  speciesOther: '',
  breed: '',
  color: '',
  size: '',
  gender: 'UNKNOWN',
  collarDescription: '',
  pets: [makeDefaultPetRow()],
  title: '',
  description: '',
  provinceCode: '',
  wardCode: '',
  detailAddress: '',
  price: '',
  latitude: '',
  longitude: '',
};

export default function NewPostPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewsRef = useRef<string[]>([]);
  imagePreviewsRef.current = imagePreviews;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES });

  const { fields: petFields, append: appendPet, remove: removePet } = useFieldArray({
    control,
    name: 'pets',
  });

  const typeText = watch('typeText');
  const species = watch('species');
  const provinceCode = watch('provinceCode');
  const wardCode = watch('wardCode');
  const latitude = watch('latitude');
  const longitude = watch('longitude');

  useEffect(() => {
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    fetch(PROVINCES_API_URL)
      .then((res) => res.json())
      .then((data: Province[]) => setProvinces(data))
      .catch(() => setRegionError('Không tải được danh sách tỉnh/thành.'));
  }, []);

  useEffect(() => {
    setValue('wardCode', '');
    if (!provinceCode) {
      setWards([]);
      return;
    }
    fetch(`${PROVINCES_API_URL}${provinceCode}?depth=2`)
      .then((res) => res.json())
      .then((data: Province) => setWards(data.wards))
      .catch(() => setRegionError('Không tải được danh sách phường/xã.'));
  }, [provinceCode, setValue]);

  useEffect(() => {
    if (router.isReady) {
      setValue('typeText', TYPE_LABEL[parseType(router.query.type)]);
    }
  }, [router.isReady, router.query.type, setValue]);

  useEffect(() => {
    if (!checkingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [checkingAuth, isAuthenticated, router]);

  useEffect(() => {
    return () => {
      imagePreviewsRef.current.forEach((src) => URL.revokeObjectURL(src));
    };
  }, []);

  if (checkingAuth || !isAuthenticated) {
    return null;
  }

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
    const truncated = merged.length > MAX_IMAGES;
    const finalFiles = merged.slice(0, MAX_IMAGES);

    if (rejected.length > 0) {
      setImageError(`Đã bỏ qua ảnh không hợp lệ hoặc quá ${MAX_IMAGE_SIZE_MB}MB: ${rejected.join(', ')}`);
    } else if (truncated) {
      setImageError(`Chỉ được chọn tối đa ${MAX_IMAGES} ảnh.`);
    } else {
      setImageError(null);
    }

    const acceptedCount = finalFiles.length - imageFiles.length;
    const newPreviews = accepted.slice(0, acceptedCount).map((file) => URL.createObjectURL(file));

    setImageFiles(finalFiles);
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImageError(null);
  };

  const reverseGeocodeAndFill = async (lat: number, lng: number) => {
    if (provinces.length === 0) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=vi`,
      );
      const data = await res.json();
      const addr = data.address ?? {};
      const provinceCandidate: string = addr.state || addr.city || addr.county || '';
      const wardCandidate: string =
        addr.suburb || addr.quarter || addr.village || addr.town || addr.city_district || addr.neighbourhood || '';

      const matchedProvince = provinces.find((p) => namesMatch(p.name, provinceCandidate));
      if (!matchedProvince) return;

      setValue('provinceCode', String(matchedProvince.code));
      const wardsRes = await fetch(`${PROVINCES_API_URL}${matchedProvince.code}?depth=2`);
      const wardsData = await wardsRes.json();
      setWards(wardsData.wards);
      const matchedWard = wardCandidate
        ? wardsData.wards.find((w: Ward) => namesMatch(w.name, wardCandidate))
        : undefined;
      setValue('wardCode', matchedWard ? String(matchedWard.code) : '');
    } catch {
      // Best-effort only — leave dropdowns for manual selection on any failure.
    }
  };

  const type = LABEL_TO_TYPE[typeText.trim()] ?? null;
  const showPrice = type === 'TRADE';
  const showSpecies = type !== 'MARKETPLACE';
  const showPetList = type === 'ADOPTION';
  const showSingleAnimal = showSpecies && !showPetList;
  const selectedProvince = provinces.find((p) => String(p.code) === provinceCode);
  const selectedWard = wards.find((w) => String(w.code) === wardCode);

  const typeTextField = register('typeText', {
    validate: (value) =>
      !!LABEL_TO_TYPE[value.trim()] || 'Vui lòng chọn loại tin hợp lệ từ danh sách.',
  });

  const onSubmit = handleSubmit(async (data) => {
    const resolvedType = LABEL_TO_TYPE[data.typeText.trim()];
    if (!resolvedType) return;

    const speciesValue = data.species === 'OTHER' ? data.speciesOther.trim() : SPECIES_LABEL[data.species];
    const regionAddress =
      selectedWard && selectedProvince ? `${selectedWard.name}, ${selectedProvince.name}` : '';
    const address = [data.detailAddress.trim(), regionAddress].filter(Boolean).join(', ');

    let uploadedUrls: string[] = [];
    if (imageFiles.length > 0) {
      setUploadingImages(true);
      try {
        const formData = new FormData();
        imageFiles.forEach((file) => formData.append('images', file));
        const res = await api.postForm('/posts/upload-images', formData, accessToken || undefined);
        uploadedUrls = res.urls;
      } catch (err: any) {
        setUploadingImages(false);
        setError('root', { message: err.message || 'Tải ảnh lên thất bại.' });
        return;
      }
      setUploadingImages(false);
    }

    try {
      await api.post(
        '/posts',
        {
          type: resolvedType,
          title: data.title,
          description: data.description,
          ...(uploadedUrls.length ? { images: uploadedUrls } : {}),
          ...(address ? { address } : {}),
          ...(showPrice && data.price ? { price: Number(data.price) } : {}),
          ...(showSingleAnimal && speciesValue ? { species: speciesValue } : {}),
          ...(showSingleAnimal && data.breed ? { breed: data.breed } : {}),
          ...(showSingleAnimal && data.color ? { color: data.color } : {}),
          ...(showSingleAnimal && data.size ? { size: Number(data.size) } : {}),
          ...(showSingleAnimal ? { gender: data.gender } : {}),
          ...(type === 'LOST' && data.collarDescription ? { collarDescription: data.collarDescription } : {}),
          ...(showPetList
            ? {
                pets: data.pets.map((p) => ({
                  species: p.species === 'OTHER' ? p.speciesOther.trim() : SPECIES_LABEL[p.species],
                  ...(p.breed ? { breed: p.breed } : {}),
                  ...(p.color ? { color: p.color } : {}),
                  ...(p.age ? { age: Number(p.age) } : {}),
                  gender: p.gender,
                  ...(p.size ? { size: Number(p.size) } : {}),
                })),
              }
            : {}),
          ...(data.latitude && data.longitude
            ? { latitude: Number(data.latitude), longitude: Number(data.longitude) }
            : {}),
        },
        accessToken || undefined,
      );
      router.push(`${REDIRECT_PATH[resolvedType]}?created=1`);
    } catch (err: any) {
      setError('root', { message: err.message });
    }
  });

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Đăng tin mới</h1>
      <form onSubmit={onSubmit}>
        <div className={`${styles.field} ${styles.typeField}`}>
          <label htmlFor="type">
            Loại tin<span className={styles.requiredMark}>*</span>
          </label>
          <div className={styles.typeInputWrapper}>
            <input
              id="type"
              className={styles.typeInput}
              autoComplete="off"
              {...typeTextField}
              onFocus={() => setTypeDropdownOpen(true)}
              onBlur={(e) => {
                typeTextField.onBlur(e);
                setTypeDropdownOpen(false);
              }}
            />
            <span className={styles.typeCaret} aria-hidden="true" />
          </div>
          {typeDropdownOpen && (
            <ul className={styles.typeDropdown}>
              {TYPE_OPTIONS.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    className={styles.typeDropdownOption}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setValue('typeText', TYPE_LABEL[t], { shouldValidate: true });
                      setTypeDropdownOpen(false);
                    }}
                  >
                    {TYPE_LABEL[t]}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {errors.typeText && <p style={{ color: 'red', fontSize: 13 }}>{errors.typeText.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="title">
            Tiêu đề<span className={styles.requiredMark}>*</span>
          </label>
          <input id="title" {...register('title', { required: 'Vui lòng nhập tiêu đề.' })} />
          {errors.title && <p style={{ color: 'red', fontSize: 13 }}>{errors.title.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="description">
            Mô tả<span className={styles.requiredMark}>*</span>
          </label>
          <textarea id="description" {...register('description', { required: 'Vui lòng nhập mô tả.' })} />
          {errors.description && (
            <p style={{ color: 'red', fontSize: 13 }}>{errors.description.message}</p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="images">Hình ảnh (không bắt buộc, tối đa {MAX_IMAGES} ảnh)</label>
          <input
            id="images"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={isSubmitting || uploadingImages}
            onChange={handleFilesSelected}
          />
          {imageError && <p style={{ color: 'red', fontSize: 13 }}>{imageError}</p>}
          {imagePreviews.length > 0 && (
            <div className={styles.imagePreviewGrid}>
              {imagePreviews.map((src, idx) => (
                <div key={src} className={styles.imagePreviewItem}>
                  <img src={src} alt={`Ảnh ${idx + 1}`} />
                  <button type="button" onClick={() => removeImage(idx)} aria-label="Xóa ảnh">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {showSingleAnimal && (
          <div className={styles.field}>
            <label htmlFor="species">Loài</label>
            <Controller
              name="species"
              control={control}
              render={({ field }) => (
                <Dropdown id="species" options={SPECIES_DROPDOWN_OPTIONS} value={field.value} onChange={field.onChange} />
              )}
            />
            {species === 'OTHER' && (
              <input
                placeholder="Nhập loài (VD: Hamster, Thỏ...)"
                maxLength={100}
                {...register('speciesOther', {
                  validate: (value) => species !== 'OTHER' || !!value.trim() || 'Vui lòng nhập loài.',
                })}
              />
            )}
            {errors.speciesOther && (
              <p style={{ color: 'red', fontSize: 13 }}>{errors.speciesOther.message}</p>
            )}
          </div>
        )}

        {showSingleAnimal && (
          <div className={styles.field}>
            <label htmlFor="breed">Giống (không bắt buộc)</label>
            <input id="breed" maxLength={100} {...register('breed')} />
          </div>
        )}

        {showSingleAnimal && (
          <div className={styles.field}>
            <label htmlFor="color">Màu sắc (không bắt buộc)</label>
            <input id="color" maxLength={100} {...register('color')} />
          </div>
        )}

        {showSingleAnimal && (
          <div className={styles.field}>
            <label htmlFor="size">Cân nặng (kg, không bắt buộc)</label>
            <input id="size" type="number" min={0} step="0.1" {...register('size')} />
          </div>
        )}

        {showSingleAnimal && (
          <div className={styles.field}>
            <label htmlFor="gender">Giới tính</label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Dropdown id="gender" options={GENDER_DROPDOWN_OPTIONS} value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
        )}

        {type === 'LOST' && (
          <div className={styles.field}>
            <label htmlFor="collarDescription">Mô tả vòng cổ/thẻ bài (không bắt buộc)</label>
            <input id="collarDescription" maxLength={200} {...register('collarDescription')} />
          </div>
        )}

        {showPetList && (
          <div className={styles.field}>
            <div className={styles.petListHeader}>
              <label>
                Danh sách bé cần tìm sen<span className={styles.requiredMark}>*</span>
              </label>
              <button
                type="button"
                className={styles.addPetBtn}
                onClick={() => appendPet(makeDefaultPetRow())}
                disabled={petFields.length >= 20}
              >
                + Thêm bé
              </button>
            </div>
            <div className={styles.petTableWrapper}>
              <table className={styles.petTable}>
                <thead>
                  <tr>
                    <th>Loài</th>
                    <th>Giống</th>
                    <th>Màu sắc</th>
                    <th>Tuổi (tháng)</th>
                    <th>Giới tính</th>
                    <th>Cân nặng (kg)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {petFields.map((field, index) => {
                    const rowSpecies = watch(`pets.${index}.species`);
                    return (
                      <tr key={field.id}>
                        <td>
                          <Controller
                            name={`pets.${index}.species`}
                            control={control}
                            render={({ field }) => (
                              <Dropdown size="sm" options={SPECIES_DROPDOWN_OPTIONS} value={field.value} onChange={field.onChange} />
                            )}
                          />
                          {rowSpecies === 'OTHER' && (
                            <input
                              placeholder="Nhập loài (VD: Hamster, Thỏ...)"
                              maxLength={100}
                              {...register(`pets.${index}.speciesOther`, {
                                validate: (value) =>
                                  watch(`pets.${index}.species`) !== 'OTHER' || !!value.trim() || 'Vui lòng nhập loài.',
                              })}
                            />
                          )}
                          {errors.pets?.[index]?.speciesOther && (
                            <p style={{ color: 'red', fontSize: 12 }}>
                              {errors.pets[index]?.speciesOther?.message}
                            </p>
                          )}
                        </td>
                        <td>
                          <input maxLength={100} {...register(`pets.${index}.breed`)} />
                        </td>
                        <td>
                          <input maxLength={100} {...register(`pets.${index}.color`)} />
                        </td>
                        <td>
                          <input type="number" min={0} {...register(`pets.${index}.age`)} />
                        </td>
                        <td>
                          <Controller
                            name={`pets.${index}.gender`}
                            control={control}
                            render={({ field }) => (
                              <Dropdown size="sm" options={GENDER_DROPDOWN_OPTIONS} value={field.value} onChange={field.onChange} />
                            )}
                          />
                        </td>
                        <td>
                          <input type="number" min={0} step="0.1" {...register(`pets.${index}.size`)} />
                        </td>
                        <td>
                          {petFields.length > 1 && (
                            <button
                              type="button"
                              className={styles.removePetBtn}
                              onClick={() => removePet(index)}
                              aria-label="Xóa bé"
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showPrice && (
          <div className={styles.field}>
            <label htmlFor="price">
              Giá (đ)<span className={styles.requiredMark}>*</span>
            </label>
            <input
              id="price"
              type="number"
              min={0}
              {...register('price', { required: 'Vui lòng nhập giá.' })}
            />
            {errors.price && <p style={{ color: 'red', fontSize: 13 }}>{errors.price.message}</p>}
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="province">
            Khu vực<span className={styles.requiredMark}>*</span>
          </label>
          <div className={styles.regionRow}>
            <Controller
              name="provinceCode"
              control={control}
              rules={{ required: 'Vui lòng chọn tỉnh/thành phố.' }}
              render={({ field }) => (
                <Dropdown
                  id="province"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="-- Tỉnh/Thành phố --"
                  options={provinces.map((p) => ({ value: String(p.code), label: p.name }))}
                />
              )}
            />
            <Controller
              name="wardCode"
              control={control}
              rules={{ required: 'Vui lòng chọn phường/xã.' }}
              render={({ field }) => (
                <Dropdown
                  id="ward"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!provinceCode}
                  placeholder="-- Phường/Xã --"
                  options={wards.map((w) => ({ value: String(w.code), label: w.name }))}
                />
              )}
            />
          </div>
          {errors.provinceCode && (
            <p style={{ color: 'red', fontSize: 13 }}>{errors.provinceCode.message}</p>
          )}
          {errors.wardCode && <p style={{ color: 'red', fontSize: 13 }}>{errors.wardCode.message}</p>}
          {regionError && <p style={{ color: 'red', fontSize: 13 }}>{regionError}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="detailAddress">Địa chỉ cụ thể (không bắt buộc)</label>
          <input
            id="detailAddress"
            placeholder="Số nhà, tên đường..."
            maxLength={200}
            {...register('detailAddress')}
          />
        </div>

        <div className={styles.field}>
          <button
            type="button"
            className={styles.mapToggle}
            onClick={() => setShowMap((open) => !open)}
          >
            <MapPin size={14} style={{ verticalAlign: -2 }} />{' '}
            {showMap ? 'Ẩn bản đồ' : 'Ghim vị trí trên bản đồ (không bắt buộc)'}
          </button>
          {showMap && (
            <LocationPicker
              latitude={latitude ? Number(latitude) : null}
              longitude={longitude ? Number(longitude) : null}
              onChange={(lat, lng) => {
                setValue('latitude', String(lat));
                setValue('longitude', String(lng));
                reverseGeocodeAndFill(lat, lng);
              }}
              onClear={() => {
                setValue('latitude', '');
                setValue('longitude', '');
              }}
            />
          )}
        </div>

        {errors.root && <p style={{ color: 'red', fontSize: 14 }}>{errors.root.message}</p>}
        <button
          type="submit"
          className={`btn btn-primary ${styles.submit}`}
          disabled={isSubmitting || uploadingImages}
        >
          {uploadingImages ? 'Đang tải ảnh...' : isSubmitting ? 'Đang đăng...' : 'Đăng tin'}
        </button>
      </form>
    </div>
  );
}

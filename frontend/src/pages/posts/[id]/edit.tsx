import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { MapPin, Plus, X } from 'lucide-react';
import { api, toAssetUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { namesMatch } from '../../../lib/location';
import { PROVINCES_API_URL, Province, useRegionOptions } from '../../../lib/useRegionOptions';
import { useImageUpload } from '../../../lib/useImageUpload';
import Dropdown from '../../../components/Dropdown';
import styles from '../new/index.module.scss';

const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE_MB = 5;

const LocationPicker = dynamic(() => import('../../../components/LocationPicker'), { ssr: false });

type PostType = 'LOST' | 'ADOPTION' | 'SUPPLY' | 'TRADE';
type PetGender = 'MALE' | 'FEMALE' | 'UNKNOWN';
type AdoptionPetStatus = 'PENDING' | 'ADOPTED';

interface AdoptionPetInfo {
  species: string;
  breed?: string;
  color?: string;
  age?: number;
  gender?: PetGender;
  size?: number;
  status?: AdoptionPetStatus;
}

interface Author {
  id: string;
  name: string;
}

interface PostDetail {
  id: string;
  type: PostType;
  title: string;
  description: string;
  images: string[];
  address?: string;
  provinceCode?: number;
  wardCode?: number;
  price?: number;
  species?: string;
  breed?: string;
  color?: string;
  size?: number;
  gender?: PetGender;
  collarDescription?: string;
  pets?: AdoptionPetInfo[];
  latitude?: number;
  longitude?: number;
  author?: Author;
}

const TYPE_LABEL: Record<PostType, string> = {
  LOST: 'Tìm boss lạc',
  ADOPTION: 'Tuyển sen/Tìm sen',
  SUPPLY: 'Cho tặng đồ dùng',
  TRADE: 'Mua bán boss',
};

type SpeciesOption = 'CAT' | 'DOG' | 'OTHER';

const SPECIES_OPTIONS: SpeciesOption[] = ['CAT', 'DOG', 'OTHER'];

const SPECIES_LABEL: Record<SpeciesOption, string> = {
  CAT: 'Mèo',
  DOG: 'Chó',
  OTHER: 'Khác',
};

const SPECIES_DROPDOWN_OPTIONS = SPECIES_OPTIONS.map((s) => ({ value: s, label: SPECIES_LABEL[s] }));

function toSpeciesOption(value?: string): { species: SpeciesOption; speciesOther: string } {
  if (!value || value === SPECIES_LABEL.CAT) return { species: 'CAT', speciesOther: '' };
  if (value === SPECIES_LABEL.DOG) return { species: 'DOG', speciesOther: '' };
  return { species: 'OTHER', speciesOther: value };
}

type GenderOption = 'MALE' | 'FEMALE' | 'UNKNOWN';

const GENDER_OPTIONS: GenderOption[] = ['MALE', 'FEMALE', 'UNKNOWN'];

const GENDER_LABEL: Record<GenderOption, string> = {
  MALE: 'Đực',
  FEMALE: 'Cái',
  UNKNOWN: 'Chưa rõ',
};

const GENDER_DROPDOWN_OPTIONS = GENDER_OPTIONS.map((g) => ({ value: g, label: GENDER_LABEL[g] }));

interface PetRowValues {
  species: SpeciesOption;
  speciesOther: string;
  breed: string;
  color: string;
  age: string;
  gender: GenderOption;
  size: string;
  status: AdoptionPetStatus;
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
    status: 'PENDING',
  };
}

// Adoption status is only ever changed from the post detail page — carried through
// here unchanged so saving unrelated edits doesn't reset a pet back to "pending".
function petToRow(pet: AdoptionPetInfo): PetRowValues {
  const { species, speciesOther } = toSpeciesOption(pet.species);
  return {
    species,
    speciesOther,
    breed: pet.breed ?? '',
    color: pet.color ?? '',
    age: pet.age != null ? String(pet.age) : '',
    gender: pet.gender ?? 'UNKNOWN',
    size: pet.size != null ? pet.size.toFixed(1) : '',
    status: pet.status ?? 'PENDING',
  };
}

// Mirrors how `address` is composed on save (`[detail, ward, province].join(', ')`):
// strips the known ward+province tail so the detail field doesn't start out
// duplicating it. Falls back to the full address text for legacy posts that
// predate provinceCode/wardCode, so nothing is lost.
function defaultDetailAddress(post: PostDetail | null): string {
  if (!post?.address) return '';
  if (!post.provinceCode || !post.wardCode) return post.address;
  const parts = post.address.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.slice(0, -2).join(', ');
}

interface FormValues {
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

interface Props {
  post: PostDetail | null;
}

export default function EditPostPage({ post }: Props) {
  const router = useRouter();
  const { isAuthenticated, user, accessToken } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const gallery = useImageUpload({
    maxFiles: MAX_IMAGES,
    maxSizeMB: MAX_IMAGE_SIZE_MB,
    existing: post?.images ?? [],
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const speciesInfo = toSpeciesOption(post?.species);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      species: speciesInfo.species,
      speciesOther: speciesInfo.speciesOther,
      breed: post?.breed ?? '',
      color: post?.color ?? '',
      size: post?.size != null ? post.size.toFixed(1) : '',
      gender: post?.gender ?? 'UNKNOWN',
      collarDescription: post?.collarDescription ?? '',
      pets: post?.pets && post.pets.length > 0 ? post.pets.map(petToRow) : [makeDefaultPetRow()],
      title: post?.title ?? '',
      description: post?.description ?? '',
      provinceCode: post?.provinceCode != null ? String(post.provinceCode) : '',
      wardCode: post?.wardCode != null ? String(post.wardCode) : '',
      detailAddress: defaultDetailAddress(post),
      price: post?.price != null ? String(post.price) : '',
      latitude: post?.latitude != null ? String(post.latitude) : '',
      longitude: post?.longitude != null ? String(post.longitude) : '',
    },
  });

  const { fields: petFields, append: appendPet, remove: removePet } = useFieldArray({
    control,
    name: 'pets',
  });

  const species = watch('species');
  const provinceCode = watch('provinceCode');
  const wardCode = watch('wardCode');
  const latitude = watch('latitude');
  const longitude = watch('longitude');

  const { provinces, wards, error: regionError } = useRegionOptions(provinceCode, wardCode, () =>
    setValue('wardCode', ''),
  );

  useEffect(() => {
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (checkingAuth) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (post && user && post.author && post.author.id !== user.id) {
      router.replace(`/posts/${post.id}`);
    }
  }, [checkingAuth, isAuthenticated, post, user, router]);

  if (!post) {
    return (
      <div className={styles.wrapper}>
        <p>Không tìm thấy bài đăng.</p>
      </div>
    );
  }

  const isOwner = !!user && !!post.author && post.author.id === user.id;

  if (checkingAuth || !isAuthenticated || !isOwner) {
    return null;
  }

  const type = post.type;
  const showPrice = type === 'TRADE';
  const showSpecies = type !== 'SUPPLY';
  const showPetList = type === 'ADOPTION';
  const showSingleAnimal = showSpecies && !showPetList;
  const selectedProvince = provinces.find((p) => String(p.code) === provinceCode);
  const selectedWard = wards.find((w) => String(w.code) === wardCode);

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
      const wardsData: Province = await wardsRes.json();
      const matchedWard = wardCandidate
        ? wardsData.wards.find((w) => namesMatch(w.name, wardCandidate))
        : undefined;
      setValue('wardCode', matchedWard ? String(matchedWard.code) : '');
    } catch {
      // Best-effort only — leave dropdowns for manual selection on any failure.
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    const speciesValue = data.species === 'OTHER' ? data.speciesOther.trim() : SPECIES_LABEL[data.species];
    const regionAddress =
      selectedWard && selectedProvince ? `${selectedWard.name}, ${selectedProvince.name}` : '';
    const address = [data.detailAddress.trim(), regionAddress].filter(Boolean).join(', ');

    let uploadedUrls: string[] = [];
    if (gallery.imageFiles.length > 0) {
      setUploadingImages(true);
      try {
        const formData = new FormData();
        gallery.imageFiles.forEach((file) => formData.append('images', file));
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
      await api.patch(
        `/posts/${post.id}`,
        {
          title: data.title,
          description: data.description,
          images: [...gallery.existingImages, ...uploadedUrls],
          address,
          ...(selectedProvince ? { provinceCode: selectedProvince.code } : {}),
          ...(selectedWard ? { wardCode: selectedWard.code } : {}),
          ...(showPrice && data.price ? { price: Number(data.price) } : {}),
          ...(showSingleAnimal
            ? {
                species: speciesValue,
                breed: data.breed,
                color: data.color,
                gender: data.gender,
                ...(data.size ? { size: Number(data.size) } : {}),
              }
            : {}),
          ...(type === 'LOST' ? { collarDescription: data.collarDescription } : {}),
          ...(showPetList
            ? {
                pets: data.pets.map((p) => ({
                  species: p.species === 'OTHER' ? p.speciesOther.trim() : SPECIES_LABEL[p.species],
                  ...(p.breed ? { breed: p.breed } : {}),
                  ...(p.color ? { color: p.color } : {}),
                  ...(p.age ? { age: Number(p.age) } : {}),
                  gender: p.gender,
                  ...(p.size ? { size: Number(p.size) } : {}),
                  status: p.status,
                })),
              }
            : {}),
          ...(data.latitude && data.longitude
            ? { latitude: Number(data.latitude), longitude: Number(data.longitude) }
            : {}),
        },
        accessToken || undefined,
      );
      router.push(`/posts/${post.id}`);
    } catch (err: any) {
      setError('root', { message: err.message });
    }
  });

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Chỉnh sửa tin ({TYPE_LABEL[type]})</h1>
      <form onSubmit={onSubmit} className={styles.card}>
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
          <label htmlFor="images">
            Hình ảnh <span className={styles.optionalHint}>(không bắt buộc, tối đa {MAX_IMAGES} ảnh)</span>
          </label>
          <input
            id="images"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className={styles.hiddenFileInput}
            disabled={isSubmitting || uploadingImages || gallery.totalCount >= MAX_IMAGES}
            onChange={gallery.handleFilesSelected}
          />
          {gallery.imageError && <p style={{ color: 'red', fontSize: 13 }}>{gallery.imageError}</p>}
          <div className={styles.imageGrid}>
            {gallery.existingImages.map((img, idx) => (
              <div key={img} className={styles.imageTile}>
                <img src={toAssetUrl(img)} alt={`Ảnh ${idx + 1}`} />
                <button
                  type="button"
                  className={styles.imageRemoveBtn}
                  onClick={() => gallery.removeExisting(idx)}
                  aria-label="Xóa ảnh"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {gallery.imagePreviews.map((src, idx) => (
              <div key={src} className={styles.imageTile}>
                <img src={src} alt={`Ảnh mới ${idx + 1}`} />
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
            {gallery.totalCount < MAX_IMAGES && (
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
              placeholder="VD: 150000"
              {...register('price', { required: 'Vui lòng nhập giá.' })}
            />
            {errors.price && <p style={{ color: 'red', fontSize: 13 }}>{errors.price.message}</p>}
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="province">Khu vực (không bắt buộc)</label>
          <div className={styles.regionRow}>
            <Controller
              name="provinceCode"
              control={control}
              render={({ field }) => (
                <Dropdown
                  id="province"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="-- Tỉnh/Thành phố --"
                  options={provinces.map((p) => ({ value: String(p.code), label: p.name }))}
                  clearable
                />
              )}
            />
            <Controller
              name="wardCode"
              control={control}
              render={({ field }) => (
                <Dropdown
                  id="ward"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!provinceCode}
                  placeholder="-- Phường/Xã --"
                  options={wards.map((w) => ({ value: String(w.code), label: w.name }))}
                  clearable
                />
              )}
            />
          </div>
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
            {showMap ? 'Ẩn bản đồ' : 'Ghim lại vị trí trên bản đồ (không bắt buộc)'}
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
          {uploadingImages ? 'Đang tải ảnh...' : isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = ctx.params?.id as string;
  try {
    const post = await api.get(`/posts/${id}`);
    return { props: { post } };
  } catch {
    return { props: { post: null } };
  }
};

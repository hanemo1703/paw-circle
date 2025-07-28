import { useEffect, useRef, useState } from 'react';

// Same source used by the "new post" location picker and the Khu vực filter.
export const PROVINCES_API_URL = 'https://provinces.open-api.vn/api/v2/p/';

export interface Ward {
  code: number;
  name: string;
}

export interface Province {
  code: number;
  name: string;
  wards: Ward[];
}

// Fetches provinces once, then wards whenever `provinceCode` changes. Only calls
// `onResetWard` if the currently selected ward doesn't belong to the freshly
// fetched province — this lets a form load with a pre-filled province+ward (e.g.
// editing an existing post) without the ward being wiped out on first mount.
export function useRegionOptions(provinceCode: string, currentWardCode: string, onResetWard: () => void) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Read via a ref (always up to date) rather than closing over `currentWardCode` at the
  // time the fetch below started — otherwise a ward set concurrently by another caller
  // (e.g. reverse-geocoding a map pin) could race with this fetch and get reset again.
  const currentWardCodeRef = useRef(currentWardCode);
  currentWardCodeRef.current = currentWardCode;

  useEffect(() => {
    fetch(PROVINCES_API_URL)
      .then((res) => res.json())
      .then((data: Province[]) => setProvinces(data))
      .catch(() => setError('Không tải được danh sách tỉnh/thành.'));
  }, []);

  useEffect(() => {
    if (!provinceCode) {
      setWards([]);
      onResetWard();
      return;
    }
    fetch(`${PROVINCES_API_URL}${provinceCode}?depth=2`)
      .then((res) => res.json())
      .then((data: Province) => {
        setWards(data.wards);
        if (!data.wards.some((w) => String(w.code) === currentWardCodeRef.current)) {
          onResetWard();
        }
      })
      .catch(() => setError('Không tải được danh sách phường/xã.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinceCode]);

  return { provinces, wards, error };
}

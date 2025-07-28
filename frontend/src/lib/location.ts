// Vietnamese address/location names appear in many different forms across the app
// (official provinces API names, free-text post addresses, reverse-geocoded results),
// e.g. "Thành phố Hồ Chí Minh" vs "TP.HCM" vs "Tp Hồ Chí Minh". These helpers strip
// diacritics/prefixes so such variants can still be compared as the same place.
export function normalizeLocationName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // "TP.HCM" / "TPHCM" -> "tp hcm" so the prefix-word strip below (which needs a
    // word boundary after "tp") also catches the dot-less/space-less abbreviation.
    .replace(/\btp\.?(?=[a-z])/g, 'tp ')
    .replace(/\b(tinh|thanh pho|tp|quan|huyen|thi xa|phuong|xa|thi tran)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Initials of each word, e.g. "ho chi minh" -> "hcm" — lets an acronym like
// "HCM" match its spelled-out province name and vice versa.
function acronymOf(normalized: string): string {
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('');
}

export function namesMatch(a: string, b: string): boolean {
  const na = normalizeLocationName(a);
  const nb = normalizeLocationName(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  return na === acronymOf(nb) || nb === acronymOf(na);
}

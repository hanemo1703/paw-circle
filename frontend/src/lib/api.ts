const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

async function request(path: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Yêu cầu thất bại: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body: unknown, token?: string) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
  postForm: (path: string, formData: FormData, token?: string) =>
    request(path, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
};

export function toAssetUrl(path?: string): string | undefined {
  if (!path) return path;
  return /^https?:\/\//.test(path) ? path : `${API_ORIGIN}${path}`;
}

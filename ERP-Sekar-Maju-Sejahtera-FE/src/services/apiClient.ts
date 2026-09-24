/**
 * API Client untuk komunikasi ke Backend Laravel (ERP-Sekar-Maju-Sejahtera-BE)
 * Mendukung autentikasi Sanctum Bearer Token dan deteksi status koneksi.
 */

function resolveDefaultApiUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // 1. Jika dibuka di komputer lokal saat development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api/v1';
    }
    // 2. Jika di-deploy di Vercel (demo standalone tanpa backend server)
    if (hostname.endsWith('.vercel.app')) {
      return ''; // Langsung mode lokal tanpa delay request API
    }
    // 3. Jika dibuka di server VPS / domain produksi, gunakan origin server yang sedang dibuka
    return `${window.location.origin}/api/v1`;
  }
  return 'http://localhost:8000/api/v1';
}

export const API_BASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) 
    ? import.meta.env.VITE_API_BASE_URL 
    : resolveDefaultApiUrl();

const TOKEN_KEY = 'erp_sanctum_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.warn('Gagal menyimpan token ke localStorage:', err);
  }
}

/** Batas waktu satu permintaan API, agar layar tidak menunggu tanpa akhir bila server macet */
export const API_TIMEOUT_MS = 15000;

/** Waktu (ms) terakhir permintaan gagal karena jaringan / batas waktu; membatalkan cache status server */
let terakhirGagalJaringan = 0;
export const getTerakhirGagalJaringan = (): number => terakhirGagalJaringan;

/**
 * Galat dari server dengan kode HTTP-nya, agar pemanggil bisa membedakan sesi habis (401), data belum ada (404),
 * data sudah dihapus (410), penolakan (422), dan galat server (5xx). Status 0 = server tidak dapat dihubungi
 * (jaringan putus / batas waktu habis): datanya belum tentu sampai, jadi boleh dicoba ulang.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Server tidak dapat dihubungi (bukan menolak): jaringan putus, batas waktu habis, atau server sibuk. */
export function isGalatJaringan(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return typeof status !== 'number' || status === 0 || status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

/** Pesan galat untuk operator, tanpa istilah teknis untuk kasus umum. */
export function pesanGalatApi(err: unknown): string {
  const status = (err as { status?: number } | null)?.status;
  if (status === 401) return 'sesi login habis, silakan login ulang';
  if (isGalatJaringan(err)) return 'server tidak dapat dihubungi. Periksa jaringan lalu coba lagi';
  return err instanceof Error && err.message ? err.message : 'server menolak permintaan';
}

/** Nama event yang dikirim saat server menjawab 401 (token tidak berlaku lagi). App menampilkan login ulang. */
export const EVENT_SESI_HABIS = 'erp-sesi-habis';

export interface ApiResponse<T = any> {
  status: 'success' | 'error' | 'warning';
  message?: string;
  data?: T;
}

/**
 * Cek apakah backend Laravel sedang aktif dan dapat dihubungi
 */
export async function checkBackendHealth(): Promise<boolean> {
  if (!API_BASE_URL) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 detik: VPS yang baru bangun bisa lambat menjawab

    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!res.ok) return false;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn(`[ERP-API] Endpoint ${API_BASE_URL}/health mengembalikan ${contentType}, bukan JSON. Pastikan konfigurasi Nginx server mengarahkan rute /api ke Laravel.`);
      return false;
    }

    const data = await res.json().catch(() => null);
    return Boolean(data && (data.status === 'ok' || data.status === 'success'));
  } catch (err) {
    console.warn(`[ERP-API] Tidak dapat menghubungi backend server di ${API_BASE_URL}/health:`, err);
    return false;
  }
}

/**
 * Wrapper pemanggilan API HTTP generik
 */
export async function apiRequest<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    terakhirGagalJaringan = Date.now();
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(`Server tidak merespons dalam ${API_TIMEOUT_MS / 1000} detik.`, 0);
    }
    throw new ApiError(err instanceof Error ? err.message : 'Server tidak dapat dihubungi', 0);
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const textPreview = await res.text().catch(() => '');
    console.error(`[ERP-API] Request ke ${url} merespon dengan ${contentType} (bukan JSON):`, textPreview.substring(0, 200));
    throw new ApiError(`Server tidak mengembalikan JSON (${res.status} ${res.statusText}). Periksa konfigurasi Nginx / backend server.`, res.status);
  }

  const data = await res.json().catch(() => ({ status: 'error', message: 'Respon tidak valid dari server' }));

  if (!res.ok) {
    // Juga tanpa token (login cadangan saat server sempat tidak terjangkau): begitu server menjawab, login ulang
    if (res.status === 401 && !url.includes('/auth/login') && typeof window !== 'undefined') {
      // Token yang ditolak ikut dikirim: jawaban terlambat untuk token lama tidak boleh mengeluarkan sesi baru
      window.dispatchEvent(new CustomEvent(EVENT_SESI_HABIS, { detail: { token } }));
    }
    const errors = data?.errors;
    let detail = data?.message || `HTTP Error ${res.status}`;
    if (errors && typeof errors === 'object') {
      const first = (Object.values(errors) as unknown[])
        .flat()
        .find((item) => typeof item === 'string' && item.trim());
      if (typeof first === 'string') detail = first;
    }
    throw new ApiError(detail, res.status);
  }

  return data;
}

export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) => 
    apiRequest<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};

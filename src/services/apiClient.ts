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

/** Galat dari server dengan kode HTTP-nya, agar pemanggil bisa membedakan sesi habis (401), data belum ada (404), dan galat server (5xx). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error' | 'warning';
  message?: string;
  data?: T;
  /** Server menjawab 304: isi daftar sama dengan penyegaran sebelumnya (isi diambil dari simpanan di memori). */
  tidakBerubah?: boolean;
}

/** Opsi permintaan daftar yang disegarkan berkala (lihat api.get). */
export interface OpsiDaftar {
  /** Pakai ETag: server menjawab 304 tanpa isi bila daftar tidak berubah sejak penyegaran sebelumnya. */
  daftar?: boolean;
  /** Abaikan ETag dan ambil isi penuh (mis. setelah penolakan/penghapusan dari perangkat lain). */
  paksa?: boolean;
}

/**
 * Jawaban daftar terakhir per alamat beserta ETag-nya, hanya di memori (hilang saat halaman dimuat ulang). Dipakai
 * supaya penyegaran berkala menu yang sedang dibuka tidak mengunduh dan mengolah ulang daftar yang tidak berubah.
 */
const simpananDaftar = new Map<string, { etag: string; jawaban: ApiResponse<any> }>();
export const lupakanSimpananDaftar = (): void => simpananDaftar.clear();

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
  options: RequestInit & OpsiDaftar = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const { daftar, paksa, ...init } = options;
  const pakaiEtag = Boolean(daftar) && (init.method ?? 'GET') === 'GET';
  const simpanan = pakaiEtag && !paksa ? simpananDaftar.get(url) : undefined;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (simpanan) {
    headers['If-None-Match'] = simpanan.etag;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
      // ETag diatur sendiri; cache HTTP peramban tidak ikut campur
      ...(pakaiEtag ? { cache: 'no-store' as RequestCache } : {}),
    });
  } catch (err) {
    terakhirGagalJaringan = Date.now();
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Server tidak merespons dalam ${API_TIMEOUT_MS / 1000} detik.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  // Daftar tidak berubah sejak penyegaran sebelumnya: tidak ada isi yang diunduh
  if (res.status === 304) {
    if (simpanan) return { ...(simpanan.jawaban as ApiResponse<T>), tidakBerubah: true };
    simpananDaftar.delete(url);
    return apiRequest<T>(endpoint, { ...options, paksa: true });
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const textPreview = await res.text().catch(() => '');
    console.error(`[ERP-API] Request ke ${url} merespon dengan ${contentType} (bukan JSON):`, textPreview.substring(0, 200));
    throw new ApiError(`Server tidak mengembalikan JSON (${res.status} ${res.statusText}). Periksa konfigurasi Nginx / backend server.`, res.status);
  }

  const data = await res.json().catch(() => ({ status: 'error', message: 'Respon tidak valid dari server' }));

  if (!res.ok) {
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

  if (pakaiEtag) {
    const etag = res.headers.get('ETag');
    if (etag) simpananDaftar.set(url, { etag, jawaban: data });
    else simpananDaftar.delete(url);
  }

  return data;
}

export const api = {
  /** `opsi.daftar` untuk daftar yang disegarkan berkala: dijawab 304 (`tidakBerubah`) bila isinya tidak berubah. */
  get: <T = any>(endpoint: string, opsi: OpsiDaftar = {}) => apiRequest<T>(endpoint, { method: 'GET', ...opsi }),
  post: <T = any>(endpoint: string, body?: any) => 
    apiRequest<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(endpoint: string, body?: any) => 
    apiRequest<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};

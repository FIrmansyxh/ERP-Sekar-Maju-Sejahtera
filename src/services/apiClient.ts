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
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 detik timeout

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

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const textPreview = await res.text().catch(() => '');
    console.error(`[ERP-API] Request ke ${url} merespon dengan ${contentType} (bukan JSON):`, textPreview.substring(0, 200));
    throw new Error(`Server tidak mengembalikan JSON (${res.status} ${res.statusText}). Periksa konfigurasi Nginx / backend server.`);
  }

  const data = await res.json().catch(() => ({ status: 'error', message: 'Respon tidak valid dari server' }));

  if (!res.ok) {
    throw new Error(data.message || `HTTP Error ${res.status}`);
  }

  return data;
}

export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) => 
    apiRequest<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(endpoint: string, body?: any) => 
    apiRequest<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};

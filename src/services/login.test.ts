import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErpApiService } from './erpApi';
import { INITIAL_USER_DATA } from '../data/initialUserData';
import * as apiClient from './apiClient';

// Kata sandi awal tidak diketahui tes; akun lokal disiapkan dengan hash sandi uji sendiri.
const SANDI_UJI = 'sandi-uji-123';

async function sha256(teks: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('login: server adalah penentu, akun lokal hanya saat server tidak terjangkau', () => {
  beforeEach(async () => {
    const { saveUserData } = await import('../utils/storage');
    saveUserData([{ ...INITIAL_USER_DATA[0], password: await sha256(SANDI_UJI) }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('server menolak sandi (401): login gagal dan TIDAK jatuh ke akun lokal', async () => {
    vi.spyOn(ErpApiService, 'isBackendOnline').mockResolvedValue(true);
    vi.spyOn(apiClient.api, 'post').mockRejectedValue(new apiClient.ApiError('Username atau password salah.', 401));

    const hasil = await ErpApiService.login(INITIAL_USER_DATA[0].username, SANDI_UJI);

    expect(hasil.success).toBe(false);
    expect(hasil.mode).toBe('api');
    expect(hasil.message).toBe('Username atau password salah.');
  });

  it('server menjawab tanpa sukses: login gagal, bukan fallback', async () => {
    vi.spyOn(ErpApiService, 'isBackendOnline').mockResolvedValue(true);
    vi.spyOn(apiClient.api, 'post').mockResolvedValue({ status: 'error', message: 'Akun dinonaktifkan.' });

    const hasil = await ErpApiService.login(INITIAL_USER_DATA[0].username, SANDI_UJI);

    expect(hasil.success).toBe(false);
    expect(hasil.mode).toBe('api');
  });

  it('server tidak terjangkau: akun lokal dipakai agar gudang tetap beroperasi', async () => {
    vi.spyOn(ErpApiService, 'isBackendOnline').mockResolvedValue(false);

    const hasil = await ErpApiService.login(INITIAL_USER_DATA[0].username, SANDI_UJI);

    expect(hasil.success).toBe(true);
    expect(hasil.mode).toBe('local');
  });

  it('galat jaringan atau 5xx saat login: akun lokal dipakai', async () => {
    vi.spyOn(ErpApiService, 'isBackendOnline').mockResolvedValue(true);
    vi.spyOn(apiClient.api, 'post').mockRejectedValue(new apiClient.ApiError('Bad gateway', 502));

    const hasil = await ErpApiService.login(INITIAL_USER_DATA[0].username, SANDI_UJI);

    expect(hasil.mode).toBe('local');
    expect(hasil.success).toBe(true);
  });

  it('fallback lokal tetap menolak sandi yang salah', async () => {
    vi.spyOn(ErpApiService, 'isBackendOnline').mockResolvedValue(false);

    const hasil = await ErpApiService.login(INITIAL_USER_DATA[0].username, 'salah');

    expect(hasil.success).toBe(false);
  });
});

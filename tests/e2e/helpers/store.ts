import LZString from 'lz-string';
import type { Page } from '@playwright/test';

/** Kunci localStorage yang dipakai aplikasi (lihat src/utils/storage.ts). */
export const KEYS = {
  petani: 'erp_tembakau_petani_v32',
  barang: 'erp_tembakau_barang_v32',
  masterBarang: 'erp_tembakau_master_barang_v32',
  harga: 'erp_tembakau_harga_v32',
  hargaJual: 'erp_tembakau_harga_jual_v32',
  transaksi: 'erp_tembakau_transaksi_v32',
  sample: 'erp_tembakau_sample_v32',
  batchSample: 'erp_tembakau_batch_sample_v32',
  pengiriman: 'erp_tembakau_pengiriman_v32',
  users: 'erp_tembakau_users_v32',
  currentUser: 'erp_tembakau_current_user_v32',
  audit: 'erp_tembakau_audit_log_v32',
  rawAuth: 'erp_tembakau_auth_session',
  logoutFlag: 'erp_explicit_logout',
  activeModule: 'erp_tembakau_active_module',
} as const;

export async function rawGet(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

export async function rawSet(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
}

export async function rawRemove(page: Page, key: string): Promise<void> {
  await page.evaluate((k) => localStorage.removeItem(k), key);
}

/** Membaca & mendekompresi (lz-string UTF16) data aplikasi dari localStorage. */
export async function readStore<T = any>(page: Page, key: string): Promise<T | null> {
  const raw = await rawGet(page, key);
  if (raw === null || raw === undefined) return null;
  if (raw.startsWith('[') || raw.startsWith('{')) return JSON.parse(raw) as T;
  const decompressed = LZString.decompressFromUTF16(raw);
  if (!decompressed) return null;
  return JSON.parse(decompressed) as T;
}

/** Menulis data ke localStorage dalam format terkompresi yang sama dengan aplikasi. */
export async function writeStore(page: Page, key: string, data: unknown): Promise<void> {
  const compressed = LZString.compressToUTF16(JSON.stringify(data));
  await rawSet(page, key, compressed);
}

export async function clearAllStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}

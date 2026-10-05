import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, lupakanSimpananDaftar } from './apiClient';

/** Jawaban fetch tiruan secukupnya untuk apiRequest. */
const jawaban = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  statusText: '',
  headers: new Headers({ 'content-type': 'application/json', ...headers }),
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe('apiClient: daftar dengan ETag (penyegaran berkala hemat)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    lupakanSimpananDaftar();
  });

  it('jawaban 304 memakai isi tersimpan tanpa mengunduh ulang, dan paksa mengabaikan ETag', async () => {
    const isi = { status: 'success', data: [{ petani_id: 'P1' }] };
    const fetchTiruan = vi
      .fn()
      .mockResolvedValueOnce(jawaban(200, isi, { ETag: '"v1"' }))
      .mockResolvedValueOnce({ ...jawaban(304, null), headers: new Headers({ ETag: '"v1"' }) })
      .mockResolvedValueOnce(jawaban(200, isi, { ETag: '"v1"' }));
    vi.stubGlobal('fetch', fetchTiruan);

    const pertama = await api.get('/petani', { daftar: true });
    expect(pertama.tidakBerubah).toBeUndefined();
    expect(fetchTiruan.mock.calls[0][1].headers['If-None-Match']).toBeUndefined();

    const kedua = await api.get('/petani', { daftar: true });
    expect(fetchTiruan.mock.calls[1][1].headers['If-None-Match']).toBe('"v1"');
    expect(kedua.tidakBerubah).toBe(true);
    expect(kedua.data).toBe(pertama.data);

    await api.get('/petani', { daftar: true, paksa: true });
    expect(fetchTiruan.mock.calls[2][1].headers['If-None-Match']).toBeUndefined();
  });

  it('permintaan biasa (bukan daftar) tidak memakai ETag', async () => {
    const fetchTiruan = vi.fn().mockResolvedValue(jawaban(200, { status: 'success', data: {} }, { ETag: '"x"' }));
    vi.stubGlobal('fetch', fetchTiruan);
    await api.get('/transaksi/TRX-1');
    await api.get('/transaksi/TRX-1');
    expect(fetchTiruan.mock.calls[1][1].headers['If-None-Match']).toBeUndefined();
  });

  it('304 tanpa isi tersimpan (halaman dimuat ulang) diulang tanpa ETag', async () => {
    const fetchTiruan = vi
      .fn()
      .mockResolvedValueOnce(jawaban(304, null))
      .mockResolvedValueOnce(jawaban(200, { status: 'success', data: [] }, { ETag: '"v2"' }));
    vi.stubGlobal('fetch', fetchTiruan);
    const hasil = await api.get('/barang', { daftar: true });
    expect(hasil.status).toBe('success');
    expect(fetchTiruan).toHaveBeenCalledTimes(2);
  });
});

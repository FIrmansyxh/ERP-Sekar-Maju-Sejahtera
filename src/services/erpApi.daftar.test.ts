import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErpApiService } from './erpApi';
import * as apiClient from './apiClient';

describe('daftar dari server: jawaban "tidak berubah" (304) tidak diolah dan tidak disimpan ulang', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    ErpApiService.lupakanDaftar();
  });

  it('petani: 304 mengembalikan hasil olahan sebelumnya tanpa menulis ke penyimpanan peramban', async () => {
    vi.spyOn(ErpApiService, 'isBackendOnline').mockResolvedValue(true);
    const isi = { status: 'success' as const, data: [{ petani_id: 'PTN-2026-001', nama_petani: 'Pak Uji', status_aktif: true }] };
    const get = vi
      .spyOn(apiClient.api, 'get')
      .mockResolvedValueOnce(isi)
      .mockResolvedValueOnce({ ...isi, tidakBerubah: true });

    const pertama = await ErpApiService.getPetaniList();
    expect(pertama).toMatchObject({ fromBackend: true, tidakBerubah: false });
    expect(get).toHaveBeenCalledWith('/petani', { daftar: true, paksa: undefined });

    const tulis = vi.spyOn(Storage.prototype, 'setItem');
    const kedua = await ErpApiService.getPetaniList();
    expect(kedua.tidakBerubah).toBe(true);
    expect(kedua.data).toBe(pertama.data);
    expect(tulis).not.toHaveBeenCalled();
  });

  it('muat ulang paksa diteruskan ke permintaan (tanpa ETag)', async () => {
    vi.spyOn(ErpApiService, 'isBackendOnline').mockResolvedValue(true);
    const get = vi.spyOn(apiClient.api, 'get').mockResolvedValue({ status: 'success', data: [] });
    await ErpApiService.getPengirimanList({ paksa: true });
    expect(get).toHaveBeenCalledWith('/pengiriman', { daftar: true, paksa: true });
  });

  it('ringkasan: server lama tanpa endpoint tidak ditanya terus', async () => {
    vi.spyOn(ErpApiService, 'isBackendOnline').mockResolvedValue(true);
    const get = vi
      .spyOn(apiClient.api, 'get')
      .mockRejectedValue(new apiClient.ApiError('The route api/v1/ringkasan could not be found.', 404));
    expect(await ErpApiService.getRingkasan()).toBeNull();
    expect(await ErpApiService.getRingkasan()).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });
});

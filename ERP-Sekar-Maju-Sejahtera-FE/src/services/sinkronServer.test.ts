import { afterEach, describe, expect, it, vi } from 'vitest';
import { ambilPerubahan, gabungDaftar } from './sinkronServer';
import * as apiClient from './apiClient';

interface Baris {
  id: string;
  nama: string;
  diperbarui_pada?: string;
}
const opsi = { ambilId: (b: Baris) => b.id };
const b = (id: string, nama: string, waktu?: string): Baris => ({ id, nama, ...(waktu ? { diperbarui_pada: waktu } : {}) });

afterEach(() => vi.restoreAllMocks());

describe('gabungDaftar: layar mengikuti server', () => {
  it('baris yang dihapus di komputer lain hilang dari layar', () => {
    const lama = [b('1', 'a'), b('2', 'b'), b('3', 'c')];
    expect(gabungDaftar(lama, [], ['2'], false, opsi).map((x) => x.id)).toEqual(['1', '3']);
  });

  it('baris yang diubah ikut berubah, baris baru muncul di atas', () => {
    const lama = [b('1', 'a'), b('2', 'b')];
    const hasil = gabungDaftar(lama, [b('2', 'B baru'), b('9', 'baru')], undefined, false, opsi);
    expect(hasil).toEqual([b('9', 'baru'), b('1', 'a'), b('2', 'B baru')]);
  });

  it('tanpa perubahan: daftar yang sama dikembalikan (layar tidak digambar ulang)', () => {
    const lama = [b('1', 'a')];
    expect(gabungDaftar(lama, [b('1', 'a')], [], false, opsi)).toBe(lama);
    expect(gabungDaftar(lama, undefined, undefined, false, opsi)).toBe(lama);
    expect(gabungDaftar(lama, [b('1', 'a')], undefined, true, opsi)).toBe(lama);
  });

  it('data server yang lebih lama tidak menimpa jawaban simpanan yang lebih baru di layar', () => {
    const lama = [b('1', 'sudah diedit', '2026-09-24T05:00:10Z')];
    const hasil = gabungDaftar(lama, [b('1', 'versi lama', '2026-09-24T05:00:00Z')], undefined, false, opsi);
    expect(hasil).toBe(lama);
  });

  it('muatan penuh: yang tidak ada di server dibuang, kecuali yang tersimpan setelah paket dibaca', () => {
    const lama = [b('1', 'a', '2026-09-24T05:00:00Z'), b('2', 'hantu', '2026-09-24T04:00:00Z'), b('3', 'baru disimpan', '2026-09-24T05:00:20Z')];
    const hasil = gabungDaftar(lama, [b('1', 'a', '2026-09-24T05:00:00Z')], undefined, true, { ...opsi, waktuPaket: '2026-09-24T05:00:15Z' });
    expect(hasil.map((x) => x.id)).toEqual(['3', '1']);
  });

  it('ID yang baru dihapus dari perangkat ini tidak dihidupkan lagi oleh data yang terlambat', () => {
    const hasil = gabungDaftar([b('1', 'a')], [b('2', 'terlambat')], undefined, false, { ...opsi, abaikan: new Set(['2']) });
    expect(hasil.map((x) => x.id)).toEqual(['1']);
  });
});

describe('ambilPerubahan', () => {
  it('memetakan paket server: perubahan, penghapusan, dan kursor waktu', async () => {
    const get = vi.spyOn(apiClient.api, 'get').mockResolvedValue({
      status: 'success',
      penuh: false,
      server_time: '2026-09-24T05:00:00.000000Z',
      data: {
        petani: [{ petani_id: 'PTN-1', nama_petani: 'Budi', status_aktif: true, updated_at: '2026-09-24T04:59:59Z' }],
        harga_jual: [{ harga_jual_id: 'HJ-1', kode: 'HJ-45', harga_jual: '45000.00', status_aktif: true }],
      },
      dihapus: { transaksi: ['TRX-9'] },
    } as never);
    const paket = await ambilPerubahan('2026-09-24T04:59:00Z');
    expect(get).toHaveBeenCalledWith('/sync/perubahan?sejak=2026-09-24T04%3A59%3A00Z');
    expect(paket.penuh).toBe(false);
    expect(paket.serverTime).toBe('2026-09-24T05:00:00.000000Z');
    expect(paket.petani?.[0]).toMatchObject({ petani_id: 'PTN-1', nama_petani: 'Budi', diperbarui_pada: '2026-09-24T04:59:59Z' });
    expect(paket.harga_jual?.[0].harga_jual).toBe(45000);
    expect(paket.dihapus).toEqual({ transaksi: ['TRX-9'] });
    expect(paket.transaksi).toBeUndefined();
  });

  it('server lama tanpa /sync/perubahan: semua daftar dimuat penuh dari endpoint lama', async () => {
    const get = vi.spyOn(apiClient.api, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/sync')) throw new apiClient.ApiError('The route api/v1/sync/perubahan could not be found.', 404);
      return { status: 'success', data: url === '/petani' ? [{ petani_id: 'PTN-1', nama_petani: 'Budi' }] : [] } as never;
    });
    const paket = await ambilPerubahan('2026-09-24T04:59:00Z');
    expect(paket.penuh).toBe(true);
    expect(paket.serverTime).toBeNull();
    expect(paket.petani).toHaveLength(1);
    expect(get).toHaveBeenCalledWith('/transaksi');
  });

  it('server tidak terjangkau: galat diteruskan (layar tetap menampilkan data terakhir)', async () => {
    vi.spyOn(apiClient.api, 'get').mockRejectedValue(new apiClient.ApiError('Failed to fetch', 0));
    await expect(ambilPerubahan(null)).rejects.toMatchObject({ status: 0 });
  });
});

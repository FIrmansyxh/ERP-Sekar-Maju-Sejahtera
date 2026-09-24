import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buatItemBal, buatKupon } from '../test/fixtures';
import { antrianKupon } from './antrianKupon';
import { ApiError } from './apiClient';
import { OperasiKupon, terapkanOperasi } from './operasiKupon';
import type { TransaksiPembelian } from '../types';

const tunggu = () => new Promise((r) => setTimeout(r, 0));
async function tuntas(n = 20) {
  for (let i = 0; i < n; i++) await tunggu();
}

const kuponBaru = () =>
  buatKupon('TRX-1', { no_kupon: 'KUP0001', status_tahap: 'proses_sortir', status_pembayaran: 'belum_lunas', items: [buatItemBal('A1')] });

/** Server tiruan: menyimpan kupon dan menerapkan operasi seperti backend. */
function serverTiruan() {
  const kupon = new Map<string, TransaksiPembelian>();
  const diterima: OperasiKupon[] = [];
  const kirim = vi.fn(async (id: string, op: OperasiKupon) => {
    diterima.push(op);
    const hasil = terapkanOperasi(kupon.get(id), op);
    if (!hasil) throw new ApiError(`Kupon ${id} tidak ditemukan`, 404);
    const disimpan = { ...hasil, items: (hasil.items || []).map((it, i) => ({ ...it, item_id: `${id}-BAL-0${i + 1}` })) };
    kupon.set(id, disimpan);
    return disimpan;
  });
  return { kupon, diterima, kirim };
}

beforeEach(() => {
  antrianKupon.reset();
  antrianKupon.aturJeda(() => 60_000);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  antrianKupon.reset();
  vi.restoreAllMocks();
});

describe('antrianKupon: operasi dikirim berurutan, server sumber kebenaran', () => {
  it('operasi satu kupon dikirim sesuai urutan dan jawaban server diteruskan ke layar', async () => {
    const server = serverTiruan();
    const hasil: TransaksiPembelian[] = [];
    antrianKupon.pasang(server.kirim);
    antrianKupon.saatBerhasil((_id, tx) => hasil.push(tx));

    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'buat', kupon: kuponBaru() });
    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'tambah_bal', bal: [buatItemBal('A2')] });
    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'ubah_bal', ref: { no_bal: 'A2' }, perubahan: { berat_kg: 40, berat_bruto_kg: 44, potongan_tara_kg: 4 } });
    await tuntas();

    expect(server.diterima.map((o) => o.jenis)).toEqual(['buat', 'tambah_bal', 'ubah_bal']);
    expect(antrianKupon.ringkasan().menunggu).toBe(0);
    expect(hasil.at(-1)!.items!.map((i) => [i.no_bal, i.berat_kg])).toEqual([['A1', 0], ['A2', 40]]);
  });

  it('selama belum terkirim, layar = data server + operasi yang menunggu', () => {
    const diServer = buatKupon('TRX-1', { no_kupon: 'KUP0001', items: [buatItemBal('A1'), buatItemBal('A2')] });
    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'hapus_bal', ref: { no_bal: 'A2' } });
    antrianKupon.masukkan('TRX-2', 'KUP0002', { jenis: 'buat', kupon: buatKupon('TRX-2', { no_kupon: 'KUP0002', items: [buatItemBal('B1')] }) });

    const layar = antrianKupon.terapkanKeDaftar([diServer]);
    expect(layar.map((t) => t.transaksi_id)).toEqual(['TRX-2', 'TRX-1']);
    expect(layar[1].items!.map((i) => i.no_bal)).toEqual(['A1']);
  });

  it('server MENOLAK (4xx): operasi dibatalkan saat itu juga dan alasannya dilaporkan, tidak disimpan diam-diam', async () => {
    const ditolak: string[] = [];
    antrianKupon.pasang(async () => {
      throw new ApiError('Kupon KUP0001 sudah lunas; bal tidak dapat ditambah, diubah, atau dihapus.', 422);
    });
    antrianKupon.saatDitolak((t, pesan) => ditolak.push(`${t.label} | ${pesan}`));
    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'hapus_bal', ref: { no_bal: 'A1' } });
    await tuntas();

    expect(antrianKupon.ringkasan().menunggu).toBe(0);
    expect(ditolak).toEqual(['Kupon KUP0001: hapus bal A1 | Kupon KUP0001 sudah lunas; bal tidak dapat ditambah, diubah, atau dihapus.']);
    // Layar kembali sama dengan server: bal tidak "terhapus" hanya di komputer ini
    const diServer = buatKupon('TRX-1', { items: [buatItemBal('A1')] });
    expect(antrianKupon.terapkanKeDaftar([diServer])[0]).toBe(diServer);
  });

  it('kupon gagal dibuat: operasi lanjutannya ikut dibatalkan (tidak menumpuk galat)', async () => {
    const ditolak = vi.fn();
    antrianKupon.pasang(async () => {
      throw new ApiError('No. kupon KUP0001 masih dipakai kupon aktif milik petani lain.', 422);
    });
    antrianKupon.saatDitolak(ditolak);
    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'buat', kupon: kuponBaru() });
    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'tambah_bal', bal: [buatItemBal('A2')] });
    await tuntas();
    expect(ditolak).toHaveBeenCalledTimes(1);
    expect(antrianKupon.ringkasan().menunggu).toBe(0);
  });

  it('kupon sudah dihapus di komputer lain (410): semua operasinya dibuang dan layar diberi tahu', async () => {
    const dihapus = vi.fn();
    antrianKupon.pasang(async () => {
      throw new ApiError('Kupon TRX-1 sudah dihapus.', 410);
    });
    antrianKupon.saatKuponDihapus(dihapus);
    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'ubah_bal', ref: { no_bal: 'A1' }, perubahan: { berat_kg: 40 } });
    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'ubah_bal', ref: { no_bal: 'A2' }, perubahan: { berat_kg: 41 } });
    await tuntas();
    expect(dihapus).toHaveBeenCalledWith('TRX-1', 'KUP0001', 'Kupon TRX-1 sudah dihapus.');
    expect(antrianKupon.ringkasan().menunggu).toBe(0);
  });

  it('jaringan putus: operasi ditahan dan dicoba lagi; berhasil setelah tersambung', async () => {
    let putus = true;
    const server = serverTiruan();
    antrianKupon.aturJeda(() => 0);
    antrianKupon.pasang(async (id, op) => {
      if (putus) throw new ApiError('Failed to fetch', 0);
      return server.kirim(id, op);
    });
    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'buat', kupon: kuponBaru() });
    await tuntas();
    expect(antrianKupon.ringkasan().menunggu).toBe(1);
    expect(antrianKupon.ringkasan().rincian[0].percobaan).toBeGreaterThan(0);

    putus = false;
    await antrianKupon.kirimUlangSekarang();
    await tuntas();
    expect(antrianKupon.ringkasan().menunggu).toBe(0);
    expect(server.kupon.has('TRX-1')).toBe(true);
  });

  it('sesi habis (401): antrean berhenti sampai login ulang, simpanan tidak dibuang', async () => {
    const perluLogin = vi.fn();
    antrianKupon.pasang(async () => {
      throw new ApiError('Unauthenticated.', 401);
    });
    antrianKupon.saatButuhLogin(perluLogin);
    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'buat', kupon: kuponBaru() });
    await tuntas();
    expect(perluLogin).toHaveBeenCalled();
    expect(antrianKupon.ringkasan()).toMatchObject({ menunggu: 1, butuhLoginUlang: true });

    const server = serverTiruan();
    antrianKupon.pasang(server.kirim);
    await tuntas();
    expect(antrianKupon.ringkasan().menunggu).toBe(0);
  });

  it('server menggabungkan kupon ke kupon yang sama dari komputer lain: operasi berikutnya ikut ID server', async () => {
    const dikirimKe: string[] = [];
    antrianKupon.pasang(async (id, op) => {
      dikirimKe.push(`${op.jenis}:${id}`);
      return buatKupon('TRX-SERVER', { no_kupon: 'KUP0001', items: [buatItemBal('A1')] });
    });
    antrianKupon.masukkan('TRX-LOKAL', 'KUP0001', { jenis: 'buat', kupon: kuponBaru() });
    antrianKupon.masukkan('TRX-LOKAL', 'KUP0001', { jenis: 'tambah_bal', bal: [buatItemBal('A2')] });
    await tuntas();
    expect(dikirimKe).toEqual(['buat:TRX-LOKAL', 'tambah_bal:TRX-SERVER']);
  });

  it('antrean tersimpan di peramban dan tab lain tidak menghapus simpanan tab ini', () => {
    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'buat', kupon: kuponBaru() });
    const tersimpan = JSON.parse(localStorage.getItem('sms_antrian_kupon_v2') || '[]');
    expect(tersimpan).toHaveLength(1);
    // Tab lain menambah simpanannya sendiri
    localStorage.setItem('sms_antrian_kupon_v2', JSON.stringify([...tersimpan, { ...tersimpan[0], uid: 'tab-lain', transaksiId: 'TRX-9' }]));
    antrianKupon.masukkan('TRX-1', 'KUP0001', { jenis: 'tambah_bal', bal: [buatItemBal('A2')] });
    const sesudah = JSON.parse(localStorage.getItem('sms_antrian_kupon_v2') || '[]');
    expect(sesudah.map((t: { uid: string }) => t.uid)).toContain('tab-lain');
    expect(sesudah).toHaveLength(3);
  });
});

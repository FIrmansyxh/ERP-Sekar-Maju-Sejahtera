import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { antrianMutasi, barisSudahTiada, endpointBelumAda, HandlerMutasi, TugasMutasi } from './antrianMutasi';

interface Batch {
  batch_id: string;
  kode_batch: string;
  nama: string;
}

const galat = (status: number, pesan: string) => Object.assign(new Error(pesan), { status });
const opsi = { ambilId: (b: Batch) => b.batch_id, ambilIdAlt: (b: Batch) => b.kode_batch };
const server: Batch[] = [
  { batch_id: 'SPL0001', kode_batch: 'SS-01', nama: 'lama' },
  { batch_id: 'SPL0002', kode_batch: 'SS-02', nama: 'lain' },
];

const pasang = (h: Partial<Record<string, HandlerMutasi>>) => antrianMutasi.pasang(h as never);

beforeEach(() => {
  antrianMutasi.reset();
  antrianMutasi.aturJeda(() => 60_000);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  antrianMutasi.reset();
  vi.restoreAllMocks();
});

describe('antrianMutasi: pengiriman dan pencatatan', () => {
  it('berhasil: antrean kosong dan pendengar selesai dipanggil dengan jawaban server', async () => {
    const kirim = vi.fn(async () => ({ hasil: { ok: 1 } }));
    pasang({ 'batch_sample:simpan': { kirim } });
    const selesai = vi.fn();
    antrianMutasi.saatSelesai(selesai);

    await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'B1', aksi: 'simpan', data: { batch_id: 'B1' } });

    expect(kirim).toHaveBeenCalledTimes(1);
    expect(antrianMutasi.ringkasan().menunggu).toBe(0);
    expect(selesai).toHaveBeenCalledWith(expect.objectContaining({ id: 'B1' }), { ok: 1 });
  });

  it('gagal: tetap di antrean dengan galatnya, tidak dibuang diam-diam', async () => {
    pasang({ 'batch_sample:simpan': { kirim: async () => { throw new Error('jaringan putus'); } } });
    await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'B1', aksi: 'simpan', data: {}, label: 'Batch SS-01' });

    const r = antrianMutasi.ringkasan();
    expect(r.menunggu).toBe(1);
    expect(r.rincian[0]).toMatchObject({ label: 'Batch SS-01', percobaan: 1, galat: 'jaringan putus' });
    expect(r.bermasalah).toBe(0);
  });

  it('ditolak server (4xx) ditandai bermasalah, sesi habis ditandai butuh login ulang', async () => {
    pasang({
      'batch_sample:hapus': { kirim: async () => { throw galat(422, 'Data ditolak'); } },
      'pengiriman:hapus': { kirim: async () => { throw galat(401, 'Unauthenticated.'); } },
    });
    await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'B1', aksi: 'hapus' });
    expect(antrianMutasi.ringkasan().bermasalah).toBe(1);

    await antrianMutasi.masukkan({ entitas: 'pengiriman', id: 'P1', aksi: 'hapus' });
    expect(antrianMutasi.ringkasan().butuhLoginUlang).toBe(true);
  });

  it('simpanan beruntun digabung: yang terkirim terakhir adalah keadaan terbaru', async () => {
    const terkirim: unknown[] = [];
    let lepas: () => void = () => {};
    pasang({
      'batch_sample:simpan': {
        kirim: async (t: TugasMutasi) => {
          terkirim.push(t.data);
          if (terkirim.length === 1) await new Promise<void>((r) => { lepas = r; });
          return {};
        },
      },
    });

    const pertama = antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'B1', aksi: 'simpan', data: { v: 1 } });
    await Promise.resolve();
    void antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'B1', aksi: 'simpan', data: { v: 2 } });
    void antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'B1', aksi: 'simpan', data: { v: 3 } });
    lepas();
    await pertama;

    expect(terkirim).toEqual([{ v: 1 }, { v: 3 }]);
    expect(antrianMutasi.ringkasan().menunggu).toBe(0);
  });

  it('server menjawab OK tetapi isinya tidak cocok: tidak dianggap berhasil dan selisihnya terlihat', async () => {
    pasang({
      'batch_sample:simpan': {
        kirim: async () => ({ hasil: { jumlahBal: 2 } }),
        verifikasi: (t, hasil) => ((hasil as { jumlahBal: number }).jumlahBal === (t.data as { jumlahBal: number }).jumlahBal ? [] : ['jumlah bal berbeda']),
      },
    });
    await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'B1', aksi: 'simpan', data: { jumlahBal: 3 } });

    const r = antrianMutasi.ringkasan();
    expect(r.menunggu).toBe(1);
    expect(r.rincian[0].selisih).toEqual(['jumlah bal berbeda']);
  });

  it('penghapusan membatalkan simpanan yang menunggu untuk entitas yang sama', async () => {
    pasang({
      'batch_sample:simpan': { kirim: async () => { throw new Error('offline'); } },
      'batch_sample:hapus': { kirim: async () => { throw new Error('offline'); } },
    });
    await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'B1', aksi: 'simpan', data: {} });
    await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'B1', aksi: 'hapus' });

    expect(antrianMutasi.ringkasan().rincian.map((x) => x.kunci)).toEqual(['batch_sample|B1|hapus']);
  });
});

describe('antrianMutasi: menimpa daftar server (akar batch yang muncul lagi dan edit yang mental)', () => {
  it('penghapusan yang belum sampai ke server membuang baris dari daftar server', async () => {
    pasang({ 'batch_sample:hapus': { kirim: async () => { throw new Error('offline'); } } });
    await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'SPL0001', aksi: 'hapus' });

    const tampil = antrianMutasi.terapkanKeDaftar('batch_sample', server, opsi);
    expect(tampil.map((b) => b.batch_id)).toEqual(['SPL0002']);
  });

  it('penghapusan yang baru sukses tetap membuang baris bila server masih mengembalikannya sebentar', async () => {
    pasang({ 'batch_sample:hapus': { kirim: async () => ({}) } });
    await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'SPL0001', aksi: 'hapus' });

    expect(antrianMutasi.ringkasan().menunggu).toBe(0);
    expect(antrianMutasi.terapkanKeDaftar('batch_sample', server, opsi).map((b) => b.batch_id)).toEqual(['SPL0002']);
  });

  it('pembatalan lunak di server disembunyikan seterusnya, walau baris masih dikembalikan server', async () => {
    pasang({ 'batch_sample:hapus': { kirim: async () => ({ hapusLunak: true }) } });
    await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'SPL0001', aksi: 'hapus' });

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 10 * 60_000); // jauh melewati masa ingat tugas selesai
    try {
      expect(antrianMutasi.terapkanKeDaftar('batch_sample', server, opsi).map((b) => b.batch_id)).toEqual(['SPL0002']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('dicocokkan juga lewat kunci alami (No. Surat) bila ID lokal dan ID server berbeda', async () => {
    pasang({ 'batch_sample:hapus': { kirim: async () => { throw new Error('offline'); } } });
    await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'FE-1', idAlt: 'SS-01', aksi: 'hapus' });

    expect(antrianMutasi.terapkanKeDaftar('batch_sample', server, opsi).map((b) => b.batch_id)).toEqual(['SPL0002']);
  });

  it('simpanan yang belum terkirim menggantikan baris server dan baris baru tetap tampil', async () => {
    pasang({ 'batch_sample:simpan': { kirim: async () => { throw new Error('offline'); } } });
    await antrianMutasi.masukkan({
      entitas: 'batch_sample',
      id: 'SPL0001',
      aksi: 'simpan',
      data: { batch_id: 'SPL0001', kode_batch: 'SS-01', nama: 'DIUBAH' },
    });
    await antrianMutasi.masukkan({
      entitas: 'batch_sample',
      id: 'FE-9',
      aksi: 'simpan',
      data: { batch_id: 'FE-9', kode_batch: 'SS-09', nama: 'baru' },
    });

    const tampil = antrianMutasi.terapkanKeDaftar('batch_sample', server, opsi);
    expect(tampil.map((b) => [b.batch_id, b.nama])).toEqual([
      ['FE-9', 'baru'],
      ['SPL0001', 'DIUBAH'],
      ['SPL0002', 'lain'],
    ]);
  });

  it('tanpa tugas untuk entitas itu, daftar server dikembalikan apa adanya', async () => {
    pasang({ 'petani:hapus': { kirim: async () => { throw new Error('offline'); } } });
    await antrianMutasi.masukkan({ entitas: 'petani', id: 'SPL0001', aksi: 'hapus' });

    expect(antrianMutasi.terapkanKeDaftar('batch_sample', server, opsi)).toBe(server);
  });
});

describe('antrianMutasi: pembeda galat', () => {
  it('endpoint belum ada dibedakan dari baris yang sudah tiada', () => {
    expect(endpointBelumAda(galat(405, 'Method Not Allowed'))).toBe(true);
    expect(endpointBelumAda(galat(404, 'The route api/v1/sample-batch/1 could not be found.'))).toBe(true);
    expect(endpointBelumAda(galat(404, 'No query results for model'))).toBe(false);
    expect(barisSudahTiada(galat(404, 'No query results for model'))).toBe(true);
    expect(barisSudahTiada(galat(404, 'The route x could not be found.'))).toBe(false);
    expect(barisSudahTiada(galat(500, 'Server Error'))).toBe(false);
  });
});

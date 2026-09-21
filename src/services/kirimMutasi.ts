import { api, API_BASE_URL } from './apiClient';
import { ErpApiService, mapPetaniFromApi } from './erpApi';
import {
  antrianMutasi,
  barisSudahTiada,
  endpointBelumAda,
  HasilKirimMutasi,
  PetaHandlerMutasi,
  SpesifikasiMutasi,
  TugasMutasi,
} from './antrianMutasi';
import { statusKeServer } from '../utils/statusBatchSample';
import type { Barang, BatchPengirimanSample, MasterHargaJual, PengirimanBarang, Petani, TabelHarga, User } from '../types';

/**
 * Pengirim perubahan ke server untuk antrean mutasi (antrianMutasi.ts). Semua fungsi di sini MELEMPAR
 * galat bila server gagal atau menolak, tidak pernah jatuh diam-diam ke penyimpanan lokal, supaya
 * antrean tahu dan mengulang. Kontrak endpoint lengkap: DOKUMENTASI_DATABASE.md bagian 5.
 */

/** Tanpa alamat server (mode demo lokal) tidak ada yang perlu dikirim. */
export const serverAktif = (): boolean => Boolean(API_BASE_URL);

/** Mencatat perubahan ke antrean; tanpa server (mode demo) tidak berbuat apa-apa. */
export function catatMutasi(spek: SpesifikasiMutasi): Promise<void> {
  if (!serverAktif()) return Promise.resolve();
  return antrianMutasi.masukkan(spek);
}

const ambilData = <T>(res: { data?: unknown }, pesan: string): T => {
  if (res.data === undefined || res.data === null) throw new Error(pesan);
  return res.data as T;
};

const galatSudahAda = (err: unknown): boolean => {
  const status = (err as { status?: number } | null)?.status;
  const pesan = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return status === 409 || /sudah (ada|digunakan|terdaftar)|already|unique|duplicate|has already been taken|exists/.test(pesan);
};

const sama = (a: unknown, b: unknown): boolean => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

// ---------- Petani ----------
function payloadPetani(p: Petani) {
  return {
    petani_id: p.petani_id,
    nama_petani: p.nama_petani,
    alamat: p.alamat || '',
    no_hp: p.no_hp || '',
    desa_kecamatan: p.desa_kecamatan || p.alamat || '',
    catatan: p.catatan || '',
    status_aktif: p.status_aktif ?? true,
    alasan_nonaktif: p.alasan_nonaktif || null,
    tanggal_daftar: p.tanggal_daftar || new Date().toISOString().split('T')[0],
  };
}

export async function kirimPetani(p: Petani, baru: boolean): Promise<Petani> {
  const ubah = async () => mapPetaniFromApi(ambilData((await api.put(`/petani/${p.petani_id}`, payloadPetani(p))), 'Server tidak mengembalikan data petani'));
  const buat = async () => mapPetaniFromApi(ambilData((await api.post('/petani', payloadPetani(p))), 'Server tidak mengembalikan data petani'));
  try {
    return await (baru ? buat() : ubah());
  } catch (err) {
    // Jalur ubah dan buat saling menggantikan: petani ternyata sudah ada / belum ada di server
    if (baru && p.petani_id && galatSudahAda(err)) return ubah();
    if (!baru && barisSudahTiada(err)) return buat();
    throw err;
  }
}

export function verifikasiPetani(t: TugasMutasi, hasil: unknown): string[] {
  const kirim = t.data as Petani;
  const server = hasil as Petani | undefined;
  if (!server) return [];
  const selisih: string[] = [];
  if (!sama(kirim.nama_petani, server.nama_petani)) selisih.push(`nama "${kirim.nama_petani}" di layar tetapi "${server.nama_petani}" di server`);
  if (!sama(kirim.no_hp, server.no_hp)) selisih.push('No. HP tidak tersimpan di server');
  if (!sama(kirim.alamat, server.alamat)) selisih.push('alamat tidak tersimpan di server');
  if (Boolean(kirim.status_aktif) !== Boolean(server.status_aktif)) selisih.push('status aktif tidak tersimpan di server');
  return selisih;
}

export async function gantiIdPetani(idLama: string, petani: Petani): Promise<Petani> {
  const res = await api.put(`/petani/${idLama}/ganti-id`, { petani_id_baru: petani.petani_id });
  return mapPetaniFromApi(ambilData(res, 'Server tidak mengembalikan data petani'));
}

// ---------- Harga ----------
export async function kirimHargaBeli(h: TabelHarga): Promise<TabelHarga> {
  const res = await api.post<TabelHarga>('/master/harga-beli', {
    harga_id: h.harga_id,
    kode_grade: h.kode_grade,
    harga_per_kg: h.harga_per_kg,
    rate_potongan_per_bal: h.rate_potongan_per_bal ?? 0,
    berat_standar_kg: h.berat_standar_kg,
    tanggal_berlaku: h.tanggal_berlaku,
    status: h.status ?? 'aktif',
    deskripsi: h.deskripsi,
  });
  return ambilData<TabelHarga>(res, 'Server tidak mengembalikan data harga beli');
}

export function verifikasiHargaBeli(t: TugasMutasi, hasil: unknown): string[] {
  const kirim = t.data as TabelHarga;
  const server = hasil as TabelHarga | undefined;
  if (!server) return [];
  const selisih: string[] = [];
  if (Number(server.harga_per_kg) !== Number(kirim.harga_per_kg)) selisih.push(`harga ${kirim.harga_per_kg} di layar tetapi ${server.harga_per_kg} di server`);
  if (server.status && kirim.status && server.status !== kirim.status) selisih.push(`status ${kirim.status} di layar tetapi ${server.status} di server`);
  return selisih;
}

export async function kirimHargaJual(h: MasterHargaJual): Promise<MasterHargaJual> {
  const res = await api.post<MasterHargaJual>('/master/harga-jual', {
    harga_jual_id: h.harga_jual_id,
    kode: h.kode,
    harga_jual: h.harga_jual,
    tanggal_berlaku: h.tanggal_berlaku,
    status_aktif: h.status_aktif,
  });
  return ambilData<MasterHargaJual>(res, 'Server tidak mengembalikan data harga jual');
}

export function verifikasiHargaJual(t: TugasMutasi, hasil: unknown): string[] {
  const kirim = t.data as MasterHargaJual;
  const server = hasil as MasterHargaJual | undefined;
  if (!server) return [];
  const selisih: string[] = [];
  if (Number(server.harga_jual) !== Number(kirim.harga_jual)) selisih.push(`harga jual ${kirim.harga_jual} di layar tetapi ${server.harga_jual} di server`);
  if (Boolean(server.status_aktif) !== Boolean(kirim.status_aktif)) selisih.push('status aktif tidak tersimpan di server');
  return selisih;
}

// ---------- Pengguna ----------
export async function kirimStatusUser(u: User): Promise<void> {
  await api.put(`/users/${u.user_id}/status`, { status_aktif: u.status_aktif });
}

// ---------- Status bal ----------
export async function kirimStatusBarang(b: Barang): Promise<Barang> {
  const res = await api.put<Barang>(`/barang/${b.barang_id}/status`, {
    status_stok: b.status_stok,
    catatan: b.catatan,
  });
  return (res.data ?? b) as Barang;
}

// ---------- Batch sample ----------
function payloadBatchSample(b: BatchPengirimanSample) {
  return {
    status: statusKeServer(b.status),
    kode_batch: b.kode_batch,
    dikirim_oleh: b.dikirim_oleh,
    tujuan_buyer: b.tujuan_buyer,
    permintaan_buyer: b.permintaan_buyer,
    tanggal_kirim: b.tanggal_kirim || new Date().toISOString().split('T')[0],
    tanggal_respon: b.tanggal_respon,
    petugas_qc_pabrik: b.petugas_qc_pabrik,
    catatan: b.catatan,
    // Daftar bal lengkap: server menyamakan isi batch dengan daftar ini (bal baru masuk, bal yang tidak ada keluar)
    items: (b.items || []).map((it) => ({
      sample_item_id: it.sample_item_id,
      barang_id: it.barang_id,
      no_bal: it.no_bal,
      kode_harga_jual: it.kode_harga_jual,
      harga_tawaran_kg: it.harga_tawaran_kg,
      harga_deal_kg: it.harga_deal_kg,
      berat_sample_gram: it.berat_sample_gram || 200,
      status_item: it.status_item,
      alasan_tolak: it.alasan_tolak,
      catatan_nego: it.catatan_nego,
      tanggal_evaluasi: it.tanggal_evaluasi,
      sudah_dikirim_do: it.sudah_dikirim_do,
    })),
  };
}

/** Jawaban simpan batch: `server` apa adanya (untuk verifikasi), `gabungan` sudah digabung dengan isi lokal (untuk layar). */
export interface HasilBatchSample {
  gabungan: BatchPengirimanSample;
  server: BatchPengirimanSample;
}

export async function kirimBatchSample(b: BatchPengirimanSample, baru: boolean): Promise<HasilBatchSample> {
  const dariServer = (res: { data?: unknown }): HasilBatchSample => {
    const server = ErpApiService.mapBackendBatchSample(ambilData(res, 'Server tidak mengembalikan batch sample'));
    return { server, gabungan: ErpApiService.gabungBatchServer(b, server) };
  };
  const buat = async () => dariServer(await api.post<unknown>('/sample-batch', payloadBatchSample(b)));
  const ubah = async () => dariServer(await api.put<unknown>(`/sample-batch/${b.batch_id}`, payloadBatchSample(b)));
  try {
    return await (baru ? buat() : ubah());
  } catch (err) {
    if (baru && galatSudahAda(err)) return ubah();
    if (!baru && barisSudahTiada(err)) return buat();
    throw err;
  }
}

export function verifikasiBatchSample(t: TugasMutasi, hasil: unknown): string[] {
  const kirim = t.data as BatchPengirimanSample;
  // Bandingkan dengan jawaban server apa adanya; isi lokal yang sudah digabung akan selalu terlihat cocok
  const itemServer = (hasil as HasilBatchSample | undefined)?.server?.items;
  if (!itemServer || itemServer.length === 0) return [];
  const selisih: string[] = [];
  const peta = new Map(itemServer.map((it) => [it.barang_id, it] as const));
  for (const it of kirim.items || []) {
    const di = peta.get(it.barang_id);
    if (!di) {
      selisih.push(`bal ${it.no_bal} belum ada di batch pada server`);
      continue;
    }
    if (Number(di.harga_tawaran_kg || 0) !== Number(it.harga_tawaran_kg || 0)) {
      selisih.push(`bal ${it.no_bal}: harga ${it.harga_tawaran_kg} di layar tetapi ${di.harga_tawaran_kg} di server`);
    }
    if ((it.kode_harga_jual || '') && (di.kode_harga_jual || '') !== (it.kode_harga_jual || '')) {
      selisih.push(`bal ${it.no_bal}: kode harga jual ${it.kode_harga_jual} di layar tetapi ${di.kode_harga_jual || '-'} di server`);
    }
  }
  const idKirim = new Set((kirim.items || []).map((it) => it.barang_id));
  for (const it of itemServer) {
    if (!idKirim.has(it.barang_id)) selisih.push(`bal ${it.no_bal} sudah dikeluarkan di layar tetapi masih ada di server`);
  }
  return selisih;
}

/**
 * Menghapus batch sample di server. Bila endpoint DELETE belum ada, batch dibatalkan lewat
 * PUT status "dibatalkan" (jalur yang sudah ada) dan disembunyikan terus dari layar.
 */
export async function hapusBatchSample(b: BatchPengirimanSample): Promise<HasilKirimMutasi> {
  try {
    await api.delete(`/sample-batch/${b.batch_id}`);
    return {};
  } catch (err) {
    if (barisSudahTiada(err)) return {};
    if (!endpointBelumAda(err)) throw err;
  }
  try {
    await api.put(`/sample-batch/${b.batch_id}`, { ...payloadBatchSample(b), status: 'dibatalkan' });
    return { hapusLunak: true };
  } catch (err) {
    if (barisSudahTiada(err)) return {};
    throw err;
  }
}

// ---------- Surat Jalan ----------
function payloadPengiriman(p: PengirimanBarang) {
  return {
    no_surat_jalan: p.no_surat_jalan,
    tujuan: p.tujuan,
    jenis_pengeluaran: p.jenis_pengeluaran || 'Pabrik Rokok',
    driver_nama: p.driver_nama,
    plat_nomor: p.plat_nomor,
    tanggal_kirim: p.tanggal_kirim,
    batch_sample_id_ref: p.batch_sample_id_ref,
    nomor_kontrak: p.nomor_kontrak,
    catatan: p.catatan,
    aturan_netto: p.aturan_netto,
    items: (p.barang_ids || []).map((bId) => ({
      barang_id: bId,
      kode_harga_jual: p.kode_harga_jual_map?.[bId],
      harga_deal_per_kg: p.harga_deal_map?.[bId] || 0,
      berat_kirim_kg: p.berat_kirim_map?.[bId],
      netto_jual_kg: p.netto_jual_map?.[bId],
    })),
  };
}

export async function kirimPengiriman(p: PengirimanBarang, baru: boolean): Promise<PengirimanBarang> {
  const buat = async () => {
    const res = await api.post<unknown>('/pengiriman', payloadPengiriman(p));
    return ErpApiService.gabungPengirimanServer(p, ErpApiService.mapBackendPengiriman(ambilData(res, 'Server tidak mengembalikan Surat Jalan')));
  };
  const ubah = async () => {
    const res = await api.put<unknown>(`/pengiriman/${p.pengiriman_id}`, payloadPengiriman(p));
    // Jawaban PUT boleh kosong; isi lokal tetap dipakai
    return res.data ? ErpApiService.gabungPengirimanServer(p, ErpApiService.mapBackendPengiriman(res.data)) : p;
  };
  try {
    return await (baru ? buat() : ubah());
  } catch (err) {
    if (baru && galatSudahAda(err)) return ubah();
    throw err;
  }
}

export function verifikasiPengiriman(t: TugasMutasi, hasil: unknown): string[] {
  const kirim = t.data as PengirimanBarang;
  const server = hasil as PengirimanBarang | undefined;
  if (!server || t.tambahan?.baru !== true) return [];
  const selisih: string[] = [];
  const idServer = new Set(server.barang_ids || []);
  for (const id of kirim.barang_ids || []) if (!idServer.has(id)) selisih.push(`bal ${id} belum ada di Surat Jalan pada server`);
  return selisih;
}

export async function hapusPengirimanServer(pengirimanId: string): Promise<HasilKirimMutasi> {
  try {
    await api.delete(`/pengiriman/${pengirimanId}`);
  } catch (err) {
    if (!barisSudahTiada(err)) throw err;
  }
  return {};
}

export async function kirimStatusPengiriman(p: PengirimanBarang): Promise<HasilKirimMutasi> {
  await api.put(`/pengiriman/${p.pengiriman_id}/status`, { status: p.status });
  return {};
}

// ---------- Kupon ----------
export async function hapusTransaksiServer(transaksiId: string, alasan?: string): Promise<HasilKirimMutasi> {
  const query = alasan ? `?alasan=${encodeURIComponent(alasan)}` : '';
  try {
    await api.delete(`/transaksi/${transaksiId}${query}`);
  } catch (err) {
    if (!barisSudahTiada(err)) throw err;
  }
  return {};
}

const STATUS_BAL_DIKIRIM = ['di_gudang', 'terkirim_sample', 'keluar'];

/**
 * Mencatat perubahan status bal yang benar-benar berbeda dari keadaan sebelumnya. Daftar `baru` boleh
 * berisi seluruh bal (hasil map); hanya yang statusnya berubah yang dikirim ke server.
 */
export function catatStatusBal(baru: Barang[] | undefined, lama: Barang[]): void {
  if (!baru || !serverAktif()) return;
  const peta = new Map(lama.map((b) => [b.barang_id, b] as const));
  for (const b of baru) {
    const sebelum = peta.get(b.barang_id);
    if (sebelum && sebelum.status_stok === b.status_stok) continue;
    if (!STATUS_BAL_DIKIRIM.includes(b.status_stok)) continue;
    void antrianMutasi.masukkan({ entitas: 'barang', id: b.barang_id, aksi: 'status', data: b, label: `Status bal ${b.no_bal || b.barang_id}` });
  }
}

/** Peta pengirim yang dipasang ke antrean mutasi saat aplikasi mulai. */
export const handlerMutasi: PetaHandlerMutasi = {
  'petani:simpan': {
    kirim: async (t) => ({ hasil: await kirimPetani(t.data as Petani, t.tambahan?.baru === true) }),
    verifikasi: verifikasiPetani,
  },
  'petani:status': {
    kirim: async (t) => ({ hasil: await kirimPetani(t.data as Petani, false) }),
    verifikasi: verifikasiPetani,
  },
  'petani:ganti_id': {
    kirim: async (t) => ({ hasil: await gantiIdPetani(String(t.idAlt), t.data as Petani) }),
    verifikasi: (t, hasil) => (sama((hasil as Petani | undefined)?.petani_id, (t.data as Petani).petani_id) ? [] : ['ID kartu petani tidak berubah di server']),
  },
  'harga_beli:simpan': { kirim: async (t) => ({ hasil: await kirimHargaBeli(t.data as TabelHarga) }), verifikasi: verifikasiHargaBeli },
  'harga_jual:simpan': { kirim: async (t) => ({ hasil: await kirimHargaJual(t.data as MasterHargaJual) }), verifikasi: verifikasiHargaJual },
  'user:status': { kirim: async (t) => { await kirimStatusUser(t.data as User); return {}; } },
  'barang:status': { kirim: async (t) => ({ hasil: await kirimStatusBarang(t.data as Barang) }) },
  'batch_sample:simpan': {
    kirim: async (t) => ({ hasil: await kirimBatchSample(t.data as BatchPengirimanSample, t.tambahan?.baru === true) }),
    verifikasi: verifikasiBatchSample,
  },
  'batch_sample:hapus': { kirim: async (t) => hapusBatchSample(t.tambahan?.batch as BatchPengirimanSample) },
  'pengiriman:simpan': {
    kirim: async (t) => ({ hasil: await kirimPengiriman(t.data as PengirimanBarang, t.tambahan?.baru === true) }),
    verifikasi: verifikasiPengiriman,
  },
  'pengiriman:hapus': { kirim: async (t) => hapusPengirimanServer(t.id) },
  'pengiriman:status': { kirim: async (t) => kirimStatusPengiriman(t.data as PengirimanBarang) },
  'transaksi:hapus': { kirim: async (t) => hapusTransaksiServer(t.id, t.tambahan?.alasan as string | undefined) },
};

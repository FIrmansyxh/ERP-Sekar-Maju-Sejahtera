import { api, API_BASE_URL, ApiError } from './apiClient';
import { ErpApiService, mapPetaniFromApi } from './erpApi';
import { mapHargaBeli, mapHargaJual, mapUser } from './sinkronServer';
import { statusKeServer, tandaiServerKenalDraft } from '../utils/statusBatchSample';
import type { BatchPengirimanSample, MasterHargaJual, PengirimanBarang, Petani, TabelHarga, User } from '../types';
import { hariIniLokal } from '../utils/rentangTanggal';

/**
 * Perubahan data selain kupon (petani, harga, pengguna, batch sample, Surat Jalan, hapus kupon) dikirim LANGSUNG ke
 * server dan layar baru berubah setelah server menyimpannya. Bila server menolak atau tidak terjangkau, fungsi di
 * sini melempar galat dan layar tetap seperti semula (operator melihat pesannya dan bisa mengulang).
 *
 * Dulu perubahan ini tampil dulu di layar lalu dikirim lewat antrean di belakang; bila server menolak, perubahan
 * itu tetap tampil di satu komputer saja (dan dikirim ulang terus), sehingga "sudah diedit tapi tidak berubah",
 * "sudah dihapus tapi muncul lagi" di komputer lain. Sekarang yang tampil selalu yang ada di server.
 */

/** Tanpa alamat server (mode demo di peramban) semua perubahan hanya disimpan di peramban. */
export const serverAktif = (): boolean => Boolean(API_BASE_URL);

const ambilData = <T>(res: { data?: unknown; message?: string }, pesan: string): T => {
  if (res.data === undefined || res.data === null) throw new ApiError(res.message || pesan, 500);
  return res.data as T;
};

const statusGalat = (err: unknown): number | undefined => (err as { status?: number } | null)?.status;

/** 404 karena barisnya memang sudah tidak ada (bukan karena rute belum ada di server). */
const barisSudahTiada = (err: unknown): boolean =>
  statusGalat(err) === 404 && !/route|could not be found|method/i.test(err instanceof Error ? err.message : String(err));

// ---------- Petani ----------
function payloadPetani(p: Petani) {
  return {
    petani_id: p.petani_id || undefined,
    nama_petani: p.nama_petani,
    alamat: p.alamat || '',
    no_hp: p.no_hp || '',
    desa_kecamatan: p.desa_kecamatan || p.alamat || '',
    catatan: p.catatan || '',
    status_aktif: p.status_aktif ?? true,
    alasan_nonaktif: p.alasan_nonaktif || null,
    tanggal_daftar: p.tanggal_daftar || hariIniLokal(),
  };
}

export async function simpanPetaniServer(p: Petani, baru: boolean): Promise<Petani> {
  const ubah = async () => mapPetaniFromApi(ambilData(await api.put(`/petani/${encodeURIComponent(p.petani_id)}`, payloadPetani(p)), 'Server tidak mengembalikan data petani'));
  const buat = async () => mapPetaniFromApi(ambilData(await api.post('/petani', payloadPetani(p)), 'Server tidak mengembalikan data petani'));
  // Kirim ulang petani baru yang sama dijawab server dengan data yang sudah ada (bukan galat)
  return baru ? buat() : ubah();
}

export async function gantiIdPetaniServer(idLama: string, idBaru: string): Promise<Petani> {
  const res = await api.put(`/petani/${encodeURIComponent(idLama)}/ganti-id`, { petani_id_baru: idBaru });
  return mapPetaniFromApi(ambilData(res, 'Server tidak mengembalikan data petani'));
}

// ---------- Harga ----------
export async function simpanHargaBeliServer(h: TabelHarga): Promise<TabelHarga> {
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
  return mapHargaBeli(ambilData(res, 'Server tidak mengembalikan data harga beli'));
}

export async function simpanHargaJualServer(h: MasterHargaJual): Promise<MasterHargaJual> {
  const res = await api.post<MasterHargaJual>('/master/harga-jual', {
    harga_jual_id: h.harga_jual_id,
    kode: h.kode,
    harga_jual: h.harga_jual,
    tanggal_berlaku: h.tanggal_berlaku,
    status_aktif: h.status_aktif,
  });
  return mapHargaJual(ambilData(res, 'Server tidak mengembalikan data harga jual'));
}

// ---------- Pengguna ----------
export async function simpanUserServer(user: Partial<User>, baru: boolean): Promise<User> {
  const isi = {
    username: user.username,
    nama_lengkap: user.nama_lengkap,
    role: user.role,
    role_code: user.role,
    email: user.email || '',
    no_hp: user.no_hp || '',
    unit_penugasan: user.unit_penugasan || '',
    password: user.password || undefined,
  };
  const res = baru
    ? await api.post<User>('/users', { user_id: user.user_id, ...isi })
    : await api.put<User>(`/users/${encodeURIComponent(String(user.user_id))}`, { ...isi, status_aktif: user.status_aktif });
  return mapUser(ambilData(res, 'Server tidak mengembalikan data pengguna'));
}

export async function ubahStatusUserServer(userId: string, statusAktif: boolean): Promise<User> {
  const res = await api.put<User>(`/users/${encodeURIComponent(userId)}/status`, { status_aktif: statusAktif });
  return mapUser(ambilData(res, 'Server tidak mengembalikan data pengguna'));
}

// ---------- Batch sample ----------
/** null = belum diketahui; false = server lama menolak status Draft sehingga Draft dikirim sebagai 'sample'. */
let serverTerimaDraft: boolean | null = null;
/** Hanya untuk tes */
export const aturUlangDukunganDraft = (): void => {
  serverTerimaDraft = null;
  tandaiServerKenalDraft(null);
};

function payloadBatchSample(b: BatchPengirimanSample, terimaDraft: boolean) {
  return {
    batch_id: b.batch_id,
    status: statusKeServer(b.status, terimaDraft),
    kode_batch: b.kode_batch,
    dikirim_oleh: b.dikirim_oleh,
    tujuan_buyer: b.tujuan_buyer,
    permintaan_buyer: b.permintaan_buyer,
    tanggal_kirim: b.tanggal_kirim || hariIniLokal(),
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

export async function simpanBatchSampleServer(b: BatchPengirimanSample, baru: boolean): Promise<BatchPengirimanSample> {
  const kirim = async (terimaDraft: boolean) => {
    const dariServer = (res: { data?: unknown }) =>
      ErpApiService.gabungBatchServer(b, ErpApiService.mapBackendBatchSample(ambilData(res, 'Server tidak mengembalikan batch sample')));
    const buat = async () => dariServer(await api.post<unknown>('/sample-batch', payloadBatchSample(b, terimaDraft)));
    const ubah = async () => dariServer(await api.put<unknown>(`/sample-batch/${encodeURIComponent(b.batch_id)}`, payloadBatchSample(b, terimaDraft)));
    return baru ? buat() : ubah();
  };
  if (b.status !== 'draft' || serverTerimaDraft === false) return kirim(false);
  try {
    const hasil = await kirim(true);
    serverTerimaDraft = true;
    tandaiServerKenalDraft(true);
    return hasil;
  } catch (err) {
    // Hanya penolakan nilai status (server lama tanpa Draft) yang diulang sebagai 'sample'
    if (statusGalat(err) !== 422 || !/status/i.test(err instanceof Error ? err.message : '')) throw err;
    const hasil = await kirim(false);
    serverTerimaDraft = false;
    tandaiServerKenalDraft(false);
    return hasil;
  }
}

export async function hapusBatchSampleServer(batchId: string): Promise<void> {
  try {
    await api.delete(`/sample-batch/${encodeURIComponent(batchId)}`);
  } catch (err) {
    if (!barisSudahTiada(err)) throw err;
  }
}

// ---------- Surat Jalan ----------
function payloadPengiriman(p: PengirimanBarang) {
  return {
    pengiriman_id: p.pengiriman_id,
    no_surat_jalan: p.no_surat_jalan,
    status: p.status,
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

export async function simpanPengirimanServer(p: PengirimanBarang, baru: boolean): Promise<PengirimanBarang> {
  const dariServer = (res: { data?: unknown }) =>
    ErpApiService.gabungPengirimanServer(p, ErpApiService.mapBackendPengiriman(ambilData(res, 'Server tidak mengembalikan Surat Jalan')));
  if (baru) return dariServer(await api.post<unknown>('/pengiriman', payloadPengiriman(p)));
  return dariServer(await api.put<unknown>(`/pengiriman/${encodeURIComponent(p.pengiriman_id)}`, payloadPengiriman(p)));
}

export async function hapusPengirimanServer(pengirimanId: string): Promise<void> {
  try {
    await api.delete(`/pengiriman/${encodeURIComponent(pengirimanId)}`);
  } catch (err) {
    if (!barisSudahTiada(err)) throw err;
  }
}

export async function ubahStatusPengirimanServer(p: PengirimanBarang, status: PengirimanBarang['status']): Promise<PengirimanBarang> {
  const res = await api.put<unknown>(`/pengiriman/${encodeURIComponent(p.pengiriman_id)}/status`, { status });
  return res.data
    ? ErpApiService.gabungPengirimanServer(p, ErpApiService.mapBackendPengiriman(res.data))
    : { ...p, status };
}

// ---------- Kupon ----------
/** Kupon yang memang belum pernah sampai ke server (404) juga dicatat terhapus oleh server, jadi dianggap berhasil. */
export async function hapusTransaksiServer(transaksiId: string, alasan?: string): Promise<void> {
  const query = alasan ? `?alasan=${encodeURIComponent(alasan)}` : '';
  try {
    await api.delete(`/transaksi/${encodeURIComponent(transaksiId)}${query}`);
  } catch (err) {
    if (!barisSudahTiada(err)) throw err;
  }
}

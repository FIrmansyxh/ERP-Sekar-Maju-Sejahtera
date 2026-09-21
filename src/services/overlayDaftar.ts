import type { Barang, BatchPengirimanSample, MasterHargaJual, PengirimanBarang, Petani, TabelHarga, TransaksiPembelian, User } from '../types';
import { antrianMutasi } from './antrianMutasi';
import { antrianSinkron } from './antrianSinkron';

/**
 * Menimpa daftar dari server dengan perubahan yang belum (atau baru saja) sampai ke server.
 *
 * Dipakai di DUA tempat, keduanya wajib: saat daftar diterima (erpApi.ts) dan sekali lagi tepat sebelum daftar itu
 * dipasang ke layar (App.tsx). Pemuatan ulang memuat beberapa daftar sekaligus dan bisa makan beberapa detik;
 * perubahan yang dibuat operator selama menunggu (mis. centang ganti tikar, menghapus batch) tidak boleh
 * tertimpa daftar yang sudah usang.
 */

export const overlayPetani = (daftar: Petani[]): Petani[] =>
  antrianMutasi.terapkanKeDaftar('petani', daftar, {
    ambilId: (p) => p.petani_id,
    gabung: (srv, lokal) => ({ ...srv, ...lokal, statistik: srv.statistik ?? lokal.statistik }),
  });

/** Status bal yang diubah di perangkat ini tetap dipakai; bal milik kupon yang sedang dihapus disembunyikan. */
export const overlayBarang = (daftar: Barang[]): Barang[] => {
  const kuponDihapus = antrianMutasi.daftarTerhapus('transaksi');
  return antrianMutasi
    .terapkanKeDaftar('barang', daftar, {
      ambilId: (b) => b.barang_id,
      gabung: (srv, lokal) => ({ ...srv, status_stok: lokal.status_stok, catatan: lokal.catatan ?? srv.catatan }),
    })
    .filter((b) => !b.transaksi_pembelian_id || !kuponDihapus.has(b.transaksi_pembelian_id));
};

export const overlayHargaBeli = (daftar: TabelHarga[]): TabelHarga[] =>
  antrianMutasi.terapkanKeDaftar('harga_beli', daftar, { ambilId: (h) => h.harga_id });

export const overlayHargaJual = (daftar: MasterHargaJual[]): MasterHargaJual[] =>
  antrianMutasi.terapkanKeDaftar('harga_jual', daftar, { ambilId: (h) => h.harga_jual_id });

export const overlayUser = (daftar: User[]): User[] =>
  antrianMutasi.terapkanKeDaftar('user', daftar, {
    ambilId: (u) => u.user_id,
    gabung: (srv, lokal) => ({ ...srv, status_aktif: lokal.status_aktif }),
  });

export const overlayBatchSample = (daftar: BatchPengirimanSample[]): BatchPengirimanSample[] =>
  antrianMutasi.terapkanKeDaftar('batch_sample', daftar, {
    ambilId: (b) => b.batch_id,
    ambilIdAlt: (b) => b.kode_batch,
    gabung: (srv, lokal) => ({ ...srv, ...lokal, batch_id: srv.batch_id }),
  });

export const overlayPengiriman = (daftar: PengirimanBarang[]): PengirimanBarang[] =>
  antrianMutasi.terapkanKeDaftar('pengiriman', daftar, {
    ambilId: (p) => p.pengiriman_id,
    ambilIdAlt: (p) => p.no_surat_jalan,
    gabung: (srv, lokal) => ({ ...srv, ...lokal, pengiriman_id: srv.pengiriman_id }),
  });

/** Kupon: perubahan bal/timbang dari antrean kupon, lalu kupon yang sedang dihapus. */
export const overlayTransaksi = (daftar: TransaksiPembelian[]): TransaksiPembelian[] =>
  antrianMutasi.terapkanKeDaftar('transaksi', antrianSinkron.terapkanKeDaftar(daftar), {
    ambilId: (t) => t.transaksi_id,
    ambilIdAlt: (t) => t.no_kupon,
  });

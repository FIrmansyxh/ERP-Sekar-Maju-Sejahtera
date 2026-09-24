import { useEffect, useRef, useState } from 'react';
import {
  loadBarangData,
  loadBatchSampleData,
  loadHargaData,
  loadHargaJualData,
  loadPengirimanData,
  loadPetaniData,
  loadTransaksiData,
  loadUserData,
  saveBarangData,
  saveBatchSampleData,
  saveHargaData,
  saveHargaJualData,
  savePengirimanData,
  savePetaniData,
  saveTransaksiData,
  saveUserData,
} from '../utils/storage';
import { EntitasSinkron, SEMUA_ENTITAS } from '../services/sinkronServer';
import { serverAktif } from '../services/mutasiServer';
import { Baris, DataServer, TokoDataServer } from '../services/tokoDataServer';

export type { DataServer } from '../services/tokoDataServer';

/**
 * Data layar untuk React: semua daftar SEPERTI DI SERVER (TokoDataServer), diselaraskan terus selama pengguna login.
 *
 * - Saat login dimuat penuh, lalu tiap SELANG_SINKRON_MS (selama tab terlihat) hanya perubahan yang diambil, jadi
 *   tambah/ubah/hapus dari komputer atau akun lain terlihat dalam beberapa detik di SEMUA menu, termasuk laporan.
 * - Tab kembali terlihat / jendela difokuskan / jaringan tersambung lagi: langsung diselaraskan.
 * - localStorage hanya cadangan untuk membuka aplikasi saat server tidak terjangkau; tidak pernah menimpa server.
 */

export const SELANG_SINKRON_MS = 3000;
const SELANG_SINKRON_LATAR_MS = 30000;

const SIMPAN: { [E in EntitasSinkron]: (d: DataServer[E]) => void } = {
  petani: savePetaniData,
  transaksi: saveTransaksiData,
  barang: saveBarangData,
  harga_beli: saveHargaData,
  harga_jual: saveHargaJualData,
  batch_sample: saveBatchSampleData,
  pengiriman: savePengirimanData,
  // Hash kata sandi login cadangan yang tersimpan di peramban (mis. dari login terakhir) tidak ikut terhapus
  users: (d) => {
    const sandi = new Map(loadUserData().filter((u) => u.password).map((u) => [u.user_id, u.password] as const));
    saveUserData(d.map((u) => (u.password || !sandi.has(u.user_id) ? u : { ...u, password: sandi.get(u.user_id) })));
  },
};

function muatCache(): DataServer {
  return {
    petani: loadPetaniData(),
    transaksi: loadTransaksiData(),
    barang: loadBarangData(),
    harga_beli: loadHargaData(),
    harga_jual: loadHargaJualData(),
    batch_sample: loadBatchSampleData(),
    pengiriman: loadPengirimanData(),
    users: loadUserData(),
  };
}

export interface KendaliDataServer {
  data: DataServer;
  /** Ambil perubahan dari server sekarang (penuh = muat ulang semua). true bila berhasil. */
  sinkronkan: (opsi?: { penuh?: boolean }) => Promise<boolean>;
  /** Pasang baris jawaban server (tambah atau ganti per ID). Data yang lebih lama tidak menimpa yang lebih baru. */
  pasangBaris: <E extends EntitasSinkron>(entitas: E, baris: Baris<E> | Baris<E>[]) => void;
  /** Buang baris yang sudah dihapus di server; data terlambat tidak akan menghidupkannya lagi. */
  hapusBaris: <E extends EntitasSinkron>(entitas: E, id: string | string[]) => void;
  /** Mengubah daftar langsung (hanya mode demo tanpa server). */
  ubahDaftar: <E extends EntitasSinkron>(entitas: E, ubah: (lama: DataServer[E]) => DataServer[E]) => void;
}

export function useDataServer(aktif: boolean): KendaliDataServer {
  const [toko] = useState(() => new TokoDataServer(muatCache()));
  const [data, setData] = useState<DataServer>(toko.ambil);
  useEffect(() => toko.berlangganan(() => setData(toko.ambil())), [toko]);

  // Selama pengguna login: muat penuh sekali, lalu perubahan saja tiap beberapa detik
  useEffect(() => {
    if (!aktif || !serverAktif()) return;
    toko.mulaiUlang();
    void toko.sinkronkan({ penuh: true });
    const terlihat = () => typeof document === 'undefined' || document.visibilityState === 'visible';
    const detak = window.setInterval(() => {
      if (terlihat()) void toko.sinkronkan();
    }, SELANG_SINKRON_MS);
    const detakLatar = window.setInterval(() => {
      if (!terlihat()) void toko.sinkronkan();
    }, SELANG_SINKRON_LATAR_MS);
    const segera = () => {
      if (terlihat()) void toko.sinkronkan();
    };
    document.addEventListener('visibilitychange', segera);
    window.addEventListener('focus', segera);
    window.addEventListener('online', segera);
    return () => {
      window.clearInterval(detak);
      window.clearInterval(detakLatar);
      document.removeEventListener('visibilitychange', segera);
      window.removeEventListener('focus', segera);
      window.removeEventListener('online', segera);
    };
  }, [aktif, toko]);

  // Cadangan di peramban, hanya daftar yang berubah dan tidak setiap detik
  const tersimpan = useRef<DataServer>(data);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const sebelum = tersimpan.current;
      for (const e of SEMUA_ENTITAS) {
        if (sebelum[e] !== data[e]) (SIMPAN[e] as (d: unknown) => void)(data[e]);
      }
      tersimpan.current = data;
    }, 400);
    return () => window.clearTimeout(t);
  }, [data]);

  return { data, sinkronkan: toko.sinkronkan, pasangBaris: toko.pasangBaris, hapusBaris: toko.hapusBaris, ubahDaftar: toko.ubahDaftar };
}

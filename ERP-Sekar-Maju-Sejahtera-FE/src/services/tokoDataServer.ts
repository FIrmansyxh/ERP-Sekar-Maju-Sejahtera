import type {
  Barang,
  BatchPengirimanSample,
  MasterHargaJual,
  PengirimanBarang,
  Petani,
  TabelHarga,
  TransaksiPembelian,
  User,
} from '../types';
import { ambilPerubahan, EntitasSinkron, gabungDaftar, PaketSinkron, SEMUA_ENTITAS } from './sinkronServer';
import { ErpApiService } from './erpApi';
import { serverAktif } from './mutasiServer';
import { statusServer } from './statusServer';
import { pesanGalatApi } from './apiClient';

/**
 * Semua daftar data yang tampil di layar, SEPERTI YANG ADA DI SERVER (tanpa React; hook useDataServer membungkusnya).
 *
 * - sinkronkan(): mengambil perubahan sejak pertanyaan terakhir (atau semua data) dan menerapkannya.
 * - pasangBaris / hapusBaris: memasang jawaban server setelah perangkat ini menyimpan / menghapus.
 * Tidak ada daftar lokal yang menimpa server; ID yang baru dihapus dari perangkat ini tidak bisa dihidupkan lagi oleh
 * data yang dibaca server sebelum penghapusan (mis. jawaban sinkron yang tiba terlambat).
 */

export interface DataServer {
  petani: Petani[];
  transaksi: TransaksiPembelian[];
  barang: Barang[];
  harga_beli: TabelHarga[];
  harga_jual: MasterHargaJual[];
  batch_sample: BatchPengirimanSample[];
  pengiriman: PengirimanBarang[];
  users: User[];
}

export type Baris<E extends EntitasSinkron> = DataServer[E][number];

/** Lama ID yang baru dihapus dari perangkat ini diabaikan bila masih terbawa data yang dibaca server sebelumnya */
const MASA_ABAIKAN_MS = 120000;

export const AMBIL_ID: { [E in EntitasSinkron]: (x: Baris<E>) => string } = {
  petani: (x) => x.petani_id,
  transaksi: (x) => x.transaksi_id,
  barang: (x) => x.barang_id,
  harga_beli: (x) => x.harga_id,
  harga_jual: (x) => x.harga_jual_id,
  batch_sample: (x) => x.batch_id,
  pengiriman: (x) => x.pengiriman_id,
  users: (x) => x.user_id,
};

/** Rincian yang memang tidak disimpan server tetap diambil dari data di layar. */
const GABUNG: { [E in EntitasSinkron]?: (lokal: Baris<E> | undefined, server: Baris<E>) => Baris<E> } = {
  batch_sample: (lokal, server) => ErpApiService.gabungBatchServer(lokal, server),
  pengiriman: (lokal, server) => ErpApiService.gabungPengirimanServer(lokal, server),
  // Hash kata sandi untuk login cadangan (tanpa server) hanya ada di peramban
  users: (lokal, server) => (lokal?.password ? { ...server, password: lokal.password } : server),
};

export const DATA_KOSONG: DataServer = {
  petani: [],
  transaksi: [],
  barang: [],
  harga_beli: [],
  harga_jual: [],
  batch_sample: [],
  pengiriman: [],
  users: [],
};

export class TokoDataServer {
  private data: DataServer;
  private kursor: string | null = null;
  private berjalan: Promise<boolean> | null = null;
  private mintaLagi = false;
  private mintaPenuh = false;
  private readonly abaikan: Record<EntitasSinkron, Map<string, number>>;
  private readonly pendengar = new Set<() => void>();

  constructor(awal: DataServer = DATA_KOSONG) {
    this.data = awal;
    this.abaikan = Object.fromEntries(SEMUA_ENTITAS.map((e) => [e, new Map<string, number>()])) as Record<EntitasSinkron, Map<string, number>>;
  }

  ambil = (): DataServer => this.data;

  berlangganan = (fn: () => void): (() => void) => {
    this.pendengar.add(fn);
    return () => this.pendengar.delete(fn);
  };

  /** Sinkron berikutnya memuat semua data (mis. setelah login). */
  mulaiUlang = (): void => {
    this.kursor = null;
  };

  private pasang(ubah: (d: DataServer) => DataServer): void {
    const next = ubah(this.data);
    if (next === this.data) return;
    this.data = next;
    this.pendengar.forEach((fn) => fn());
  }

  private idDiabaikan(e: EntitasSinkron): Set<string> {
    const peta = this.abaikan[e];
    const sekarang = Date.now();
    for (const [id, pada] of peta) if (sekarang - pada > MASA_ABAIKAN_MS) peta.delete(id);
    return new Set(peta.keys());
  }

  terapkanPaket = (paket: PaketSinkron): void => {
    this.pasang((d) => {
      let hasil = d;
      for (const e of SEMUA_ENTITAS) {
        const lama = d[e] as unknown[];
        const baru = gabungDaftar(lama, paket[e] as unknown[] | undefined, paket.dihapus[e], paket.penuh, {
          ambilId: AMBIL_ID[e] as (x: unknown) => string,
          gabung: GABUNG[e] as ((l: unknown, s: unknown) => unknown) | undefined,
          abaikan: this.idDiabaikan(e),
          waktuPaket: paket.serverTime,
        });
        if (baru !== lama) hasil = { ...hasil, [e]: baru };
      }
      return hasil;
    });
  };

  /**
   * Ambil perubahan dari server sekarang (penuh = muat ulang semua). Permintaan yang datang saat sinkron sedang
   * berjalan digabung: sinkron diulang sekali lagi sesudahnya. true bila berhasil.
   */
  sinkronkan = (opsi: { penuh?: boolean } = {}): Promise<boolean> => {
    if (!serverAktif()) return Promise.resolve(false);
    if (opsi.penuh) this.mintaPenuh = true;
    this.mintaLagi = true;
    if (this.berjalan) return this.berjalan;
    const jalan = (async () => {
      let berhasil = false;
      try {
        while (this.mintaLagi) {
          this.mintaLagi = false;
          const penuh = this.mintaPenuh || !this.kursor;
          this.mintaPenuh = false;
          try {
            const paket = await ambilPerubahan(penuh ? null : this.kursor);
            this.terapkanPaket(paket);
            this.kursor = paket.serverTime;
            statusServer.berhasil();
            berhasil = true;
          } catch (err) {
            if (penuh) this.mintaPenuh = true;
            statusServer.gagal(pesanGalatApi(err));
            berhasil = false;
            break;
          }
        }
      } finally {
        this.berjalan = null;
      }
      return berhasil;
    })();
    this.berjalan = jalan;
    return jalan;
  };

  /** Pasang baris jawaban server (tambah atau ganti per ID). Data yang lebih lama tidak menimpa yang lebih baru. */
  pasangBaris = <E extends EntitasSinkron>(entitas: E, baris: Baris<E> | Baris<E>[]): void => {
    const ambilId = AMBIL_ID[entitas] as (x: unknown) => string;
    // Jawaban simpanan yang tiba setelah datanya dihapus (mis. timbang yang terkirim tepat sebelum kupon dihapus)
    // tidak boleh menghidupkannya lagi
    const diabaikan = this.idDiabaikan(entitas);
    const daftar = ((Array.isArray(baris) ? baris : [baris]).filter(Boolean) as unknown[]).filter((b) => !diabaikan.has(ambilId(b)));
    if (daftar.length === 0) return;
    this.pasang((d) => {
      const lama = d[entitas] as unknown[];
      const baru = gabungDaftar(lama, daftar, undefined, false, {
        ambilId,
        gabung: GABUNG[entitas] as ((l: unknown, s: unknown) => unknown) | undefined,
      });
      return baru === lama ? d : { ...d, [entitas]: baru };
    });
  };

  /** Buang baris yang sudah dihapus di server; data terlambat tidak akan menghidupkannya lagi. */
  hapusBaris = <E extends EntitasSinkron>(entitas: E, id: string | string[]): void => {
    const daftar = new Set(Array.isArray(id) ? id : [id]);
    if (daftar.size === 0) return;
    const sekarang = Date.now();
    daftar.forEach((x) => this.abaikan[entitas].set(x, sekarang));
    const ambilId = AMBIL_ID[entitas] as (x: unknown) => string;
    this.pasang((d) => {
      const lama = d[entitas] as unknown[];
      const baru = lama.filter((x) => !daftar.has(ambilId(x)));
      return baru.length === lama.length ? d : { ...d, [entitas]: baru };
    });
  };

  /** Mengubah daftar langsung (hanya mode demo tanpa server). */
  ubahDaftar = <E extends EntitasSinkron>(entitas: E, ubah: (lama: DataServer[E]) => DataServer[E]): void => {
    this.pasang((d) => {
      const baru = ubah(d[entitas]);
      return baru === d[entitas] ? d : { ...d, [entitas]: baru };
    });
  };
}

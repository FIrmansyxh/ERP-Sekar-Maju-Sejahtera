/**
 * Peringatan penyimpanan yang harus diketahui operator, ditampilkan di Header (IndikatorSinkron):
 *  - perubahan yang tersimpan di komputer ini tetapi GAGAL dikirim ke server (selain kupon, yang punya antrean sendiri);
 *  - penyimpanan peramban penuh sehingga data hanya bertahan sampai halaman dimuat ulang.
 * Sebelumnya keduanya hanya muncul di konsol pengembang sehingga operator tidak tahu datanya belum aman.
 */

export interface PeringatanSimpanan {
  id: string;
  jenis: 'server' | 'kuota';
  pesan: string;
  rincian?: string;
  waktu: number;
}

type Pendengar = () => void;

let daftar: PeringatanSimpanan[] = [];
const pendengar = new Set<Pendengar>();
const umumkan = () => pendengar.forEach((fn) => fn());

const pesanGalat = (galat: unknown): string => (galat instanceof Error ? galat.message : String(galat ?? ''));

const jam = (waktu: number) => new Date(waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export const peringatanSimpanan = {
  /** Perubahan `entitas` tersimpan lokal tetapi tidak sampai ke server. Peringatan yang sama tidak menumpuk. */
  laporkanGagalServer(entitas: string, galat?: unknown): void {
    const waktu = Date.now();
    const id = `server:${entitas}`;
    const baru: PeringatanSimpanan = {
      id,
      jenis: 'server',
      pesan: `${entitas} belum tersimpan di server (${jam(waktu)})`,
      rincian: pesanGalat(galat) || undefined,
      waktu,
    };
    daftar = [...daftar.filter((p) => p.id !== id), baru];
    umumkan();
  },

  /** Kuota penyimpanan peramban habis; data sementara hanya di memori. */
  laporkanKuotaPenuh(kunci: string): void {
    if (daftar.some((p) => p.jenis === 'kuota')) return;
    daftar = [
      ...daftar,
      {
        id: 'kuota',
        jenis: 'kuota',
        pesan: 'Penyimpanan peramban penuh: data bisa hilang saat halaman dimuat ulang',
        rincian: `Gagal menulis ${kunci}. Ekspor data penting dan kosongkan penyimpanan peramban.`,
        waktu: Date.now(),
      },
    ];
    umumkan();
  },

  tutup(id: string): void {
    daftar = daftar.filter((p) => p.id !== id);
    umumkan();
  },

  semua(): PeringatanSimpanan[] {
    return daftar;
  },

  berlangganan(fn: Pendengar): () => void {
    pendengar.add(fn);
    return () => {
      pendengar.delete(fn);
    };
  },

  /** Hanya untuk tes. */
  _atur(ulang: PeringatanSimpanan[] = []): void {
    daftar = ulang;
    umumkan();
  },
};

/** Mencatat galat sinkron ke konsol sekaligus memberi tahu operator di Header. */
export function laporkanGagalSimpan(entitas: string, galat?: unknown): void {
  console.warn(`Gagal menyimpan ${entitas} ke server, tersimpan di komputer ini:`, galat);
  peringatanSimpanan.laporkanGagalServer(entitas, galat);
}

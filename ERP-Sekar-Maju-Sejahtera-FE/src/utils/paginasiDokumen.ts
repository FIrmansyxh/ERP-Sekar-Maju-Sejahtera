/**
 * Pembagian halaman dokumen bertabel (Surat Jalan, Surat Pengantar Sample) dengan aturan yang sama
 * seperti Nota Pembelian (lihat paginasiNota.ts): tiap lembar dihitung dari tinggi blok yang pasti
 * (tinggi baris dipatok), sehingga baris tidak pernah terbelah di pergantian halaman, judul kolom
 * diulang di tiap halaman, dan blok penutup (terbilang, syarat, tanda tangan) tidak pernah sendirian
 * terpisah dari tabel tanpa alasan.
 *
 * Satuan piksel CSS pada lebar dokumen 760px, sama dengan lebar tangkapan PDF. Angka sengaja sedikit
 * lebih besar dari hasil ukur agar selalu ada sisa ruang.
 */
export interface UkuranDokumen {
  /** Tinggi isi satu lembar, termasuk footer. */
  halaman: number;
  /** Footer di dasar tiap lembar, termasuk jarak atasnya. */
  footer: number;
  /** Kop surat + kotak data dokumen beserta jaraknya (hanya lembar pertama). */
  kopMeta: number;
  /** Judul lanjutan di atas lembar kedua dst. */
  lanjutan: number;
  /** Baris judul kolom tabel. */
  thead: number;
  /** Satu baris data. */
  baris: number;
  /** Baris (atau baris-baris) TOTAL di bawah tabel. */
  totalBaris: number;
  /** Blok penutup (terbilang, catatan, syarat, tanda tangan) beserta jaraknya. */
  ekor: number;
}

/**
 * Ukuran hasil ukur di browser pada lebar 760px (tiap angka ditambah sisa aman 2-6px).
 * "footer" sudah mencakup padding atas-bawah lembar (2 x 24), footer 30, dan jarak di atasnya (16).
 * "ekor" sudah mencakup jarak 16 di atas blok penutup.
 */
export const UKURAN_SURAT_JALAN: UkuranDokumen = {
  halaman: 1090,
  footer: 98,
  kopMeta: 256,
  lanjutan: 48,
  thead: 40,
  baris: 37,
  totalBaris: 44,
  // Dasar (terbilang, syarat, tanda tangan); Surat Jalan menambah untuk catatan dan aturan netto.
  // Sisa 16px disediakan bila terbilang turun ke baris kedua.
  ekor: 292,
};

export const UKURAN_SURAT_SAMPLE: UkuranDokumen = {
  halaman: 1090,
  footer: 98,
  kopMeta: 218,
  lanjutan: 48,
  thead: 40,
  baris: 37,
  totalBaris: 44,
  ekor: 182,
};

export interface HalamanDokumen {
  nomor: number;
  /** Lembar pertama memuat kop surat dan data dokumen. */
  pertama: boolean;
  /** Rentang baris di lembar ini: [barisMulai, barisAkhir). Kosong bila tabel sudah habis. */
  barisMulai: number;
  barisAkhir: number;
  /** Baris TOTAL ada di lembar ini (berarti tabel selesai di sini). */
  totalBaris: boolean;
  /** Blok penutup ada di lembar ini. */
  ekor: boolean;
}

export function susunHalamanDokumen(jumlahBaris: number, ukuran: UkuranDokumen): HalamanDokumen[] {
  const U = ukuran;
  const n = Math.max(0, jumlahBaris);
  const halaman: HalamanDokumen[] = [];
  let idx = 0;
  let totalSelesai = false;
  let ekorSelesai = false;

  while (!(totalSelesai && ekorSelesai) && halaman.length < 500) {
    const pertama = halaman.length === 0;
    let sisa = U.halaman - U.footer - (pertama ? U.kopMeta : U.lanjutan);
    const hal: HalamanDokumen = {
      nomor: halaman.length + 1,
      pertama,
      barisMulai: idx,
      barisAkhir: idx,
      totalBaris: false,
      ekor: false,
    };

    if (!totalSelesai) {
      sisa -= U.thead;
      const sisaBaris = n - idx;
      const sisaSetelahTotal = sisa - (sisaBaris * U.baris + U.totalBaris);
      // Bila tabel muat tetapi blok penutup tidak, ikutkan 3 baris terakhir ke lembar berikutnya
      // supaya tanda tangan tidak berdiri sendiri di lembar tanpa isi tabel.
      const ekorTerpisah = sisaSetelahTotal >= 0 && sisaSetelahTotal < U.ekor && sisaBaris >= 4;
      if (sisaSetelahTotal >= 0 && !ekorTerpisah) {
        // Seluruh sisa baris beserta baris TOTAL muat di lembar ini
        idx = n;
        hal.totalBaris = true;
        totalSelesai = true;
        sisa = sisaSetelahTotal;
      } else {
        // Isi lembar penuh dengan baris; sisakan minimal 2 baris agar TOTAL tidak sendirian
        let k = ekorTerpisah ? sisaBaris - 3 : Math.floor(sisa / U.baris);
        if (sisaBaris - k < 2) k = sisaBaris - 2;
        k = Math.max(1, Math.min(k, sisaBaris));
        idx += k;
        hal.barisAkhir = idx;
        halaman.push(hal);
        continue;
      }
    }

    hal.barisAkhir = idx;

    // Blok penutup satu kesatuan: dipindah utuh ke halaman berikutnya bila tidak muat,
    // agar tanda tangan tidak terpotong.
    if (!ekorSelesai && sisa >= U.ekor) {
      hal.ekor = true;
      ekorSelesai = true;
    }

    halaman.push(hal);
  }

  return halaman;
}

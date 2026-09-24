/**
 * Pembagian halaman Nota Pembelian.
 *
 * Nota tidak lagi dipotong dari satu gambar panjang. Setiap lembar dihitung di sini dari tinggi
 * blok yang pasti (tinggi baris tabel dipatok), sehingga baris tidak pernah terbelah di
 * pergantian halaman dan tabel selalu berbingkai utuh di tiap halaman.
 *
 * Satuan piksel CSS pada lebar dokumen 760px, sama dengan lebar tangkapan PDF (A4 dengan
 * margin 8mm). Angka sengaja sedikit lebih besar dari hasil ukur agar selalu ada sisa ruang.
 */
export const UKURAN_NOTA = {
  /** Tinggi isi satu lembar, termasuk footer. */
  halaman: 1090,
  /** Footer di dasar tiap lembar, termasuk jarak atasnya. */
  footer: 44,
  /** Kop surat + kotak data kupon/petani beserta jaraknya (hanya lembar pertama). */
  kopMeta: 220,
  /** Judul lanjutan di atas lembar kedua dst. */
  lanjutan: 48,
  /** Baris judul kolom tabel bal. */
  thead: 40,
  /** Satu baris bal. */
  baris: 37,
  /** Baris TOTAL di bawah tabel bal. */
  totalBaris: 44,
  /** Tabel rincian potongan beserta jaraknya. */
  potongan: 200,
  /** Kotak total dibayar, terbilang, dan tanda tangan beserta jaraknya. */
  ringkasan: 360,
} as const;

export interface HalamanNota {
  nomor: number;
  /** Lembar pertama memuat kop surat dan data kupon. */
  pertama: boolean;
  /** Rentang baris bal di lembar ini: [barisMulai, barisAkhir). Kosong bila tabel sudah habis. */
  barisMulai: number;
  barisAkhir: number;
  /** Baris TOTAL tabel bal ada di lembar ini (berarti tabel selesai di sini). */
  totalBaris: boolean;
  potongan: boolean;
  ringkasan: boolean;
}

export function susunHalamanNota(jumlahBaris: number): HalamanNota[] {
  const U = UKURAN_NOTA;
  const n = Math.max(0, jumlahBaris);
  const halaman: HalamanNota[] = [];
  let idx = 0;
  let totalSelesai = false;
  let potonganSelesai = false;
  let ringkasanSelesai = false;

  while (!(totalSelesai && potonganSelesai && ringkasanSelesai) && halaman.length < 500) {
    const pertama = halaman.length === 0;
    let sisa = U.halaman - U.footer - (pertama ? U.kopMeta : U.lanjutan);
    const hal: HalamanNota = {
      nomor: halaman.length + 1,
      pertama,
      barisMulai: idx,
      barisAkhir: idx,
      totalBaris: false,
      potongan: false,
      ringkasan: false,
    };

    if (!totalSelesai) {
      sisa -= U.thead;
      const sisaBaris = n - idx;
      if (sisaBaris * U.baris + U.totalBaris <= sisa) {
        // Seluruh sisa baris beserta baris TOTAL muat di lembar ini
        idx = n;
        hal.totalBaris = true;
        totalSelesai = true;
        sisa -= sisaBaris * U.baris + U.totalBaris;
      } else {
        // Isi lembar penuh dengan baris; sisakan minimal 2 baris agar TOTAL tidak sendirian
        let k = Math.floor(sisa / U.baris);
        if (sisaBaris - k < 2) k = sisaBaris - 2;
        k = Math.max(1, Math.min(k, sisaBaris));
        idx += k;
        hal.barisAkhir = idx;
        halaman.push(hal);
        continue;
      }
    }

    hal.barisAkhir = idx;

    // Rincian potongan dan ringkasan pembayaran (total, terbilang, tanda tangan) satu kesatuan:
    // dipindah bersama ke halaman berikutnya bila tidak muat, agar tanda tangan tidak sendirian.
    if (!potonganSelesai && sisa >= U.potongan + U.ringkasan) {
      hal.potongan = true;
      hal.ringkasan = true;
      potonganSelesai = true;
      ringkasanSelesai = true;
    }

    halaman.push(hal);
  }

  return halaman;
}

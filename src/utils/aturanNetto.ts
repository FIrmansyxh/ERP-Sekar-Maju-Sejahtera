import { AturanNettoDO } from '../types';
import { normalizeKg } from './formatters';

/**
 * Aturan potongan bruto ke netto jual pada Surat Jalan.
 *
 * Tiap pembeli punya aturan sendiri dan sering berubah, jadi aturan diisi operator per Surat Jalan
 * (bukan disimpan sebagai master). Contoh GG: 1-49 kg dipotong 4 kg, 50 kg ke atas dipotong 5 kg.
 *
 * Rentang ditulis dalam kg utuh: "1-49" mencakup 1 sampai 49,999 (49,5 kg masuk rentang ini),
 * sedangkan "50-59" mulai dari 50. Batas atas dikosongkan berarti "ke atas" tanpa batas.
 * Berat yang diukur adalah bruto timbang ulang, bukan bruto di gudang.
 */

/** Satu baris isian di layar; berupa teks agar operator bebas mengetik. */
export interface AturanNettoBaris {
  id: string;
  min: string;
  max: string;
  potongan: string;
}

export interface AturanNettoHasil {
  /** Aturan yang lengkap dan valid, terurut dari batas bawah. */
  aturan: AturanNettoDO[];
  /** Pesan untuk baris yang belum lengkap, terbalik, atau tumpang tindih. */
  masalah: string[];
}

export interface NettoJualHasil {
  bruto: number;
  potongan: number;
  netto: number;
  /** Ada aturan yang mencakup berat ini (atau memang tidak ada aturan sama sekali). */
  tercakup: boolean;
}

let urutanId = 0;
export const barisAturanBaru = (): AturanNettoBaris => ({
  id: `an-${Date.now().toString(36)}-${++urutanId}`,
  min: '',
  max: '',
  potongan: '',
});

const angkaKg = (raw: string): number => {
  const teks = raw.trim().replace(',', '.');
  if (teks === '') return NaN;
  const n = Number(teks);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/** Batas atas yang tidak ikut: bilangan bulat 49 berarti kurang dari 50. */
const batasAtas = (max: number | null): number => {
  if (max === null) return Infinity;
  return Number.isInteger(max) ? max + 1 : max + 1e-6;
};

export function bacaAturanNetto(baris: AturanNettoBaris[]): AturanNettoHasil {
  const aturan: AturanNettoDO[] = [];
  const masalah: string[] = [];

  baris.forEach((b, i) => {
    const no = i + 1;
    const kosongSemua = !b.min.trim() && !b.max.trim() && !b.potongan.trim();
    if (kosongSemua) {
      masalah.push(`Baris ${no} masih kosong. Isi atau hapus baris ini.`);
      return;
    }
    const min = angkaKg(b.min);
    const max = b.max.trim() === '' ? null : angkaKg(b.max);
    const potongan = angkaKg(b.potongan);
    if (Number.isNaN(min)) return void masalah.push(`Baris ${no}: berat bruto awal wajib diisi dengan angka.`);
    if (max !== null && Number.isNaN(max)) return void masalah.push(`Baris ${no}: berat bruto akhir bukan angka.`);
    if (max !== null && max < min) return void masalah.push(`Baris ${no}: berat akhir (${max}) lebih kecil dari berat awal (${min}).`);
    if (Number.isNaN(potongan)) return void masalah.push(`Baris ${no}: potongan netto wajib diisi dengan angka.`);
    aturan.push({ min, max, potongan });
  });

  aturan.sort((a, b) => a.min - b.min);
  for (let i = 1; i < aturan.length; i++) {
    const sebelum = aturan[i - 1];
    if (aturan[i].min < batasAtas(sebelum.max)) {
      const akhir = sebelum.max === null ? 'ke atas' : sebelum.max;
      masalah.push(`Rentang ${sebelum.min}-${akhir} kg tumpang tindih dengan rentang yang mulai dari ${aturan[i].min} kg.`);
    }
  }
  return { aturan, masalah };
}

export function hitungNettoJual(brutoTimbangUlang: number, aturan: AturanNettoDO[]): NettoJualHasil {
  const bruto = normalizeKg(brutoTimbangUlang);
  if (aturan.length === 0) return { bruto, potongan: 0, netto: bruto, tercakup: true };
  const cocok = aturan.find((a) => bruto >= a.min && bruto < batasAtas(a.max));
  const potongan = cocok?.potongan ?? 0;
  return { bruto, potongan, netto: Math.max(0, normalizeKg(bruto - potongan)), tercakup: !!cocok };
}

/** Teks rentang untuk tampilan, mis. "50-59 kg" atau "60 kg ke atas". */
export function labelRentang(a: AturanNettoDO): string {
  return a.max === null ? `${a.min} kg ke atas` : `${a.min}-${a.max} kg`;
}

/**
 * Tarif potongan per bal yang dipakai Sortir, Timbangan, Koreksi Transaksi,
 * Nota Pembelian, dan ketentuan di balik Kartu Petani.
 */
export const POTONGAN_KULI_PER_BAL = 7000;
export const POTONGAN_TALI_PER_BAL = 3000;
export const POTONGAN_GANTI_TIKAR = 75000;

/**
 * Ketentuan Potongan Tara (Bruto ke Netto) per Kode Bal / Mutu:
 * - SB: 2 kg rata (semua bobot)
 * - HF: <= 49 kg (3 kg), 50 - 59.9 kg (5 kg), >= 60 kg (6 kg)
 * - TS: 30 - 49 kg (4 kg, batas bawah <50 kg), 50 - 59.9 kg (5 kg), >= 60 kg (6 kg)
 * - T : Sama dengan TS
 * - Standar / Kode lain: Sama dengan HF (<50 kg: 3 kg, 50-59.9 kg: 5 kg, >=60 kg: 6 kg)
 */
export type KodeAturanTara = 'SB' | 'HF' | 'TS' | 'T' | 'DEFAULT';

export interface AturanTaraDetail {
  kode: KodeAturanTara;
  label: string;
  deskripsi: string;
}

export const DAFTAR_ATURAN_TARA: Record<KodeAturanTara, AturanTaraDetail> = {
  SB: {
    kode: 'SB',
    label: 'Kode SB',
    deskripsi: 'Potongan 2 kg rata untuk semua bobot',
  },
  HF: {
    kode: 'HF',
    label: 'Kode HF',
    deskripsi: '≤49 kg: 3 kg | 50–59 kg: 5 kg | ≥60 kg: 6 kg',
  },
  TS: {
    kode: 'TS',
    label: 'Kode TS',
    deskripsi: '30–49 kg (<50 kg): 4 kg | 50–59 kg: 5 kg | ≥60 kg: 6 kg',
  },
  T: {
    kode: 'T',
    label: 'Kode T',
    deskripsi: 'Sama dengan TS (30–49 kg: 4 kg | 50–59 kg: 5 kg | ≥60 kg: 6 kg)',
  },
  DEFAULT: {
    kode: 'DEFAULT',
    label: 'Standar / Lainnya',
    deskripsi: '≤49 kg: 3 kg | 50–59 kg: 5 kg | ≥60 kg: 6 kg',
  },
};

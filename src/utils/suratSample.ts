import { useCallback, useEffect, useState } from 'react';
import { SampleItemDetail } from '../types';

/**
 * Isi Surat Pengiriman Sample / Reclass untuk pembeli. Dipakai bersama oleh dokumen cetak dan unduhan Excel,
 * supaya kolom keduanya selalu sama. Bruto selalu tampil; kolom nomor dan harga jual mengikuti opsi cetak.
 */

/** Kode harga jual satu bal; strip bila belum dipilih. */
export function kodeHargaJualSample(item: Pick<SampleItemDetail, 'kode_harga_jual'>): string {
  const kode = (item.kode_harga_jual || '').trim();
  return kode && kode !== '-' ? kode : '-';
}

/** Nomor jadi (nomor bal untuk pembeli); sama dengan No Bal gudang bila tidak diberi nomor lain. */
export function noJadiSample(item: Pick<SampleItemDetail, 'no_bal' | 'kode_bal_pembeli'>): string {
  return (item.kode_bal_pembeli || '').trim() || item.no_bal || '-';
}

/** Nilai harga jual per kg: harga deal bila sudah ada, selain itu harga tawaran dari kode harga jual. 0 bila belum ada. */
export function nilaiHargaJualSample(item: Pick<SampleItemDetail, 'harga_deal_kg' | 'harga_tawaran_kg'>): number {
  return Number(item.harga_deal_kg || item.harga_tawaran_kg || 0);
}

// ---------- Opsi cetak ----------
export type OpsiNoBalSample = 'asal_jadi' | 'jadi';
export type OpsiHargaSample = 'kode' | 'nilai' | 'keduanya';

export interface OpsiCetakSample {
  /** 'asal_jadi' = kolom No Asal (No Bal gudang) dan No Jadi; 'jadi' = hanya nomor jadi */
  noBal: OpsiNoBalSample;
  /** Kode harga jual saja, nilai rupiah per kg saja, atau keduanya */
  harga: OpsiHargaSample;
}

export const OPSI_CETAK_SAMPLE_BAWAAN: OpsiCetakSample = { noBal: 'asal_jadi', harga: 'kode' };

export const LABEL_OPSI_NO_BAL: Record<OpsiNoBalSample, string> = {
  asal_jadi: 'No Asal & No Jadi',
  jadi: 'No Jadi Saja',
};

export const LABEL_OPSI_HARGA: Record<OpsiHargaSample, string> = {
  kode: 'Kode Harga Jual',
  nilai: 'Nilai Harga Jual',
  keduanya: 'Kode & Nilai',
};

export type KunciKolomSample = 'no' | 'asal' | 'jadi' | 'bruto' | 'kode' | 'nilai';

export interface KolomSuratSample {
  kunci: KunciKolomSample;
  judul: string;
  /** Bobot lebar kolom pada dokumen cetak (dinormalkan menjadi persen) */
  bobot: number;
}

/** Susunan kolom surat sample untuk opsi tertentu. Bruto selalu ada. */
export function kolomSuratSample(opsi: OpsiCetakSample): KolomSuratSample[] {
  const kolom: KolomSuratSample[] = [{ kunci: 'no', judul: 'No', bobot: 6 }];
  if (opsi.noBal === 'asal_jadi') {
    kolom.push({ kunci: 'asal', judul: 'No Asal', bobot: 20 }, { kunci: 'jadi', judul: 'No Jadi', bobot: 20 });
  } else {
    kolom.push({ kunci: 'jadi', judul: 'No Bal', bobot: 28 });
  }
  kolom.push({ kunci: 'bruto', judul: 'Bruto (kg)', bobot: 18 });
  if (opsi.harga !== 'nilai') kolom.push({ kunci: 'kode', judul: 'Kode Harga Jual', bobot: 18 });
  if (opsi.harga !== 'kode') kolom.push({ kunci: 'nilai', judul: 'Harga Jual (Rp/kg)', bobot: 20 });
  return kolom;
}

const KUNCI_OPSI = 'sms_opsi_cetak_sample';
const EVENT_OPSI = 'sms-opsi-cetak-sample';
/** Pilihan terakhir di halaman ini (dipakai bersama semua pemakai hook). */
let opsiTerakhir: OpsiCetakSample | null = null;

export function bacaOpsiCetakSample(): OpsiCetakSample {
  try {
    const data = JSON.parse(localStorage.getItem(KUNCI_OPSI) || 'null');
    return {
      noBal: data?.noBal === 'jadi' ? 'jadi' : 'asal_jadi',
      harga: data?.harga === 'nilai' || data?.harga === 'keduanya' ? data.harga : 'kode',
    };
  } catch {
    return OPSI_CETAK_SAMPLE_BAWAAN;
  }
}

/**
 * Opsi cetak surat sample, diingat di peramban ini dan sama di jendela pratinjau maupun halaman cetak
 * (pilihan di satu tempat langsung dipakai di tempat lain).
 */
export function useOpsiCetakSample(): [OpsiCetakSample, (ubah: Partial<OpsiCetakSample>) => void] {
  const [opsi, setOpsi] = useState<OpsiCetakSample>(() => opsiTerakhir ?? bacaOpsiCetakSample());
  useEffect(() => {
    const segarkan = (e: Event) => setOpsi((e as CustomEvent<OpsiCetakSample>).detail);
    window.addEventListener(EVENT_OPSI, segarkan);
    return () => window.removeEventListener(EVENT_OPSI, segarkan);
  }, []);
  const ubah = useCallback((perubahan: Partial<OpsiCetakSample>) => {
    // Digabung ke pilihan yang sedang berlaku (bukan dibaca ulang dari penyimpanan), supaya opsi lain tidak kembali
    // ke bawaan bila penyimpanan peramban tidak tersedia
    const baru = { ...(opsiTerakhir ?? bacaOpsiCetakSample()), ...perubahan };
    opsiTerakhir = baru;
    try {
      localStorage.setItem(KUNCI_OPSI, JSON.stringify(baru));
    } catch {
      // penyimpanan tidak tersedia: opsi tetap berlaku selama halaman terbuka
    }
    window.dispatchEvent(new CustomEvent<OpsiCetakSample>(EVENT_OPSI, { detail: baru }));
  }, []);
  return [opsi, ubah];
}

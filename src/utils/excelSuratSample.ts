import { BatchPengirimanSample } from '../types';
import { beratBrutoItemSample } from './beratKirim';
import { downloadExcelReport, ExcelCellValue, ExcelColumn, ExcelSheet } from './excelExport';
import {
  kodeHargaJualSample,
  KunciKolomSample,
  kolomSuratSample,
  nilaiHargaJualSample,
  noJadiSample,
  OPSI_CETAK_SAMPLE_BAWAAN,
  OpsiCetakSample,
} from './suratSample';

/**
 * Sheet Surat Pengiriman Sample untuk Excel, dengan kolom yang sama persis dengan dokumen cetaknya (mengikuti
 * opsi cetak: nomor asal & jadi / jadi saja, kode / nilai harga jual). Bruto selalu ada. Data pemasok (petani)
 * sengaja tidak disertakan.
 */
export function susunSheetSuratSample(batch: BatchPengirimanSample, opsi: OpsiCetakSample = OPSI_CETAK_SAMPLE_BAWAAN): ExcelSheet {
  const items = batch.items || [];
  const daftarKolom = kolomSuratSample(opsi);

  const JENIS: Record<KunciKolomSample, Omit<ExcelColumn, 'header'>> = {
    no: { type: 'integer', align: 'center' },
    asal: { type: 'text', align: 'center' },
    jadi: { type: 'text', align: 'center' },
    bruto: { type: 'kg' },
    kode: { type: 'text', align: 'center' },
    nilai: { type: 'rupiah' },
  };
  const columns: ExcelColumn[] = daftarKolom.map((k) => ({ header: k.kunci === 'bruto' ? 'Bruto (Kg)' : k.judul, ...JENIS[k.kunci] }));

  const nilaiSel = (kunci: KunciKolomSample, it: (typeof items)[number], idx: number): ExcelCellValue => {
    switch (kunci) {
      case 'no':
        return idx + 1;
      case 'asal':
        return it.no_bal || '-';
      case 'jadi':
        return noJadiSample(it);
      case 'bruto':
        return beratBrutoItemSample(it);
      case 'kode':
        return kodeHargaJualSample(it);
      case 'nilai': {
        const nilai = nilaiHargaJualSample(it);
        return nilai > 0 ? nilai : '-';
      }
    }
  };
  const rows = items.map((it, idx) => daftarKolom.map((k) => nilaiSel(k.kunci, it, idx)));

  const totalBruto = items.reduce((sum, it) => sum + beratBrutoItemSample(it), 0);
  const totalRow = daftarKolom.map((k, i) => (i === 0 ? `TOTAL (${items.length} bal sample)` : k.kunci === 'bruto' ? totalBruto : ''));

  return {
    name: 'Surat Sample',
    title: 'Surat Pengantar Sample',
    info: [
      `No. Surat Sample: ${batch.kode_batch} · Tanggal Kirim: ${batch.tanggal_kirim || '-'}`,
      `Tujuan / Buyer: ${batch.tujuan_buyer || '-'} · Pengirim: ${batch.dikirim_oleh || '-'}`,
      ...(batch.permintaan_buyer ? [`Spesifikasi: ${batch.permintaan_buyer}`] : []),
    ],
    columns,
    rows,
    totalRow,
  };
}

/** Unduh Surat Pengiriman Sample sebagai berkas Excel. */
export function unduhSuratSampleExcel(batch: BatchPengirimanSample, opsi: OpsiCetakSample = OPSI_CETAK_SAMPLE_BAWAAN): Promise<void> {
  const aman = (batch.kode_batch || batch.batch_id).replace(/[^A-Za-z0-9_-]+/g, '_');
  return downloadExcelReport(`Surat_Sample_${aman}`, [susunSheetSuratSample(batch, opsi)]);
}

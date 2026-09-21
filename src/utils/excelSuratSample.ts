import { BatchPengirimanSample } from '../types';
import { beratBrutoItemSample } from './beratKirim';
import { downloadExcelReport, ExcelColumn, ExcelSheet } from './excelExport';
import { kodeBalPembeliBerbeda, kodeHargaJualSample } from './suratSample';

/**
 * Sheet Surat Pengiriman Sample untuk Excel: No Bal, bruto, dan KODE harga jual (bukan nilai rupiah),
 * sama seperti dokumen cetaknya. Data pemasok (petani) sengaja tidak disertakan.
 */
export function susunSheetSuratSample(batch: BatchPengirimanSample): ExcelSheet {
  const items = batch.items || [];
  const adaKodeBuyer = items.some((it) => kodeBalPembeliBerbeda(it) !== '');

  const columns: ExcelColumn[] = [
    { header: 'No', type: 'integer', align: 'center' },
    { header: 'No Bal', type: 'text', align: 'center' },
    ...(adaKodeBuyer ? [{ header: 'Kode Buyer', type: 'text' as const, align: 'center' as const }] : []),
    { header: 'Bruto (Kg)', type: 'kg' },
    { header: 'Kode Harga Jual', type: 'text', align: 'center' },
  ];

  const rows = items.map((it, idx) => [
    idx + 1,
    it.no_bal,
    ...(adaKodeBuyer ? [kodeBalPembeliBerbeda(it)] : []),
    beratBrutoItemSample(it),
    kodeHargaJualSample(it),
  ]);

  const totalBruto = items.reduce((sum, it) => sum + beratBrutoItemSample(it), 0);
  const totalRow = [
    `TOTAL (${items.length} bal sample)`,
    '',
    ...(adaKodeBuyer ? [''] : []),
    totalBruto,
    '',
  ];

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
export function unduhSuratSampleExcel(batch: BatchPengirimanSample): Promise<void> {
  const aman = (batch.kode_batch || batch.batch_id).replace(/[^A-Za-z0-9_-]+/g, '_');
  return downloadExcelReport(`Surat_Sample_${aman}`, [susunSheetSuratSample(batch)]);
}

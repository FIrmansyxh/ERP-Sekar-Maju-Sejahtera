import type { Borders, Cell, Workbook, Worksheet } from 'exceljs';
import { APP_COMPANY, APP_LOCATION } from '../config/appInfo';

/**
 * Pembuat laporan Excel (.xlsx) siap pakai untuk seluruh menu laporan.
 *
 * Setiap file memuat kop perusahaan, judul, keterangan filter, header tabel yang
 * tetap terlihat saat digulir, filter kolom, format Rupiah / kilogram / tanggal
 * yang tetap berupa angka, baris total, dan pengaturan cetak A4. Admin cukup
 * membuka file tanpa perlu merapikan format lagi.
 *
 * Pustaka ExcelJS cukup besar sehingga baru dimuat ketika tombol unduh diklik.
 */

export type ExcelColumnType =
  | 'text' // teks biasa, termasuk No Bal / No HP agar angka 0 di depan tidak hilang
  | 'integer' // bilangan bulat dengan pemisah ribuan
  | 'decimal' // bilangan desimal (2 angka)
  | 'kg' // berat, tampil sampai 3 desimal tanpa pembulatan nilai
  | 'rupiah'
  | 'percent' // nilai 0-100
  | 'date' // 'YYYY-MM-DD...' atau Date
  | 'datetime';

export interface ExcelColumn {
  header: string;
  type?: ExcelColumnType;
  /** Lebar kolom dalam jumlah karakter; bila kosong dihitung dari isi */
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export type ExcelCellValue = string | number | Date | null | undefined;

export interface ExcelSheet {
  /** Nama tab sheet (maks. 31 karakter) */
  name: string;
  title: string;
  /** Keterangan di bawah judul, mis. periode dan filter yang aktif */
  info?: string[];
  columns: ExcelColumn[];
  rows: ExcelCellValue[][];
  /** Baris total di bawah tabel, sejajar dengan kolom */
  totalRow?: ExcelCellValue[];
}

const COLOR = {
  brand: 'FFB81D24',
  text: 'FF111827',
  muted: 'FF6B7280',
  headerFill: 'FFF3F4F6',
  zebraFill: 'FFF9FAFB',
  totalFill: 'FFE5E7EB',
  border: 'FFD1D5DB',
  borderStrong: 'FF6B7280',
};

const FONT_NAME = 'Calibri';

const NUM_FMT: Partial<Record<ExcelColumnType, string>> = {
  integer: '#,##0',
  decimal: '#,##0.00',
  kg: '#,##0.0##',
  rupiah: '"Rp "#,##0;-"Rp "#,##0',
  percent: '0.0%',
  date: 'dd/mm/yyyy',
  datetime: 'dd/mm/yyyy hh:mm',
};

const NUMERIC_TYPES: ExcelColumnType[] = ['integer', 'decimal', 'kg', 'rupiah', 'percent'];

const thinBorder = (color = COLOR.border): Partial<Borders> => ({
  top: { style: 'thin', color: { argb: color } },
  left: { style: 'thin', color: { argb: color } },
  bottom: { style: 'thin', color: { argb: color } },
  right: { style: 'thin', color: { argb: color } },
});

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Excel menyimpan tanggal tanpa zona waktu, sedangkan ExcelJS menulis Date sebagai UTC.
 * Komponen tanggal lokal dipindah ke UTC supaya yang tampil sama dengan di aplikasi.
 */
function toExcelDate(value: ExcelCellValue, withTime: boolean): Date | null {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return new Date(Date.UTC(
      value.getFullYear(), value.getMonth(), value.getDate(),
      withTime ? value.getHours() : 0, withTime ? value.getMinutes() : 0,
    ));
  }
  if (typeof value !== 'string' || !value.trim()) return null;

  const str = value.trim();
  if (!withTime) {
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : toExcelDate(parsed, true);
}

function toNumber(value: ExcelCellValue): number | null {
  if (typeof value === 'number') return isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) return Number(value);
  return null;
}

/** Perkiraan panjang teks yang tampil di sel, dipakai untuk lebar kolom otomatis */
function displayLength(value: ExcelCellValue, type: ExcelColumnType): number {
  if (value === null || value === undefined || value === '') return 0;
  switch (type) {
    case 'date':
      return 10;
    case 'datetime':
      return 16;
    case 'percent':
      return 7;
    case 'rupiah':
    case 'integer':
    case 'decimal':
    case 'kg': {
      const num = toNumber(value);
      if (num === null) return String(value).length;
      const decimals = type === 'kg' ? 3 : type === 'decimal' ? 2 : 0;
      const formatted = num.toLocaleString('id-ID', { maximumFractionDigits: decimals });
      return formatted.length + (type === 'rupiah' ? 3 : 0);
    }
    default:
      return String(value).length;
  }
}

function writeValue(cell: Cell, value: ExcelCellValue, type: ExcelColumnType) {
  if (value === null || value === undefined || value === '') {
    cell.value = null;
    return;
  }

  if (NUMERIC_TYPES.includes(type)) {
    const num = toNumber(value);
    if (num !== null) {
      cell.value = type === 'percent' ? num / 100 : num;
      cell.numFmt = NUM_FMT[type]!;
      return;
    }
  }

  if (type === 'date' || type === 'datetime') {
    const date = toExcelDate(value, type === 'datetime');
    if (date) {
      cell.value = date;
      cell.numFmt = NUM_FMT[type]!;
      return;
    }
  }

  if (type === 'text' && typeof value === 'number') {
    cell.value = value;
    return;
  }

  // Teks tetap teks agar Excel tidak mengubah No HP / No Bal menjadi angka
  cell.value = value instanceof Date ? value.toLocaleDateString('id-ID') : String(value);
}

function defaultAlign(type: ExcelColumnType): 'left' | 'center' | 'right' {
  if (NUMERIC_TYPES.includes(type)) return 'right';
  if (type === 'date' || type === 'datetime') return 'center';
  return 'left';
}

function sanitizeSheetName(name: string, used: Set<string>): string {
  const base = (name.replace(/[[\]:*?/\\]/g, ' ').trim() || 'Sheet').slice(0, 31);
  let candidate = base;
  let counter = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${counter++})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function columnLetter(index: number): string {
  let letter = '';
  let n = index;
  while (n > 0) {
    const mod = (n - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function buildSheet(workbook: Workbook, spec: ExcelSheet, sheetName: string, downloadedAt: string) {
  const colCount = Math.max(spec.columns.length, 1);
  const lastCol = columnLetter(colCount);
  const types = spec.columns.map((c) => c.type || 'text');

  const sheet: Worksheet = workbook.addWorksheet(sheetName, {
    properties: { defaultRowHeight: 18 },
  });

  // Kop laporan
  const addMergedLine = (text: string, font: Partial<Cell['font']>, height: number) => {
    const row = sheet.addRow([text]);
    sheet.mergeCells(`A${row.number}:${lastCol}${row.number}`);
    row.height = height;
    const cell = row.getCell(1);
    cell.font = { name: FONT_NAME, ...font };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    return row;
  };

  addMergedLine(APP_COMPANY, { size: 14, bold: true, color: { argb: COLOR.text } }, 22);
  addMergedLine(spec.title, { size: 12, bold: true, color: { argb: COLOR.brand } }, 20);
  [...(spec.info || []), `${APP_LOCATION} · Diunduh ${downloadedAt}`].forEach((line) => {
    addMergedLine(line, { size: 9, color: { argb: COLOR.muted } }, 15);
  });
  sheet.addRow([]);

  // Header tabel
  const headerRow = sheet.addRow(spec.columns.map((c) => c.header));
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR.text } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.headerFill } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      ...thinBorder(),
      bottom: { style: 'medium', color: { argb: COLOR.borderStrong } },
    };
  });

  // Isi tabel
  const widths = spec.columns.map((c) => {
    const longestWord = c.header.split(/\s+/).reduce((max, w) => Math.max(max, w.length), 0);
    return Math.max(longestWord, Math.min(c.header.length, 16));
  });

  const isEmpty = (v: ExcelCellValue) => v === null || v === undefined || v === '';

  const writeRow = (values: ExcelCellValue[], isTotal: boolean, zebra: boolean) => {
    const row = sheet.addRow([]);

    // Label total digabung dengan sel kosong di sebelah kanannya, mis. "TOTAL" melebar sampai kolom angka pertama
    let labelSpan = 1;
    if (isTotal && typeof values[0] === 'string') {
      while (labelSpan < spec.columns.length && isEmpty(values[labelSpan])) labelSpan++;
      if (labelSpan === spec.columns.length) labelSpan = 1;
    }

    spec.columns.forEach((col, i) => {
      const type = types[i];
      const value = values[i];
      const cell = row.getCell(i + 1);
      writeValue(cell, value, type);

      const isText = typeof cell.value === 'string';
      cell.font = { name: FONT_NAME, size: 10, bold: isTotal, color: { argb: COLOR.text } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.align || (isText && NUMERIC_TYPES.includes(type) ? 'center' : defaultAlign(type)),
        wrapText: type === 'text',
      };
      cell.border = isTotal
        ? { ...thinBorder(), top: { style: 'medium', color: { argb: COLOR.borderStrong } } }
        : thinBorder();
      if (isTotal) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.totalFill } };
      } else if (zebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.zebraFill } };
      }

      if (labelSpan === 1 || i > 0) widths[i] = Math.max(widths[i], displayLength(value, type));
    });

    if (labelSpan > 1) {
      sheet.mergeCells(`A${row.number}:${columnLetter(labelSpan)}${row.number}`);
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    }
  };

  spec.rows.forEach((values, idx) => writeRow(values, false, idx % 2 === 1));
  const lastDataRow = headerRow.number + spec.rows.length;

  if (spec.rows.length === 0) {
    const row = sheet.addRow(['Tidak ada data untuk filter yang dipilih.']);
    sheet.mergeCells(`A${row.number}:${lastCol}${row.number}`);
    const cell = row.getCell(1);
    cell.font = { name: FONT_NAME, size: 10, italic: true, color: { argb: COLOR.muted } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder();
  }

  if (spec.totalRow) writeRow(spec.totalRow, true, false);

  spec.columns.forEach((col, i) => {
    // Teks panjang (nama, keterangan) dibatasi lalu dibungkus ke baris berikutnya
    const maxWidth = types[i] === 'text' ? 45 : 30;
    sheet.getColumn(i + 1).width = col.width ?? Math.min(Math.max(widths[i] + 3, 8), maxWidth);
  });

  // Header tetap terlihat saat digulir + filter kolom
  sheet.views = [{ state: 'frozen', ySplit: headerRow.number, xSplit: 0 }];
  if (spec.rows.length > 0) {
    sheet.autoFilter = `A${headerRow.number}:${lastCol}${lastDataRow}`;
  }

  // Siap cetak A4
  const totalWidth = spec.columns.reduce((sum, _c, i) => sum + (sheet.getColumn(i + 1).width || 10), 0);
  const escapeHeaderFooter = (text: string) => text.replace(/&/g, '&&');
  sheet.pageSetup = {
    paperSize: 9,
    orientation: totalWidth > 110 ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    printTitlesRow: `${headerRow.number}:${headerRow.number}`,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
  };
  sheet.headerFooter = {
    oddFooter: `&L&8${escapeHeaderFooter(APP_COMPANY)} · ${escapeHeaderFooter(spec.title)}&R&8Halaman &P dari &N`,
  };
}

/** Menyusun workbook dari satu atau beberapa sheet laporan */
export async function buildExcelWorkbook(sheets: ExcelSheet[]): Promise<Workbook> {
  const mod: any = await import('exceljs');
  const ExcelJS = mod.default ?? mod;

  const now = new Date();
  const downloadedAt = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  const workbook: Workbook = new ExcelJS.Workbook();
  workbook.creator = APP_COMPANY;
  workbook.created = now;

  const usedNames = new Set<string>();
  sheets.forEach((spec) => buildSheet(workbook, spec, sanitizeSheetName(spec.name, usedNames), downloadedAt));
  return workbook;
}

/**
 * Membuat lalu mengunduh file .xlsx berisi satu atau beberapa sheet laporan.
 * Kegagalan ditampilkan ke pengguna sehingga pemanggil tidak perlu menangani error.
 */
export async function downloadExcelReport(filename: string, sheets: ExcelSheet[]): Promise<void> {
  try {
    const workbook = await buildExcelWorkbook(sheets);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const cleanName = filename.replace(/\.(csv|xlsx?)$/i, '');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Gagal membuat file Excel:', err);
    window.alert('File Excel gagal dibuat. Silakan coba lagi.');
  }
}

const STATUS_STOK_LABEL: Record<string, string> = {
  proses_sortir: 'Proses Sortir',
  di_gudang: 'Di Gudang',
  siap_kirim: 'Siap Kirim',
  terkirim_sample: 'Sample',
  keluar: 'Dikirim',
};

const STATUS_PENGIRIMAN_LABEL: Record<string, string> = {
  dimuat: 'Sedang Dimuat',
  dalam_perjalanan: 'Dalam Perjalanan',
  dikirim: 'Dikirim',
  diterima: 'Diterima Pabrik',
  selesai: 'Selesai',
};

const STATUS_SAMPLE_LABEL: Record<string, string> = {
  sample: 'Sample',
  dikirim: 'Dikirim',
  diterima: 'Diterima',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  nego: 'Nego Harga',
};

/** Kode status internal diubah menjadi teks yang mudah dibaca di laporan */
export const labelStatusStok = (status?: string) => STATUS_STOK_LABEL[status || ''] || status || '-';
export const labelStatusPengiriman = (status?: string) => STATUS_PENGIRIMAN_LABEL[status || ''] || status || '-';
export const labelStatusSample = (status?: string) => STATUS_SAMPLE_LABEL[status || ''] || status || '-';

/** Tanggal hari ini dalam format YYYY-MM-DD (waktu lokal) untuk nama file */
export function todayStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Mengubah 'YYYY-MM-DD' menjadi 'DD/MM/YYYY' untuk teks keterangan periode */
export function formatTanggalInfo(value?: string): string {
  const match = (value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

/** Teks periode untuk keterangan laporan, mis. "Periode: 01/09/2026 s.d. 17/09/2026" */
export function periodeInfo(start?: string, end?: string): string {
  const s = formatTanggalInfo(start);
  const e = formatTanggalInfo(end);
  if (s && e) return `Periode: ${s} s.d. ${e}`;
  if (s) return `Periode: mulai ${s}`;
  if (e) return `Periode: sampai ${e}`;
  return 'Periode: semua tanggal';
}

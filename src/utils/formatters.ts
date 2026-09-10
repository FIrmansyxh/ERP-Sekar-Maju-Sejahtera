// Utility functions for ERP Gudang Tembakau

export function formatRupiah(amount?: number | null): string {
  if (amount === undefined || amount === null) return 'Rp 0';
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

export function formatAccounting(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0,-';
  return `${Math.round(amount).toLocaleString('id-ID')},-`;
}

export function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${day} ${months[monthIndex]} ${year}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Format date strictly as hari-bulan-tahun (DD-MM-YYYY), e.g. "14-08-2026"
export function formatDateHariBulanTahun(dateStr?: string | null): string {
  if (!dateStr) return '-';
  // Strip time part whether separated by 'T' or space
  const clean = (dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0]).trim();
  
  // Format: YYYY-MM-DD
  const ymd = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }

  // Format: DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {
    // fallback
  }

  return clean;
}

/**
 * Periksa apakah Kode / No Bal berawalan 'SB' (case-insensitive, trimmed)
 */
export function isBalKodeSB(noBal?: string | null): boolean {
  if (!noBal) return false;
  return noBal.trim().toUpperCase().startsWith('SB');
}

/**
 * Aturan Potongan Tara Berat Bersih / Netto:
 * 1. Kode/No Bal berawalan SB potongan 2kg rata untuk semua berat
 * 2. Selain SB:
 *    - BERAT 49kg kebawah potongan 3 kg
 *    - BERAT 50-59 potongan 5 kg
 *    - BERAT 60-seterusnya potongan 6 kg
 */
export function hitungPotonganTaraKg(
  beratBrutoKg: number,
  isGantiTikarOrNoBal?: boolean | string | null,
  noBal?: string | null
): number {
  let resolvedNoBal: string | undefined | null = noBal;
  if (typeof isGantiTikarOrNoBal === 'string' && !noBal) {
    resolvedNoBal = isGantiTikarOrNoBal;
  }

  // 1. Kode/No Bal berawalan SB: potongan 2kg rata untuk semua
  if (isBalKodeSB(resolvedNoBal)) {
    return 2;
  }

  // 2. Selain SB:
  // - BERAT 49kg kebawah potongan 3
  // - BERAT 50-59 potongan 5
  // - BERAT 60-seterusnya potongan 6
  const bruto = Number(beratBrutoKg) || 0;
  if (bruto >= 60) {
    return 6;
  } else if (bruto >= 50) {
    return 5;
  } else {
    return 3;
  }
}

/**
 * Memberikan label acuan potongan tara bal
 */
export function getKeteranganPotonganTara(beratBrutoKg: number, noBal?: string | null): string {
  if (isBalKodeSB(noBal)) {
    return 'Kode SB: Potongan 2 kg (Rata)';
  }
  const bruto = Number(beratBrutoKg) || 0;
  if (bruto >= 60) {
    return 'Berat ≥ 60 kg: Potongan 6 kg';
  } else if (bruto >= 50) {
    return 'Berat 50-59 kg: Potongan 5 kg';
  } else {
    return 'Berat ≤ 49 kg: Potongan 3 kg';
  }
}


export function formatDateTimeIndo(isoString?: string | null): string {
  if (!isoString) return 'Belum Pernah';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Belum Pernah';
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Belum Pernah';
  }
}

export function formatNumber(num?: number | null, decimals?: number): string {
  if (num === undefined || num === null) return '0';
  if (decimals !== undefined) {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  }
  return new Intl.NumberFormat('id-ID').format(num);
}

export function generatePetaniId(existingList: { petani_id?: string }[], targetYear?: number): string {
  const currentYear = targetYear || new Date().getFullYear();
  const prefix = `PTN-${currentYear}-`;
  
  // Find all existing sequence numbers for this year
  const seqs = existingList
    .map(p => (p.petani_id || '').trim().toUpperCase())
    .filter(id => id.startsWith(prefix))
    .map(id => {
      const numPart = id.replace(prefix, '');
      const parsed = parseInt(numPart, 10);
      return isNaN(parsed) ? 0 : parsed;
    });

  const nextSeq = seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
  const pad = String(nextSeq).padStart(3, '0');
  let id = `${prefix}${pad}`;
  
  let attempt = 1;
  while (existingList.some(p => (p.petani_id || '').toUpperCase() === id.toUpperCase())) {
    id = `${prefix}${String(nextSeq + attempt).padStart(3, '0')}`;
    attempt++;
  }
  return id;
}

export function validateGradeCode(code: string): { isValid: boolean; message?: string } {
  if (!code || code.trim().length === 0) {
    return { isValid: false, message: 'Kode grade wajib diisi.' };
  }
  const trimmed = code.trim();
  if (trimmed.length > 3) {
    return { isValid: false, message: 'Kode grade maksimal 3 karakter (contoh: A, A1, A+, AB).' };
  }
  const firstChar = trimmed.charAt(0);
  if (!/^[A-Za-z]/.test(firstChar)) {
    return { isValid: false, message: 'Karakter pertama harus berupa huruf alfabet (A-Z).' };
  }
  return { isValid: true };
}

// Format Date as DDMMYY (e.g. 140826 for 14 Agustus 2026)
export function formatDateDDMMYY(inputDate?: Date | string | null): string {
  let d: Date;
  if (!inputDate) {
    d = new Date();
  } else if (typeof inputDate === 'string') {
    d = new Date(inputDate);
    if (isNaN(d.getTime())) {
      // try parsing YYYY-MM-DD or DD/MM/YYYY
      if (inputDate.includes('/')) {
        const parts = inputDate.split('/');
        if (parts.length === 3) {
          const dd = parts[0].padStart(2, '0');
          const mm = parts[1].padStart(2, '0');
          const yy = parts[2].slice(-2);
          return `${dd}${mm}${yy}`;
        }
      }
      d = new Date();
    }
  } else {
    d = inputDate;
  }

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

// Generate Standard Tobacco Bal ID: [Grade]-[DDMMYY]-[Urutan 001-999]
// Example: A-140826-001, E-140826-034
export function generateBalId(grade: string, date?: Date | string | null, sequenceNumber: number = 1): string {
  const cleanGrade = (grade || 'A').toUpperCase().trim();
  const dateCode = formatDateDDMMYY(date);
  const seqCode = String(sequenceNumber).padStart(3, '0');
  return `${cleanGrade}-${dateCode}-${seqCode}`;
}

// Generate Simple No Bal (e.g. E0034 or A0001)
export function generateNoBalSimple(grade: string, sequenceNumber: number = 1): string {
  const cleanGrade = (grade || 'A').toUpperCase().trim();
  return `${cleanGrade}${String(sequenceNumber).padStart(4, '0')}`;
}

// Generate Next Unique No Bal checking against existing warehouse inventory & current form batch
export function generateNextUniqueNoBal(
  grade: string,
  existingList: { no_bal?: string; barang_id?: string; barcode?: string }[] = [],
  currentBatch: { noBal: string }[] = []
): string {
  const cleanGrade = (grade || '50').toUpperCase().trim();
  let maxSeq = 0;
  const regex = new RegExp(`^${cleanGrade}(\\d+)$`, 'i');

  existingList.forEach((item) => {
    const match = (item.no_bal || '').match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  });

  currentBatch.forEach((item) => {
    const match = (item.noBal || '').match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  });

  let nextSeq = maxSeq > 0 ? maxSeq + 1 : 1;
  let candidate = `${cleanGrade}${String(nextSeq).padStart(4, '0')}`;

  const isTaken = (val: string) => {
    const v = val.toLowerCase().trim();
    return (
      existingList.some((e) => (e.no_bal || '').toLowerCase().trim() === v || (e.barang_id || '').toLowerCase().trim() === v) ||
      currentBatch.some((c) => (c.noBal || '').toLowerCase().trim() === v)
    );
  };

  while (isTaken(candidate)) {
    nextSeq++;
    candidate = `${cleanGrade}${String(nextSeq).padStart(4, '0')}`;
  }

  return candidate;
}

// Generate Delivery Order / No. Surat Jalan (Urutan sederhana: 1 hingga 9999)
export function generateNoSuratJalanSimple(sequenceNumber: number = 1, _date?: Date | string | null): string {
  const num = Math.max(1, Math.min(9999, Math.floor(sequenceNumber)));
  return String(num);
}

// Generate Sample ID (Urutan sederhana: 1 hingga 9999)
export function generateSampleId(_grade?: string, _date?: Date | string | null, sequenceNumber: number = 1): string {
  const num = Math.max(1, Math.min(9999, Math.floor(sequenceNumber)));
  return String(num);
}

// Generate Batch Sample ID (Urutan sederhana: 1 hingga 9999)
export function generateBatchSampleId(sequenceNumber: number = 1, _date?: Date | string | null): string {
  const num = Math.max(1, Math.min(9999, Math.floor(sequenceNumber)));
  const paddedNum = String(num).padStart(4, '0');
  return `SPL${paddedNum}`;
}

export function generateSuggestedCardNumber(regionCode: string = 'WRA', sequenceNumber: number = 1): string {
  const paddedNum = String(Math.max(1, Math.floor(sequenceNumber))).padStart(4, '0');
  return `KRT-${regionCode.toUpperCase()}-${paddedNum}`;
}

// Simple pseudo QR Matrix renderer for printable ID card
export function generateSimpleQrMatrix(data: string): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array(size).fill(false).map(() => Array(size).fill(false));

  // Finder patterns at (0,0), (0, 14), (14, 0)
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[startY + r][startX + c] = true;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);

  // Fill in timing patterns
  for (let i = 8; i < 13; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Generate data based on hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Don't overwrite finders
      const inFinder1 = r < 8 && c < 8;
      const inFinder2 = r < 8 && c >= 13;
      const inFinder3 = r >= 13 && c < 8;
      if (!inFinder1 && !inFinder2 && !inFinder3 && r !== 6 && c !== 6) {
        matrix[r][c] = ((posHash ^ (r * 17 + c * 31)) % 3) === 0;
      }
    }
  }
  return matrix;
}

/**
 * Convert number into formal Indonesian Terbilang words
 * e.g. 14500000 -> "Empat Belas Juta Lima Ratus Ribu Rupiah"
 */
export function angkaTerbilang(nilai?: number | null): string {
  if (nilai === undefined || nilai === null || isNaN(nilai)) return 'Nol Rupiah';
  const n = Math.abs(Math.round(nilai));
  if (n === 0) return 'Nol Rupiah';

  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  function terbilangHelper(num: number): string {
    if (num < 12) {
      return satuan[num];
    } else if (num < 20) {
      return terbilangHelper(num - 10) + ' Belas';
    } else if (num < 100) {
      return terbilangHelper(Math.floor(num / 10)) + ' Puluh ' + terbilangHelper(num % 10);
    } else if (num < 200) {
      return 'Seratus ' + terbilangHelper(num - 100);
    } else if (num < 1000) {
      return terbilangHelper(Math.floor(num / 100)) + ' Ratus ' + terbilangHelper(num % 100);
    } else if (num < 2000) {
      return 'Seribu ' + terbilangHelper(num - 1000);
    } else if (num < 1000000) {
      return terbilangHelper(Math.floor(num / 1000)) + ' Ribu ' + terbilangHelper(num % 1000);
    } else if (num < 1000000000) {
      return terbilangHelper(Math.floor(num / 1000000)) + ' Juta ' + terbilangHelper(num % 1000000);
    } else if (num < 1000000000000) {
      return terbilangHelper(Math.floor(num / 1000000000)) + ' Miliar ' + terbilangHelper(num % 1000000000);
    } else {
      return terbilangHelper(Math.floor(num / 1000000000000)) + ' Triliun ' + terbilangHelper(num % 1000000000000);
    }
  }

  const hasil = terbilangHelper(n).replace(/\s+/g, ' ').trim();
  return `${hasil} Rupiah`;
}

export const terbilangRupiah = angkaTerbilang;

export function formatNoKupon(kupon: string): string {
  if (!kupon) return kupon;
  return kupon.replace(/-/g, '').toUpperCase();
}

/**
 * Formats a date into DDMMYYYY compact format (e.g. "08092026")
 */
export function formatDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = String(now.getFullYear());
    return `${d}${m}${y}`;
  }
  const clean = (dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0]).trim();
  const ymd = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${d.padStart(2, '0')}${m.padStart(2, '0')}${y}`;
  }
  const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${d.padStart(2, '0')}${m.padStart(2, '0')}${y}`;
  }
  try {
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) {
      const d = String(dt.getDate()).padStart(2, '0');
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const y = String(dt.getFullYear());
      return `${d}${m}${y}`;
    }
  } catch {
    // fallback
  }
  return dateStr.replace(/\D/g, '');
}

/**
 * Generates standardized Transaksi ID: TRX-Tanggal-Urutan
 * Example: TRX-08092026-001
 */
export function generateTransaksiId(
  dateStr?: string | null,
  existingTransactions?: { transaksi_id?: string }[]
): string {
  const dateCode = formatDDMMYYYY(dateStr);
  const prefix = `TRX-${dateCode}-`;

  if (!existingTransactions || existingTransactions.length === 0) {
    return `${prefix}001`;
  }

  let maxSeq = 0;
  for (const item of existingTransactions) {
    if (item.transaksi_id && item.transaksi_id.startsWith(prefix)) {
      const seqStr = item.transaksi_id.replace(prefix, '');
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

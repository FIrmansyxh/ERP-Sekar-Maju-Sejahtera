import { KodeAturanTara, DAFTAR_ATURAN_TARA } from '../config/aturanTimbang';

// Utility functions for ERP Gudang Tembakau
export function formatRupiah(amount?: number | null): string {
  if (amount === undefined || amount === null) return 'Rp 0';
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

export function formatAccounting(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0,-';
  return `${Math.round(amount).toLocaleString('id-ID')},-`;
}

export function formatDateHariBulanTahun(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = String(parseInt(parts[1], 10)).padStart(2, '0');
      const day = String(parseInt(parts[2], 10)).padStart(2, '0');
      return `${day}-${month}-${year}`;
    }
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

export function formatDateIndo(dateStr?: string | null): string {
  return formatDateHariBulanTahun(dateStr);
}

export function formatDateTimeIndo(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
    const timeStr = dateStr.includes('T') ? dateStr.split('T')[1]?.split('.')[0] : dateStr.split(' ')[1];
    
    const parts = cleanStr.split('-');
    let datePart = '';
    if (parts.length === 3) {
      const year = parts[0];
      const month = String(parseInt(parts[1], 10)).padStart(2, '0');
      const day = String(parseInt(parts[2], 10)).padStart(2, '0');
      datePart = `${day}-${month}-${year}`;
    } else {
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      datePart = `${day}-${month}-${year}`;
    }
    
    if (timeStr) {
      return `${datePart} ${timeStr.substring(0, 5)}`;
    }
    return datePart;
  } catch {
    return dateStr;
  }
}

// Example: A-140826-001, E-140826-034
export function generateBalId(grade: string, date?: Date | string | null, sequenceNumber: number = 1): string {
  const cleanGrade = (grade || 'A').toUpperCase().trim();
  const dateCode = formatDDMMYYYY(date);
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

/**
 * Ekstrak kode bal (huruf di bagian depan, misal: "SB-01" -> "SB", "HF-02" -> "HF", "GT-15" -> "GT", "ST01" -> "ST").
 * Huruf di depan adalah murni kode bal tanpa diartikan.
 */
export function extractKodeBalPrefix(noBal?: string): string {
  if (!noBal) return '';
  const trimmed = noBal.trim();
  const match = trimmed.match(/^([A-Za-z]+)/);
  return match ? match[1].toUpperCase() : '';
}

/**
 * Ekstrak nomor / ID bal (angka di bagian belakang agar tidak kembar, misal: "SB-01" -> "01", "HF-12" -> "12").
 */
export function extractNomorBalId(noBal?: string): string {
  if (!noBal) return '';
  const trimmed = noBal.trim();
  const match = trimmed.match(/(\d+)$/);
  return match ? match[1] : trimmed;
}
// Ketentuan tara ini juga tertulis di balik Kartu Petani (PetaniCardPrintModal); ubah keduanya bersamaan.
<<<<<<< HEAD
export function hitungPotonganTaraKg(beratBruto: number, gantiTikar?: boolean, noBal?: string): number {
  const prefix = extractKodeBalPrefix(noBal);

  // Aturan 1: Kode bal SB = 2kg rata
  if (prefix === 'SB' || (noBal && noBal.toUpperCase().startsWith('SB'))) {
=======

/**
 * Deteksi kategori kode aturan tara dari nomor bal atau kode grade:
 * - 'SB': Kode bal atau grade berawalan SB
 * - 'TS': Kode bal atau grade berawalan TS
 * - 'HF': Kode bal atau grade berawalan HF
 * - 'T' : Kode bal atau grade berawalan T (setelah dicek bukan TS)
 * - 'DEFAULT': Kode lainnya atau tanpa awalan huruf khusus
 */
export function deteksiKodeAturanTara(noBal?: string, kodeGrade?: string): KodeAturanTara {
  const candidates = [noBal, kodeGrade].filter(Boolean) as string[];

  for (const c of candidates) {
    const prefix = extractKodeBalPrefix(c);
    const upper = c.trim().toUpperCase();

    if (prefix === 'SB' || upper.startsWith('SB')) return 'SB';
    if (prefix === 'TS' || upper.startsWith('TS')) return 'TS';
    if (prefix === 'HF' || upper.startsWith('HF')) return 'HF';
    if (prefix === 'T' || upper === 'T' || /^T[\s\-_0-9]/.test(upper)) return 'T';
  }

  return 'DEFAULT';
}

/**
 * Hitung potongan tara (bruto ke netto) dalam satuan kg:
 * - SB 2KG RATA (semua bobot)
 * - HF: 49 kg ke bawah = 3 kg, 50 ke atas = 5 kg, 60 ke atas = 6 kg
 * - TS: 30-49 kg = 4 kg, 50-60 kg = 5 kg, 60 kg ke atas = 6 kg
 * - T : SAMA DENGAN TS (<50 kg = 4 kg, 50-59.9 kg = 5 kg, >=60 kg = 6 kg)
 * - Default: Mengikuti aturan umum (sama dengan HF)
 */
export function hitungPotonganTaraKg(
  beratBruto: number,
  gantiTikar?: boolean,
  noBal?: string,
  kodeGrade?: string
): number {
  const kategori = deteksiKodeAturanTara(noBal, kodeGrade);

  // Kode bal SB = 2 kg rata (berlaku bahkan jika bobot awal 0 saat registrasi bal)
  if (kategori === 'SB') {
>>>>>>> 4d7cbdcf1401709293a0717fd9b4a93992d2dca4
    return 2.0;
  }

  // Fallback jika belum ditimbang / bruto <= 0
  if (beratBruto <= 0) return 0;

<<<<<<< HEAD
  // Aturan 2: Kode bal TS dan T (T sama dengan TS)
  // TS 30-49 = 4kg (<50kg), 50-60 = 5kg (>=50 & <60), 60 ke atas = 6kg
  if (prefix === 'TS' || prefix === 'T' || (noBal && (noBal.toUpperCase().startsWith('TS') || noBal.toUpperCase().startsWith('T')))) {
=======
  // Kode bal TS dan T: 30-49 kg (atau <50 kg) = 4 kg, 50-59.9 kg = 5 kg, >=60 kg = 6 kg
  if (kategori === 'TS' || kategori === 'T') {
>>>>>>> 4d7cbdcf1401709293a0717fd9b4a93992d2dca4
    if (beratBruto >= 60) {
      return 6.0;
    } else if (beratBruto >= 50) {
      return 5.0;
    } else {
<<<<<<< HEAD
=======
      // 49 kg ke bawah (30-49 kg)
>>>>>>> 4d7cbdcf1401709293a0717fd9b4a93992d2dca4
      return 4.0;
    }
  }

<<<<<<< HEAD
  // Aturan 3: Kode bal HF dan Umum/Lainnya
  // 49kg ke bawah = 3kg, 50 ke atas = 5kg, 60 ke atas = 6kg
=======
  // Kode bal HF dan kode lainnya (default): <= 49 kg = 3 kg, 50-59.9 kg = 5 kg, >= 60 kg = 6 kg
>>>>>>> 4d7cbdcf1401709293a0717fd9b4a93992d2dca4
  if (beratBruto >= 60) {
    return 6.0;
  } else if (beratBruto >= 50) {
    return 5.0;
  } else {
    // 49 kg ke bawah
    return 3.0;
  }
}

/**
 * Informasi ringkas aturan tara yang berlaku untuk bal tertentu (untuk tampilan UI).
 */
export function getInfoAturanTara(
  noBal?: string,
  kodeGrade?: string,
  beratBruto?: number
): {
  kode: KodeAturanTara;
  label: string;
  potonganKg: number;
  keterangan: string;
} {
  const kategori = deteksiKodeAturanTara(noBal, kodeGrade);
  const tara = hitungPotonganTaraKg(beratBruto || 0, false, noBal, kodeGrade);

  let keterangan = DAFTAR_ATURAN_TARA[kategori].deskripsi;
  if ((beratBruto || 0) > 0) {
    if (kategori === 'SB') {
      keterangan = 'Tarif rata 2.0 kg';
    } else if (kategori === 'TS' || kategori === 'T') {
      if ((beratBruto || 0) >= 60) keterangan = 'Bobot ≥60 kg → Potongan 6.0 kg';
      else if ((beratBruto || 0) >= 50) keterangan = 'Bobot 50–59.9 kg → Potongan 5.0 kg';
      else keterangan = 'Bobot <50 kg (30–49 kg) → Potongan 4.0 kg';
    } else {
      if ((beratBruto || 0) >= 60) keterangan = 'Bobot ≥60 kg → Potongan 6.0 kg';
      else if ((beratBruto || 0) >= 50) keterangan = 'Bobot 50–59.9 kg → Potongan 5.0 kg';
      else keterangan = 'Bobot ≤49 kg → Potongan 3.0 kg';
    }
  }

  return {
    kode: kategori,
    label: DAFTAR_ATURAN_TARA[kategori].label,
    potonganKg: tara,
    keterangan,
  };
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
export function formatDDMMYYYY(dateStr?: string | Date | null): string {
  if (!dateStr) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = String(now.getFullYear());
    return `${d}${m}${y}`;
  }

  let clean = '';
  if (dateStr instanceof Date) {
    const d = String(dateStr.getDate()).padStart(2, '0');
    const m = String(dateStr.getMonth() + 1).padStart(2, '0');
    const y = String(dateStr.getFullYear());
    return `${d}${m}${y}`;
  } else {
    clean = (dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0]).trim();
  }

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

  return String(dateStr).replace(/\D/g, '');
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

/**
 * Memformat angka dengan pemisah ribuan gaya Indonesia, mis. 1000.5 -> "1.000,5".
 *
 * Desimal yang benar-benar ada tetap ditampilkan sampai tiga angka di belakang
 * koma, sehingga berat timbangan tidak pernah terlihat dibulatkan.
 */
export function formatNumber(val?: number | null, decimals: number = 0): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: Math.max(decimals, 3),
  });
}

/**
 * Membersihkan galat pembulatan floating point tanpa mengubah nilai berat.
 *
 * Contoh: 15.75 - 3 menghasilkan 12.749999999999998 di JavaScript; fungsi ini
 * mengembalikannya menjadi 12.75. Presisi tiga angka di belakang koma dipilih
 * karena timbangan gudang mencatat sampai satuan gram, jadi tidak ada angka
 * berat sah yang hilang. Fungsi ini BUKAN pembulatan berat: nilai seperti
 * 12.756 tetap tersimpan apa adanya.
 */
export function normalizeKg(val?: number | null): number {
  if (val === undefined || val === null || isNaN(val)) return 0;
  return Math.round(val * 1000) / 1000;
}

export function generatePetaniId(existingList: any[] = []): string {
  let maxSeq = 0;
  const currentYear = new Date().getFullYear();
  for (const item of existingList) {
    if (item.petani_id && item.petani_id.startsWith('PTN-')) {
      const parts = item.petani_id.split('-');
      const lastPart = parts[parts.length - 1];
      const parsed = parseInt(lastPart, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }
  return `PTN-${currentYear}-${String(maxSeq + 1).padStart(3, '0')}`;
}

export function formatDateDDMMYY(dateStr?: string | Date | null): string {
  const full = formatDDMMYYYY(dateStr);
  if (full.length === 8) {
    return full.substring(0, 4) + full.substring(6, 8);
  }
  return full;
}

export function validateGradeCode(code: string): string {
  return (code || '').trim().toUpperCase();
}

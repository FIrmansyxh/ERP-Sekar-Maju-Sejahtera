import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import {
  FileText,
  Search,
  RotateCcw,
  Filter,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  ArrowUp,
  ArrowDown,
  Scale,
  X
} from 'lucide-react';

import { TransaksiPembelian, Petani } from '../../types';
import { downloadExcelReport, periodeInfo, todayStamp, ExcelCellValue, ExcelRowKind } from '../../utils/excelExport';
import { isTransaksiLunas, labelStatusBayar } from '../../utils/statusBayar';
import { SortIcon } from '../common/SortIcon';
import { formatDateHariBulanTahun, extractKodeBalPrefix } from '../../utils/formatters';
import { hitungJumlahBayarBal, hitungNilaiBal, hitungModalTransaksi } from '../../utils/finance';
import { POTONGAN_GANTI_TIKAR, POTONGAN_KULI_PER_BAL, POTONGAN_TALI_PER_BAL } from '../../config/aturanTimbang';
import { useLaporanTampilan } from '../../hooks/useLaporanTampilan';
import { LaporanTampilanToggle } from './LaporanTampilanToggle';
import { LaporanPembelianRekap, nilaiKotor, RekapJasa, totalJasa } from './LaporanPembelianRekap';
import { LaporanPembelianRekapHarga } from './LaporanPembelianRekapHarga';
import { rekapHargaPerKode } from '../../utils/rekapKodeBal';
import { PresetTanggal } from './PresetTanggal';

export type SortField = 'default' | 'tanggal' | 'kupon' | 'petani' | 'no_bal' | 'bruto' | 'netto' | 'potongan_tali' | 'potongan_kuli' | 'potongan_tikar' | 'total_harga' | 'jumlah_bayar';

interface LaporanPembelianBarangViewProps {
  transaksiList: TransaksiPembelian[];
  petaniList: Petani[];
  userRole?: string;
  onNavigateToTransaksi?: () => void;
}

interface SortableHeaderProps {
  title: string;
  widthClass?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  sortField?: SortField;
  sortConfigs?: { field: SortField; direction: 'asc' | 'desc' }[];
  onSort?: (field: SortField) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ 
  title, 
  widthClass = '',
  align = 'left',
  className = '',
  sortField,
  sortConfigs = [],
  onSort
}) => {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  const baseClass = `py-2 px-2 border-r border-gray-200 select-none ${widthClass} ${onSort && sortField ? 'cursor-pointer hover:bg-gray-200/80 transition' : ''}`;
  
  const configIndex = sortField ? sortConfigs.findIndex(c => c.field === sortField) : -1;
  const sortConfig = configIndex >= 0 ? sortConfigs[configIndex] : null;

  return (
    <th 
      className={`${baseClass} ${alignClass} ${className}`}
      onClick={() => {
        if (onSort && sortField) {
          onSort(sortField);
        }
      }}
      title={onSort && sortField ? `Klik untuk mengurutkan berdasarkan ${title}` : ''}
    >
      <div className={`flex items-center ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'} space-x-1`}>
        <span>{title}</span>
        {onSort && sortField && (
          <SortIcon
            aktif={Boolean(sortConfig)}
            arah={sortConfig?.direction ?? 'asc'}
            urutan={sortConfig && sortConfigs.length > 1 ? configIndex + 1 : undefined}
          />
        )}
      </div>
    </th>
  );
};

interface RincianBal {
  key: string;
  noBal: string;
  hargaBeli: number;
  bruto: number;
  netto: number;
  tali: number;
  kuli: number;
  tikar: number;
  nilaiBeli: number;
  jumlahBayar: number;
}

interface RingkasanKupon {
  rincian: RincianBal[];
  jumlahBal: number;
  bruto: number;
  netto: number;
  tali: number;
  kuli: number;
  tikar: number;
  nilaiBeli: number;
  jumlahBayar: number;
}

/**
 * Rincian setiap bal dan subtotal satu kupon.
 * Per bal: Nilai Beli = Harga Beli × Netto;
 * Jumlah Bayar = Nilai Beli − Kuli − Tali − Tikar (tikar hanya bila ganti tikar); bal yang belum ditimbang
 * belum dibayar (0), sama dengan Jumlah Bayar di Kasir dan Nota.
 * Subtotal kupon adalah penjumlahan baris bal, sehingga tabel selalu cocok bila dihitung manual.
 */
function ringkasKupon(row: TransaksiPembelian): RingkasanKupon {
  const items = row.items || [];
  const rincian: RincianBal[] = items.length > 0
    ? items.map((it, i) => {
        const netto = Number(it.berat_kg || 0);
        const hargaBeli = Number(it.harga_per_kg || 0);
        const nilaiBeli = hitungNilaiBal({ berat_kg: netto, harga_per_kg: hargaBeli });
        const kuli = Number(it.potongan_kuli ?? POTONGAN_KULI_PER_BAL);
        const tali = Number(it.potongan_tali ?? POTONGAN_TALI_PER_BAL);
        const gantiTikar = Boolean(it.ganti_tikar) || Number(it.potongan_tikar || 0) > 0;
        const tikar = gantiTikar ? Number(it.potongan_tikar || 0) || POTONGAN_GANTI_TIKAR : 0;
        return {
          key: it.item_id || `${row.transaksi_id}-${i}`,
          noBal: it.no_bal || it.barcode || it.sample_label_code || '-',
          hargaBeli,
          bruto: Number(it.berat_bruto_kg || 0) || (netto > 0 ? netto + Number(it.potongan_tara_kg || 0) : 0),
          netto,
          tali,
          kuli,
          tikar,
          nilaiBeli,
          jumlahBayar: hitungJumlahBayarBal(nilaiBeli, netto, kuli + tali + tikar),
        };
      })
    : (() => {
        // Data lama tanpa rincian bal: satu baris dari nilai transaksi
        const nilaiBeli = hitungModalTransaksi(row);
        const kuli = Number(row.potongan_kuli || 0);
        const tali = Number(row.potongan_tali || 0);
        const tikar = Number(row.potongan_tikar || 0);
        return [{
          key: row.transaksi_id,
          noBal: row.no_bal || '-',
          hargaBeli: Number(row.harga_per_kg || 0),
          bruto: row.jenis_timbang === 'bruto'
            ? Number(row.berat_terukur_kg || 0)
            : (row.berat_kg ? Number(row.berat_kg) + Number(row.potongan_tara_kg || 0) : 0),
          netto: Number(row.berat_kg || 0),
          tali,
          kuli,
          tikar,
          nilaiBeli,
          jumlahBayar: hitungJumlahBayarBal(nilaiBeli, Number(row.berat_kg || 0), kuli + tali + tikar),
        }];
      })();

  const jumlah = (pilih: (b: RincianBal) => number) => rincian.reduce((s, b) => s + pilih(b), 0);
  return {
    rincian,
    jumlahBal: items.length > 0 ? items.length : (row.total_bal || 1),
    bruto: jumlah((b) => b.bruto),
    netto: jumlah((b) => b.netto),
    tali: jumlah((b) => b.tali),
    kuli: jumlah((b) => b.kuli),
    tikar: jumlah((b) => b.tikar),
    nilaiBeli: jumlah((b) => b.nilaiBeli),
    jumlahBayar: jumlah((b) => b.jumlahBayar),
  };
}

/** Berat tampil apa adanya sampai 3 desimal, kosong ditandai "-" */
const formatKg = (n: number) =>
  n > 0 ? n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 3 }) : '-';

/** Rupiah tanpa simbol untuk isi tabel, nol ditandai "-" */
const formatRp = (n: number) => (n ? Math.round(n).toLocaleString('id-ID') : '-');

export const LaporanPembelianBarangView: React.FC<LaporanPembelianBarangViewProps> = ({
  transaksiList = [],
  petaniList = [],
  userRole,
  onNavigateToTransaksi,
}) => {
  // Clear any legacy resized column widths from session
  useEffect(() => {
    try {
      sessionStorage.removeItem('pembelianColWidths');
    } catch {
      // ignore
    }
  }, []);

  // Filter States 
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterKupon, setFilterKupon] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterKodeBal, setFilterKodeBal] = useState('');
  const [filterNoBall, setFilterNoBall] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');

  // Multi-column Sort State (max 3 columns)
  type SortConfig = { field: SortField; direction: 'asc' | 'desc' };
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);

  // Applied Filter State (updates on "Cari Data" or reset)
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: '',
    endDate: '',
    kupon: '',
    grade: '',
    kodeBal: '',
    noBall: '',
    supplier: '',
  });

  // Panel Filter dan Ringkasan bisa disembunyikan (pilihan diingat) agar tabel lebih luas
  const tampilan = useLaporanTampilan('pembelian');
  const jumlahFilterAktif = Object.values(appliedFilters).filter((v) => v !== '').length;

  // Table Real-Time Quick Search
  const [tableSearch, setTableSearch] = useState('');

  // Scroll Position State for Scroll-To-Top and Scroll-To-Bottom buttons
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const docHeight = document.documentElement.scrollHeight;

      // Sembunyikan ketika di paling atas (<= 100px) ATAU ketika sudah di paling bawah (>= docHeight - 80px)
      // Muncul kembali ketika di-scroll ke atas dari bawah atau di-scroll ke bawah dari atas
      const isAtTop = scrollY <= 100;
      const isAtBottom = scrollY + windowHeight >= docHeight - 80;

      setShowScrollButtons(!isAtTop && !isAtBottom);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

// Unique list of Kupons & Suppliers for dropdowns
  /**
   * Mengambil seluruh Grade unik dari transaksi kupon pembelian tanpa duplikasi.
   * Misal jika dalam 1 kupon ada bal Grade A, B, C, D maka menghasilkan ['A', 'B', 'C', 'D'].
   */
  const getTransactionUniqueGrades = (row: TransaksiPembelian): string[] => {
    const grades = new Set<string>();
    if (row.items && Array.isArray(row.items) && row.items.length > 0) {
      row.items.forEach((it) => {
        if (it.kode_grade && it.kode_grade.trim()) {
          grades.add(it.kode_grade.trim().toUpperCase());
        }
      });
    }
    if (grades.size === 0 && row.kode_grade) {
      row.kode_grade
        .split(/[,/]/)
        .map((g) => g.trim().toUpperCase())
        .filter(Boolean)
        .forEach((g) => grades.add(g));
    }
    return Array.from(grades).sort();
  };

  const uniqueKupons = useMemo(() => {
    const kupons = new Set<string>();
    transaksiList.forEach(t => {
      if (t.no_kupon) kupons.add(t.no_kupon);
    });
    return Array.from(kupons).sort();
  }, [transaksiList]);

  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    transaksiList.forEach(t => {
      getTransactionUniqueGrades(t).forEach(g => grades.add(g));
    });
    return Array.from(grades).sort();
  }, [transaksiList]);


  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, string>();
    transaksiList.forEach(t => {
      if (t.petani_id && t.nama_petani) {
        map.set(t.petani_id, t.nama_petani);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [transaksiList]);

  // Unique list of Kode Bal (huruf prefix depan bal, misal: SB, TS, HF, T, GT, dll)
  const uniqueKodeBal = useMemo(() => {
    const codes = new Set<string>();
    const add = (noBal?: string) => {
      const prefix = extractKodeBalPrefix(noBal);
      if (prefix) codes.add(prefix);
    };
    transaksiList.forEach((t) => {
      if (t.no_bal) add(t.no_bal);
      (t.items || []).forEach((it) => {
        add(it.no_bal);
        if ((it as any).kode_bal_prefix) codes.add(String((it as any).kode_bal_prefix).toUpperCase());
      });
    });
    return Array.from(codes).sort();
  }, [transaksiList]);

  // Execute Filter Search
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({
      startDate: filterStartDate,
      endDate: filterEndDate,
      kupon: filterKupon,
      grade: filterGrade,
      kodeBal: filterKodeBal.trim(),
      noBall: filterNoBall.trim(),
      supplier: filterSupplier,
    });
  };

  // Reset Filters
  const handleReset = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterKupon('');
    setFilterGrade('');
    setFilterKodeBal('');
    setFilterNoBall('');
    setFilterSupplier('');
    setAppliedFilters({
      startDate: '',
      endDate: '',
      kupon: '',
      grade: '',
      kodeBal: '',
      noBall: '',
      supplier: '',
    });
  };

  const handleSort = (field: SortField) => {
    if (field === 'default') {
      setSortConfigs([]);
      return;
    }

    setSortConfigs(prev => {
      const existingIndex = prev.findIndex(c => c.field === field);
      
      // No Bal paling wajar dibaca dari nomor kecil ke besar, jadi klik pertamanya naik (asc)
      const arahAwal = field === 'no_bal' ? 'asc' : 'desc';
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        if (existing.direction === arahAwal) {
          // Balik arah (klik kedua)
          const newConfigs = [...prev];
          newConfigs[existingIndex] = { ...existing, direction: arahAwal === 'asc' ? 'desc' : 'asc' };
          return newConfigs;
        } else {
          // Remove from sort (third click)
          return prev.filter((_, idx) => idx !== existingIndex);
        }
      } else {
        // Add new sort, desc first (first click)
        const newConfigs = [...prev, { field, direction: arahAwal as 'asc' | 'desc' }];
        // Keep only max 3 columns for sorting
        if (newConfigs.length > 3) {
          newConfigs.shift();
        }
        return newConfigs;
      }
    });
  };

  // Render Sort Header Icon - Single clean arrow when active
  const renderSortIndicator = (field: SortField) => {
    if (field === 'default') {
      if (sortConfigs.length === 0) return null;
      return (
        <button type="button" onClick={() => setSortConfigs([])} className="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 px-2 py-0.5 rounded-sm transition ml-2 cursor-pointer font-semibold border border-red-200">
          Reset Urutan
        </button>
      );
    }
    return null; // The column indicator is handled inside ResizableHeader
  };

  // Aturan filter satu sumber; abaikanTanggal dipakai untuk rekap "sepanjang masa" (filter lain tetap berlaku)
  const cocokFilter = (item: TransaksiPembelian, abaikanTanggal = false): boolean => {
    {
      // Filter Tanggal Dari
      if (!abaikanTanggal && appliedFilters.startDate && item.tanggal_transaksi) {
        const itemDate = item.tanggal_transaksi.split('T')[0];
        if (itemDate < appliedFilters.startDate) return false;
      }
      // Filter Tanggal Sampai
      if (!abaikanTanggal && appliedFilters.endDate && item.tanggal_transaksi) {
        const itemDate = item.tanggal_transaksi.split('T')[0];
        if (itemDate > appliedFilters.endDate) return false;
      }
      // Filter Kupon
      if (appliedFilters.kupon && appliedFilters.kupon !== 'ALL' && item.no_kupon !== appliedFilters.kupon) {
        return false;
      }
      // Filter Grade
      if (appliedFilters.grade && appliedFilters.grade !== 'ALL') {
        const targetG = appliedFilters.grade.trim().toUpperCase();
        const rowGrades = getTransactionUniqueGrades(item);
        if (!rowGrades.includes(targetG) && item.kode_grade?.toUpperCase() !== targetG) {
          return false;
        }
      }
      // Filter Kode Bal (prefix huruf kode bal, misal: SB, HF, TS, T, GT, dll)
      if (appliedFilters.kodeBal && appliedFilters.kodeBal !== 'ALL') {
        const targetKode = appliedFilters.kodeBal.trim().toUpperCase();
        const matchesKode = (noBal?: string) => {
          if (!noBal) return false;
          const p = extractKodeBalPrefix(noBal);
          return p === targetKode || noBal.trim().toUpperCase().startsWith(targetKode);
        };
        const hasItemMatch = (item.items || []).some(
          (i) => matchesKode(i.no_bal) || ((i as any).kode_bal_prefix && String((i as any).kode_bal_prefix).toUpperCase() === targetKode)
        );
        const singleMatch = item.no_bal ? matchesKode(item.no_bal) : false;
        if (!hasItemMatch && !singleMatch) return false;
      }
      // Filter No Ball
      if (appliedFilters.noBall) {
        const query = appliedFilters.noBall.toLowerCase();
        const hasItemMatch = (item.items || []).some(i => i.no_bal?.toLowerCase().includes(query) || i.barcode?.toLowerCase().includes(query) || i.sample_label_code?.toLowerCase().includes(query));
        if (!item.no_bal?.toLowerCase().includes(query) && !hasItemMatch) return false;
      }
      // Filter Supplier
      if (appliedFilters.supplier && appliedFilters.supplier !== 'ALL' && item.petani_id !== appliedFilters.supplier) {
        return false;
      }
      return true;
    }
  };

  // Filtered Transaksi Data
  const filteredData = useMemo(
    () => transaksiList.filter((item) => cocokFilter(item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transaksiList, appliedFilters]
  );

  // Data dengan filter yang sama tetapi tanpa batas tanggal (sepanjang masa)
  const dataSepanjangMasa = useMemo(
    () => transaksiList.filter((item) => cocokFilter(item, true)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transaksiList, appliedFilters]
  );

  // Rincian bal & subtotal per kupon, dipakai tabel, urutan, total, dan Excel
  const urutanNoBal = sortConfigs.find((c) => c.field === 'no_bal')?.direction;
  const ringkasanMap = useMemo(
    () =>
      new Map(
        filteredData.map((row) => {
          const r = ringkasKupon(row);
          if (urutanNoBal) {
            // Bal di dalam kupon diurutkan menurut nomor (natural: A2 sebelum A10)
            const arah = urutanNoBal === 'asc' ? 1 : -1;
            r.rincian = [...r.rincian].sort((a, b) => arah * a.noBal.localeCompare(b.noBal, undefined, { numeric: true, sensitivity: 'base' }));
          }
          return [row, r] as const;
        })
      ),
    [filteredData, urutanNoBal]
  );
  const ringkasan = (row: TransaksiPembelian): RingkasanKupon => ringkasanMap.get(row) ?? ringkasKupon(row);

  // Sorted Transaksi Data
  const sortedData = useMemo(() => {
    if (sortConfigs.length === 0) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      for (const config of sortConfigs) {
        let comparison = 0;
        switch (config.field) {
          case 'tanggal': {
            const tA = a.tanggal_transaksi ? new Date(a.tanggal_transaksi).getTime() : 0;
            const tB = b.tanggal_transaksi ? new Date(b.tanggal_transaksi).getTime() : 0;
            comparison = tA - tB;
            break;
          }
          case 'kupon': {
            const kA = a.no_kupon || '';
            const kB = b.no_kupon || '';
            comparison = kA.localeCompare(kB, undefined, { numeric: true, sensitivity: 'base' });
            break;
          }
          case 'petani': {
            const pA = a.nama_petani || '';
            const pB = b.nama_petani || '';
            comparison = pA.localeCompare(pB, undefined, { numeric: true, sensitivity: 'base' });
            break;
          }
          case 'no_bal': {
            // Kupon diurutkan menurut bal pertamanya pada urutan yang sedang dipakai
            const nA = ringkasan(a).rincian[0]?.noBal || '';
            const nB = ringkasan(b).rincian[0]?.noBal || '';
            comparison = nA.localeCompare(nB, undefined, { numeric: true, sensitivity: 'base' });
            break;
          }
          case 'bruto':
            comparison = ringkasan(a).bruto - ringkasan(b).bruto;
            break;
          case 'netto':
            comparison = ringkasan(a).netto - ringkasan(b).netto;
            break;
          case 'potongan_tali':
            comparison = ringkasan(a).tali - ringkasan(b).tali;
            break;
          case 'potongan_kuli':
            comparison = ringkasan(a).kuli - ringkasan(b).kuli;
            break;
          case 'potongan_tikar':
            comparison = ringkasan(a).tikar - ringkasan(b).tikar;
            break;
          case 'total_harga':
            comparison = ringkasan(a).nilaiBeli - ringkasan(b).nilaiBeli;
            break;
          case 'jumlah_bayar':
            comparison = ringkasan(a).jumlahBayar - ringkasan(b).jumlahBayar;
            break;
        }
        
        if (comparison !== 0) {
          return config.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }, [filteredData, sortConfigs, ringkasanMap]);

  // Real-time table search within sorted results (ditunda agar ketikan tetap lancar pada data besar)
  const tableSearchTertunda = useDeferredValue(tableSearch);
  const searchedData = useMemo(() => {
    if (!tableSearchTertunda.trim()) return sortedData;
    const q = tableSearchTertunda.toLowerCase().trim();
    return sortedData.filter((row) => {
      const matchKupon = (row.no_kupon || '').toLowerCase().includes(q);
      const matchPetani = (row.nama_petani || '').toLowerCase().includes(q);
      const matchNoBal = (row.no_bal || '').toLowerCase().includes(q);
      const matchGrade = (row.kode_grade || '').toLowerCase().includes(q);
      const matchItems = row.items?.some(
        it => (it.no_bal || '').toLowerCase().includes(q) || (it.kode_grade || '').toLowerCase().includes(q) || extractKodeBalPrefix(it.no_bal).toLowerCase().includes(q)
      );
      return matchKupon || matchPetani || matchNoBal || matchGrade || matchItems;
    });
  }, [sortedData, tableSearchTertunda]);

  // Totals Calculation
  const totals = useMemo(() => {
    let totalBal = 0;
    let totalBruto = 0;
    let totalNetto = 0;
    let totalPotonganTali = 0;
    let totalPotonganKuli = 0;
    let totalPotonganTikar = 0;
    let totalNilaiHargaBeli = 0;
    let totalJumlahBayar = 0;
    let totalJumlahBayarLunas = 0;
    let totalJumlahBayarKredit = 0;

    sortedData.forEach((row) => {
      const r = ringkasan(row);
      totalBal += r.jumlahBal;
      totalBruto += r.bruto;
      totalNetto += r.netto;
      totalPotonganTali += r.tali;
      totalPotonganKuli += r.kuli;
      totalPotonganTikar += r.tikar;
      totalNilaiHargaBeli += r.nilaiBeli;
      totalJumlahBayar += r.jumlahBayar;

      // Kupon yang belum dibayar di Kasir (termasuk status kosong) masih kredit
      if (isTransaksiLunas(row)) {
        totalJumlahBayarLunas += r.jumlahBayar;
      } else {
        totalJumlahBayarKredit += r.jumlahBayar;
      }
    });

    return {
      totalBal,
      totalBruto,
      totalNetto,
      totalPotonganTali,
      totalPotonganKuli,
      totalPotonganTikar,
      totalNilaiHargaBeli,
      totalJumlahBayar,
      totalJumlahBayarLunas,
      totalJumlahBayarKredit,
      count: sortedData.length,
    };
  }, [sortedData, ringkasanMap]);


  // Rekap ganti tikar, jasa (tali + kuli + tikar), dan nilai kotor untuk hasil filter serta sepanjang masa
  const hitungRekapJasa = (daftar: TransaksiPembelian[]): RekapJasa => {
    const hasil: RekapJasa = { kupon: daftar.length, bal: 0, balTikar: 0, tikar: 0, tali: 0, kuli: 0, nilaiBeli: 0 };
    daftar.forEach((row) => {
      const r = ringkasKupon(row);
      hasil.bal += r.jumlahBal;
      hasil.balTikar += r.rincian.filter((b) => b.tikar > 0).length;
      hasil.tikar += r.tikar;
      hasil.tali += r.tali;
      hasil.kuli += r.kuli;
      hasil.nilaiBeli += r.nilaiBeli;
    });
    return hasil;
  };
  const rekapSesuaiFilter = useMemo(() => hitungRekapJasa(filteredData), [filteredData]);
  const rekapSepanjangMasa = useMemo(() => hitungRekapJasa(dataSepanjangMasa), [dataSepanjangMasa]);

  // Rekap jumlah bal & rata-rata harga per kode bal (SB, HF, TS, dst.): dihitung sejak sortir + harga
  // diinput, tidak menunggu ditimbang, mengikuti filter yang sama dengan tabel utama.
  const rekapHargaKode = useMemo(
    () =>
      rekapHargaPerKode(
        filteredData.flatMap((row) =>
          ringkasan(row).rincian.map((bal) => ({ no_bal: bal.noBal, harga_per_kg: bal.hargaBeli }))
        )
      ),
    [filteredData, ringkasanMap]
  );
  const adaFilterTanggal = Boolean(appliedFilters.startDate || appliedFilters.endDate);
  const konteksRekap = [
    periodeInfo(appliedFilters.startDate, appliedFilters.endDate),
    appliedFilters.supplier && appliedFilters.supplier !== 'ALL'
      ? 'Petani: ' + (petaniList.find((pt) => pt.petani_id === appliedFilters.supplier)?.nama_petani || appliedFilters.supplier)
      : '',
  ].filter(Boolean).join(' · ');

  // Rentang tanggal cepat: langsung diterapkan bersama filter lain yang sedang dipilih di form
  const handlePilihRentang = (start: string, end: string) => {
    setFilterStartDate(start);
    setFilterEndDate(end);
    setAppliedFilters({
      startDate: start,
      endDate: end,
      kupon: filterKupon,
      grade: filterGrade,
      kodeBal: filterKodeBal.trim(),
      noBall: filterNoBall.trim(),
      supplier: filterSupplier,
    });
  };

  // Export Excel
  const handleExportExcel = () => {
    if (sortedData.length === 0) return;

    const namaSupplier = petaniList.find((p) => p.petani_id === appliedFilters.supplier)?.nama_petani;
    const info = [
      periodeInfo(appliedFilters.startDate, appliedFilters.endDate),
      [
        `Kode Beli: ${appliedFilters.grade && appliedFilters.grade !== 'ALL' ? appliedFilters.grade : 'Semua'}`,
        appliedFilters.kodeBal && appliedFilters.kodeBal !== 'ALL' ? `Kode Bal: ${appliedFilters.kodeBal}` : '',
        `Kupon: ${appliedFilters.kupon && appliedFilters.kupon !== 'ALL' ? appliedFilters.kupon : 'Semua'}`,
        `Petani: ${namaSupplier || 'Semua'}`,
        appliedFilters.noBall ? `No Bal: ${appliedFilters.noBall}` : '',
      ].filter(Boolean).join(' · '),
    ];

    const rows: ExcelCellValue[][] = [];
    const rowKinds: ExcelRowKind[] = [];
    sortedData.forEach((row) => {
      const r = ringkasan(row);
      rows.push(['', row.tanggal_transaksi, row.no_kupon || '-', row.nama_petani || '-', '', '', '', '', '', '', '', '', '', labelStatusBayar(row)]);
      rowKinds.push('group');
      r.rincian.forEach((bal, balIdx) => {
        rows.push([balIdx + 1, '', '', '', bal.noBal, bal.hargaBeli, bal.bruto || '', bal.netto || '', bal.tali, bal.kuli, bal.tikar || '', bal.nilaiBeli, bal.jumlahBayar, '']);
        rowKinds.push('data');
      });
      rows.push([`Total ${row.no_kupon || 'Kupon'} (${r.jumlahBal} bal)`, '', '', '', '', '', r.bruto, r.netto, r.tali, r.kuli, r.tikar, r.nilaiBeli, r.jumlahBayar, '']);
      rowKinds.push('subtotal');
    });

    const barisRekap = (): ExcelCellValue[][] => {
      const a = rekapSesuaiFilter;
      const b = rekapSepanjangMasa;
      return [
        ['Jumlah Kupon', a.kupon, b.kupon],
        ['Jumlah Bal', a.bal, b.bal],
        ['Bal Ganti Tikar', a.balTikar, b.balTikar],
        ['Potongan Tikar (Rp)', a.tikar, b.tikar],
        ['Potongan Tali (Rp)', a.tali, b.tali],
        ['Potongan Kuli (Rp)', a.kuli, b.kuli],
        ['Total Jasa: Tali + Kuli + Tikar (Rp)', totalJasa(a), totalJasa(b)],
        ['Nilai Beli (Rp)', a.nilaiBeli, b.nilaiBeli],
        ['Total Nilai Kotor: Nilai Beli + Tali + Kuli + Tikar (Rp)', nilaiKotor(a), nilaiKotor(b)],
      ];
    };

    downloadExcelReport(`Laporan_Pembelian_Barang_${todayStamp()}`, [
      {
        name: 'Pembelian Barang',
        title: 'Laporan Rekapitulasi Pembelian Barang',
        info,
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'Tanggal', type: 'date' },
          { header: 'Kupon', align: 'center' },
          { header: 'Petani' },
          { header: 'No Bal', align: 'center' },
          { header: 'Harga Beli (Rp/Kg)', type: 'rupiah' },
          { header: 'Bruto (Kg)', type: 'kg' },
          { header: 'Netto (Kg)', type: 'kg' },
          { header: 'Tali (Rp)', type: 'rupiah' },
          { header: 'Kuli (Rp)', type: 'rupiah' },
          { header: 'Tikar (Rp)', type: 'rupiah' },
          { header: 'Nilai Beli (Rp)', type: 'rupiah' },
          { header: 'Jumlah Bayar (Rp)', type: 'rupiah' },
          { header: 'Status Bayar', align: 'center' },
        ],
        rows,
        rowKinds,
        totalRow: [
          `TOTAL (${totals.count} kupon, ${totals.totalBal} bal)`, '', '', '', '', '',
          totals.totalBruto,
          totals.totalNetto,
          totals.totalPotonganTali,
          totals.totalPotonganKuli,
          totals.totalPotonganTikar,
          totals.totalNilaiHargaBeli,
          totals.totalJumlahBayar,
          '',
        ],
      },
      {
        name: 'Rekap Jasa',
        title: 'Rekap Ganti Tikar, Jasa & Nilai Kotor',
        info,
        columns: [
          { header: 'Keterangan' },
          { header: 'Sesuai Filter', type: 'integer' },
          { header: 'Sepanjang Masa', type: 'integer' },
        ],
        rows: barisRekap(),
      },
    ]);
  };

  // Tabel utama dibangun ulang hanya bila data, urutan, atau total berubah (bukan setiap ketikan di kotak cari)
  const tabelUtama = useMemo(() => (
    <table className="no-zebra w-full min-w-[960px] table-fixed text-left text-xs border-collapse">
      {/* Lebar kolom proporsional sesuai isi, agar kolom Petani tidak menelan sisa ruang */}
      <colgroup>
        <col className="w-[4%]" />
        <col className="w-[8%]" />
        <col className="w-[7%]" />
        <col className="w-[12%]" />
        <col className="w-[8%]" />
        <col className="w-[8%]" />
        <col className="w-[7%]" />
        <col className="w-[7%]" />
        <col className="w-[6%]" />
        <col className="w-[6%]" />
        <col className="w-[6%]" />
        <col className="w-[10%]" />
        <col className="w-[11%]" />
      </colgroup>
      <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
        <tr className="text-gray-700 font-bold border-b border-gray-200 uppercase text-[10px] tracking-wider">
          <th
            className="py-2 px-2 text-center border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition select-none w-px whitespace-nowrap"
            onClick={() => {
              setSortConfigs([]);
            }}
            title="Klik untuk reset urutan default"
          >
            <div className="flex items-center justify-center space-x-1">
              <span>No</span>
              {sortConfigs.length > 0 && renderSortIndicator('default')}
            </div>
          </th>
          <SortableHeader title="Tanggal" widthClass="" sortField="tanggal" sortConfigs={sortConfigs} onSort={handleSort} />
          <SortableHeader title="Kupon" widthClass="" sortField="kupon" sortConfigs={sortConfigs} onSort={handleSort} />
          <SortableHeader title="Petani" widthClass="" sortField="petani" sortConfigs={sortConfigs} onSort={handleSort} />
          <SortableHeader title="No Bal" widthClass="" align="center" sortField="no_bal" sortConfigs={sortConfigs} onSort={handleSort} />
          <SortableHeader title="Harga Beli (Rp/Kg)" widthClass="" align="right" />
          <SortableHeader title="Bruto (Kg)" widthClass="" align="right" sortField="bruto" sortConfigs={sortConfigs} onSort={handleSort} />
          <SortableHeader title="Netto (Kg)" widthClass="" align="right" sortField="netto" sortConfigs={sortConfigs} onSort={handleSort} />
          <SortableHeader title="Tali (Rp)" widthClass="" align="right" sortField="potongan_tali" sortConfigs={sortConfigs} onSort={handleSort} />
          <SortableHeader title="Kuli (Rp)" widthClass="" align="right" sortField="potongan_kuli" sortConfigs={sortConfigs} onSort={handleSort} />
          <SortableHeader title="Tikar (Rp)" widthClass="" align="right" sortField="potongan_tikar" sortConfigs={sortConfigs} onSort={handleSort} />
          <SortableHeader title="Nilai Beli (Rp)" widthClass="" align="right" sortField="total_harga" sortConfigs={sortConfigs} onSort={handleSort} />
          <SortableHeader title="Jumlah Bayar (Rp)" widthClass="" align="right" className="font-extrabold text-[#b81d24]" sortField="jumlah_bayar" sortConfigs={sortConfigs} onSort={handleSort} />
        </tr>
      </thead>

      {searchedData.length === 0 ? (
        <tbody>
          <tr>
            <td colSpan={13} className="py-10 text-center text-gray-500">
              <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="font-semibold">Tidak ada data transaksi</p>
            </td>
          </tr>
        </tbody>
      ) : (
        searchedData.map((row, idx) => {
          const r = ringkasan(row);
          const lunas = isTransaksiLunas(row);

          return (
            <tbody key={row.transaksi_id || idx} className="border-t-2 border-gray-300">
              {/* 1. Baris kupon */}
              <tr className="bg-slate-100 text-gray-900">
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2 font-mono text-[11px] text-gray-700 whitespace-nowrap">{formatDateHariBulanTahun(row.tanggal_transaksi)}</td>
                <td className="py-2 px-2 whitespace-nowrap">
                  <span className="bg-white border border-gray-200 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-[#b81d24]">
                    {row.no_kupon || '-'}
                  </span>
                </td>
                <td
                  className="py-2 px-2.5 font-bold text-gray-900 whitespace-nowrap truncate"
                  title={row.petani_id ? `${row.nama_petani} (${row.petani_id})` : row.nama_petani}
                >
                  {row.nama_petani || '-'}
                </td>
                <td colSpan={9} className="py-2 px-2.5 text-[11px] text-gray-500 whitespace-nowrap">
                  <span className="font-semibold text-gray-700">{r.jumlahBal} bal</span>
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded-xs text-[10px] font-bold border ${
                      lunas ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {labelStatusBayar(row)}
                  </span>
                </td>
              </tr>

              {/* 2. Rincian setiap bal */}
              {r.rincian.map((bal, balIdx) => (
                <tr key={bal.key} className="bg-white hover:bg-gray-50 transition-colors">
                  {/* Nomor urut bal, mulai dari 1 pada setiap kupon */}
                  <td className="py-1.5 px-2 text-center font-mono text-[11px] text-gray-500 whitespace-nowrap">{balIdx + 1}</td>
                  <td colSpan={3} className="bg-white"></td>
                  <td className="py-1.5 px-2.5 text-center font-mono font-semibold text-gray-800 whitespace-nowrap">{bal.noBal}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-gray-700 whitespace-nowrap">{formatRp(bal.hargaBeli)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-gray-700 whitespace-nowrap">{formatKg(bal.bruto)}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-semibold text-gray-900 whitespace-nowrap">{formatKg(bal.netto)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-gray-900 whitespace-nowrap">{formatRp(bal.tali)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-gray-900 whitespace-nowrap">{formatRp(bal.kuli)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-gray-900 whitespace-nowrap">{formatRp(bal.tikar)}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-semibold text-gray-900 whitespace-nowrap">{formatRp(bal.nilaiBeli)}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-[#b81d24] whitespace-nowrap">{formatRp(bal.jumlahBayar)}</td>
                </tr>
              ))}

              {/* 3. Total per kupon */}
              <tr className="bg-gray-50 font-bold text-gray-900 border-t border-gray-200">
                <td colSpan={6} className="py-2 px-3 text-right text-[11px] uppercase tracking-wide text-gray-900 whitespace-nowrap">
                  Total {row.no_kupon || 'Kupon'} ({r.jumlahBal} bal)
                </td>
                <td className="py-2 px-2 text-right font-mono whitespace-nowrap">{formatKg(r.bruto)}</td>
                <td className="py-2 px-2 text-right font-mono text-gray-900 whitespace-nowrap">{formatKg(r.netto)}</td>
                <td className="py-2 px-2 text-right font-mono text-gray-900 whitespace-nowrap">{formatRp(r.tali)}</td>
                <td className="py-2 px-2 text-right font-mono text-gray-900 whitespace-nowrap">{formatRp(r.kuli)}</td>
                <td className="py-2 px-2 text-right font-mono text-gray-900 whitespace-nowrap">{formatRp(r.tikar)}</td>
                <td className="py-2 px-2 text-right font-mono whitespace-nowrap">{formatRp(r.nilaiBeli)}</td>
                <td className="py-2 px-2.5 text-right font-mono text-[#b81d24] whitespace-nowrap">{formatRp(r.jumlahBayar)}</td>
              </tr>
            </tbody>
          );
        })
      )}

      {/* Footer Totals  */}
      {sortedData.length > 0 && (
        <tfoot className="border-t-2 border-gray-400">
          <tr className="bg-slate-200/90 text-gray-950 font-extrabold text-xs">
            <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider whitespace-nowrap">
              Total Keseluruhan ({totals.count} kupon, {totals.totalBal} bal)
            </td>
            <td className="py-3 px-2 text-right font-mono whitespace-nowrap">{formatKg(totals.totalBruto)}</td>
            <td className="py-3 px-2 text-right font-mono text-gray-900 whitespace-nowrap">{formatKg(totals.totalNetto)}</td>
            <td className="py-3 px-2 text-right font-mono text-gray-900 whitespace-nowrap">{formatRp(totals.totalPotonganTali)}</td>
            <td className="py-3 px-2 text-right font-mono text-gray-900 whitespace-nowrap">{formatRp(totals.totalPotonganKuli)}</td>
            <td className="py-3 px-2 text-right font-mono text-gray-900 whitespace-nowrap">{formatRp(totals.totalPotonganTikar)}</td>
            <td className="py-3 px-2 text-right font-mono whitespace-nowrap">{formatRp(totals.totalNilaiHargaBeli)}</td>
            <td className="py-3 px-2.5 text-right font-mono text-[#b81d24] bg-red-100 font-black text-sm whitespace-nowrap">{formatRp(totals.totalJumlahBayar)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  ), [searchedData, sortedData.length, sortConfigs, totals, ringkasanMap]);

  return (
    <div className="space-y-4 font-sans text-gray-800">
      
      {/* Header Banner */}
      <div className="bg-white p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#b81d24] text-white rounded-sm flex items-center justify-center shadow-xs shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Laporan Pembelian</h1>
        </div>

        {/* Tampilan (Filter / Ringkasan / Fokus Tabel) dan tombol unduh */}
        <div className="flex flex-wrap items-center gap-2">
          <LaporanTampilanToggle tampilan={tampilan} jumlahFilterAktif={jumlahFilterAktif} />

          <button
            onClick={handleExportExcel}
            disabled={sortedData.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Unduh Excel</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Keseluruhan (Kumulatif) */}
      {tampilan.tampilRingkasan && (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total Kupon & Bal</p>
            <p className="text-lg font-black text-gray-900 font-mono mt-0.5">
              {sortedData.length} <span className="text-sm font-medium text-gray-500 font-sans">Kupon</span> <span className="text-gray-300 mx-1">|</span> {totals.totalBal} <span className="text-sm font-medium text-gray-500 font-sans">Bal</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
            <FileText className="w-5 h-5 text-slate-600" />
          </div>
        </div>
        <div className="bg-white p-3 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total Berat (Netto)</p>
            <p className="text-lg font-black text-gray-900 font-mono mt-0.5">
              {totals.totalNetto.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-medium text-gray-500 font-sans">Kg</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <Scale className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white p-3 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total Pembayaran Lunas</p>
            <p className="text-lg font-black text-gray-900 font-mono mt-0.5">
              Rp {Math.round(totals.totalJumlahBayarLunas).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white p-3 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total Pembayaran Kredit</p>
            <p className="text-lg font-black text-gray-900 font-mono mt-0.5">
              Rp {Math.round(totals.totalJumlahBayarKredit).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
            <Clock className="w-5 h-5 text-[#b81d24]" />
          </div>
        </div>
      </div>
      )}

      {/* Filter Form Card  */}
      {tampilan.tampilFilter && (
      <div className="bg-white p-4 border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-gray-100">
          <Filter className="w-4 h-4 text-[#b81d24]" />
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">Filter</span>
        </div>

        <PresetTanggal className="mb-3" startDate={filterStartDate} endDate={filterEndDate} onPilih={handlePilihRentang} />

        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          
          {/* Tanggal Dari */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Tanggal Dari
            </label>
            <div className="relative">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none"
              />
            </div>
          </div>

          {/* Tanggal Sampai */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Tanggal Sampai
            </label>
            <div className="relative">
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none"
              />
            </div>
          </div>

          {/* Kupon */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Kupon
            </label>
            <input
              type="text"
              list="kupon-list"
              value={filterKupon}
              onChange={(e) => setFilterKupon(e.target.value)}
              placeholder="Kupon"
              className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none"
            />
            <datalist id="kupon-list">
              <option value="ALL">Semua Kupon</option>
              {uniqueKupons.map(kup => (
                <option key={kup} value={kup}>{kup}</option>
              ))}
            </datalist>
          </div>

          {/* Kode Beli */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Kode Beli
            </label>
            <input
              type="text"
              list="grade-list"
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              placeholder="Kode beli"
              className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none"
            />
            <datalist id="grade-list">
              <option value="ALL">Semua Kode Beli</option>
              {uniqueGrades.map(g => (
                <option key={g} value={g}>Kode Beli {g}</option>
              ))}
            </datalist>
          </div>

          {/* Kode Bal */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Kode Bal
            </label>
            <input
              type="text"
              list="kode-bal-list"
              value={filterKodeBal}
              onChange={(e) => setFilterKodeBal(e.target.value)}
              placeholder="Kode bal"
              className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none uppercase"
            />
            <datalist id="kode-bal-list">
              <option value="ALL">Semua Kode Bal</option>
              {uniqueKodeBal.map(k => (
                <option key={k} value={k}>Kode Bal {k}</option>
              ))}
            </datalist>
          </div>

          {/* No Bal */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              No Bal
            </label>
            <input
              type="text"
              placeholder="Semua bal"
              value={filterNoBall}
              onChange={(e) => setFilterNoBall(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none"
            />
          </div>

          {/* Petani */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Petani
            </label>
            <input
              type="text"
              list="supplier-list"
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              placeholder="Petani"
              className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#b81d24] focus:outline-none rounded-none truncate"
            />
            <datalist id="supplier-list">
              <option value="ALL">Semua Petani</option>
              {uniqueSuppliers.map(sup => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </datalist>
          </div>

          {/* Action Filter Buttons */}
          <div className="col-span-full flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-none transition flex items-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              <span>Reset Filter</span>
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-none transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari Data</span>
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Quick Summary Pill Row */}
      {tampilan.tampilRingkasan && (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        <div className="bg-white p-2.5 border border-gray-200">
          <div className="text-gray-500 text-[11px]">Total Data Ditemukan</div>
          <div className="text-base font-bold text-gray-900 mt-0.5">{totals.count} Kupon</div>
        </div>
        <div className="bg-white p-2.5 border border-gray-200">
          <div className="text-gray-500 text-[11px]">Total Netto Timbang</div>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {totals.totalNetto.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-500">kg</span>
          </div>
        </div>
        <div className="bg-white p-2.5 border border-gray-200">
          <div className="text-gray-500 text-[11px]">Total Potongan Tali</div>
          <div className="text-base font-bold text-gray-900 mt-0.5">
            Rp {Math.round(totals.totalPotonganTali).toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white p-2.5 border border-gray-200">
          <div className="text-gray-500 text-[11px]">Total Potongan Kuli</div>
          <div className="text-base font-bold text-gray-900 mt-0.5">
            Rp {totals.totalPotonganKuli.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white p-2.5 border border-gray-200">
          <div className="text-gray-500 text-[11px]">Total Potongan Tikar</div>
          <div className="text-base font-bold text-gray-900 mt-0.5">
            Rp {totals.totalPotonganTikar.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white p-2.5 border border-gray-200">
          <div className="text-gray-500 text-[11px]">Total Jumlah Bayar Petani</div>
          <div className="text-base font-bold text-[#b81d24] mt-0.5">
            Rp {totals.totalJumlahBayar.toLocaleString('id-ID')}
          </div>
        </div>
      </div>
      )}

      {/* Rekap ganti tikar/jasa/nilai kotor, dan rekap bal & rata-rata harga per kode bal, berdampingan */}
      {tampilan.tampilRingkasan && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <LaporanPembelianRekap
            sesuaiFilter={rekapSesuaiFilter}
            sepanjangMasa={rekapSepanjangMasa}
            adaFilterTanggal={adaFilterTanggal}
            konteks={konteksRekap}
          />
          <LaporanPembelianRekapHarga data={rekapHargaKode} konteks={konteksRekap} />
        </div>
      )}

      {/* Data Table Card  */}
      <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Rekap Pembelian
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              {tableSearch.trim() ? (
                <>Ditemukan: <strong className="text-gray-900">{searchedData.length}</strong> dari {sortedData.length} kupon</>
              ) : (
                <>Total: <strong className="text-gray-900">{sortedData.length}</strong> kupon ({totals.totalBal} Bal • {totals.totalNetto.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg Netto)</>
              )}
            </span>
          </div>
          
          {/* Kolom Pencarian Cepat Tabel Pembelian */}
          <div className="w-full sm:w-80 md:w-96">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="search-laporan-pembelian-table-input"
                type="text"
                placeholder="Cari kupon, petani, no bal, grade"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-sm pl-8 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] transition shadow-2xs"
              />
              {tableSearch && (
                <button
                  type="button"
                  id="btn-clear-search-laporan-pembelian-table"
                  onClick={() => setTableSearch('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`overflow-x-auto overflow-y-auto ${tampilan.fokusTabel ? 'max-h-[calc(100vh-170px)]' : 'max-h-[60vh]'} border border-gray-200 shadow-sm relative scrollbar-thin`}>
          {tabelUtama}
        </div>
      </div>

      {/* Floating Scroll Controls (Otomatis Geser ke Paling Atas & Paling Bawah) */}
      <div 
        className={`fixed bottom-6 right-6 z-40 flex flex-col items-center space-y-2 transition-all duration-300 ${
          showScrollButtons ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={scrollToTop}
          className="p-2.5 bg-white/90 hover:bg-white text-gray-600 hover:text-[#b81d24] rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.1)] border border-gray-200 hover:border-red-200 backdrop-blur-sm transition-all cursor-pointer group flex items-center justify-center hover:scale-110 active:scale-95"
          title="Geser ke Paling Atas"
        >
          <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          <span className="sr-only">Geser ke Paling Atas</span>
        </button>
        <button
          type="button"
          onClick={scrollToBottom}
          className="p-2.5 bg-white/90 hover:bg-white text-gray-600 hover:text-[#b81d24] rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.1)] border border-gray-200 hover:border-red-200 backdrop-blur-sm transition-all cursor-pointer group flex items-center justify-center hover:scale-110 active:scale-95"
          title="Geser ke Paling Bawah"
        >
          <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          <span className="sr-only">Geser ke Paling Bawah</span>
        </button>
      </div>

  </div>
);
};

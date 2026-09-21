import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Search,
  RotateCcw,
  Calendar,
  ArrowUp,
  ArrowDown,
  Scale,
  DollarSign,
  FileSpreadsheet,
  TrendingUp,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Barang, Petani, TransaksiPembelian, TabelHarga, UserRole } from '../../types';
import { isTransaksiLunas } from '../../utils/statusBayar';
import { extractKodeBalPrefix } from '../../utils/formatters';
import { downloadExcelReport, labelStatusStok, periodeInfo, todayStamp } from '../../utils/excelExport';
import { hitungNilaiBal } from '../../utils/finance';
import { Pagination } from '../common/Pagination';
import { SortIcon } from '../common/SortIcon';
import { COMPANY_NAME } from '../../config/appInfo';
import { useLaporanTampilan } from '../../hooks/useLaporanTampilan';
import { LaporanTampilanToggle } from './LaporanTampilanToggle';
import { LaporanBalRekap } from './LaporanBalRekap';
import { PresetTanggal } from './PresetTanggal';
import { SearchableSelect } from '../common/SearchableSelect';
import { rataHargaRekap, rekapPerKode, totalRekapKode } from '../../utils/rekapKodeBal';

interface LaporanBalViewProps {
  barangList: Barang[];
  petaniList?: Petani[];
  transaksiList?: TransaksiPembelian[];
  hargaList?: TabelHarga[];
  userRole?: UserRole;
  onNavigateToTransaksi?: () => void;
}

type SortField = 
  | 'default'
  | 'no_bal'
  | 'tanggal_masuk'
  | 'kode_grade'
  | 'berat_kg'
  | 'berat_bruto_kg'
  | 'harga_per_kg'
  | 'total_harga'
  | 'nama_petani'
  | 'ganti_tikar'
  | 'status_stok';

export const LaporanBalView: React.FC<LaporanBalViewProps> = ({
  barangList = [],
  petaniList = [],
  transaksiList = [],
  hargaList = [],
  userRole = 'superadmin',
  onNavigateToTransaksi,
}) => {
  // Filter States
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterKodeBal, setFilterKodeBal] = useState<string>('ALL');
  const [filterStatusStok, setFilterStatusStok] = useState<string>('ALL');
  const [filterStatusBayar, setFilterStatusBayar] = useState<string>('ALL');
  const [filterGantiTikar, setFilterGantiTikar] = useState<'ALL' | 'ya' | 'tidak'>('ALL');
  const [filterPetani, setFilterPetani] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [filterMinBerat, setFilterMinBerat] = useState<string>('');
  const [filterMaxBerat, setFilterMaxBerat] = useState<string>('');
  const [filterMinHarga, setFilterMinHarga] = useState<string>('');
  const [filterMaxHarga, setFilterMaxHarga] = useState<string>('');

  // Applied Filter State
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: '',
    endDate: '',
    grade: 'ALL',
    kodeBal: 'ALL',
    statusStok: 'ALL',
    statusBayar: 'ALL',
    gantiTikar: 'ALL' as 'ALL' | 'ya' | 'tidak',
    petani: 'ALL',
    search: '',
    minBerat: '',
    maxBerat: '',
    minHarga: '',
    maxHarga: '',
  });

  // Multi-column Sorting State
  type SortConfig = { field: SortField; direction: 'asc' | 'desc' };
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);

  // UI States
  // Panel Ringkasan dan Filter bisa disembunyikan (pilihan diingat) agar tabel lebih luas
  const tampilan = useLaporanTampilan('bal');
  const showSummaryCards = tampilan.tampilRingkasan;
  const isFilterPanelOpen = tampilan.tampilFilter;
  const jumlahFilterAktif = Object.values(appliedFilters).filter((v) => v !== '' && v !== 'ALL').length;
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

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

  // Unique Lists for Dropdown Filter Options
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    barangList.forEach((b) => {
      if (b.kode_grade) grades.add(b.kode_grade.trim().toUpperCase());
    });
    transaksiList.forEach((tx) => {
      (tx.items || []).forEach((it) => {
        if (it.kode_grade) grades.add(it.kode_grade.trim().toUpperCase());
      });
    });
    return Array.from(grades).sort();
  }, [barangList, transaksiList]);

  const uniqueKodeBal = useMemo(() => {
    const codes = new Set<string>();
    const add = (noBal?: string) => {
      const prefix = extractKodeBalPrefix(noBal);
      if (prefix) codes.add(prefix);
    };
    barangList.forEach((b) => add(b.no_bal));
    transaksiList.forEach((tx) => {
      (tx.items || []).forEach((it) => add(it.no_bal));
    });
    return Array.from(codes).sort();
  }, [barangList, transaksiList]);

  // Handle Search / Apply Filters
  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({
      startDate: filterStartDate,
      endDate: filterEndDate,
      grade: filterGrade,
      kodeBal: filterKodeBal,
      statusStok: filterStatusStok,
      statusBayar: filterStatusBayar,
      gantiTikar: filterGantiTikar,
      petani: filterPetani,
      search: searchQuery.trim(),
      minBerat: filterMinBerat,
      maxBerat: filterMaxBerat,
      minHarga: filterMinHarga,
      maxHarga: filterMaxHarga,
    });
    setCurrentPage(1);
  };

  // Rentang tanggal cepat (Hari Ini, Kemarin, dst.): langsung diterapkan bersama filter lain di form
  const handlePilihRentang = (start: string, end: string) => {
    setFilterStartDate(start);
    setFilterEndDate(end);
    setAppliedFilters({
      startDate: start,
      endDate: end,
      grade: filterGrade,
      kodeBal: filterKodeBal,
      statusStok: filterStatusStok,
      statusBayar: filterStatusBayar,
      gantiTikar: filterGantiTikar,
      petani: filterPetani,
      search: searchQuery.trim(),
      minBerat: filterMinBerat,
      maxBerat: filterMaxBerat,
      minHarga: filterMinHarga,
      maxHarga: filterMaxHarga,
    });
    setCurrentPage(1);
  };

  // Handle Reset Filters
  const handleResetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterGrade('ALL');
    setFilterKodeBal('ALL');
    setFilterStatusStok('ALL');
    setFilterStatusBayar('ALL');
    setFilterGantiTikar('ALL');
    setFilterPetani('ALL');
    setSearchQuery('');
    setFilterMinBerat('');
    setFilterMaxBerat('');
    setFilterMinHarga('');
    setFilterMaxHarga('');
    setAppliedFilters({
      startDate: '',
      endDate: '',
      grade: 'ALL',
      kodeBal: 'ALL',
      statusStok: 'ALL',
      statusBayar: 'ALL',
      gantiTikar: 'ALL',
      petani: 'ALL',
      search: '',
      minBerat: '',
      maxBerat: '',
      minHarga: '',
      maxHarga: '',
    });
    setSortConfigs([]);
    setCurrentPage(1);
  };

  // Natural alphanumeric sorting comparator for No Bal (e.g. A-01, A-02, A-10, B-01)
  const compareAlphanumeric = (a: string, b: string): number => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  };

  // Toggle Header Sort with cycle: desc -> asc -> none
  const handleHeaderSort = (field: SortField) => {
    if (field === 'default') {
      setSortConfigs([]);
      return;
    }

    setSortConfigs(prev => {
      const existingIndex = prev.findIndex(c => c.field === field);
      
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        if (existing.direction === 'desc') {
          const newConfigs = [...prev];
          newConfigs[existingIndex] = { ...existing, direction: 'asc' };
          return newConfigs;
        } else {
          return prev.filter((_, idx) => idx !== existingIndex);
        }
      } else {
        const newConfigs = [...prev, { field, direction: 'desc' as const }];
        if (newConfigs.length > 3) {
          newConfigs.shift();
        }
        return newConfigs;
      }
    });
  };

  // Filtered & Enriched Bal Data
  // Termasuk bal yang baru discan (belum ditimbang): No Bal + harga sudah tampil
  const enrichedBalList = useMemo(() => {
    type TxInfo = {
      harga_per_kg: number;
      total_kotor: number;
      nama_petani: string;
      no_kupon: string;
      potongan: number;
      status_pembayaran: string;
      metode_pembayaran: string;
      kode_grade: string;
      no_bal: string;
      barang_id?: string;
      berat_kg: number;
      berat_bruto_kg?: number;
      potongan_tara_kg?: number;
      ganti_tikar: boolean;
      potongan_tikar?: number;
      tanggal: string;
      petani_id: string;
      transaksi_id: string;
      item_id: string;
    };

    const txItemMap = new Map<string, TxInfo>();
    transaksiList.forEach((tx) => {
      (tx.items || []).forEach((it) => {
        if (!it.barang_id && !it.no_bal) return;
        const isTikar = Boolean(it.ganti_tikar) || Number(it.potongan_tikar || 0) > 0;
        const potTikar = Number(it.potongan_tikar || 0) || (isTikar ? 75000 : 0);
        const info: TxInfo = {
          harga_per_kg: it.harga_per_kg || 0,
          total_kotor: it.total_kotor || ((it.berat_kg || 0) * (it.harga_per_kg || 0)),
          nama_petani: tx.nama_petani || '',
          no_kupon: tx.no_kupon || '',
          potongan: it.potongan || 0,
          status_pembayaran: tx.status_pembayaran || 'belum_lunas',
          metode_pembayaran: tx.metode_pembayaran || '',
          kode_grade: it.kode_grade || '',
          no_bal: it.no_bal || '',
          barang_id: it.barang_id,
          berat_kg: it.berat_kg || 0,
          berat_bruto_kg: it.berat_bruto_kg,
          potongan_tara_kg: it.potongan_tara_kg,
          tanggal: (tx.tanggal_transaksi || '').split(' ')[0] || '',
          petani_id: tx.petani_id,
          transaksi_id: tx.transaksi_id,
          item_id: it.item_id,
          ganti_tikar: isTikar,
          potongan_tikar: potTikar,
        };
        if (it.barang_id) txItemMap.set(it.barang_id, info);
        if (it.no_bal) txItemMap.set(it.no_bal, info);
      });
    });

    const seenKeys = new Set<string>();
    const rows: Array<Barang & {
      originalIndex: number;
      no_kupon: string;
      potongan: number;
      status_pembayaran: string;
      metode_pembayaran: string;
      status_bayar: string;
      has_tx: boolean;
      kode_bal_prefix: string;
      ganti_tikar: boolean;
      potongan_tikar?: number;
    }> = [];

    barangList.forEach((bal, originalIndex) => {
      const key = bal.barang_id || bal.no_bal;
      if (key) seenKeys.add(String(key).toUpperCase());
      if (bal.no_bal) seenKeys.add(String(bal.no_bal).toUpperCase());

      const txInfo = txItemMap.get(bal.barang_id) || txItemMap.get(bal.no_bal);
      const fallbackGradePrice =
        hargaList.find((h) => h.kode_grade?.toUpperCase() === bal.kode_grade?.toUpperCase())?.harga_per_kg || 0;
      const hrgBeli = bal.harga_per_kg || txInfo?.harga_per_kg || fallbackGradePrice;
      const netto = bal.berat_kg || txInfo?.berat_kg || 0;
      const subtotal = hitungNilaiBal({ berat_kg: netto, harga_per_kg: hrgBeli }, fallbackGradePrice);
      const bruto =
        bal.berat_bruto_kg && bal.berat_bruto_kg > 0
          ? bal.berat_bruto_kg
          : netto > 0
            ? netto + (bal.potongan_tara_kg || 0)
            : 0;
      const tara = bal.potongan_tara_kg !== undefined ? bal.potongan_tara_kg : Math.max(0, bruto - netto);
      const isTikar = Boolean(bal.ganti_tikar) || Number(bal.potongan_tikar || 0) > 0 || (txInfo ? txInfo.ganti_tikar : false);
      const potTikar = bal.potongan_tikar || (txInfo ? txInfo.potongan_tikar : 0) || (isTikar ? 75000 : 0);

      rows.push({
        ...bal,
        no_bal: bal.no_bal || txInfo?.no_bal || '',
        kode_grade: bal.kode_grade || txInfo?.kode_grade || '',
        harga_per_kg: hrgBeli,
        berat_kg: netto,
        berat_bruto_kg: bruto,
        potongan_tara_kg: tara,
        ganti_tikar: isTikar,
        potongan_tikar: potTikar,
        total_harga: subtotal,
        nama_petani: bal.nama_petani || txInfo?.nama_petani || 'Petani Kemitraan',
        originalIndex,
        no_kupon: txInfo?.no_kupon || '-',
        potongan: txInfo?.potongan || 0,
        status_pembayaran: txInfo?.status_pembayaran || 'belum_lunas',
        metode_pembayaran: txInfo?.metode_pembayaran || '',
        status_bayar: !txInfo
          ? 'tanpa_transaksi'
          : isTransaksiLunas(txInfo)
            ? 'lunas'
            : 'belum_lunas',
        has_tx: !!txInfo,
        kode_bal_prefix: extractKodeBalPrefix(bal.no_bal || txInfo?.no_bal),
      });
    });

    // Bal dari kupon (sortir) yang belum masuk inventaris barang — tetap tampil No Bal + harga
    let syntheticIndex = barangList.length;
    transaksiList.forEach((tx) => {
      (tx.items || []).forEach((it) => {
        const keys = [it.barang_id, it.no_bal].filter(Boolean).map((k) => String(k).toUpperCase());
        if (keys.some((k) => seenKeys.has(k))) return;
        keys.forEach((k) => seenKeys.add(k));

        const fallbackGradePrice =
          hargaList.find((h) => h.kode_grade?.toUpperCase() === (it.kode_grade || '').toUpperCase())?.harga_per_kg || 0;
        const hrgBeli = it.harga_per_kg || fallbackGradePrice;
        const netto = it.berat_kg || 0;
        const subtotal = hitungNilaiBal({ berat_kg: netto, harga_per_kg: hrgBeli }, fallbackGradePrice);
        const bruto = it.berat_bruto_kg && it.berat_bruto_kg > 0 ? it.berat_bruto_kg : 0;
        const isTikar = Boolean(it.ganti_tikar) || Number(it.potongan_tikar || 0) > 0;
        const potTikar = Number(it.potongan_tikar || 0) || (isTikar ? 75000 : 0);

        rows.push({
          barang_id: it.barang_id || `TX-ITEM-${it.item_id}`,
          no_bal: it.no_bal,
          kode_grade: it.kode_grade,
          berat_kg: netto,
          berat_bruto_kg: bruto,
          potongan_tara_kg: it.potongan_tara_kg || 0,
          harga_per_kg: hrgBeli,
          total_harga: subtotal,
          status_stok: netto > 0 ? 'di_gudang' : 'proses_sortir',
          tanggal_masuk: (tx.tanggal_transaksi || '').split(' ')[0] || '',
          petani_id: tx.petani_id,
          nama_petani: tx.nama_petani,
          desa_kecamatan: tx.desa_kecamatan,
          transaksi_pembelian_id: tx.transaksi_id,
          originalIndex: syntheticIndex++,
          no_kupon: tx.no_kupon || '-',
          potongan: it.potongan || 0,
          status_pembayaran: tx.status_pembayaran || 'belum_lunas',
          metode_pembayaran: tx.metode_pembayaran || '',
          status_bayar:
            isTransaksiLunas(tx) ? 'lunas' : 'belum_lunas',
          has_tx: true,
          kode_bal_prefix: extractKodeBalPrefix(it.no_bal),
          ganti_tikar: isTikar,
          potongan_tikar: potTikar,
        });
      });
    });

    return rows;
  }, [barangList, transaksiList, hargaList]);

  // Aturan filter satu sumber; abaikanTanggal dipakai untuk rekap "sepanjang masa" (filter lain tetap berlaku)
  const cocokFilter = (item: (typeof enrichedBalList)[number], abaikanTanggal = false): boolean => {
    {
      // Tanggal Dari
      if (!abaikanTanggal && appliedFilters.startDate && item.tanggal_masuk) {
        const itemDate = item.tanggal_masuk.split('T')[0];
        if (itemDate < appliedFilters.startDate) return false;
      }
      // Tanggal Sampai
      if (!abaikanTanggal && appliedFilters.endDate && item.tanggal_masuk) {
        const itemDate = item.tanggal_masuk.split('T')[0];
        if (itemDate > appliedFilters.endDate) return false;
      }
      // Petani
      if (appliedFilters.petani !== 'ALL' && item.petani_id !== appliedFilters.petani) {
        return false;
      }
      // Kode Grade
      if (appliedFilters.grade !== 'ALL') {
        if (item.kode_grade?.toUpperCase() !== appliedFilters.grade.toUpperCase()) {
          return false;
        }
      }
      // Kode Bal (prefix, mis. SB / HF / GT)
      if (appliedFilters.kodeBal !== 'ALL') {
        const prefix = item.kode_bal_prefix || extractKodeBalPrefix(item.no_bal);
        if (prefix !== appliedFilters.kodeBal.toUpperCase()) {
          return false;
        }
      }
      // Status Stok
      if (appliedFilters.statusStok !== 'ALL') {
        if (item.status_stok !== appliedFilters.statusStok) {
          return false;
        }
      }
      // Status Bayar
      if (appliedFilters.statusBayar !== 'ALL' && item.status_bayar !== appliedFilters.statusBayar) {
        return false;
      }
      // Filter Ganti Tikar
      if (appliedFilters.gantiTikar !== 'ALL') {
        const isYa = String(appliedFilters.gantiTikar).toLowerCase() === 'ya';
        if (isYa && !item.ganti_tikar) return false;
        if (!isYa && item.ganti_tikar) return false;
      }
      // Min & Max Berat
      if (appliedFilters.minBerat) {
        const min = parseFloat(appliedFilters.minBerat);
        if (!isNaN(min) && (item.berat_kg || 0) < min) return false;
      }
      if (appliedFilters.maxBerat) {
        const max = parseFloat(appliedFilters.maxBerat);
        if (!isNaN(max) && (item.berat_kg || 0) > max) return false;
      }
      // Min & Max Harga Beli
      if (appliedFilters.minHarga) {
        const min = parseFloat(appliedFilters.minHarga);
        if (!isNaN(min) && (item.harga_per_kg || 0) < min) return false;
      }
      if (appliedFilters.maxHarga) {
        const max = parseFloat(appliedFilters.maxHarga);
        if (!isNaN(max) && (item.harga_per_kg || 0) > max) return false;
      }
      // Free text search
      if (appliedFilters.search) {
        const q = appliedFilters.search.toLowerCase();
        const matchNoBal = item.no_bal?.toLowerCase().includes(q);
        const matchKode = item.kode_bal_pembeli?.toLowerCase().includes(q);
        const matchId = item.barang_id?.toLowerCase().includes(q);
        const matchPetani = item.nama_petani?.toLowerCase().includes(q);
        const matchKupon = item.no_kupon?.toLowerCase().includes(q);
        const matchGrade = item.kode_grade?.toLowerCase().includes(q);

        if (!matchNoBal && !matchKode && !matchId && !matchPetani && !matchKupon && !matchGrade) {
          return false;
        }
      }

      return true;
    }
  };

  const filteredData = useMemo(
    () => enrichedBalList.filter((item) => cocokFilter(item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enrichedBalList, appliedFilters]
  );

  // Bal dengan filter yang sama tetapi tanpa batas tanggal, untuk kolom "Sepanjang Masa" di rekap
  const balSepanjangMasa = useMemo(
    () => enrichedBalList.filter((item) => cocokFilter(item, true)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enrichedBalList, appliedFilters]
  );

  // Daftar petani untuk pilihan filter
  const petaniOptions = useMemo(() => {
    const peta = new Map<string, string>();
    enrichedBalList.forEach((b) => {
      if (b.petani_id && !peta.has(b.petani_id)) peta.set(b.petani_id, b.nama_petani || b.petani_id);
    });
    petaniList.forEach((pt) => {
      if (pt.petani_id && !peta.has(pt.petani_id)) peta.set(pt.petani_id, pt.nama_petani);
    });
    return [
      { value: 'ALL', label: 'Semua Petani' },
      ...Array.from(peta.entries())
        .map(([value, label]) => ({ value, label: `${label} (${value})` }))
        .sort((x, y) => x.label.localeCompare(y.label)),
    ];
  }, [enrichedBalList, petaniList]);

  // Keterangan filter untuk judul rekap dan Excel
  const konteksRekap = useMemo(() => {
    const f = appliedFilters;
    const petaniDipilih = f.petani !== 'ALL' ? petaniOptions.find((o) => o.value === f.petani)?.label : '';
    return [
      periodeInfo(f.startDate, f.endDate),
      petaniDipilih ? `Petani: ${petaniDipilih}` : '',
      f.kodeBal !== 'ALL' ? `Kode Bal: ${f.kodeBal}` : '',
    ].filter(Boolean).join(' · ');
  }, [appliedFilters, petaniOptions]);

  // Sorted Data based on sortConfigs
  const sortedData = useMemo(() => {
    if (sortConfigs.length === 0) {
      return [...filteredData].sort((a, b) => a.originalIndex - b.originalIndex);
    }

    return [...filteredData].sort((a, b) => {
      for (const config of sortConfigs) {
        let comparison = 0;
        switch (config.field) {
          case 'no_bal': {
            const balA = a.no_bal || a.barang_id || '';
            const balB = b.no_bal || b.barang_id || '';
            comparison = compareAlphanumeric(balA, balB);
            break;
          }
          case 'tanggal_masuk': {
            const dateA = a.tanggal_masuk || '';
            const dateB = b.tanggal_masuk || '';
            comparison = dateA.localeCompare(dateB);
            break;
          }
          case 'kode_grade': {
            const gradeA = a.kode_grade || '';
            const gradeB = b.kode_grade || '';
            comparison = gradeA.localeCompare(gradeB);
            break;
          }
          case 'berat_kg': {
            comparison = (a.berat_kg || 0) - (b.berat_kg || 0);
            break;
          }
          case 'berat_bruto_kg': {
            comparison = (a.berat_bruto_kg || 0) - (b.berat_bruto_kg || 0);
            break;
          }
          case 'harga_per_kg': {
            comparison = (a.harga_per_kg || 0) - (b.harga_per_kg || 0);
            break;
          }
          case 'total_harga': {
            comparison = (a.total_harga || 0) - (b.total_harga || 0);
            break;
          }
          case 'nama_petani': {
            const pA = a.nama_petani || '';
            const pB = b.nama_petani || '';
            comparison = pA.localeCompare(pB);
            break;
          }
          case 'ganti_tikar': {
            comparison = (a.ganti_tikar ? 1 : 0) - (b.ganti_tikar ? 1 : 0);
            break;
          }
          case 'status_stok': {
            const stA = a.status_stok || '';
            const stB = b.status_stok || '';
            comparison = stA.localeCompare(stB);
            break;
          }
        }
        
        if (comparison !== 0) {
          return config.direction === 'asc' ? comparison : -comparison;
        }
      }
      return a.originalIndex - b.originalIndex;
    });
  }, [filteredData, sortConfigs]);

  // Aggregation & KPI Totals
  const totals = useMemo(() => {
    let totalBal = sortedData.length;
    let totalBalLunas = 0;
    let totalNetto = 0;
    let totalBruto = 0;
    let totalTara = 0;
    let totalNilai = 0;
    let totalNilaiKredit = 0;
    let minBerat = sortedData.length > 0 ? Number.MAX_VALUE : 0;
    let maxBerat = 0;
    let minHarga = sortedData.length > 0 ? Number.MAX_VALUE : 0;
    let maxHarga = 0;

    sortedData.forEach((b) => {
      const netto = b.berat_kg || 0;
      // Berat dan nilai (aset) hanya dihitung dari bal yang sudah ditimbang dan kuponnya lunas
      if (netto <= 0) return;
      if (b.status_bayar === 'belum_lunas') {
        totalNilaiKredit += hitungNilaiBal(b);
        return;
      }
      totalBalLunas += 1;
      const bruto = b.berat_bruto_kg || 0;
      const tara = b.potongan_tara_kg || 0;
      const subtotal = hitungNilaiBal(b);
      const hrg = b.harga_per_kg || 0;

      totalNetto += netto;
      totalBruto += bruto;
      totalTara += tara;
      totalNilai += subtotal;

      if (netto < minBerat) minBerat = netto;
      if (netto > maxBerat) maxBerat = netto;
      if (hrg > 0 && hrg < minHarga) minHarga = hrg;
      if (hrg > maxHarga) maxHarga = hrg;
    });

    if (minBerat === Number.MAX_VALUE) minBerat = 0;
    if (minHarga === Number.MAX_VALUE) minHarga = 0;

    const avgNetto = totalBalLunas > 0 ? totalNetto / totalBalLunas : 0;
    const avgHargaKg = totalNetto > 0 ? totalNilai / totalNetto : 0;

    return {
      totalBal,
      totalBalLunas,
      totalNilaiKredit,
      totalNetto,
      totalBruto,
      totalTara,
      totalNilai,
      avgNetto,
      avgHargaKg,
      minBerat,
      maxBerat,
      minHarga,
      maxHarga,
    };
  }, [sortedData]);

  // Real-time table search within sorted results
  const searchedData = useMemo(() => {
    if (!tableSearch.trim()) return sortedData;
    const q = tableSearch.toLowerCase().trim();
    return sortedData.filter((item) => {
      const matchNoBal = (item.no_bal || '').toLowerCase().includes(q);
      const matchKodeBal = (item.kode_bal_prefix || '').toLowerCase().includes(q);
      const matchBarangId = (item.barang_id || '').toLowerCase().includes(q);
      const matchGrade = (item.kode_grade || '').toLowerCase().includes(q);
      const matchPetani = (item.nama_petani || item.petani_id || '').toLowerCase().includes(q);
      return matchNoBal || matchKodeBal || matchBarangId || matchGrade || matchPetani;
    });
  }, [sortedData, tableSearch]);

  // Pagination Slice
  const isShowAll = itemsPerPage === -1;
  const totalPages = isShowAll ? 1 : Math.max(1, Math.ceil(searchedData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    if (itemsPerPage === -1) {
      return searchedData;
    }
    const startIdx = (currentPage - 1) * itemsPerPage;
    return searchedData.slice(startIdx, startIdx + itemsPerPage);
  }, [searchedData, currentPage, itemsPerPage]);

  // Helper Badge Color for Grade
  const getGradeBadgeClass = (grade: string) => {
    const g = grade.trim().toUpperCase();
    if (g === 'A') return 'bg-zinc-900 text-white';
    if (g === 'B') return 'bg-zinc-800 text-zinc-100';
    if (g === 'C') return 'bg-blue-100 text-blue-900 font-bold';
    if (g === 'D') return 'bg-purple-100 text-purple-900 font-bold';
    if (g === 'E') return 'bg-gray-200 text-gray-800 font-bold';
    return 'bg-red-100 text-red-900 font-bold';
  };

  const getStatusBayarBadge = (statusBayar: string) => {
    if (statusBayar === 'lunas') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          Lunas
        </span>
      );
    }
    if (statusBayar === 'belum_lunas') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
          Belum Lunas
        </span>
      );
    }
    return <span className="text-[10px] text-gray-400">-</span>;
  };

  // Helper Badge Color for Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'proses_sortir':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            Proses Sortir
          </span>
        );
      case 'di_gudang':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Di Gudang
          </span>
        );
      case 'siap_kirim':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Siap Kirim DO
          </span>
        );
      case 'keluar':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-300">
            Dikirim
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  // Render Sort Header Icon - Single clean arrow when active
  const renderSortIndicator = (field: SortField) => {
    if (field === 'default') {
      if (sortConfigs.length === 0) return null;
      return (
        <button type="button" onClick={(e) => { e.stopPropagation(); setSortConfigs([]); }} className="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 px-2 py-0.5 rounded-sm transition ml-2 cursor-pointer font-semibold border border-red-200">
          Reset Urutan
        </button>
      );
    }

    const configIndex = sortConfigs.findIndex(c => c.field === field);
    const config = sortConfigs[configIndex];
    return (
      <SortIcon
        aktif={configIndex !== -1}
        arah={config?.direction ?? 'asc'}
        urutan={configIndex !== -1 && sortConfigs.length > 1 ? configIndex + 1 : undefined}
      />
    );
  };

  // Export Excel
  const handleExportExcel = () => {
    if (sortedData.length === 0) return;

    const f = appliedFilters;
    const rentang = (label: string, min: string, max: string, satuan: string) =>
      min || max ? `${label}: ${min || '0'} s.d. ${max || '∞'} ${satuan}` : '';
    const info = [
      periodeInfo(f.startDate, f.endDate),
      [
        `Grade: ${f.grade !== 'ALL' ? f.grade : 'Semua'}`,
        f.kodeBal !== 'ALL' ? `Kode Bal: ${f.kodeBal}` : '',
        f.petani !== 'ALL' ? `Petani: ${petaniOptions.find((o) => o.value === f.petani)?.label || f.petani}` : '',
        f.gantiTikar !== 'ALL' ? `Tikar: ${String(f.gantiTikar).toLowerCase() === 'ya' ? 'Ganti Tikar' : 'Standar'}` : '',
        `Status Stok: ${f.statusStok !== 'ALL' ? labelStatusStok(f.statusStok) : 'Semua'}`,
        `Status Bayar: ${f.statusBayar === 'lunas' ? 'Lunas' : f.statusBayar === 'belum_lunas' ? 'Belum Lunas' : 'Semua'}`,
        rentang('Berat', f.minBerat, f.maxBerat, 'kg'),
        rentang('Harga', f.minHarga, f.maxHarga, 'Rp/kg'),
        f.search ? `Pencarian: ${f.search}` : '',
      ].filter(Boolean).join(' · '),
    ];

    const totalPotongan = sortedData.reduce((sum, b) => sum + (b.potongan || 0), 0);

    downloadExcelReport(`Laporan_Detail_Bal_${todayStamp()}`, [
      {
        name: 'Detail Bal',
        title: 'Laporan Detail Bal Tembakau',
        info,
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'Tanggal Masuk', type: 'date' },
          { header: 'No Bal', align: 'center' },
          { header: 'Grade', align: 'center' },
          { header: 'Petani' },
          { header: 'Kupon', align: 'center' },
          { header: 'Ganti Tikar', align: 'center' },
          { header: 'Bruto (Kg)', type: 'kg' },
          { header: 'Netto (Kg)', type: 'kg' },
          { header: 'Harga Beli (Rp/Kg)', type: 'rupiah' },
          { header: 'Total Harga Beli (Rp)', type: 'rupiah' },
          { header: 'Potongan (Rp)', type: 'rupiah' },
          { header: 'Status Bayar', align: 'center' },
          { header: 'Status Stok', align: 'center' },
        ],
        rows: sortedData.map((b, idx) => {
          // Bal proses sortir belum punya berat dan nilai
          const ditimbang = (b.berat_kg || 0) > 0;
          return [
            idx + 1,
            b.tanggal_masuk,
            b.no_bal || '-',
            b.kode_grade || '-',
            b.nama_petani || '-',
            b.no_kupon || '-',
            b.ganti_tikar ? 'Ganti Tikar' : 'Standar',
            ditimbang ? b.berat_bruto_kg || 0 : '-',
            ditimbang ? b.berat_kg : '-',
            b.harga_per_kg || 0,
            ditimbang ? b.total_harga || 0 : '-',
            b.potongan || 0,
            b.status_bayar === 'lunas' ? 'Lunas' : b.status_bayar === 'belum_lunas' ? 'Belum Lunas' : '-',
            labelStatusStok(b.status_stok),
          ];
        }),
        totalRow: [
          `TOTAL LUNAS (${totals.totalBalLunas} dari ${totals.totalBal} bal)`, '', '', '', '', '', '',
          totals.totalBruto,
          totals.totalNetto,
          totals.avgHargaKg,
          totals.totalNilai,
          totalPotongan,
          '', '',
        ],
      },
      {
        name: 'Rekap Kode Bal',
        title: 'Rekap Jumlah Bal per Kode',
        info: [...info, 'Jumlah bal mencakup semua bal (termasuk yang belum ditimbang dan belum dibayar); berat dan nilai hanya dari bal yang sudah ditimbang dan lunas.'],
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'Kode Bal', align: 'center' },
          { header: 'Total Bal', type: 'integer' },
          { header: 'Belum Ditimbang', type: 'integer' },
          { header: 'Ditimbang, Belum Lunas', type: 'integer' },
          { header: 'Lunas', type: 'integer' },
          { header: 'Berat Bruto Lunas (Kg)', type: 'kg' },
          { header: 'Berat Netto Lunas (Kg)', type: 'kg' },
          { header: 'AVG Harga (Rp/Kg)', type: 'rupiah' },
          { header: 'Total Nilai Lunas (Rp)', type: 'rupiah' },
          { header: 'Total Bal Sepanjang Masa', type: 'integer' },
        ],
        rows: (() => {
          const semua = new Map(rekapPerKode(balSepanjangMasa).map((r) => [r.kode, r] as const));
          return rekapPerKode(filteredData).map((r, idx) => [
            idx + 1, r.kode, r.total, r.belumTimbang, r.kredit, r.lunas, r.brutoLunas, r.nettoLunas, rataHargaRekap(r), r.nilaiLunas, semua.get(r.kode)?.total ?? r.total,
          ]);
        })(),
        totalRow: (() => {
          const t = totalRekapKode(rekapPerKode(filteredData));
          return ['TOTAL', '', t.total, t.belumTimbang, t.kredit, t.lunas, t.brutoLunas, t.nettoLunas, rataHargaRekap(t), t.nilaiLunas, totalRekapKode(rekapPerKode(balSepanjangMasa)).total];
        })(),
      },
    ]);
  };

  return (
    <div className="space-y-4 font-sans text-gray-800 animate-in fade-in duration-150">
      
      {/* 1. Header Banner */}
      <div className="bg-white p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#b81d24] text-white rounded-sm flex items-center justify-center shadow-xs shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 font-bold text-[10px] rounded-none uppercase tracking-wider">
                LAPORAN INVENTARIS FISIK
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                {COMPANY_NAME}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              Laporan Detail Bal Tembakau
            </h1>
          </div>
        </div>

        {/* Action Buttons: Tampilan (Filter / Ringkasan / Fokus Tabel) dan Excel */}
        <div className="flex flex-wrap items-center gap-2">
          <LaporanTampilanToggle tampilan={tampilan} jumlahFilterAktif={jumlahFilterAktif} />

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={sortedData.length === 0}
            className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-sm font-semibold text-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
            title="Download laporan dalam format Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Ringkasan & Sub-Ringkasan Grade (Di atas Filter Data); bisa disembunyikan lewat toolbar Tampilan */}
      {showSummaryCards && (
      <div className="bg-white border border-gray-200 shadow-xs">
        <div className="px-4 py-3 bg-[#f8f9fa] border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#b81d24]" />
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Ringkasan & Metrik Analisis Bal Tembakau
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-gray-700 border border-gray-300 rounded-xs">
              {totals.totalBal} Bal Terdata
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <p className="text-[11px] text-gray-500 font-medium">
              Total Tonase: <strong className="text-gray-900 font-mono">{totals.totalNetto.toFixed(1)} kg</strong> ({(totals.totalNetto / 1000).toFixed(2)} Ton)
            </p>
          </div>
        </div>

        {/* Collapsible Content */}
        {showSummaryCards && (
          <div className="overflow-hidden">
            <div className="p-4 space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Card 1: Total Bal */}
            <div className="bg-white p-3.5 border border-gray-200 rounded-none shadow-xs space-y-1 hover:border-gray-300 transition">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                <span>Total Populasi Bal</span>
                <Package className="w-4 h-4 text-slate-700" />
              </div>
              <div className="text-xl font-bold font-mono text-gray-950">
                {totals.totalBal.toLocaleString('id-ID')}{' '}
                <span className="text-xs font-normal text-gray-500 font-sans">Bal</span>
              </div>
              <div className="text-[10px] text-gray-500">
                Terfilter dari {barangList.length} total bal master
              </div>
            </div>

            {/* Card 2: Total Tonase Netto */}
            <div className="bg-white p-3.5 border border-gray-200 rounded-none shadow-xs space-y-1 bg-blue-50/20 hover:border-blue-300 transition">
              <div className="flex items-center justify-between text-blue-900 text-[11px] font-semibold">
                <span>Total Berat Netto (Lunas)</span>
                <Scale className="w-4 h-4 text-blue-700" />
              </div>
              <div className="text-xl font-black font-mono text-blue-950">
                {totals.totalNetto.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                <span className="text-xs font-bold text-blue-700 font-sans">Kg</span>
              </div>
              <div className="text-[10px] text-blue-800 font-medium">
                ≈ {(totals.totalNetto / 1000).toFixed(2)} Ton (Bruto: {totals.totalBruto.toFixed(1)} kg)
              </div>
            </div>

            {/* Card 3: Rata-rata Berat / Bal */}
            <div className="bg-white p-3.5 border border-gray-200 rounded-none shadow-xs space-y-1 hover:border-gray-300 transition">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                <span>Rata-rata Berat / Bal</span>
                <TrendingUp className="w-4 h-4 text-slate-700" />
              </div>
              <div className="text-xl font-bold font-mono text-gray-950">
                {totals.avgNetto.toFixed(1)}{' '}
                <span className="text-xs font-normal text-gray-500 font-sans">Kg/bal</span>
              </div>
              <div className="text-[10px] text-gray-500">
                Min: {totals.minBerat.toFixed(1)} kg • Max: {totals.maxBerat.toFixed(1)} kg
              </div>
            </div>

            {/* Card 4: Rata-rata Harga Beli */}
            <div className="bg-white p-3.5 border border-gray-200 rounded-none shadow-xs space-y-1 hover:border-gray-300 transition">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                <span>Rata-rata Harga Beli</span>
                <DollarSign className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-900">
                Rp {Math.round(totals.avgHargaKg).toLocaleString('id-ID')}{' '}
                <span className="text-xs font-normal text-gray-500 font-sans">/kg</span>
              </div>
              <div className="text-[10px] text-gray-500">
                Min: Rp {totals.minHarga.toLocaleString('id-ID')} • Max: Rp {totals.maxHarga.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Card 5: Total Nilai Pembelian */}
            <div className="bg-white p-3.5 border border-gray-200 rounded-none shadow-xs space-y-1 bg-red-50/20 col-span-2 sm:col-span-1 hover:border-red-300 transition">
              <div className="flex items-center justify-between text-[#b81d24] text-[11px] font-bold">
                <span>Total Nilai Pembelian (Lunas)</span>
                <DollarSign className="w-4 h-4 text-[#b81d24]" />
              </div>
              <div className="text-lg sm:text-xl font-black font-mono text-[#b81d24]">
                Rp {Math.round(totals.totalNilai).toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-gray-600 font-medium">
                Hanya bal lunas • Kredit: Rp {Math.round(totals.totalNilaiKredit).toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
      )}

      {/* 3. Collapsible Filter Control Section */}
      {isFilterPanelOpen && (
        <div className="overflow-hidden">
          <div className="bg-white p-4 border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Filter Data & Parameter Analisis Bal
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[11px] text-red-700 hover:text-red-900 font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Semua Filter</span>
          </button>
        </div>

        <form onSubmit={handleApplyFilters} className="space-y-3">
          <PresetTanggal startDate={filterStartDate} endDate={filterEndDate} onPilih={handlePilihRentang} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            
            {/* Filter 1: Tanggal Dari */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Tanggal Masuk Dari
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            {/* Filter 2: Tanggal Sampai */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Tanggal Sampai
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            {/* Filter 3: Kode Grade / Beli */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Kode Grade / Beli
              </label>
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">Semua Grade</option>
                {uniqueGrades.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Petani: jumlah bal per kode untuk satu petani (hari itu atau sepanjang masa) */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Petani
              </label>
              <SearchableSelect
                value={filterPetani}
                onChange={(val) => setFilterPetani(val || 'ALL')}
                options={petaniOptions}
                placeholder="Semua Petani"
              />
            </div>

            {/* Filter 3b: Kode Bal */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Kode Bal
              </label>
              <select
                value={filterKodeBal}
                onChange={(e) => setFilterKodeBal(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">Semua Kode Bal</option>
                {uniqueKodeBal.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 4: Status Stok */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Status Stok Bal
              </label>
              <select
                value={filterStatusStok}
                onChange={(e) => setFilterStatusStok(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">Semua Status</option>
                <option value="proses_sortir">Proses Sortir</option>
                <option value="di_gudang">Di Gudang</option>
                <option value="keluar">Dikirim</option>
              </select>
            </div>

            {/* Filter 4b: Status Bayar */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Status Bayar
              </label>
              <select
                value={filterStatusBayar}
                onChange={(e) => setFilterStatusBayar(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">Semua Status Bayar</option>
                <option value="lunas">Lunas</option>
                <option value="belum_lunas">Belum Lunas</option>
              </select>
            </div>

            {/* Filter 4c: Ganti Tikar */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Ganti Tikar
              </label>
              <select
                id="filter-ganti-tikar"
                value={filterGantiTikar}
                onChange={(e) => setFilterGantiTikar(e.target.value as 'ALL' | 'ya' | 'tidak')}
                className="w-full px-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">Semua Tikar</option>
                <option value="ya">Ganti Tikar (Ya)</option>
                <option value="tidak">Tidak Ganti (Standar)</option>
              </select>
            </div>

            {/* Filter 5: Search Keyword */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Cari No Bal / Petani / Kupon
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="No bal, petani, barcode..."
                  className="w-full pl-8 pr-2 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Sub-Row: Min/Max Berat & Harga Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-gray-500 whitespace-nowrap">Rentang Berat (kg):</span>
              <input
                type="number"
                placeholder="Min"
                value={filterMinBerat}
                onChange={(e) => setFilterMinBerat(e.target.value)}
                className="w-20 px-2 py-1 bg-white border border-gray-300 rounded-none text-xs"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filterMaxBerat}
                onChange={(e) => setFilterMaxBerat(e.target.value)}
                className="w-20 px-2 py-1 bg-white border border-gray-300 rounded-none text-xs"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-gray-500 whitespace-nowrap">Rentang Harga (Rp):</span>
              <input
                type="number"
                placeholder="Min Rp"
                value={filterMinHarga}
                onChange={(e) => setFilterMinHarga(e.target.value)}
                className="w-24 px-2 py-1 bg-white border border-gray-300 rounded-none text-xs"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max Rp"
                value={filterMaxHarga}
                onChange={(e) => setFilterMaxHarga(e.target.value)}
                className="w-24 px-2 py-1 bg-white border border-gray-300 rounded-none text-xs"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-end space-x-2">
              <button
                type="submit"
                className="px-5 py-1.5 bg-[#b81d24] hover:bg-[#a0181e] text-white font-bold text-xs rounded-sm shadow-xs transition cursor-pointer flex items-center space-x-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Terapkan Filter</span>
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>
      )}

      {/* Rekap jumlah bal per kode / per petani; ikut disembunyikan oleh tombol Ringkasan */}
      {tampilan.tampilRingkasan && (
        <LaporanBalRekap
          rows={filteredData}
          rowsSepanjangMasa={balSepanjangMasa}
          adaFilterTanggal={Boolean(appliedFilters.startDate || appliedFilters.endDate)}
          konteks={konteksRekap}
        />
      )}

      {/* 4. Main Table: Detail Setiap Bal */}
      <div className="bg-white border border-gray-200 rounded-sm shadow-xs overflow-hidden">
        
        {/* Table Header Info Bar */}
        <div className="p-3 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-gray-600 font-medium">Tampil</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-gray-300 rounded-sm text-xs font-semibold text-gray-800 shadow-2xs focus:outline-hidden focus:border-[#b81d24] cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
              <span className="text-gray-500 hidden sm:inline">per hal.</span>
            </div>

            <span className="text-[11px] text-gray-500 font-medium">
              {tableSearch.trim() ? (
                <>Ditemukan: <strong className="text-gray-900">{searchedData.length}</strong> dari {sortedData.length} bal</>
              ) : (
                <>Total: <strong className="text-gray-900">{sortedData.length}</strong> bal terfilter</>
              )}
            </span>

            {sortConfigs.length > 0 && (
              <div className="inline-flex items-center space-x-1.5 ml-1 flex-wrap gap-y-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase mr-0.5">Urutan:</span>
                {sortConfigs.map((config, idx) => (
                  <span key={config.field} className="px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold rounded-xs flex items-center space-x-1">
                    <span>{idx + 1}. {config.field.replace(/_/g, ' ').toUpperCase()}</span>
                    <span>({config.direction === 'asc' ? 'TERENDAH / A-Z' : 'TERTINGGI / Z-A'})</span>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSortConfigs([]);
                  }}
                  className="px-1.5 py-0.5 text-[10px] font-bold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xs flex items-center space-x-1 cursor-pointer"
                  title="Reset urutan ke default"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset Urutan</span>
                </button>
              </div>
            )}
          </div>

          {/* Kolom Pencarian (Search Bar) Utama Bal */}
          <div className="w-full sm:w-80 md:w-96">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="search-laporan-bal-table-input"
                type="text"
                placeholder="Cari cepat (No Bal, Grade, Petani, Gudang, DO)..."
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-sm pl-8 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] transition shadow-2xs"
              />
              {tableSearch && (
                <button
                  type="button"
                  id="btn-clear-search-laporan-bal-table"
                  onClick={() => {
                    setTableSearch('');
                    setCurrentPage(1);
                  }}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f1f3f5] border-b-2 border-gray-300 text-gray-800 font-bold uppercase tracking-wider text-[11px]">
                
                {/* 1. No */}
                <th
                  onClick={() => handleHeaderSort('default')}
                  className="py-2.5 px-2.5 text-center border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition w-12 group select-none"
                  title="Klik untuk reset urutan default"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>No</span>
                    {sortConfigs.length > 0 && renderSortIndicator('default')}
                  </div>
                </th>

                {/* 2. No Bal (Alphanumeric Natural Sort) */}
                <th
                  onClick={() => handleHeaderSort('no_bal')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none bg-slate-100/50 w-28 whitespace-nowrap"
                  title="Klik untuk urutkan No Bal dari alfabet lalu angka"
                >
                  <div className="flex items-center justify-between space-x-1.5">
                    <span className="text-gray-950 font-black">No. Bal</span>
                    {renderSortIndicator('no_bal')}
                  </div>
                </th>

                {/* 3. Tanggal Masuk */}
                <th
                  onClick={() => handleHeaderSort('tanggal_masuk')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Tanggal Masuk"
                >
                  <div className="flex items-center justify-between space-x-1">
                    <span>Tanggal Masuk</span>
                    {renderSortIndicator('tanggal_masuk')}
                  </div>
                </th>

                {/* 4. Grade */}
                <th
                  onClick={() => handleHeaderSort('kode_grade')}
                  className="py-2.5 px-2.5 text-center border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Grade"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Grade</span>
                    {renderSortIndicator('kode_grade')}
                  </div>
                </th>

                {/* 5. Petani / Supplier & Kupon */}
                <th
                  onClick={() => handleHeaderSort('nama_petani')}
                  className="py-2.5 px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Nama Petani"
                >
                  <div className="flex items-center justify-between space-x-1">
                    <span>Petani / Supplier</span>
                    {renderSortIndicator('nama_petani')}
                  </div>
                </th>

                {/* 6. Ganti Tikar */}
                <th
                  onClick={() => handleHeaderSort('ganti_tikar')}
                  className="py-2.5 px-2.5 text-center border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none whitespace-nowrap"
                  title="Klik untuk urutkan Status Ganti Tikar"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Ganti Tikar</span>
                    {renderSortIndicator('ganti_tikar')}
                  </div>
                </th>

                {/* 7. Berat Bruto (kg) */}
                <th
                  onClick={() => handleHeaderSort('berat_bruto_kg')}
                  className="py-2.5 px-3 text-right border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Berat Bruto"
                >
                  <div className="flex items-center justify-end space-x-1">
                    {renderSortIndicator('berat_bruto_kg')}
                    <span>Bruto (kg)</span>
                  </div>
                </th>

                {/* 8. Berat Netto (kg) [PRIMARY SORT TARGET] */}
                <th
                  onClick={() => handleHeaderSort('berat_kg')}
                  className="py-2.5 px-3 text-right border-r border-gray-200 cursor-pointer hover:bg-blue-100 transition group select-none bg-blue-50/70"
                  title="Klik untuk urutkan Paling Berat / Paling Ringan"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    {renderSortIndicator('berat_kg')}
                    <span className="text-blue-950 font-black">Netto (kg)</span>
                  </div>
                </th>

                {/* 10. Harga Beli / kg (Rp) [PRIMARY SORT TARGET] */}
                <th
                  onClick={() => handleHeaderSort('harga_per_kg')}
                  className="py-2.5 px-3 text-right border-r border-gray-200 cursor-pointer hover:bg-emerald-100 transition group select-none bg-emerald-50/70"
                  title="Klik untuk urutkan Harga Terendah ke Tertinggi"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-emerald-950 font-black">Harga/kg (Rp)</span>
                    {renderSortIndicator('harga_per_kg')}
                  </div>
                </th>

                {/* 11. Total Harga Beli (Rp) [PRIMARY SORT TARGET] */}
                <th
                  onClick={() => handleHeaderSort('total_harga')}
                  className="py-2.5 px-3 text-right border-r border-gray-200 cursor-pointer hover:bg-red-100 transition group select-none bg-red-50/70"
                  title="Klik untuk urutkan Total Harga Beli"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-[#b81d24] font-black">Total Harga (Rp)</span>
                    {renderSortIndicator('total_harga')}
                  </div>
                </th>

                {/* 12. Status Bayar */}
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Status Bayar</th>

                {/* 13. Status Bal */}
                <th
                  onClick={() => handleHeaderSort('status_stok')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-gray-200/80 transition group select-none"
                  title="Klik untuk urutkan Status Bal"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Status</span>
                    {renderSortIndicator('status_stok')}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-gray-500 bg-white">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Package className="w-8 h-8 text-gray-300" />
                      <p className="font-semibold text-gray-700">Tidak ada data bal yang cocok dengan filter.</p>
                      <p className="text-[11px] text-gray-400">Silakan ubah parameter pencarian atau klik reset filter.</p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-2 px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-sm shadow-2xs transition cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((bal, idx) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  const dateStr = bal.tanggal_masuk ? bal.tanggal_masuk.split('T')[0] : '-';
                  // Bal proses sortir belum punya berat dan nilai
                  const ditimbang = (bal.berat_kg || 0) > 0;

                  return (
                    <tr
                      key={bal.barang_id || idx}
                      className={`transition-colors border-b border-gray-100 hover:bg-amber-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}
                    >
                      {/* 1. No */}
                      <td className="py-2 px-2.5 text-center font-mono text-gray-500 border-r border-gray-100">
                        {rowNumber}
                      </td>

                      {/* 2. No Bal */}
                      <td className="py-2 px-3 font-mono font-black text-gray-950 border-r border-gray-100 whitespace-nowrap bg-slate-50/40 w-28">
                        <span className="hover:underline cursor-pointer">
                          {bal.no_bal || bal.barang_id}
                        </span>
                        {bal.kode_bal_pembeli && (
                          <span className="block text-[10px] text-gray-400 font-normal">
                            Ref: {bal.kode_bal_pembeli}
                          </span>
                        )}
                      </td>

                      {/* 3. Tanggal Masuk */}
                      <td className="py-2 px-3 font-mono text-gray-700 border-r border-gray-100 whitespace-nowrap text-[11px]">
                        {dateStr}
                      </td>

                      {/* 4. Grade */}
                      <td className="py-2 px-2.5 text-center border-r border-gray-100 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-xs ${getGradeBadgeClass(
                            bal.kode_grade || '-'
                          )}`}
                        >
                          {bal.kode_grade || '-'}
                        </span>
                      </td>

                      {/* 5. Petani / Supplier */}
                      <td className="py-2 px-3 border-r border-gray-100">
                        <div className="font-semibold text-gray-900 truncate max-w-[140px]" title={bal.nama_petani}>
                          {bal.nama_petani || '-'}
                        </div>
                        {bal.no_kupon && bal.no_kupon !== '-' && (
                          <span className="text-[10px] text-blue-700 font-mono">
                            Kupon: {bal.no_kupon}
                          </span>
                        )}
                      </td>

                      {/* 6. Ganti Tikar */}
                      <td className="py-2 px-2.5 text-center border-r border-gray-100 whitespace-nowrap">
                        {bal.ganti_tikar ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Ganti Tikar
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-500 font-medium">
                            Tidak
                          </span>
                        )}
                      </td>

                      {/* 7. Bruto */}
                      <td className="py-2 px-3 text-right font-mono text-gray-700 border-r border-gray-100 whitespace-nowrap">
                        {ditimbang ? (bal.berat_bruto_kg || 0).toFixed(1) : '-'}
                      </td>

                      {/* 8. Netto [HIGHLIGHT] */}
                      <td className="py-2 px-3 text-right font-mono font-black text-blue-950 border-r border-gray-100 bg-blue-50/30 whitespace-nowrap">
                        {ditimbang ? (
                          <>
                            {(bal.berat_kg || 0).toFixed(1)} <span className="text-[10px] font-normal text-gray-500">kg</span>
                          </>
                        ) : (
                          <span className="font-normal text-gray-400">-</span>
                        )}
                      </td>

                      {/* 10. Harga/kg [HIGHLIGHT] */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900 border-r border-gray-100 bg-emerald-50/20 whitespace-nowrap">
                        Rp {Math.round(bal.harga_per_kg || 0).toLocaleString('id-ID')}
                      </td>

                      {/* 11. Total Harga [HIGHLIGHT] */}
                      <td className="py-2 px-3 text-right font-mono font-black text-[#b81d24] border-r border-gray-100 bg-red-50/30 whitespace-nowrap">
                        {ditimbang ? `Rp ${Math.round(bal.total_harga || 0).toLocaleString('id-ID')}` : <span className="font-normal text-gray-400">-</span>}
                      </td>

                      {/* 12. Status Bayar */}
                      <td className="py-2 px-3 text-center whitespace-nowrap border-r border-gray-100">
                        {getStatusBayarBadge(bal.status_bayar)}
                      </td>

                      {/* 13. Status */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {getStatusBadge(bal.status_stok || 'di_gudang')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Totals */}
            {sortedData.length > 0 && (
              <tfoot className="bg-slate-200/95 text-gray-950 font-extrabold text-xs border-t-2 border-gray-300">
                <tr>
                  <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider border-r border-gray-300 bg-gray-200/80">
                    TOTAL LUNAS ({totals.totalBalLunas} DARI {totals.totalBal} BAL):
                  </td>
                  <td className="py-3 px-3 text-right font-mono border-r border-gray-300 whitespace-nowrap">
                    {totals.totalBruto.toFixed(1)} kg
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-blue-950 border-r border-gray-300 whitespace-nowrap bg-blue-100/70 font-black">
                    {totals.totalNetto.toFixed(1)} kg
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-950 border-r border-gray-300 whitespace-nowrap bg-emerald-100/70 font-bold">
                    Rata²: Rp {Math.round(totals.avgHargaKg).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#b81d24] border-r border-gray-300 whitespace-nowrap bg-red-100 font-black text-sm">
                    Rp {Math.round(totals.totalNilai).toLocaleString('id-ID')}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-center bg-gray-200/80 text-[11px] text-gray-700">
                    Bal belum lunas tidak dihitung
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Bar */}
        {searchedData.length > 0 && (
          <div className="p-3 bg-[#f8f9fa] border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 font-medium">Tampil</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-gray-300 rounded-sm text-xs font-semibold text-gray-800 shadow-2xs focus:outline-hidden focus:border-[#b81d24] cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
              {itemsPerPage === -1 && (
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200 font-semibold">
                  Semua {searchedData.length} bal ditampilkan dalam 1 halaman
                </span>
              )}
            </div>

            {itemsPerPage !== -1 && totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => setCurrentPage(p)}
              />
            )}
          </div>
        )}
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

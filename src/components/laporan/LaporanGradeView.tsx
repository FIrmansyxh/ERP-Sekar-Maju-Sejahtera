import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { 
  Tag, 
  Download, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  X,
  ChevronDown, ChevronUp,
  ChevronRight,
  Warehouse,
  Truck,
  Layers,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { 
  TabelHarga, 
  MasterHargaJual,
  Barang, 
  TransaksiPembelian, 
  PengirimanBarang, 
  PengirimanSample, 
  UserRole 
} from '../../types';
import { formatNumber, formatRupiah } from '../../utils/formatters';
import { downloadExcelReport, labelStatusStok, todayStamp } from '../../utils/excelExport';
import { isTransaksiLunas } from '../../utils/statusBayar';
import { COMPANY_NAME } from '../../config/appInfo';
import { useLaporanTampilan } from '../../hooks/useLaporanTampilan';
import { LaporanTampilanToggle } from './LaporanTampilanToggle';
import { SortIcon } from '../common/SortIcon';

// Keep export for DashboardAnalyticView compatibility
export const GRADE_PALETTE = [
  { name: 'Hitam', bg: 'bg-zinc-900', text: 'text-zinc-900', border: 'border-zinc-900', hex: '#18181b', badgeBg: 'bg-zinc-900 text-white', lightBg: 'bg-zinc-100 text-zinc-900 border-zinc-300' },
];

export function getGradePalette(_index?: number) {
  return { name: 'Hitam', bg: 'bg-zinc-900', text: 'text-zinc-900', border: 'border-zinc-900', hex: '#18181b', badgeBg: 'bg-zinc-900 text-white', lightBg: 'bg-zinc-100 text-zinc-900 border-zinc-300' };
}

export interface LaporanGradeViewProps {
  hargaList: TabelHarga[];
  hargaJualList?: MasterHargaJual[];
  barangList: Barang[];
  transaksiList?: TransaksiPembelian[];
  pengirimanList?: PengirimanBarang[];
  sampleList?: PengirimanSample[];
  userRole?: UserRole;
  initialTab?: 'beli' | 'jual';
  onNavigateToHarga?: () => void;
  onNavigateToHargaJual?: () => void;
}

export interface BalDetailItem {
  barang_id: string;
  no_bal: string;
  kode_bal_pembeli?: string;
  nama_petani?: string;
  tanggal: string;
  berat_bruto: number;
  berat_netto: number;
  harga_per_kg: number;
  total_nilai: number;
  status_stok: string;
  is_gudang: boolean;
  is_kirim: boolean;
  no_surat_jalan?: string;
}

export interface LaporanHargaRow {
  kode: string;
  nama_grade: string;
  harga_nominal: number;
  jumlah_bal: number;
  berat_bruto: number;
  berat_netto: number;
  total_nilai: number;
  bal_gudang: number;
  netto_gudang: number;
  persen_gudang: number;
  bal_kirim: number;
  netto_kirim: number;
  persen_kirim: number;
  bal_items: BalDetailItem[];
}

export const LaporanGradeView: React.FC<LaporanGradeViewProps> = ({
  hargaList = [],
  hargaJualList = [],
  barangList = [],
  transaksiList = [],
  pengirimanList = [],
  initialTab = 'beli',
}) => {
  const [activeTab, setActiveTab] = useState<'beli' | 'jual'>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedKode, setExpandedKode] = useState<string | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<keyof LaporanHargaRow>('jumlah_bal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // Kartu visual per grade (ringkasan) bisa disembunyikan agar tabel lebih luas; pilihan diingat
  const tampilan = useLaporanTampilan('grade', { filter: false });
  const showGradeSummary = tampilan.tampilRingkasan;

  // Ref for table scrolling container
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // Scroll Position State for Scroll-To-Top and Scroll-To-Bottom buttons (sama persis seperti pada Laporan Pembelian)
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const mainEl = document.querySelector('main');
      const tableEl = tableContainerRef.current;

      const scrollY = window.scrollY || document.documentElement.scrollTop || mainEl?.scrollTop || tableEl?.scrollTop || 0;
      const windowHeight = window.innerHeight || mainEl?.clientHeight || tableEl?.clientHeight || document.documentElement.clientHeight;
      const docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        mainEl?.scrollHeight || 0,
        tableEl?.scrollHeight || 0
      );

      // Sembunyikan ketika di paling atas (<= 100px) ATAU ketika sudah di paling bawah (>= docHeight - 80px)
      // Muncul kembali ketika di-scroll ke atas dari bawah atau di-scroll ke bawah dari atas
      const isAtTop = scrollY <= 100;
      const isAtBottom = scrollY + windowHeight >= docHeight - 80;

      setShowScrollButtons(!isAtTop && !isAtBottom);
    };

    const mainEl = document.querySelector('main');
    const tableEl = tableContainerRef.current;

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    if (mainEl) mainEl.addEventListener('scroll', handleScroll, { passive: true });
    if (tableEl) tableEl.addEventListener('scroll', handleScroll, { passive: true });

    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (mainEl) mainEl.removeEventListener('scroll', handleScroll);
      if (tableEl) tableEl.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        top: tableContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({
        top: mainEl.scrollHeight,
        behavior: 'smooth',
      });
    }
    window.scrollTo({
      top: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      behavior: 'smooth',
    });
  };

  // Set of shipped barang IDs from pengiriman
  const shippedBarangIds = useMemo(() => {
    const ids = new Set<string>();
    pengirimanList.forEach((p) => {
      if (p.barang_ids && Array.isArray(p.barang_ids)) {
        p.barang_ids.forEach((id) => ids.add(id));
      }
    });
    return ids;
  }, [pengirimanList]);

  // Surat jalan lookup
  const barangToSuratJalan = useMemo(() => {
    const map = new Map<string, string>();
    pengirimanList.forEach((p) => {
      if (p.barang_ids && Array.isArray(p.barang_ids)) {
        p.barang_ids.forEach((id) => {
          map.set(id, p.no_surat_jalan);
        });
      }
    });
    return map;
  }, [pengirimanList]);

  // Map of kode harga jual from pengiriman
  const barangToKodeHargaJual = useMemo(() => {
    const map = new Map<string, string>();
    pengirimanList.forEach((p) => {
      if (p.kode_harga_jual_map) {
        Object.entries(p.kode_harga_jual_map).forEach(([bId, kode]) => {
          if (kode) map.set(bId, String(kode));
        });
      }
    });
    return map;
  }, [pengirimanList]);

  // Consolidate all bal records
  const allBalItems = useMemo<BalDetailItem[]>(() => {
    const itemsMap = new Map<string, BalDetailItem>();

    // 1. Add from barangList
    barangList.forEach((b) => {
      const isShipped = 
        b.status_stok === 'keluar' || 
        Boolean(b.tanggal_keluar) || 
        Boolean(b.pengiriman_id) || 
        shippedBarangIds.has(b.barang_id);

      const isGudang = !isShipped;
      const netto = b.berat_kg || 0;
      const bruto = b.berat_bruto_kg || (netto + (b.potongan_tara_kg || 0));
      const harga = b.harga_per_kg || 0;
      const nilai = b.total_harga || (netto * harga);

      itemsMap.set(b.barang_id, {
        barang_id: b.barang_id,
        no_bal: b.no_bal || '-',
        kode_bal_pembeli: b.kode_bal_pembeli,
        nama_petani: b.nama_petani || '-',
        tanggal: b.tanggal_masuk || '',
        berat_bruto: bruto,
        berat_netto: netto,
        harga_per_kg: harga,
        total_nilai: nilai,
        status_stok: isShipped ? 'keluar' : (b.status_stok || 'di_gudang'),
        is_gudang: isGudang,
        is_kirim: isShipped,
        no_surat_jalan: barangToSuratJalan.get(b.barang_id) || '',
      });
    });

    // 2. Also check if any transaction items are not yet in barangList
    transaksiList.forEach((tx) => {
      // Kupon yang belum dibayar masih kredit, belum masuk nilai laporan
      if (!isTransaksiLunas(tx)) return;
      if (tx.items && tx.items.length > 0) {
        tx.items.forEach((it) => {
          const id = it.barang_id || `${tx.transaksi_id}-${it.item_id}`;
          if (!itemsMap.has(id)) {
            const isShipped = shippedBarangIds.has(id);
            const isGudang = !isShipped;
            const netto = it.berat_kg || 0;
            const bruto = it.berat_bruto_kg || (netto + (it.potongan_tara_kg || 0));
            const harga = it.harga_per_kg || tx.harga_per_kg || 0;
            const nilai = it.subtotal_bersih || (netto * harga);

            itemsMap.set(id, {
              barang_id: id,
              no_bal: it.no_bal || '-',
              kode_bal_pembeli: it.kode_bal_pembeli,
              nama_petani: tx.nama_petani || '-',
              tanggal: tx.tanggal_transaksi || '',
              berat_bruto: bruto,
              berat_netto: netto,
              harga_per_kg: harga,
              total_nilai: nilai,
              status_stok: isShipped ? 'keluar' : 'di_gudang',
              is_gudang: isGudang,
              is_kirim: isShipped,
              no_surat_jalan: barangToSuratJalan.get(id) || '',
            });
          }
        });
      }
    });

    return Array.from(itemsMap.values());
  }, [barangList, transaksiList, shippedBarangIds, barangToSuratJalan]);

  // Master Lookup for Harga Beli
  const masterHargaBeliMap = useMemo(() => {
    const map = new Map<string, TabelHarga>();
    hargaList.forEach((h) => {
      const code = (h.kode_grade || '').trim().toUpperCase();
      if (code) map.set(code, h);
    });
    return map;
  }, [hargaList]);

  // Master Lookup for Harga Jual
  const masterHargaJualMap = useMemo(() => {
    const map = new Map<string, MasterHargaJual>();
    hargaJualList.forEach((hj) => {
      const code = (hj.kode || '').trim().toUpperCase();
      if (code) map.set(code, hj);
    });
    return map;
  }, [hargaJualList]);

  // Helper to resolve a bal's buying price code STRICTLY from Master Harga Beli
  const resolveBalKodeBeli = (bal: BalDetailItem): string | null => {
    // 1. Check if direct record has a valid grade in Master Harga Beli
    // (excluding bal prefixes like SB/HF or multi-grade)
    const b = barangList.find((item) => item.barang_id === bal.barang_id);
    const candidateCode = (b?.kode_grade || '').trim().toUpperCase();
    if (
      candidateCode &&
      candidateCode !== 'SB' &&
      candidateCode !== 'HF' &&
      !candidateCode.includes('MULTI') &&
      masterHargaBeliMap.has(candidateCode)
    ) {
      return masterHargaBeliMap.get(candidateCode)!.kode_grade;
    }

    // Check transaction items
    for (const tx of transaksiList) {
      if (tx.items) {
        const match = tx.items.find((it) => it.barang_id === bal.barang_id);
        if (match) {
          const itCode = (match.kode_grade || '').trim().toUpperCase();
          if (
            itCode &&
            itCode !== 'SB' &&
            itCode !== 'HF' &&
            !itCode.includes('MULTI') &&
            masterHargaBeliMap.has(itCode)
          ) {
            return masterHargaBeliMap.get(itCode)!.kode_grade;
          }
        }
      }
    }

    // 2. Match by price (harga_per_kg) directly to Master Harga Beli
    const targetPrice = bal.harga_per_kg || b?.harga_per_kg || 0;
    if (targetPrice > 0) {
      // Find exact price match
      const exact = hargaList.find((h) => h.harga_per_kg === targetPrice);
      if (exact) {
        return exact.kode_grade;
      }
      // Check if price in thousands matches a code (e.g. 55000 -> "55", 45000 -> "45")
      const thousandsCode = String(Math.round(targetPrice / 1000));
      if (masterHargaBeliMap.has(thousandsCode)) {
        return masterHargaBeliMap.get(thousandsCode)!.kode_grade;
      }
    }

    // 3. Fallback: closest price in Master Harga Beli
    if (hargaList.length > 0 && targetPrice > 0) {
      let closest = hargaList[0];
      let minDiff = Math.abs((closest.harga_per_kg || 0) - targetPrice);
      for (const h of hargaList) {
        const diff = Math.abs((h.harga_per_kg || 0) - targetPrice);
        if (diff < minDiff) {
          minDiff = diff;
          closest = h;
        }
      }
      return closest.kode_grade;
    }

    return null;
  };

  // Helper to resolve a bal's selling price code STRICTLY from Master Harga Jual
  // PENTING: Bal HANYA masuk ke Harga Jual jika SUDAH TERJUAL / DIKIRIM!
  const resolveBalKodeJual = (bal: BalDetailItem): string | null => {
    // Jika bal belum dikirim / belum terjual, sama sekali bukan bagian dari penjualan
    if (!bal.is_kirim && !shippedBarangIds.has(bal.barang_id)) {
      return null;
    }

    // 1. Cek jika di-mapping pada pengiriman barang
    const assigned = barangToKodeHargaJual.get(bal.barang_id);
    if (assigned) {
      const upper = assigned.trim().toUpperCase();
      if (masterHargaJualMap.has(upper)) {
        return masterHargaJualMap.get(upper)!.kode;
      }
    }

    // 2. Cek kode harga jual pada data barang itu sendiri
    const b = barangList.find((item) => item.barang_id === bal.barang_id);
    if (b?.kode_harga_jual) {
      const upper = b.kode_harga_jual.trim().toUpperCase();
      if (masterHargaJualMap.has(upper)) {
        return masterHargaJualMap.get(upper)!.kode;
      }
    }

    return null;
  };

  // 1. Data Aggregation for LAPORAN HARGA BELI
  // STRICT: Rows HANYA BERASAL DARI MASTER HARGA BELI (hargaList)
  // Menampilkan SEMUA master data meskipun masih 0 data (jangan menunggu ada yang dipakai)
  const dataHargaBeli = useMemo<LaporanHargaRow[]>(() => {
    const groupMap = new Map<string, {
      kode: string;
      nama_grade: string;
      harga_nominal: number;
      jumlah_bal: number;
      berat_bruto: number;
      berat_netto: number;
      total_nilai: number;
      bal_gudang: number;
      netto_gudang: number;
      bal_kirim: number;
      netto_kirim: number;
      bal_items: BalDetailItem[];
    }>();

    // STRICT: Initialize SEMUA dari Master Harga Beli
    hargaList.forEach((h) => {
      const code = (h.kode_grade || '').trim();
      const codeUpper = code.toUpperCase();
      if (!code || codeUpper.includes('MULTI')) return;

      groupMap.set(codeUpper, {
        kode: h.kode_grade,
        nama_grade: h.nama_grade || `Grade ${h.kode_grade}`,
        harga_nominal: h.harga_per_kg || 0,
        jumlah_bal: 0,
        berat_bruto: 0,
        berat_netto: 0,
        total_nilai: 0,
        bal_gudang: 0,
        netto_gudang: 0,
        bal_kirim: 0,
        netto_kirim: 0,
        bal_items: [],
      });
    });

    // Distribute all bal items into their corresponding Master Harga Beli code
    allBalItems.forEach((bal) => {
      const masterCode = resolveBalKodeBeli(bal);
      if (masterCode) {
        const grp = groupMap.get(masterCode.toUpperCase());
        if (grp) {
          grp.jumlah_bal += 1;
          grp.berat_bruto += bal.berat_bruto;
          grp.berat_netto += bal.berat_netto;
          grp.total_nilai += bal.total_nilai;

          if (bal.is_gudang) {
            grp.bal_gudang += 1;
            grp.netto_gudang += bal.berat_netto;
          } else {
            grp.bal_kirim += 1;
            grp.netto_kirim += bal.berat_netto;
          }

          grp.bal_items.push(bal);
        }
      }
    });

    const rows: LaporanHargaRow[] = Array.from(groupMap.values()).map((g) => {
      const persenGudang = g.jumlah_bal > 0 ? (g.bal_gudang / g.jumlah_bal) * 100 : 0;
      const persenKirim = g.jumlah_bal > 0 ? (g.bal_kirim / g.jumlah_bal) * 100 : 0;

      return {
        ...g,
        persen_gudang: persenGudang,
        persen_kirim: persenKirim,
      };
    });

    // Tampilkan SEMUA yang ada di master data meskipun masih 0 data
    return rows;
  }, [allBalItems, hargaList, masterHargaBeliMap, barangList, transaksiList]);

  // 2. Data Aggregation for LAPORAN HARGA JUAL
  // STRICT: Rows HANYA BERASAL DARI MASTER HARGA JUAL (hargaJualList)
  // Menampilkan SEMUA master data meskipun masih 0 data (belum ada barang terjual)
  const dataHargaJual = useMemo<LaporanHargaRow[]>(() => {
    const groupMap = new Map<string, {
      kode: string;
      nama_grade: string;
      harga_nominal: number;
      jumlah_bal: number;
      berat_bruto: number;
      berat_netto: number;
      total_nilai: number;
      bal_gudang: number;
      netto_gudang: number;
      bal_kirim: number;
      netto_kirim: number;
      bal_items: BalDetailItem[];
    }>();

    // STRICT: Initialize SEMUA dari Master Harga Jual
    hargaJualList.forEach((hj) => {
      const code = (hj.kode || '').trim();
      const codeUpper = code.toUpperCase();
      if (!code) return;

      groupMap.set(codeUpper, {
        kode: hj.kode,
        nama_grade: `Harga Jual ${hj.kode}`,
        harga_nominal: hj.harga_jual || 0,
        jumlah_bal: 0,
        berat_bruto: 0,
        berat_netto: 0,
        total_nilai: 0,
        bal_gudang: 0,
        netto_gudang: 0,
        bal_kirim: 0,
        netto_kirim: 0,
        bal_items: [],
      });
    });

    // Distribute hanya bal items yang SUDAH TERJUAL / DIKIRIM
    allBalItems.forEach((bal) => {
      const masterCode = resolveBalKodeJual(bal);
      if (masterCode) {
        const grp = groupMap.get(masterCode.toUpperCase());
        if (grp) {
          grp.jumlah_bal += 1;
          grp.berat_bruto += bal.berat_bruto;
          grp.berat_netto += bal.berat_netto;

          const priceJual = grp.harga_nominal > 0 ? grp.harga_nominal : bal.harga_per_kg;
          grp.total_nilai += bal.berat_netto * priceJual;

          if (bal.is_gudang) {
            grp.bal_gudang += 1;
            grp.netto_gudang += bal.berat_netto;
          } else {
            grp.bal_kirim += 1;
            grp.netto_kirim += bal.berat_netto;
          }

          grp.bal_items.push(bal);
        }
      }
    });

    const rows: LaporanHargaRow[] = Array.from(groupMap.values()).map((g) => {
      const persenGudang = g.jumlah_bal > 0 ? (g.bal_gudang / g.jumlah_bal) * 100 : 0;
      const persenKirim = g.jumlah_bal > 0 ? (g.bal_kirim / g.jumlah_bal) * 100 : 0;

      return {
        ...g,
        persen_gudang: persenGudang,
        persen_kirim: persenKirim,
      };
    });

    // Tampilkan SEMUA yang ada di master data meskipun masih 0 data (belum ada barang terjual)
    return rows;
  }, [allBalItems, hargaJualList, masterHargaJualMap, barangToKodeHargaJual, barangList, shippedBarangIds]);

  // Current active data set
  const currentDataSet = activeTab === 'beli' ? dataHargaBeli : dataHargaJual;

  // Filter & Sort
  const filteredAndSortedData = useMemo(() => {
    let list = [...currentDataSet];

    // Filter search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => 
        item.kode.toLowerCase().includes(q) ||
        item.nama_grade.toLowerCase().includes(q) ||
        item.harga_nominal.toString().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle numerical sort for codes like "35", "36"
      if (sortField === 'kode') {
        const aNum = parseFloat(String(aVal));
        const bNum = parseFloat(String(bVal));
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
        }
        return sortOrder === 'asc' 
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        if (aVal !== bVal) {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
      }

      // Secondary tie-breaker: sort by numeric code
      const aNum = parseFloat(String(a.kode));
      const bNum = parseFloat(String(b.kode));
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return String(a.kode).localeCompare(String(b.kode));
    });

    return list;
  }, [currentDataSet, searchQuery, sortField, sortOrder]);

  // Total Calculations
  const totals = useMemo(() => {
    return filteredAndSortedData.reduce((acc, curr) => ({
      jumlah_bal: acc.jumlah_bal + curr.jumlah_bal,
      berat_bruto: acc.berat_bruto + curr.berat_bruto,
      berat_netto: acc.berat_netto + curr.berat_netto,
      total_nilai: acc.total_nilai + curr.total_nilai,
      bal_gudang: acc.bal_gudang + curr.bal_gudang,
      netto_gudang: acc.netto_gudang + curr.netto_gudang,
      bal_kirim: acc.bal_kirim + curr.bal_kirim,
      netto_kirim: acc.netto_kirim + curr.netto_kirim,
    }), {
      jumlah_bal: 0,
      berat_bruto: 0,
      berat_netto: 0,
      total_nilai: 0,
      bal_gudang: 0,
      netto_gudang: 0,
      bal_kirim: 0,
      netto_kirim: 0,
    });
  }, [filteredAndSortedData]);

  const totalPersenGudang = totals.jumlah_bal > 0 ? (totals.bal_gudang / totals.jumlah_bal) * 100 : 0;
  const totalPersenKirim = totals.jumlah_bal > 0 ? (totals.bal_kirim / totals.jumlah_bal) * 100 : 0;

  const handleSort = (field: keyof LaporanHargaRow) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // default high-to-low for counts & values
    }
  };

  const renderSortIcon = (field: keyof LaporanHargaRow) => <SortIcon aktif={sortField === field} arah={sortOrder} />;

  // Excel Export
  const handleExportExcel = () => {
    const tabName = activeTab === 'beli' ? 'Beli' : 'Jual';
    const info = [searchQuery.trim() ? `Pencarian: ${searchQuery.trim()} · Hanya bal lunas` : 'Seluruh kode harga · Hanya bal dari kupon yang sudah lunas'];
    const rincianBal = filteredAndSortedData.flatMap((item) => item.bal_items.map((bal) => ({ kode: item.kode, bal })));

    downloadExcelReport(`Laporan_Harga_${tabName}_${todayStamp()}`, [
      {
        name: `Harga ${tabName}`,
        title: `Laporan Harga ${tabName}`,
        info,
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'Kode', align: 'center' },
          { header: 'Nama Grade / Referensi' },
          { header: `Harga ${tabName} (Rp/Kg)`, type: 'rupiah' },
          { header: 'Jumlah Bal', type: 'integer' },
          { header: 'Berat Bruto (Kg)', type: 'kg' },
          { header: 'Berat Netto (Kg)', type: 'kg' },
          { header: 'Total Nilai (Rp)', type: 'rupiah' },
          { header: 'Di Gudang (Bal)', type: 'integer' },
          { header: 'Di Gudang (%)', type: 'percent' },
          { header: 'Dikirim (Bal)', type: 'integer' },
          { header: 'Dikirim (%)', type: 'percent' },
        ],
        rows: filteredAndSortedData.map((item, idx) => [
          idx + 1,
          item.kode,
          item.nama_grade,
          item.harga_nominal,
          item.jumlah_bal,
          item.berat_bruto,
          item.berat_netto,
          item.total_nilai,
          item.bal_gudang,
          item.persen_gudang,
          item.bal_kirim,
          item.persen_kirim,
        ]),
        totalRow: [
          `TOTAL (${filteredAndSortedData.length} kode)`, '', '', '',
          totals.jumlah_bal,
          totals.berat_bruto,
          totals.berat_netto,
          totals.total_nilai,
          totals.bal_gudang,
          totalPersenGudang,
          totals.bal_kirim,
          totalPersenKirim,
        ],
      },
      {
        name: 'Rincian Bal',
        title: `Rincian Bal per Kode Harga ${tabName}`,
        info,
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'Kode', align: 'center' },
          { header: 'No Bal', align: 'center' },
          { header: 'Petani' },
          { header: 'Tanggal', type: 'date' },
          { header: 'Bruto (Kg)', type: 'kg' },
          { header: 'Netto (Kg)', type: 'kg' },
          { header: 'Harga (Rp/Kg)', type: 'rupiah' },
          { header: 'Nilai (Rp)', type: 'rupiah' },
          { header: 'Status', align: 'center' },
          { header: 'No Surat Jalan', align: 'center' },
        ],
        rows: rincianBal.map(({ kode, bal }, idx) => [
          idx + 1,
          kode,
          bal.no_bal,
          bal.nama_petani || '-',
          bal.tanggal,
          bal.berat_bruto,
          bal.berat_netto,
          bal.harga_per_kg,
          bal.total_nilai,
          labelStatusStok(bal.status_stok),
          bal.no_surat_jalan || '-',
        ]),
        totalRow: [
          `TOTAL (${rincianBal.length} bal)`, '', '', '', '',
          totals.berat_bruto,
          totals.berat_netto,
          '',
          totals.total_nilai,
          '', '',
        ],
      },
    ]);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header Banner (kartu putih seperti laporan lain) */}
      <div className="bg-white p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#b81d24] text-white rounded-sm flex items-center justify-center shrink-0 shadow-xs">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 font-bold text-[10px] rounded-none uppercase tracking-wider">
                LAPORAN HARGA TEMBAKAU
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                {COMPANY_NAME}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              Laporan Harga {activeTab === 'beli' ? 'Beli' : 'Jual'}
            </h1>
            <p className="text-[11px] text-gray-500">Hanya bal dari kupon yang sudah lunas; bal yang belum dibayar masih kredit.</p>
          </div>
        </div>
        
        {/* Right Controls: Tab Switcher & Excel Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-gray-100 p-0.5 rounded-sm border border-gray-300">
            <button
              id="tab-harga-beli"
              onClick={() => {
                setActiveTab('beli');
                setExpandedKode(null);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xs transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'beli'
                  ? 'bg-[#b81d24] text-white shadow-xs'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Harga Beli</span>
            </button>
            <button
              id="tab-harga-jual"
              onClick={() => {
                setActiveTab('jual');
                setExpandedKode(null);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xs transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'jual'
                  ? 'bg-[#b81d24] text-white shadow-xs'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <span className="inline-flex items-center justify-center font-bold leading-none w-3.5 h-3.5">Rp</span>
              <span>Harga Jual</span>
            </button>
          </div>

          <LaporanTampilanToggle tampilan={tampilan} />

          <button
            id="btn-export-laporan-harga-excel"
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Main Table Card (Laporan Kode Bal style) */}
      <div className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-gray-200 overflow-hidden">
        {/* Filter and Stats Toolbar */}
        <div className="p-3 border-b border-gray-200 bg-white flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-gray-600 font-medium">
            <span>Total: <strong className="text-gray-900">{filteredAndSortedData.length}</strong> Kode</span>
            <span className="text-gray-300">|</span>
            <span><strong className="text-gray-900 font-mono">{formatNumber(totals.jumlah_bal)}</strong> Bal</span>
            <span className="text-gray-300">|</span>
            <span>Netto: <strong className="text-blue-700 font-mono">{formatNumber(totals.berat_netto)}</strong> Kg</span>
            <span className="text-gray-300">|</span>
            <span>Nilai: <strong className="text-emerald-700 font-mono">{formatRupiah(totals.total_nilai)}</strong></span>
          </div>
          <div className="w-full sm:w-72 md:w-80">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="search-laporan-harga"
                type="text"
                placeholder={`Cari Kode ${activeTab === 'beli' ? 'Beli (misal: 35)' : 'Jual'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-sm pl-8 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Content: Visual Cards */}
        <AnimatePresence initial={false}>
          {showGradeSummary && filteredAndSortedData.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-[#fafafa] border-b border-gray-200">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {filteredAndSortedData.map((gs) => {
                    const pct = totals.berat_netto > 0 ? ((gs.berat_netto / totals.berat_netto) * 100).toFixed(1) : '0';
                    const avg = gs.jumlah_bal > 0 ? (gs.berat_netto / gs.jumlah_bal).toFixed(1) : '0';
                    const gradeBadgeClass =
                      gs.kode === 'A' ? 'bg-zinc-900 text-white' :
                      gs.kode === 'B' ? 'bg-zinc-800 text-zinc-100' :
                      gs.kode === 'C' ? 'bg-blue-100 text-blue-900 font-bold' :
                      gs.kode === 'D' ? 'bg-purple-100 text-purple-900 font-bold' :
                      gs.kode === 'E' ? 'bg-gray-200 text-gray-800 font-bold' :
                      'bg-red-100 text-red-900 font-bold';

                    return (
                      <div
                        key={gs.kode}
                        className="bg-white border border-gray-200 p-2.5 rounded-xs flex flex-col justify-between space-y-1.5 shadow-2xs hover:border-gray-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-xs ${gradeBadgeClass}`}>
                            Grade {gs.kode}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded-xs border border-blue-100">
                            {pct}%
                          </span>
                        </div>
                        <div className="pt-1 space-y-0.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[11px] text-gray-500 font-medium">Total Berat:</span>
                            <span className="text-xs font-bold font-mono text-gray-900">
                              {gs.berat_netto.toFixed(1)} <span className="text-[10px] font-normal text-gray-500">kg</span>
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between text-[10px] text-gray-500">
                            <span>Populasi:</span>
                            <span className="font-mono font-semibold text-gray-700">{gs.jumlah_bal} Bal</span>
                          </div>
                          <div className="flex items-baseline justify-between text-[10px] text-gray-500">
                            <span>Rata-rata:</span>
                            <span className="font-mono text-gray-700">{avg} kg/bal</span>
                          </div>
                        </div>
                        <div className="pt-1 border-t border-gray-100 text-[11px] text-right font-mono font-bold text-[#b81d24]">
                          Rp {Math.round(gs.total_nilai).toLocaleString('id-ID')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Clean Report Table - Sticky Header ONLY (thead) */}
        <div ref={tableContainerRef} className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-210px)] min-h-[350px]">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead className="bg-[#f8f9fa] border-b border-gray-300 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <tr className="text-xs font-bold text-gray-700">
                {/* 1. No */}
                <th 
                  className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-3 text-center border-r border-gray-200 select-none w-12 cursor-pointer hover:bg-gray-200/80 transition-colors"
                  onClick={() => {
                    setSortField('kode');
                    setSortOrder('asc');
                  }}
                  title="Klik untuk urutkan No/Kode default"
                >
                  No
                </th>

                {/* 2. Kode */}
                <th 
                  className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 border-r border-gray-200 cursor-pointer hover:bg-gray-200/80 select-none w-36 transition-colors"
                  onClick={() => handleSort('kode')}
                >
                  <div className="flex items-center justify-between">
                    <span>Kode {activeTab === 'beli' ? 'Beli' : 'Jual'}</span>
                    {renderSortIcon('kode')}
                  </div>
                </th>

                {/* 3. Jumlah Bal */}
                <th 
                  className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 border-r border-gray-200 text-right cursor-pointer hover:bg-gray-200/80 select-none w-32 transition-colors"
                  onClick={() => handleSort('jumlah_bal')}
                >
                  <div className="flex items-center justify-end">
                    <span>Jumlah Bal</span>
                    {renderSortIcon('jumlah_bal')}
                  </div>
                </th>

                {/* 4. Bruto */}
                <th 
                  className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 border-r border-gray-200 text-right cursor-pointer hover:bg-gray-200/80 select-none w-32 transition-colors"
                  onClick={() => handleSort('berat_bruto')}
                >
                  <div className="flex items-center justify-end">
                    <span>Bruto</span>
                    {renderSortIcon('berat_bruto')}
                  </div>
                </th>

                {/* 5. Netto */}
                <th 
                  className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 border-r border-gray-200 text-right cursor-pointer hover:bg-gray-200/80 select-none w-32 transition-colors"
                  onClick={() => handleSort('berat_netto')}
                >
                  <div className="flex items-center justify-end">
                    <span>Netto</span>
                    {renderSortIcon('berat_netto')}
                  </div>
                </th>

                {/* 6. Nilai */}
                <th 
                  className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 border-r border-gray-200 text-right cursor-pointer hover:bg-gray-200/80 select-none w-44 transition-colors"
                  onClick={() => handleSort('total_nilai')}
                >
                  <div className="flex items-center justify-end">
                    <span>Nilai ({activeTab === 'beli' ? 'Beli' : 'Jual'})</span>
                    {renderSortIcon('total_nilai')}
                  </div>
                </th>

                {/* 7. Di Gudang */}
                <th 
                  className="sticky top-0 z-20 bg-emerald-50 py-3 px-4 border-r border-emerald-200 text-right cursor-pointer hover:bg-emerald-100 select-none w-36 transition-colors"
                  onClick={() => handleSort('bal_gudang')}
                >
                  <div className="flex items-center justify-end">
                    <span className="text-emerald-950 font-bold">Di Gudang</span>
                    {renderSortIcon('bal_gudang')}
                  </div>
                </th>

                {/* 8. Dikirimkan */}
                <th 
                  className="sticky top-0 z-20 bg-blue-50 py-3 px-4 border-r border-blue-200 text-right cursor-pointer hover:bg-blue-100 select-none w-36 transition-colors"
                  onClick={() => handleSort('bal_kirim')}
                >
                  <div className="flex items-center justify-end">
                    <span className="text-blue-950 font-bold">Dikirimkan</span>
                    {renderSortIcon('bal_kirim')}
                  </div>
                </th>

                {/* 9. Perbandingan Rasio */}
                <th className="sticky top-0 z-20 bg-[#f8f9fa] py-3 px-4 text-center select-none w-44">
                  <span>Perbandingan (% Bal)</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500">
                    Tidak ada data harga yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map((row, idx) => {
                  const isExpanded = expandedKode === row.kode;

                  return (
                    <React.Fragment key={row.kode}>
                      <tr 
                        className={`hover:bg-amber-50/40 transition-colors cursor-pointer ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                        } ${isExpanded ? 'bg-amber-50/70 border-b-0' : ''}`}
                        onClick={() => setExpandedKode(isExpanded ? null : row.kode)}
                        title="Klik baris untuk melihat rincian bal"
                      >
                        {/* 1. No */}
                        <td className="py-2.5 px-3 text-center border-r border-gray-200 text-gray-500 font-mono text-xs">
                          <div className="flex items-center justify-center space-x-1">
                            {row.bal_items.length > 0 ? (
                              isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[#b81d24]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                              )
                            ) : null}
                            <span>{idx + 1}</span>
                          </div>
                        </td>

                        {/* 2. Kode */}
                        <td className="py-2.5 px-4 border-r border-gray-200">
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-1 text-xs font-bold font-mono bg-zinc-900 text-white rounded-xs min-w-[28px] text-center shadow-2xs">
                              {row.kode}
                            </span>
                            {row.harga_nominal > 0 && (
                              <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">
                                {formatRupiah(row.harga_nominal)}/kg
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Jumlah Bal */}
                        <td className="py-2.5 px-4 border-r border-gray-200 text-right font-medium">
                          <span className="font-mono font-bold text-gray-900">
                            {formatNumber(row.jumlah_bal)}
                          </span>
                          <span className="text-gray-400 text-xs ml-1">Bal</span>
                        </td>

                        {/* 4. Bruto */}
                        <td className="py-2.5 px-4 border-r border-gray-200 text-right font-medium text-gray-700">
                          <span className="font-mono">
                            {row.berat_bruto > 0 ? row.berat_bruto.toFixed(1) : '-'}
                          </span>
                          <span className="text-gray-400 text-xs ml-1">Kg</span>
                        </td>

                        {/* 5. Netto */}
                        <td className="py-2.5 px-4 border-r border-gray-200 text-right font-medium text-blue-700">
                          <span className="font-mono font-bold">
                            {row.berat_netto > 0 ? row.berat_netto.toFixed(1) : '-'}
                          </span>
                          <span className="text-gray-400 text-xs ml-1">Kg</span>
                        </td>

                        {/* 6. Nilai */}
                        <td className="py-2.5 px-4 border-r border-gray-200 text-right font-bold text-emerald-700 font-mono">
                          {formatRupiah(row.total_nilai)}
                        </td>

                        {/* 7. Di Gudang */}
                        <td className="py-2.5 px-4 border-r border-gray-200 text-right bg-emerald-50/15">
                          <div className="font-mono font-semibold text-gray-900">
                            {formatNumber(row.bal_gudang)}{' '}
                            <span className="text-gray-400 text-xs font-normal">Bal</span>
                          </div>
                          <div className="text-[11px] font-bold text-emerald-700">
                            {row.persen_gudang.toFixed(1)}%
                          </div>
                        </td>

                        {/* 8. Dikirimkan */}
                        <td className="py-2.5 px-4 border-r border-gray-200 text-right bg-blue-50/15">
                          <div className="font-mono font-semibold text-gray-900">
                            {formatNumber(row.bal_kirim)}{' '}
                            <span className="text-gray-400 text-xs font-normal">Bal</span>
                          </div>
                          <div className="text-[11px] font-bold text-blue-700">
                            {row.persen_kirim.toFixed(1)}%
                          </div>
                        </td>

                        {/* 9. Perbandingan Rasio (% Gudang vs % Kirim) */}
                        <td className="py-2.5 px-4 text-center">
                          <div className="w-full max-w-[140px] mx-auto space-y-1">
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden flex">
                              <div 
                                className="bg-emerald-600 h-full transition-all" 
                                style={{ width: `${row.persen_gudang}%` }} 
                                title={`Di Gudang: ${row.persen_gudang.toFixed(1)}% (${row.bal_gudang} Bal)`}
                              />
                              <div 
                                className="bg-blue-600 h-full transition-all" 
                                style={{ width: `${row.persen_kirim}%` }} 
                                title={`Dikirimkan: ${row.persen_kirim.toFixed(1)}% (${row.bal_kirim} Bal)`}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-medium leading-none">
                              <span className="text-emerald-700 font-semibold" title="Masih di Gudang">
                                {row.persen_gudang.toFixed(0)}% Gdg
                              </span>
                              <span className="text-blue-700 font-semibold" title="Sudah Dikirimkan">
                                {row.persen_kirim.toFixed(0)}% Krm
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Sub-table for Detail Bal */}
                      {isExpanded && row.bal_items.length > 0 && (
                        <tr className="bg-slate-50/90 border-b border-gray-200">
                          <td colSpan={9} className="p-3 pl-8">
                            <div className="bg-white border border-gray-200 shadow-2xs rounded-xs overflow-hidden">
                              <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between text-xs font-semibold text-gray-700">
                                <span>Rincian Bal dengan Kode {row.kode} ({row.bal_items.length} Bal)</span>
                                <span className="text-gray-500 font-normal text-[11px]">
                                  Gudang: {row.bal_gudang} Bal | Terkirim: {row.bal_kirim} Bal
                                </span>
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[11px]">
                                    <tr>
                                      <th className="py-2 px-3 text-center w-10">No</th>
                                      <th className="py-2 px-3">No Bal</th>
                                      <th className="py-2 px-3">Petani</th>
                                      <th className="py-2 px-3">Tanggal</th>
                                      <th className="py-2 px-3 text-right">Bruto (Kg)</th>
                                      <th className="py-2 px-3 text-right">Netto (Kg)</th>
                                      <th className="py-2 px-3 text-right">Nilai (Rp)</th>
                                      <th className="py-2 px-3 text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {row.bal_items.map((bItem, bIdx) => (
                                      <tr key={bItem.barang_id || bIdx} className="hover:bg-gray-50">
                                        <td className="py-1.5 px-3 text-center text-gray-400 font-mono text-[11px]">
                                          {bIdx + 1}
                                        </td>
                                        <td className="py-1.5 px-3 font-mono font-bold text-gray-900">
                                          {bItem.no_bal}
                                        </td>
                                        <td className="py-1.5 px-3 text-gray-800">
                                          {bItem.nama_petani}
                                        </td>
                                        <td className="py-1.5 px-3 text-gray-600 font-mono text-[11px]">
                                          {bItem.tanggal || '-'}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono text-gray-600">
                                          {bItem.berat_bruto > 0 ? bItem.berat_bruto.toFixed(1) : '-'}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-blue-700">
                                          {bItem.berat_netto.toFixed(1)}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono font-medium text-emerald-700">
                                          {formatRupiah(bItem.total_nilai)}
                                        </td>
                                        <td className="py-1.5 px-3 text-center">
                                          {bItem.is_gudang ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                              Di Gudang
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800" title={bItem.no_surat_jalan ? `Surat Jalan: ${bItem.no_surat_jalan}` : undefined}>
                                              Terkirim {bItem.no_surat_jalan ? `(${bItem.no_surat_jalan})` : ''}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Total Row (tfoot) - Standard footer at bottom of table */}
            {filteredAndSortedData.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-gray-300 font-bold text-gray-900 text-xs">
                <tr>
                  <td className="py-3 px-3 text-center border-r border-gray-200">TOTAL</td>
                  <td className="py-3 px-4 border-r border-gray-200">{filteredAndSortedData.length} Kode</td>
                  <td className="py-3 px-4 border-r border-gray-200 text-right">
                    <span className="font-mono">{formatNumber(totals.jumlah_bal)}</span> Bal
                  </td>
                  <td className="py-3 px-4 border-r border-gray-200 text-right font-mono">
                    {formatNumber(totals.berat_bruto)} Kg
                  </td>
                  <td className="py-3 px-4 border-r border-gray-200 text-right text-blue-800 font-mono">
                    {formatNumber(totals.berat_netto)} Kg
                  </td>
                  <td className="py-3 px-4 border-r border-gray-200 text-right font-mono text-emerald-800">
                    {formatRupiah(totals.total_nilai)}
                  </td>
                  <td className="py-3 px-4 border-r border-emerald-200 text-right bg-emerald-50/40">
                    <div className="font-mono">{formatNumber(totals.bal_gudang)} Bal</div>
                    <div className="text-[11px] text-emerald-800 font-bold">
                      {totalPersenGudang.toFixed(1)}%
                    </div>
                  </td>
                  <td className="py-3 px-4 border-r border-blue-200 text-right bg-blue-50/40">
                    <div className="font-mono">{formatNumber(totals.bal_kirim)} Bal</div>
                    <div className="text-[11px] text-blue-800 font-bold">
                      {totalPersenKirim.toFixed(1)}%
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="w-full max-w-[140px] mx-auto space-y-1">
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-emerald-600 h-full" 
                          style={{ width: `${totalPersenGudang}%` }} 
                          title={`Total Di Gudang: ${totalPersenGudang.toFixed(1)}%`}
                        />
                        <div 
                          className="bg-blue-600 h-full" 
                          style={{ width: `${totalPersenKirim}%` }} 
                          title={`Total Dikirimkan: ${totalPersenKirim.toFixed(1)}%`}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-medium leading-none">
                        <span className="text-emerald-800 font-bold">
                          {totalPersenGudang.toFixed(0)}% Gdg
                        </span>
                        <span className="text-blue-800 font-bold">
                          {totalPersenKirim.toFixed(0)}% Krm
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Floating Scroll Controls (Sama persis seperti pada Laporan Pembelian) */}
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

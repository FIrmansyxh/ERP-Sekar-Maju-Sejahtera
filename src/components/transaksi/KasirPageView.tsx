import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Printer, 
  Scale, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Receipt, 
  RefreshCw,
  Filter,
  Eye,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { TransaksiPembelian, Petani, TabelHarga, Barang, Gudang, UserRole, User as UserType } from '../../types';
import { formatRupiah, formatAccounting, formatDateIndo, formatNoKupon } from '../../utils/formatters';
import { TransaksiDetailModal } from './TransaksiDetailModal';
import { PembayaranKasirModal } from './PembayaranKasirModal';
import { TransaksiEditModal } from './TransaksiEditModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { openPrintDocument } from '../../utils/openDedicatedPrint';

interface KasirPageViewProps {
  transaksiList: TransaksiPembelian[];
  petaniList: Petani[];
  hargaList: TabelHarga[];
  barangList: Barang[];
  gudangList?: Gudang[];
  userRole: UserRole;
  currentUser?: UserType | null;
  initialKuponNo?: string;
  initialTxId?: string;
  onSaveTransaksi: (newTx: TransaksiPembelian, generatedBarang: Barang | Barang[]) => void;
  onDeleteTransaksi?: (transaksiId: string, alasan?: string) => void;
  onNavigateToSortir: () => void;
  onNavigateToTimbangan: (kuponNo?: string, txId?: string) => void;
}

export const KasirPageView: React.FC<KasirPageViewProps> = ({
  transaksiList = [],
  petaniList = [],
  hargaList = [],
  barangList = [],
  gudangList = [],
  userRole,
  currentUser,
  initialKuponNo,
  initialTxId,
  onSaveTransaksi,
  onDeleteTransaksi,
  onNavigateToSortir,
  onNavigateToTimbangan,
}) => {
  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterKupon, setFilterKupon] = useState(initialKuponNo || '');
  const [filterPetaniId, setFilterPetaniId] = useState('');
  const [filterStatusBayar, setFilterStatusBayar] = useState<'all' | 'cash' | 'kredit' | 'siap_bayar' | 'belum_lengkap'>('all');
  const [sortOrderKupon, setSortOrderKupon] = useState<'desc' | 'asc'>('desc');

  // Quick Table Search & Sort (DataTables style)
  const [tableSearch, setTableSearch] = useState('');
  const [sortField, setSortField] = useState<string>('kupon');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals & Selection
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<TransaksiPembelian | null>(null);
  const [selectedTxForBayar, setSelectedTxForBayar] = useState<TransaksiPembelian | null>(null);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<TransaksiPembelian | null>(null);
  const [txToDelete, setTxToDelete] = useState<TransaksiPembelian | null>(null);
  const [alasanHapus, setAlasanHapus] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // In-memory printed status tracking
  const [localPrintedTxIds, setLocalPrintedTxIds] = useState<Set<string>>(new Set());

  // Confirm Modal state to avoid blocking browser locker errors
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya, Lanjutkan',
    cancelText: 'Batal',
    onConfirm: () => {},
  });

  const handleUpdateNotaStatus = (txId: string) => {
    setLocalPrintedTxIds((prev) => new Set([...prev, txId]));
  };

  // Helper to strictly evaluate weighing completion across all bales in a kupon
  const getKuponWeighStatus = (tx: TransaksiPembelian) => {
    const items = tx.items || [];
    if (items.length === 0) {
      const isWeighed = (tx.berat_kg || 0) > 0;
      return {
        isAllWeighed: isWeighed,
        unweighedCount: isWeighed ? 0 : 1,
        totalBal: 1,
        weighedCount: isWeighed ? 1 : 0,
        unweighedBalList: isWeighed ? [] : [tx.no_bal || 'Bal 1'],
      };
    }
    const unweighed = items.filter((it) => (it.berat_kg || 0) <= 0);
    return {
      isAllWeighed: unweighed.length === 0,
      unweighedCount: unweighed.length,
      totalBal: items.length,
      weighedCount: items.length - unweighed.length,
      unweighedBalList: unweighed.map((it) => it.no_bal),
    };
  };

  const handleConfirmCashPayment = (
    txId: string,
    details: {
      metode: 'cash';
      dibayarOleh: string;
      nominalCash: number;
    },
    directPrintAfter?: boolean
  ) => {
    const tx = transaksiList.find((t) => t.transaksi_id === txId);
    if (!tx) return;

    // Strict validation: Kupon MUST have all bales weighed before payment can be confirmed!
    const weighStatus = getKuponWeighStatus(tx);
    if (!weighStatus.isAllWeighed) {
      alert(
        `⚠️ Pembayaran Gagal!\n\nKupon ${tx.no_kupon} masih memiliki ${weighStatus.unweighedCount} bal yang belum ditimbang (${weighStatus.unweighedBalList.join(', ')}).\n\nSesuai SOP, seluruh bal dalam 1 kupon harus ditimbang semua terlebih dahulu baru bisa lanjut ke pembayaran kasir.`
      );
      return;
    }

    const updatedTx: TransaksiPembelian = {
      ...tx,
      status_pembayaran: 'lunas',
      metode_pembayaran: 'cash',
      dibayar_oleh: details.dibayarOleh,
      status_nota: 'sudah_cetak',
      dibayar_pada: new Date().toISOString(),
    };

    const relatedBarang = barangList.filter((b) => tx.barang_ids?.includes(b.barang_id));
    onSaveTransaksi(updatedTx, relatedBarang);
    handleUpdateNotaStatus(txId);

    if (selectedTxForDetail && selectedTxForDetail.transaksi_id === txId) {
      setSelectedTxForDetail(updatedTx);
    }

    if (directPrintAfter) {
      openPrintDocument('nota', txId);
    }
  };

  const handleMarkAsLunas = (txId: string) => {
    const tx = transaksiList.find((t) => t.transaksi_id === txId);
    if (!tx) return;

    const weighStatus = getKuponWeighStatus(tx);
    if (!weighStatus.isAllWeighed) {
      setConfirmConfig({
        isOpen: true,
        title: 'Tidak Dapat Melakukan Pembayaran',
        message: `Kupon ${tx.no_kupon} masih memiliki ${weighStatus.unweighedCount} bal yang belum ditimbang di modul Timbangan:\n[${weighStatus.unweighedBalList.join(', ')}]\n\nSesuai SOP, seluruh bal dalam 1 kupon harus ditimbang lengkap terlebih dahulu baru bisa lanjut ke pembayaran kasir.\n\nApakah Anda ingin membuka Kupon ${tx.no_kupon} di modul Timbangan sekarang?`,
        confirmText: 'Buka Modul Timbangan',
        cancelText: 'Tutup',
        onConfirm: () => {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          onNavigateToTimbangan(tx.no_kupon, tx.transaksi_id);
        }
      });
      return;
    }

    setSelectedTxForBayar(tx);
  };

  const handleCetakClick = (tx: TransaksiPembelian) => {
    const weighStatus = getKuponWeighStatus(tx);
    if (!weighStatus.isAllWeighed) {
      setConfirmConfig({
        isOpen: true,
        title: 'Nota Belum Dapat Dicetak',
        message: `Kupon ${tx.no_kupon} belum selesai ditimbang (${weighStatus.unweighedCount} bal belum ditimbang: ${weighStatus.unweighedBalList.join(', ')}).\n\nSeluruh bal dalam 1 kupon harus ditimbang lengkap dan dibayar di kasir sebelum nota resmi dapat dicetak.\n\nApakah Anda ingin membuka Kupon ${tx.no_kupon} di modul Timbangan sekarang?`,
        confirmText: 'Buka Modul Timbangan',
        cancelText: 'Tutup',
        onConfirm: () => {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          onNavigateToTimbangan(tx.no_kupon, tx.transaksi_id);
        }
      });
      return;
    }

    const isLunas = tx.status_pembayaran === 'lunas' || tx.metode_pembayaran === 'cash';
    if (!isLunas) {
      setConfirmConfig({
        isOpen: true,
        title: 'Nota Belum Lunas',
        message: `Perhatian: Nota pembelian untuk Kupon ${tx.no_kupon} belum dapat dicetak karena kasir belum memproses pembayaran tunai (Cash).\n\nNominal tagihan yang harus dibayarkan: ${formatRupiah(tx.harga_final)}.\n\nApakah Anda ingin membuka popup pembayaran kasir sekarang?`,
        confirmText: 'Buka Pembayaran Kasir',
        cancelText: 'Tutup',
        onConfirm: () => {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setSelectedTxForBayar(tx);
        }
      });
      return;
    }
    openPrintDocument('nota', tx.transaksi_id);
    handleUpdateNotaStatus(tx.transaksi_id);
  };

  // Main Filter logic
  const filteredList = useMemo(() => {
    return transaksiList.filter((tx) => {
      // Tanggal Mulai
      if (startDate) {
        const txDate = (tx.tanggal_transaksi || '').split(' ')[0];
        if (txDate < startDate) return false;
      }
      // Tanggal Akhir
      if (endDate) {
        const txDate = (tx.tanggal_transaksi || '').split(' ')[0];
        if (txDate > endDate) return false;
      }
      // Kupon / ID / Bal
      if (filterKupon.trim()) {
        const q = filterKupon.trim().toLowerCase();
        const matchKupon = (tx.no_kupon || '').toLowerCase().includes(q);
        const matchId = (tx.transaksi_id || '').toLowerCase().includes(q);
        const matchBal = (tx.no_bal || '').toLowerCase().includes(q);
        if (!matchKupon && !matchId && !matchBal) return false;
      }
      // Petani
      if (filterPetaniId && tx.petani_id !== filterPetaniId) {
        return false;
      }
      // Status Kas (Cash vs Kredit) & Kesiapan Timbang
      const isLunas = tx.status_pembayaran === 'lunas' || tx.metode_pembayaran === 'cash';
      const weighStatus = getKuponWeighStatus(tx);

      if (filterStatusBayar === 'cash' && !isLunas) return false;
      if (filterStatusBayar === 'kredit' && isLunas) return false;
      if (filterStatusBayar === 'siap_bayar' && (!weighStatus.isAllWeighed || isLunas)) return false;
      if (filterStatusBayar === 'belum_lengkap' && weighStatus.isAllWeighed) return false;

      return true;
    });
  }, [transaksiList, startDate, endDate, filterKupon, filterPetaniId, filterStatusBayar]);

  // Overall stats for the filtered list
  const stats = useMemo(() => {
    const totalTx = filteredList.length;
    const totalBal = filteredList.reduce((acc, t) => acc + (t.total_bal || (t.items ? t.items.length : 1)), 0);
    const totalNetto = Number(filteredList.reduce((acc, t) => acc + (t.berat_kg || 0), 0).toFixed(1));
    const totalKotor = filteredList.reduce((acc, t) => acc + (t.total_kotor || t.total_harga_beli || 0), 0);
    const totalPajak = filteredList.reduce((acc, t) => acc + (t.pajak || 0), 0);
    const totalPotongan = filteredList.reduce((acc, t) => acc + (t.total_potongan || 0), 0);
    const totalBayar = filteredList.reduce((acc, t) => acc + (t.harga_final || 0), 0);
    const avgHarga = totalNetto > 0 ? Math.round(totalKotor / totalNetto) : 0;

    const lunasList = filteredList.filter(
      (t) => t.status_pembayaran === 'lunas' || t.metode_pembayaran === 'cash'
    );
    const belumLunasList = filteredList.filter(
      (t) => t.status_pembayaran !== 'lunas' && t.metode_pembayaran !== 'cash'
    );

    const lunasNominal = lunasList.reduce((acc, t) => acc + (t.harga_final || 0), 0);
    const belumLunasNominal = belumLunasList.reduce((acc, t) => acc + (t.harga_final || 0), 0);

    const unweighedPendingList = filteredList.filter((t) => !getKuponWeighStatus(t).isAllWeighed);
    const siapBayarList = filteredList.filter((t) => {
      const isLunas = t.status_pembayaran === 'lunas' || t.metode_pembayaran === 'cash';
      return !isLunas && getKuponWeighStatus(t).isAllWeighed;
    });

    return {
      totalTx,
      totalBal,
      totalNetto,
      totalKotor,
      totalPajak,
      totalPotongan,
      totalBayar,
      avgHarga,
      lunasNominal,
      belumLunasNominal,
      lunasCount: lunasList.length,
      belumLunasCount: belumLunasList.length,
      unweighedPendingCount: unweighedPendingList.length,
      siapBayarCount: siapBayarList.length,
    };
  }, [filteredList]);

  // Table Quick Search filtering & sorting
  const searchedAndSortedList = useMemo(() => {
    let result = [...filteredList];

    // Quick text search across all columns
    if (tableSearch.trim()) {
      const q = tableSearch.trim().toLowerCase();
      result = result.filter((tx) => {
        const kupon = (tx.no_kupon || '').toLowerCase();
        const tgl = formatDateIndo(tx.tanggal_transaksi).toLowerCase();
        const petani = (tx.nama_petani || '').toLowerCase();
        const id = (tx.transaksi_id || '').toLowerCase();
        const bal = String(tx.total_bal || tx.items?.length || 1);
        const netto = String(tx.berat_kg || 0);
        return kupon.includes(q) || tgl.includes(q) || petani.includes(q) || id.includes(q) || bal.includes(q) || netto.includes(q);
      });
    }

    // Dynamic sorting
    result.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'kupon': {
          const matchA = a.no_kupon.match(/\d+/);
          const matchB = b.no_kupon.match(/\d+/);
          valA = matchA ? parseInt(matchA[0], 10) : a.no_kupon;
          valB = matchB ? parseInt(matchB[0], 10) : b.no_kupon;
          break;
        }
        case 'tanggal':
          valA = a.tanggal_transaksi || '';
          valB = b.tanggal_transaksi || '';
          break;
        case 'petani':
          valA = a.nama_petani.toLowerCase();
          valB = b.nama_petani.toLowerCase();
          break;
        case 'jumlah':
          valA = a.total_bal || a.items?.length || 1;
          valB = b.total_bal || b.items?.length || 1;
          break;
        case 'netto':
          valA = a.berat_kg || 0;
          valB = b.berat_kg || 0;
          break;
        case 'total_kotor':
          valA = a.total_kotor || a.total_harga_beli || 0;
          valB = b.total_kotor || b.total_harga_beli || 0;
          break;
        case 'pajak':
          valA = a.pajak || 0;
          valB = b.pajak || 0;
          break;
        case 'potongan':
          valA = a.total_potongan || 0;
          valB = b.total_potongan || 0;
          break;
        case 'jumlah_bayar':
          valA = a.harga_final || 0;
          valB = b.harga_final || 0;
          break;
        case 'cash': {
          const isLunasA = a.status_pembayaran === 'lunas' || a.metode_pembayaran === 'cash';
          const isLunasB = b.status_pembayaran === 'lunas' || b.metode_pembayaran === 'cash';
          valA = isLunasA ? a.harga_final : 0;
          valB = isLunasB ? b.harga_final : 0;
          break;
        }
        case 'kredit': {
          const isLunasA = a.status_pembayaran === 'lunas' || a.metode_pembayaran === 'cash';
          const isLunasB = b.status_pembayaran === 'lunas' || b.metode_pembayaran === 'cash';
          valA = !isLunasA ? a.harga_final : 0;
          valB = !isLunasB ? b.harga_final : 0;
          break;
        }
        case 'avg': {
          valA = a.berat_kg > 0 ? (a.total_kotor || a.total_harga_beli) / a.berat_kg : 0;
          valB = b.berat_kg > 0 ? (b.total_kotor || b.total_harga_beli) / b.berat_kg : 0;
          break;
        }
        default:
          valA = a.no_kupon;
          valB = b.no_kupon;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [filteredList, tableSearch, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.ceil(searchedAndSortedList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return searchedAndSortedList.slice(start, start + itemsPerPage);
  }, [searchedAndSortedList, currentPage, itemsPerPage]);

  const handleHeaderSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setFilterKupon('');
    setFilterPetaniId('');
    setFilterStatusBayar('all');
    setTableSearch('');
    setSortOrderKupon('desc');
    setSortField('kupon');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4 font-sans pb-10 text-slate-800">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-4 shadow-2xs rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-slate-800"></span>
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Data Pembelian Barang (Kasir & Pencairan Nota)
            </h2>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium rounded-xs">
              Proses 3: Kasir & Pembayaran Cash
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rekapitulasi data pembelian tembakau, verifikasi tiket timbang fisik, realisasi kas tunai keluar, dan pencetakan nota resmi.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onNavigateToSortir()}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-sm transition cursor-pointer shadow-2xs"
          >
            Intake Sortir Baru
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTimbangan()}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-sm transition cursor-pointer shadow-2xs"
          >
            Meja Timbangan
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border border-slate-200 p-4 shadow-2xs rounded-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-600" />
            <span>Filter Pencarian Data Pembelian</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Ditemukan <strong className="text-slate-800">{filteredList.length}</strong> dari {transaksiList.length} transaksi
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3 items-end">
          
          {/* Tanggal Mulai */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
            />
          </div>

          {/* Tanggal Akhir */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
            />
          </div>

          {/* Kupon */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kupon / ID
            </label>
            <input
              type="text"
              value={filterKupon}
              onChange={(e) => {
                setFilterKupon(formatNoKupon(e.target.value));
                setCurrentPage(1);
              }}
              placeholder="Masukkan kupon..."
              className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 font-mono"
            />
          </div>

          {/* Petani */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Petani
            </label>
            <select
              value={filterPetaniId}
              onChange={(e) => {
                setFilterPetaniId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
            >
              <option value="">-- Semua Petani --</option>
              {petaniList.map((p) => (
                <option key={p.petani_id} value={p.petani_id}>
                  {p.nama_petani} ({p.petani_id})
                </option>
              ))}
            </select>
          </div>

          {/* Status Bayar */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Kas & Kesiapan
            </label>
            <select
              value={filterStatusBayar}
              onChange={(e) => {
                setFilterStatusBayar(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 font-medium"
            >
              <option value="all">-- Semua Status Kas --</option>
              <option value="siap_bayar">
                ✓ Siap Bayar ({transaksiList.filter((t) => (t.status_pembayaran !== 'lunas' && t.metode_pembayaran !== 'cash') && getKuponWeighStatus(t).isAllWeighed).length})
              </option>
              <option value="belum_lengkap">
                ⚠️ Belum Lengkap Timbang ({transaksiList.filter((t) => !getKuponWeighStatus(t).isAllWeighed).length})
              </option>
              <option value="cash">
                Cash / Lunas ({transaksiList.filter((t) => t.status_pembayaran === 'lunas' || t.metode_pembayaran === 'cash').length})
              </option>
              <option value="kredit">
                Kredit / Pending ({transaksiList.filter((t) => t.status_pembayaran !== 'lunas' && t.metode_pembayaran !== 'cash').length})
              </option>
            </select>
          </div>

          {/* Urutan Kupon */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Urutan Kupon
            </label>
            <select
              value={sortDirection}
              onChange={(e) => {
                setSortField('kupon');
                setSortDirection(e.target.value as 'desc' | 'asc');
              }}
              className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 font-medium"
            >
              <option value="desc">Kupon: Tertinggi ➔ Terendah</option>
              <option value="asc">Kupon: Terendah ➔ Tertinggi</option>
            </select>
          </div>

          {/* Buttons: Cari Data */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-sm transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-sm transition cursor-pointer"
              title="Reset Filter"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 p-3 rounded-sm shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-slate-500 block tracking-wider">Total Transaksi</span>
          <p className="text-base font-semibold text-slate-900 mt-0.5">{stats.totalTx} Nota</p>
          <span className="text-[10px] text-slate-400 font-normal">Setoran pembelian</span>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-sm shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-slate-500 block tracking-wider">Total Bal</span>
          <p className="text-base font-semibold text-slate-900 mt-0.5">{stats.totalBal} Bal</p>
          <span className="text-[10px] text-slate-400 font-normal">Karung masuk</span>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-sm shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-slate-500 block tracking-wider">Total Tonase Netto</span>
          <p className="text-base font-semibold text-slate-900 mt-0.5 font-mono">{stats.totalNetto.toLocaleString('id-ID')} Kg</p>
          <span className="text-[10px] text-slate-500 font-normal">{(stats.totalNetto / 1000).toFixed(2)} Ton</span>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-sm shadow-2xs">
          <span className="text-[10px] uppercase font-semibold text-slate-500 block tracking-wider">Total Pembelian</span>
          <p className="text-base font-semibold text-slate-900 mt-0.5 font-mono">{formatRupiah(stats.totalBayar)}</p>
          <span className="text-[10px] text-slate-500 font-normal">Pot: {formatRupiah(stats.totalPotongan)}</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-slate-700 block tracking-wider">Kas Keluar (Cash)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-base font-semibold text-slate-900 mt-0.5 font-mono">{formatRupiah(stats.lunasNominal)}</p>
          <span className="text-[10px] text-emerald-700 font-semibold">{stats.lunasCount} Nota Cair</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-slate-700 block tracking-wider">Hutang (Kredit)</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-base font-semibold text-slate-900 mt-0.5 font-mono">{formatRupiah(stats.belumLunasNominal)}</p>
          <span className="text-[10px] text-amber-700 font-semibold">{stats.belumLunasCount} Nota Pending</span>
        </div>
      </div>

      {/* Informational Alert if any Kupon is blocked due to unweighed items */}
      {stats.unweighedPendingCount > 0 && (
        <div className="bg-amber-50/90 border border-amber-300 text-amber-950 px-4 py-2.5 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs shadow-2xs gap-2">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="leading-tight">
              <strong>Aturan Kasir:</strong> Terdapat <strong>{stats.unweighedPendingCount} kupon</strong> yang masih memiliki bal belum ditimbang di modul Timbangan. Seluruh bal dalam 1 kupon harus ditimbang lengkap terlebih dahulu baru bisa lanjut ke pembayaran kasir.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilterStatusBayar('belum_lengkap');
              setCurrentPage(1);
            }}
            className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline shrink-0 cursor-pointer"
          >
            Tampilkan Kupon Belum Lengkap ({stats.unweighedPendingCount})
          </button>
        </div>
      )}

      {/* Main Table Box */}
      <div className="bg-white border border-slate-200 shadow-2xs rounded-sm overflow-hidden">
        
        {/* Table Title Bar */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
              Tabel Data Pembelian Barang & Status Kasir
            </h3>
          </div>
        </div>

        {/* DataTables Controls (Show Entries & Instant Search) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200 text-xs">
          <div className="flex items-center space-x-2 text-slate-700">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded-xs px-2 py-1 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center space-x-2 text-slate-700 w-full sm:w-auto justify-end">
            <span className="font-medium">Search:</span>
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari kupon, petani, tanggal..."
              className="bg-white border border-slate-300 rounded-xs px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800 w-44 sm:w-60"
            />
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#343a40] text-white font-semibold text-[11px] border-b border-slate-700 select-none">
                <th 
                  onClick={() => handleHeaderSort('kupon')}
                  className="py-2.5 px-3 w-10 text-center cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>#</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('kupon')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span>Kupon</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('tanggal')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span>Tanggal</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('petani')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span>Petani</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('jumlah')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Jumlah / Beli</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('netto')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Netto</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('total_kotor')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Total Harga Beli</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('pajak')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Pajak</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('potongan')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Potongan</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('jumlah_bayar')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Jumlah Bayar</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('cash')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Cash</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('kredit')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Kredit</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleHeaderSort('avg')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-700 transition"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>AVG</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center w-36">
                  <span>Opsi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400 bg-white">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700 text-xs">Tidak ada data pembelian yang sesuai</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Silakan sesuaikan filter tanggal atau kata kunci pencarian.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((tx, index) => {
                  const seq = (currentPage - 1) * itemsPerPage + index + 1;
                  const { isAllWeighed, unweighedCount, totalBal: balCount, weighedCount, unweighedBalList } = getKuponWeighStatus(tx);
                  const isLunas = tx.status_pembayaran === 'lunas' || tx.metode_pembayaran === 'cash';
                  const totalKotorVal = tx.total_kotor || tx.total_harga_beli || 0;
                  const pajakVal = tx.pajak || 0;
                  const potonganVal = tx.total_potongan || 0;
                  const jumlahBayarVal = tx.harga_final || 0;

                  // Cash vs Kredit Logic requested by user:
                  // JIKA BELUM LUNAS: Cash = 0 dan Kredit = senilai Jumlah Bayar
                  // JIKA SUDAH LUNAS: Cash = senilai Jumlah Bayar dan Kredit = 0
                  const cashVal = isLunas ? jumlahBayarVal : 0;
                  const kreditVal = isLunas ? 0 : jumlahBayarVal;

                  // AVG Calculation requested by user:
                  // Rata-rata per kg = Total Harga Beli / Netto (0 jika belum ditimbang)
                  const avgPrice = tx.berat_kg > 0 ? Math.round(totalKotorVal / tx.berat_kg) : 0;

                  return (
                    <tr 
                      key={tx.transaksi_id} 
                      className="hover:bg-slate-50 transition border-b border-slate-100 text-slate-800"
                    >
                      {/* # */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {seq}
                      </td>

                      {/* Kupon */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {tx.no_kupon || '-'}
                          </span>
                          {!isLunas && !isAllWeighed && (
                            <span 
                              className="inline-flex items-center space-x-0.5 text-[9px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1 py-0.2 rounded-xs mt-0.5 w-fit"
                              title={`Masih ada ${unweighedCount} bal belum ditimbang (${unweighedBalList.join(', ')}). Tidak bisa bayar sampai semua ditimbang.`}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0 mr-0.5" />
                              <span>{unweighedCount} blm timbang</span>
                            </span>
                          )}
                          {!isLunas && isAllWeighed && (
                            <span className="inline-flex items-center text-[9px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded-xs mt-0.5 w-fit">
                              ✓ Siap Bayar
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tanggal: e.g. 08 September 2026 */}
                      <td className="py-2.5 px-3 text-slate-700 text-xs whitespace-nowrap">
                        {formatDateIndo(tx.tanggal_transaksi)}
                      </td>

                      {/* Petani */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 text-xs">{tx.nama_petani}</div>
                      </td>

                      {/* Jumlah / Beli */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-800">
                        {balCount}
                      </td>

                      {/* Netto */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                        <div>
                          <span>{tx.berat_kg ? tx.berat_kg.toLocaleString('id-ID') : 0}</span>
                          {!isAllWeighed && (
                            <span 
                              className="block text-[9px] font-sans text-amber-700 font-semibold"
                              title={`Netto sementara (${weighedCount}/${balCount} bal ditimbang)`}
                            >
                              (Belum Lengkap)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Harga Beli */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                        {formatAccounting(totalKotorVal)}
                      </td>

                      {/* Pajak */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatAccounting(pajakVal)}
                      </td>

                      {/* Potongan */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatAccounting(potonganVal)}
                      </td>

                      {/* Jumlah Bayar */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatAccounting(jumlahBayarVal)}
                      </td>

                      {/* Cash */}
                      <td className={`py-2.5 px-3 text-right font-mono ${isLunas ? 'font-bold text-emerald-700' : 'text-slate-600'}`}>
                        {formatAccounting(cashVal)}
                      </td>

                      {/* Kredit */}
                      <td className={`py-2.5 px-3 text-right font-mono ${!isLunas ? 'font-bold text-amber-700' : 'text-slate-600'}`}>
                        {formatAccounting(kreditVal)}
                      </td>

                      {/* AVG */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800 font-medium">
                        {formatAccounting(avgPrice)}
                      </td>

                      {/* Opsi Buttons */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          
                          {/* Tombol Detail (Hijau) */}
                          <button
                            type="button"
                            onClick={() => setSelectedTxForDetail(tx)}
                            className="px-2 py-1 bg-[#28a745] hover:bg-[#218838] text-white font-semibold text-[11px] rounded-xs transition cursor-pointer shadow-2xs inline-flex items-center space-x-1"
                            title="Lihat Detail Transaksi & Tiket"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Detail</span>
                          </button>

                          {/* Tombol Cetak (Terkunci ketika belum lunas, baru terbuka setelah lunas) */}
                          {isLunas && isAllWeighed ? (
                            <button
                              type="button"
                              onClick={() => handleCetakClick(tx)}
                              className="px-2 py-1 bg-[#dc3545] hover:bg-[#c82333] text-white font-semibold text-[11px] rounded-xs transition cursor-pointer shadow-2xs inline-flex items-center space-x-1"
                              title="Cetak Nota Pembelian Resmi (Lunas)"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Cetak</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="px-2 py-1 bg-slate-100 border border-slate-300 text-slate-400 font-semibold text-[11px] rounded-xs transition cursor-not-allowed shadow-none inline-flex items-center space-x-1 opacity-70"
                              title={
                                !isAllWeighed
                                  ? "Terkunci: Bal belum selesai ditimbang"
                                  : "Terkunci: Nota baru dapat dicetak setelah status pembayaran Lunas (Cash)"
                              }
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>Cetak</span>
                            </button>
                          )}

                          {/* Tombol Bayar (Jika belum lunas) */}
                          {!isLunas && (
                            isAllWeighed ? (
                              <button
                                type="button"
                                onClick={() => handleMarkAsLunas(tx.transaksi_id)}
                                className="px-2 py-1 bg-[#007bff] hover:bg-[#0069d9] text-white font-semibold text-[11px] rounded-xs transition cursor-pointer shadow-2xs inline-flex items-center space-x-1"
                                title="Proses Pembayaran Tunai (Cash) Loket Kasir"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                                <span>Bayar</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmConfig({
                                    isOpen: true,
                                    title: 'Tidak Bisa Bayar',
                                    message: `Kupon ${tx.no_kupon} masih memiliki ${unweighedCount} dari ${balCount} bal yang belum ditimbang di modul Timbangan:\n[${unweighedBalList.join(', ')}]\n\nSesuai SOP, seluruh bal dalam 1 kupon harus ditimbang semua terlebih dahulu baru bisa lanjut ke pembayaran kasir.\n\nApakah Anda ingin membuka Kupon ${tx.no_kupon} di modul Timbangan sekarang?`,
                                    confirmText: 'Buka Modul Timbangan',
                                    cancelText: 'Tutup',
                                    onConfirm: () => {
                                      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                                      onNavigateToTimbangan(tx.no_kupon, tx.transaksi_id);
                                    }
                                  });
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-[11px] rounded-xs transition cursor-pointer shadow-2xs inline-flex items-center space-x-1"
                                title={`Terkunci: Masih ada ${unweighedCount} bal belum ditimbang (${unweighedBalList.join(', ')}). Seluruh bal harus ditimbang terlebih dahulu.`}
                              >
                                <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                                <span>Timbang ({weighedCount}/{balCount})</span>
                              </button>
                            )
                          )}

                          {/* Tombol Edit jika role diperbolehkan */}
                          {(userRole === 'superadmin' || userRole === 'admin_kasir') && (
                            <button
                              type="button"
                              onClick={() => setSelectedTxForEdit(tx)}
                              className="p-1 text-slate-400 hover:text-amber-700 transition cursor-pointer"
                              title="Koreksi Transaksi"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}

                          {/* Tombol Hapus jika superadmin */}
                          {userRole === 'superadmin' && (
                            <button
                              type="button"
                              onClick={() => setTxToDelete(tx)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Summary Row matching Image 2 */}
            <tfoot>
              <tr className="bg-[#e9ecef] font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider font-extrabold text-slate-800">
                  Total:
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                  {stats.totalBal}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  {stats.totalNetto.toLocaleString('id-ID')}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  {formatAccounting(stats.totalKotor)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  {formatAccounting(stats.totalPajak)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  {formatAccounting(stats.totalPotongan)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  {formatAccounting(stats.totalBayar)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                  {formatAccounting(stats.lunasNominal)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">
                  {formatAccounting(stats.belumLunasNominal)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  {formatAccounting(stats.avgHarga)}
                </td>
                <td className="py-2.5 px-3 text-center text-slate-400">
                  -
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* DataTables Bottom Controls (Showing X of Y & Pagination) */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing {searchedAndSortedList.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, searchedAndSortedList.length)} of {searchedAndSortedList.length} entries
            {filteredList.length !== transaksiList.length && (
              <span className="text-slate-400 ml-1">
                (filtered from {transaksiList.length} total entries)
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 border border-slate-300 rounded-xs bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
              .map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-2.5 py-1 border rounded-xs text-xs font-semibold cursor-pointer ${
                    page === currentPage
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 border border-slate-300 rounded-xs bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Transaksi Detail & PDF Print Modal */}
      <TransaksiDetailModal
        isOpen={Boolean(selectedTxForDetail)}
        onClose={() => setSelectedTxForDetail(null)}
        transaksi={selectedTxForDetail}
        onUpdateNotaStatus={handleUpdateNotaStatus}
        onMarkAsLunas={handleMarkAsLunas}
        onOpenBayarModal={(tx) => setSelectedTxForBayar(tx)}
        onOpenEditModal={(tx) => setSelectedTxForEdit(tx)}
        onDeleteTransaksi={(txId, alasan) => {
          if (onDeleteTransaksi) onDeleteTransaksi(txId, alasan);
          setSelectedTxForDetail(null);
        }}
      />

      {/* Pembayaran Kasir Cash Modal */}
      <PembayaranKasirModal
        isOpen={Boolean(selectedTxForBayar)}
        onClose={() => setSelectedTxForBayar(null)}
        transaksi={selectedTxForBayar}
        currentKasirName={currentUser?.nama_lengkap || currentUser?.username || 'Petugas Kasir'}
        onConfirmPembayaran={handleConfirmCashPayment}
      />

      {/* Edit Transaksi Modal */}
      {selectedTxForEdit && (
        <TransaksiEditModal
          isOpen={Boolean(selectedTxForEdit)}
          onClose={() => setSelectedTxForEdit(null)}
          transaksi={selectedTxForEdit}
          petaniList={petaniList}
          hargaList={hargaList}
          barangList={barangList}
          gudangList={gudangList}
          currentUser={currentUser}
          onSaveTransaksi={(newTx, generatedBarang) => {
            onSaveTransaksi(newTx, generatedBarang);
            if (selectedTxForDetail && selectedTxForDetail.transaksi_id === newTx.transaksi_id) {
              setSelectedTxForDetail(newTx);
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-rose-200 rounded-sm shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Transaksi</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {txToDelete.no_kupon} ({txToDelete.transaksi_id})
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xs text-xs text-rose-950 space-y-1">
              <p>
                Apakah Anda yakin ingin menghapus transaksi milik Petani <strong>{txToDelete.nama_petani}</strong>?
              </p>
              <p className="text-[11px] text-rose-700">
                • Berat Netto: {txToDelete.berat_kg} Kg ({txToDelete.total_bal || txToDelete.items?.length || 1} Bal)
                <br />
                • Total Nilai: {formatRupiah(txToDelete.harga_final || txToDelete.total_harga_beli)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alasan Penghapusan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={alasanHapus}
                onChange={(e) => setAlasanHapus(e.target.value)}
                placeholder="Contoh: Kesalahan input sortir..."
                className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setTxToDelete(null);
                  setAlasanHapus('');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-sm transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!alasanHapus.trim()}
                onClick={() => {
                  if (onDeleteTransaksi && txToDelete) {
                    onDeleteTransaksi(txToDelete.transaksi_id, alasanHapus);
                  }
                  setTxToDelete(null);
                  setAlasanHapus('');
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs rounded-sm transition cursor-pointer shadow-2xs"
              >
                Hapus Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Kasir */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};

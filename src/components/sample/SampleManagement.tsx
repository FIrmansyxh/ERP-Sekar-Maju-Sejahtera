import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FlaskConical, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  Edit3, 
  Filter, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Info,
  ArrowLeft,
  CheckSquare,
  Scale,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  Truck,
  Printer,
  Eye,
  Trash2,
  SlidersHorizontal,
  Barcode,
  Zap,
  Package
} from 'lucide-react';
import { 
  PengirimanSample, 
  BatchPengirimanSample, 
  SampleItemDetail, 
  StatusSample, 
  StatusBatchSample, 
  Barang, 
  Gudang, 
  Petani, 
  UserRole,
  MasterHargaJual,
  TabelHarga,
  TransaksiPembelian
} from '../../types';
import { loadHargaJualData, loadBatchSampleData, loadHargaData, loadTransaksiData } from '../../utils/storage';
import { SampleStatusUpdateModal } from './SampleStatusUpdateModal';
import { BatchEvaluasiSortirModal } from './BatchEvaluasiSortirModal';
import { BatchSamplePrintModal } from './BatchSamplePrintModal';
import { ConfirmModal } from '../common/ConfirmModal';

import { Pagination } from '../common/Pagination';
import { generateBatchSampleId, generateSampleId, formatRupiah, formatNumber } from '../../utils/formatters';

interface SampleManagementProps {
  sampleList: PengirimanSample[];
  batchSampleList?: BatchPengirimanSample[];
  barangList: Barang[];
  gudangList?: Gudang[];
  petaniList?: Petani[];
  hargaJualList?: MasterHargaJual[];
  hargaList?: TabelHarga[];
  transaksiList?: TransaksiPembelian[];
  userRole: UserRole;
  onSaveNewSample?: (sample: PengirimanSample) => void;
  onSaveBatchSamples: (samples: PengirimanSample[], updatedBarangs: Barang[]) => void;
  onSaveBatchSample?: (newBatch: BatchPengirimanSample, updatedBarangs: Barang[]) => void;
  onUpdateBatchSample?: (updatedBatch: BatchPengirimanSample, updatedBarangs?: Barang[]) => void;
  onDeleteBatchSample?: (batchId: string) => void;
  onUpdateSample: (sample: PengirimanSample) => void;
  onNavigateToPengiriman?: (batchId?: string) => void;
}

export const SampleManagement: React.FC<SampleManagementProps> = ({
  sampleList = [],
  batchSampleList = [],
  barangList = [],
  gudangList = [],
  petaniList = [],
  hargaJualList = [],
  hargaList = [],
  transaksiList = [],
  userRole,
  onSaveNewSample,
  onSaveBatchSamples,
  onSaveBatchSample,
  onUpdateBatchSample,
  onDeleteBatchSample,
  onUpdateSample,
  onNavigateToPengiriman,
}) => {
  // Master Harga Jual reference list
  const activeHargaJualList = (hargaJualList && hargaJualList.length > 0) ? hargaJualList : loadHargaJualData();
  const activeHargaList = (hargaList && hargaList.length > 0) ? hargaList : loadHargaData();
  const activeTransaksiList = (transaksiList && transaksiList.length > 0) ? transaksiList : loadTransaksiData();

  // Active batches fallback to localStorage if prop is empty
  const activeBatchSampleList = useMemo(() => {
    return (batchSampleList && batchSampleList.length > 0) ? batchSampleList : loadBatchSampleData();
  }, [batchSampleList]);

  // Transaksi item map to resolve purchase price (harga_beli) and farmer info
  const txItemMap = useMemo(() => {
    const map = new Map<string, { harga_per_kg: number; nama_petani: string; no_kupon: string }>();
    activeTransaksiList.forEach((tx) => {
      if (tx.items) {
        tx.items.forEach((it) => {
          if (it.barang_id || it.no_bal) {
            const key = it.barang_id || it.no_bal;
            map.set(key, {
              harga_per_kg: it.harga_per_kg || 0,
              nama_petani: tx.nama_petani || '',
              no_kupon: tx.no_kupon || '',
            });
          }
        });
      }
    });
    return map;
  }, [activeTransaksiList]);

  // Resolver for purchase price (Harga Beli)
  const resolveHargaBeli = (bal: Partial<Barang> | undefined): number => {
    if (!bal) return 0;
    if (bal.harga_per_kg && bal.harga_per_kg > 0) {
      return bal.harga_per_kg;
    }
    const txItem = txItemMap.get(bal.barang_id || '') || txItemMap.get(bal.no_bal || '');
    if (txItem && txItem.harga_per_kg > 0) {
      return txItem.harga_per_kg;
    }
    if (bal.kode_grade) {
      const foundHrg = activeHargaList.find((h) => h.kode_grade?.toUpperCase() === bal.kode_grade?.toUpperCase());
      if (foundHrg && foundHrg.harga_per_kg > 0) {
        return foundHrg.harga_per_kg;
      }
      const num = parseInt(bal.kode_grade, 10);
      if (!isNaN(num) && num >= 10 && num <= 200) {
        return num * 1000;
      }
    }
    return 0;
  };

  // Resolver for Netto weight
  const resolveBeratNetto = (bal: Partial<Barang> | undefined, fallbackKg: number = 0): number => {
    if (!bal) return fallbackKg || 0;
    return bal.berat_kg || fallbackKg || 0;
  };

  // Resolver for Bruto weight
  const resolveBeratBruto = (bal: Partial<Barang> | undefined, fallbackNetto: number = 0): number => {
    if (!bal) return fallbackNetto > 0 ? Number((fallbackNetto + 2).toFixed(1)) : 0;
    if (bal.berat_bruto_kg && bal.berat_bruto_kg > 0) return bal.berat_bruto_kg;
    const netto = bal.berat_kg || fallbackNetto || 0;
    const tara = bal.potongan_tara_kg !== undefined ? bal.potongan_tara_kg : 2;
    return netto > 0 ? Number((netto + tara).toFixed(1)) : 0;
  };

  // Main view mode: 'list' (Daftar & Monitoring Batch) or 'create' (Input & Dispatch Sample Workstation)
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [activeTab, setActiveTab] = useState<'batches' | 'items'>('batches');

  // Barcode Scanner & Manual Bal Input for Sample Dispatch
  const [scanSampleAlert, setScanSampleAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [scanGudang, setScanGudang] = useState('');
  const [isBalDropdownOpen, setIsBalDropdownOpen] = useState(false);
  const [highlightedBalIndex, setHighlightedBalIndex] = useState(0);
  const balDropdownRef = React.useRef<HTMLDivElement>(null);
  const [isHargaJualDropdownOpen, setIsHargaJualDropdownOpen] = useState(false);
  const [highlightedHargaJualIndex, setHighlightedHargaJualIndex] = useState(0);
  const hargaJualDropdownRef = React.useRef<HTMLDivElement>(null);

  const [scanPembeli, setScanPembeli] = useState('');
  const [scanHargaJual, setScanHargaJual] = useState('');
  
  const inputGudangRef = React.useRef<HTMLInputElement>(null);
  const inputPembeliRef = React.useRef<HTMLInputElement>(null);
  const inputHargaJualRef = React.useRef<HTMLInputElement>(null);
  const [pendingScanBal, setPendingScanBal] = useState<Barang | null>(null);

  // Dropdown Autocomplete State for Bal Input
  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (balDropdownRef.current && !balDropdownRef.current.contains(e.target as Node)) {
        setIsBalDropdownOpen(false);
      }
      if (hargaJualDropdownRef.current && !hargaJualDropdownRef.current.contains(e.target as Node)) {
        setIsHargaJualDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selected Bales in Form with customizable offer price per bal
  const [selectedBalItems, setSelectedBalItems] = useState<
    { 
      barangId: string; 
      noBal: string; 
      kodeBalPembeli: string; 
      grade: string; 
      beratBalKg: number; 
      beratBrutoKg: number;
      potonganTaraKg: number;
      hargaBeliKg: number;
      kodeHargaJual: string; 
      hargaTawaranKg: number; 
    }[]
  >([]);

  const availableBalList = useMemo(() => {
    return barangList.filter((b) => b.status_stok === 'di_gudang');
  }, [barangList]);

  // Helper untuk memeriksa status penggunaan nomor bal pada modul sample
  const checkBalUsage = (bal: Barang) => {
    // 1. Cek apakah sudah dipilih di tabel draft pembuatan batch saat ini
    const isSelectedInCurrent = selectedBalItems.some(
      (it) =>
        it.barangId === bal.barang_id ||
        (it.noBal && bal.no_bal && it.noBal.trim().toLowerCase() === bal.no_bal.trim().toLowerCase())
    );
    if (isSelectedInCurrent) {
      return {
        isAvailable: false,
        statusType: 'in_current_batch' as const,
        badgeText: 'SUDAH DIPILIH',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        message: `⚠️ BAL SUDAH DIPILIH: Bal #${bal.no_bal || bal.barang_id} (${bal.kode_grade}) sudah ada dalam tabel draft sample batch ini!`,
        detail: 'Sudah tercantum di tabel draft di bawah.',
      };
    }

    // 2. Cek apakah sudah pernah digunakan pada Batch Pengiriman Sample lain yang tercatat
    const matchedBatch = activeBatchSampleList.find(
      (b) =>
        b.status !== 'dibatalkan' &&
        b.items?.some(
          (it) => {
            const isMatch = it.barang_id === bal.barang_id || (it.no_bal && bal.no_bal && it.no_bal.trim().toLowerCase() === bal.no_bal.trim().toLowerCase());
            // If the item was rejected in the batch, it can be used again
            if (isMatch && (it.status_item === 'ditolak' || (it as any).status === 'ditolak')) {
              return false;
            }
            return isMatch;
          }
        )
    );
    if (matchedBatch) {
      const statusText =
        matchedBatch.status === 'sample' || matchedBatch.status === 'diproses'
          ? 'Sedang Pengujian Lab'
          : matchedBatch.status === 'dikirim'
          ? 'Sedang Dikirim Ekspedisi'
          : matchedBatch.status === 'selesai'
          ? 'Selesai / Evaluasi Disetujui'
          : matchedBatch.status;

      return {
        isAvailable: false,
        statusType: 'used_in_batch' as const,
        badgeText: `SUDAH DIPAKAI: ${matchedBatch.kode_batch}`,
        badgeClass: 'bg-red-100 text-red-800 border-red-300',
        message: `⚠️ NO BAL SUDAH DIPAKAI: Bal #${bal.no_bal || bal.barang_id} (Grade ${bal.kode_grade}) SUDAH DIGUNAKAN pada Batch Sample "${matchedBatch.kode_batch}" (Tujuan: ${matchedBatch.tujuan_buyer} • Status: ${statusText} • Tgl Kirim: ${matchedBatch.tanggal_kirim || '-'})!`,
        detail: `Batch: ${matchedBatch.kode_batch} (${matchedBatch.tujuan_buyer})`,
        batch: matchedBatch,
      };
    }

    // 3. Cek status fisik bal di gudang
    if (bal.status_stok !== 'di_gudang') {
      let alasan = `Status fisik bal: "${bal.status_stok}".`;
      if (bal.status_stok === 'terkirim_sample') {
        alasan = `Bal ini sudah berstatus terkirim sampel (${bal.catatan || 'Dalam proses pengujian sample'}).`;
      } else if (bal.status_stok === 'keluar') {
        alasan = `Bal ini sudah keluar gudang melalui DO pengiriman reguler.`;
      }
      return {
        isAvailable: false,
        statusType: 'not_in_warehouse' as const,
        badgeText: `STATUS: ${bal.status_stok.toUpperCase()}`,
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
        message: `⚠️ BAL TIDAK TERSEDIA DI GUDANG: Bal #${bal.no_bal || bal.barang_id} tidak dapat dijadikan sample (${alasan})`,
        detail: alasan,
      };
    }

    // 4. Bal siap digunakan
    return {
      isAvailable: true,
      statusType: 'available' as const,
      badgeText: 'TERSEDIA',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      message: `Bal #${bal.no_bal || bal.barang_id} siap digunakan.`,
      detail: `Grade ${bal.kode_grade} • ${bal.berat_kg} kg • ${bal.lokasi_gudang || 'Gudang'}`,
    };
  };

  // Compute bal suggestions dynamically based on scanGudang (menampilkan info ketersediaan & info jika sudah dipakai)
  const balSuggestions = useMemo(() => {
    const q = scanGudang.trim().toLowerCase();
    if (!q) return [];
    const qClean = q.replace(/[^a-zA-Z0-9]/g, '');
    
    // Cari kecocokan di seluruh database barang
    const matches = barangList.filter((b) => {
      const bNo = (b.no_bal || b.barang_id).toLowerCase();
      const bNoClean = bNo.replace(/[^a-zA-Z0-9]/g, '');
      return bNoClean.includes(qClean) || (b.barang_id && b.barang_id.toLowerCase().includes(qClean));
    });

    // Urutkan: Bal yang tersedia dan diawali query di paling atas, kemudian bal yang sudah terpakai
    matches.sort((a, b) => {
      const usageA = checkBalUsage(a);
      const usageB = checkBalUsage(b);
      if (usageA.isAvailable && !usageB.isAvailable) return -1;
      if (!usageA.isAvailable && usageB.isAvailable) return 1;

      const aNo = a.no_bal || a.barang_id;
      const bNo = b.no_bal || b.barang_id;
      const aStarts = aNo.toLowerCase().startsWith(qClean);
      const bStarts = bNo.toLowerCase().startsWith(qClean);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aNo.localeCompare(bNo, undefined, { numeric: true, sensitivity: 'base' });
    });

    return matches.slice(0, 20);
  }, [barangList, scanGudang, selectedBalItems, activeBatchSampleList]);

  const handleSelectSuggestedBal = (bal: Barang) => {
    const check = checkBalUsage(bal);
    if (!check.isAvailable) {
      setScanSampleAlert({
        type: check.statusType === 'in_current_batch' ? 'warning' : 'error',
        message: check.message,
      });
      setIsBalDropdownOpen(false);
      setScanGudang('');
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    setPendingScanBal(bal);
    setScanSampleAlert({
      type: 'success',
      message: `✓ No Bal #${bal.no_bal || bal.barang_id} (Grade ${bal.kode_grade} - ${bal.berat_kg} kg) dipilih. Lanjut ke No Jadi.`,
    });
    setIsBalDropdownOpen(false);
    setScanGudang(bal.no_bal || bal.barang_id);
    setTimeout(() => inputPembeliRef.current?.focus(), 100);
  };

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchStatus, setSelectedBatchStatus] = useState<string>('all');
  const [selectedItemStatus, setSelectedItemStatus] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals State
  const [evaluatingBatch, setEvaluatingBatch] = useState<BatchPengirimanSample | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [printingBatch, setPrintingBatch] = useState<BatchPengirimanSample | null>(null);
  const [updatingSingleSample, setUpdatingSingleSample] = useState<PengirimanSample | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  // Create Batch Form State
  const [tujuanBuyer, setTujuanBuyer] = useState('');
  const [permintaanBuyer, setPermintaanBuyer] = useState('');
  const [sumberGudang, setSumberGudang] = useState(gudangList[0]?.nama_gudang || 'Gudang Utama Pamekasan');
  const [tanggalKirim, setTanggalKirim] = useState(new Date().toISOString().split('T')[0]);
  const [dikirimOleh, setDikirimOleh] = useState('');
  const [catatanBatchForm, setCatatanBatchForm] = useState('Sample batch resmi untuk evaluasi organoleptik dan uji kadar air sebelum DO.');

  // Bal selection filters inside Create Form
  const [filterGradeBal, setFilterGradeBal] = useState<string>('all');
  const [filterGudangBal, setFilterGudangBal] = useState<string>('all');
  const [filterPetaniBal, setFilterPetaniBal] = useState<string>('all');
  const [searchBalText, setSearchBalText] = useState<string>('');

  // Bulk set kode harga jual for all selected bales
  const [bulkKodeHarga, setBulkKodeHarga] = useState<string>('');

  const [isConfirmCreateOpen, setIsConfirmCreateOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Helper default price by grade
  const getDefaultPriceByGrade = (grade: string): number => {
    switch ((grade || 'A').toUpperCase()) {
      case 'A1': case 'A+': return 145000;
      case 'A': return 140000;
      case 'B+': return 125000;
      case 'B': return 120000;
      case 'C': return 100000;
      case 'D': return 80000;
      case 'E': return 60000;
      default: return 100000;
    }
  };

  // Available bal in warehouse for sample


  // Close dropdown on outside click
  
  // Compute bal suggestions dynamically based on scanSampleInput
  // When user types e.g. "A00", it shows recommendations: "A0001", "A0010", "A0020", "BAL-001", etc.
  const handleScanGudangSubmit = () => {
    const trimmed = scanGudang.trim();
    if (!trimmed) return;
    
    const targetBal = barangList.find(
      (b) =>
        (b.no_bal || '').toLowerCase() === trimmed.toLowerCase() ||
        (b.barang_id || '').toLowerCase() === trimmed.toLowerCase()
    );

    if (!targetBal) {
      setScanSampleAlert({
        type: 'error',
        message: `❌ BAL TIDAK DITEMUKAN: Nomor Bal "${trimmed}" tidak terdaftar di database!`,
      });
      setScanGudang('');
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    const check = checkBalUsage(targetBal);
    if (!check.isAvailable) {
      setScanSampleAlert({
        type: check.statusType === 'in_current_batch' ? 'warning' : 'error',
        message: check.message,
      });
      setScanGudang('');
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    setPendingScanBal(targetBal);
    setScanSampleAlert({
      type: 'success',
      message: `✓ No Bal #${targetBal.no_bal || targetBal.barang_id} (Grade ${targetBal.kode_grade} - ${targetBal.berat_kg} kg) ditemukan. Lanjut ke No Jadi.`,
    });
    setTimeout(() => inputPembeliRef.current?.focus(), 100);
  };


  const isNoJadiAlreadyUsed = (noJadi: string) => {
    const target = noJadi.trim().toLowerCase();
    if (!target) return false;
    
    // Check in current draft table
    if (selectedBalItems.some(item => (item.kodeBalPembeli || '').toLowerCase() === target)) {
      return true;
    }
    // Check in all existing batches
    for (const batch of activeBatchSampleList) {
      if (batch.items && batch.items.some(item => (item.kode_bal_pembeli || '').toLowerCase() === target)) {
        return true;
      }
    }
    return false;
  };


  const handleScanPembeliSubmit = () => {
    const trimmed = scanPembeli.trim();
    if (!trimmed) return;
    
    if (isNoJadiAlreadyUsed(trimmed)) {
      setScanSampleAlert({
        type: 'error',
        message: `Gagal: No Jadi "${trimmed}" sudah digunakan. No Jadi hanya bisa digunakan 1 kali.`,
      });
      setScanPembeli('');
      setTimeout(() => inputPembeliRef.current?.focus(), 100);
      return;
    }

    
    setScanSampleAlert({
      type: 'success',
      message: `No Jadi tercatat "${trimmed}". Lanjut input Harga Jual.`,
    });
    setTimeout(() => inputHargaJualRef.current?.focus(), 100);
  };

    
  // Compute harga jual suggestions
  const hargaJualSuggestions = useMemo(() => {
    const q = scanHargaJual.trim().toLowerCase();
    let matches = activeHargaJualList.filter((h) => 
      h.status_aktif !== false && 
      (!q || h.kode.toLowerCase().includes(q) || h.harga_jual.toString().includes(q) || (h.keterangan && h.keterangan.toLowerCase().includes(q)))
    );

    matches.sort((a, b) => {
      if (!q) return a.kode.localeCompare(b.kode);
      const aStarts = a.kode.toLowerCase().startsWith(q);
      const bStarts = b.kode.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.kode.localeCompare(b.kode);
    });

    return matches.slice(0, 10);
  }, [activeHargaJualList, scanHargaJual]);

  const handleSelectSuggestedHargaJual = (hj: MasterHargaJual) => {
    setScanHargaJual(hj.kode);
    setIsHargaJualDropdownOpen(false);
    setTimeout(() => {
      // simulate submit
      handleScanHargaJualSubmitWithCode(hj);
    }, 50);
  };


  const handleScanHargaJualSubmitWithCode = (foundHJ: MasterHargaJual) => {
    if (!pendingScanBal) {
      setScanSampleAlert({
        type: 'error',
        message: 'Gagal: Data Bal Gudang belum lengkap. Silakan ulangi dari awal.',
      });
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    const finalKodeBalPembeli = scanPembeli.trim() || (pendingScanBal.no_bal || pendingScanBal.barang_id);
    
    if (isNoJadiAlreadyUsed(finalKodeBalPembeli)) {
      setScanSampleAlert({
        type: 'error',
        message: `Gagal: No Jadi "${finalKodeBalPembeli}" sudah digunakan. No Jadi hanya bisa digunakan 1 kali. Silakan ketik No Jadi baru.`,
      });
      setTimeout(() => inputPembeliRef.current?.focus(), 100);
      return;
    }

    const finalNetto = resolveBeratNetto(pendingScanBal);
    const finalBruto = resolveBeratBruto(pendingScanBal, finalNetto);
    const finalTara = pendingScanBal.potongan_tara_kg !== undefined ? pendingScanBal.potongan_tara_kg : 2;
    const finalHargaBeli = resolveHargaBeli(pendingScanBal);

    const newItem = {
      barangId: pendingScanBal.barang_id,
      noBal: pendingScanBal.no_bal || pendingScanBal.barang_id,
      kodeBalPembeli: finalKodeBalPembeli,
      grade: pendingScanBal.kode_grade || '-',
      beratBalKg: finalNetto,
      beratBrutoKg: finalBruto,
      potonganTaraKg: finalTara,
      hargaBeliKg: finalHargaBeli,
      kodeHargaJual: foundHJ.kode,
      hargaTawaranKg: foundHJ.harga_jual,
    };

    setSelectedBalItems((prev) => [...prev, newItem]);
    setScanSampleAlert({
      type: 'success',
      message: `BERHASIL DITAMBAHKAN: Bal #${newItem.noBal} masuk ke tabel dengan Harga Jual ${foundHJ.kode}.`,
    });
    
    // Reset for next bal
    setPendingScanBal(null);
    setScanGudang('');
    setScanPembeli('');
    setScanHargaJual('');
    setTimeout(() => inputGudangRef.current?.focus(), 100);
  };

  const handleScanHargaJualSubmit = () => {
    const trimmed = scanHargaJual.trim();
    if (!trimmed) return;
    if (!pendingScanBal) {
      setScanSampleAlert({
        type: 'error',
        message: 'Gagal: Data Bal Gudang belum lengkap. Silakan ulangi dari awal.',
      });
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    const scannedKode = trimmed.toUpperCase();
    const foundHJ = activeHargaJualList.find((h) => h.kode.toUpperCase() === scannedKode);
    
    if (!foundHJ) {
      setScanSampleAlert({
        type: 'error',
        message: `Gagal: Kode Harga Jual "${trimmed}" tidak ditemukan di Master Harga Jual.`,
      });
      setTimeout(() => inputHargaJualRef.current?.focus(), 100);
      return;
    }
    handleScanHargaJualSubmitWithCode(foundHJ);
  };

  // Remove a bal from sample batch
  const handleRemoveBalFromSample = (barangId: string) => {
    const item = selectedBalItems.find((it) => it.barangId === barangId);
    setSelectedBalItems((prev) => prev.filter((it) => it.barangId !== barangId));
    setScanSampleAlert({
      type: 'warning',
      message: `Bal #${item?.noBal || barangId} dikeluarkan dari batch sample.`,
    });
  };

    const handleApplyBulkKodeHargaToSelected = () => {
    if (!bulkKodeHarga) return;
    const master = activeHargaJualList.find((h) => h.kode === bulkKodeHarga);
    if (!master) return;

    setSelectedBalItems((prev) => 
      prev.map((it) => ({
        ...it,
        kodeHargaJual: master.kode,
        hargaTawaranKg: master.harga_jual
      }))
    );
  };

  const handleUpdateBalKodeHarga = (barangId: string, kode: string) => {
    const trimmed = kode.trim();
    const master = activeHargaJualList.find((h) => h.kode.toLowerCase() === trimmed.toLowerCase() || h.kode === trimmed);
    setSelectedBalItems((prev) => 
      prev.map((it) => {
        if (it.barangId === barangId) {
          return {
            ...it,
            kodeHargaJual: master ? master.kode : kode,
            hargaTawaranKg: master ? master.harga_jual : it.hargaTawaranKg
          };
        }
        return it;
      })
    );
  };

  const handleUpdateBalOfferPrice = (barangId: string, price: number) => {
    setSelectedBalItems((prev) => 
      prev.map((it) => {
        if (it.barangId === barangId) {
          return {
            ...it,
            hargaTawaranKg: price
          };
        }
        return it;
      })
    );
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedBalItems([]);
  };

  // Submit Create Batch Form
  const handleSaveBatchForm = () => {
    const finalTujuan = tujuanBuyer.trim();
    if (!finalTujuan) {
      setErrorMessage('Tujuan gudang / pabrik penerima sample wajib diisi!');
      return;
    }
    if (selectedBalItems.length === 0) {
      setErrorMessage('Pilih minimal 1 bal tembakau untuk dimasukkan ke dalam Batch Sample!');
      return;
    }
    

    const nextBatchId = editingBatchId || generateBatchSampleId(activeBatchSampleList.length + 1);
    const existingBatch = activeBatchSampleList.find(b => b.batch_id === editingBatchId);
    
    const items: SampleItemDetail[] = selectedBalItems.map((s, idx) => {
      const existingItem = existingBatch?.items.find(i => i.barang_id === s.barangId);
      const matchedBal = barangList.find(b => b.barang_id === s.barangId || b.no_bal === s.noBal);
      const finalHargaBeli = s.hargaBeliKg || existingItem?.harga_beli_kg || resolveHargaBeli(matchedBal);
      const finalNetto = s.beratBalKg || resolveBeratNetto(matchedBal);
      const finalBruto = s.beratBrutoKg || existingItem?.berat_bruto_kg || resolveBeratBruto(matchedBal, finalNetto);
      const finalTara = s.potonganTaraKg || existingItem?.potongan_tara_kg || matchedBal?.potongan_tara_kg || 0;
      const finalPetani = matchedBal?.nama_petani || txItemMap.get(s.barangId)?.nama_petani || txItemMap.get(s.noBal)?.nama_petani || existingItem?.nama_petani || '-';
      const finalGudang = matchedBal?.lokasi_gudang || existingItem?.lokasi_gudang || sumberGudang;

      return {
        sample_item_id: existingItem?.sample_item_id || generateSampleId(s.grade, null, idx + 1),
        barang_id: s.barangId,
        no_bal: s.noBal,
        kode_bal_pembeli: s.kodeBalPembeli,
        kode_grade: s.grade,
        kode_harga_jual: s.kodeHargaJual,
        berat_bal_kg: finalNetto,
        berat_bruto_kg: finalBruto,
        potongan_tara_kg: finalTara,
        harga_beli_kg: finalHargaBeli,
        harga_tawaran_kg: s.hargaTawaranKg,
        status_item: existingItem?.status_item || 'dikirim',
        sudah_dikirim_do: existingItem?.sudah_dikirim_do || false,
        nama_petani: finalPetani,
        lokasi_gudang: finalGudang,
      };
    });

    const totalEstimasiNilai = items.reduce((sum, it) => sum + it.berat_bal_kg * it.harga_tawaran_kg, 0);

    const newBatch: BatchPengirimanSample = {
      ...existingBatch,
      batch_id: nextBatchId,
      kode_batch: existingBatch?.kode_batch || nextBatchId,
      tujuan_buyer: finalTujuan,
      permintaan_buyer: permintaanBuyer,
      sumber_gudang: sumberGudang,
      tanggal_kirim: tanggalKirim,
      status: existingBatch?.status || 'sample',
      dikirim_oleh: dikirimOleh.trim(),
      catatan: catatanBatchForm.trim(),
      items: items,
      total_sample_bal: items.length,
      total_bal_disetujui: existingBatch?.total_bal_disetujui || 0,
      total_bal_ditolak: existingBatch?.total_bal_ditolak || 0,
      total_bal_nego: existingBatch?.total_bal_nego || 0,
      total_estimasi_nilai: totalEstimasiNilai,
      total_nilai_deal: existingBatch?.total_nilai_deal || 0,
    };

    // Find removed items and restore to di_gudang
    const selectedIds = new Set(selectedBalItems.map((s) => s.barangId));
    let finalBarangList = [...barangList];
    
    if (existingBatch) {
      const removedItemIds = existingBatch.items
        .filter(it => !selectedIds.has(it.barang_id))
        .map(it => it.barang_id);
        
      if (removedItemIds.length > 0) {
        const removedSet = new Set(removedItemIds);
        finalBarangList = finalBarangList.map(b => {
          if (removedSet.has(b.barang_id)) {
            return {
              ...b,
              status_stok: 'di_gudang' as const,
              catatan_qc: b.catatan_qc?.replace(`Sample Batch ${editingBatchId} dikirim ke ${existingBatch.tujuan_buyer}`, '').trim()
            };
          }
          return b;
        });
      }
    }

    // Update new items to terkirim_sample
    const updatedBarangs = finalBarangList.map((b) => {
      if (selectedIds.has(b.barang_id)) {
        return {
          ...b,
          status_stok: 'terkirim_sample' as const,
          catatan_qc: `Sample Batch ${nextBatchId} dikirim ke ${finalTujuan}`,
        };
      }
      return b;
    });

    if (editingBatchId && onUpdateBatchSample) {
      onUpdateBatchSample(newBatch, updatedBarangs);
      setEditingBatchId(null);
      setViewMode('list');
    } else if (onSaveBatchSample) {
      onSaveBatchSample(newBatch, updatedBarangs);
    } else {
      // Fallback
      const flatSamples: PengirimanSample[] = items.map((it) => ({
        sample_id: it.sample_item_id,
        batch_id: newBatch.batch_id,
        barang_id: it.barang_id,
        no_bal: it.no_bal,
        kode_grade: it.kode_grade,
        sumber: newBatch.sumber_gudang,
        tujuan: newBatch.tujuan_buyer,
        berat_sample_gram: it.berat_sample_gram || 0,
        berat_bal_kg: it.berat_bal_kg,
        berat_bruto_kg: it.berat_bruto_kg,
        potongan_tara_kg: it.potongan_tara_kg,
        harga_beli_kg: it.harga_beli_kg,
        harga_tawaran_kg: it.harga_tawaran_kg,
        tanggal_kirim: newBatch.tanggal_kirim,
        status: 'sample',
        catatan: newBatch.catatan,
        dikirim_oleh: newBatch.dikirim_oleh,
        nama_petani: it.nama_petani,
      }));
      onSaveBatchSamples(flatSamples, updatedBarangs);
    }

    setIsConfirmCreateOpen(false);
    setSelectedBalItems([]);
    setTujuanBuyer('');
    setViewMode('list');
  };

  // Filtered Batches for table
  const filteredBatches = useMemo(() => {
    return activeBatchSampleList.filter((b) => {
      if (selectedBatchStatus !== 'all') {
        if (selectedBatchStatus === 'diproses' && b.status !== 'diproses' && b.status !== 'sample') return false;
        if (selectedBatchStatus === 'dikirim' && b.status !== 'dikirim') return false;
        if (selectedBatchStatus === 'selesai' && b.status !== 'selesai') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKode = (b.kode_batch || '').toLowerCase().includes(q);
        const matchTujuan = (b.tujuan_buyer || '').toLowerCase().includes(q);
        const matchPermintaan = (b.permintaan_buyer || '').toLowerCase().includes(q);
        const matchBal = b.items?.some((it) => (it.no_bal || '').toLowerCase().includes(q));
        if (!matchKode && !matchTujuan && !matchPermintaan && !matchBal) return false;
      }
      return true;
    });
  }, [activeBatchSampleList, selectedBatchStatus, searchQuery]);

  // Counts for tabs
  const countDiproses = useMemo(() => activeBatchSampleList.filter(b => b.status === 'diproses' || b.status === 'sample').length, [activeBatchSampleList]);
  const countDikirim = useMemo(() => activeBatchSampleList.filter(b => b.status === 'dikirim').length, [activeBatchSampleList]);
  const countSelesai = useMemo(() => activeBatchSampleList.filter(b => b.status === 'selesai').length, [activeBatchSampleList]);
  const totalSampleBalCount = useMemo(() => activeBatchSampleList.reduce((acc, b) => acc + (b.items?.length || b.total_sample_bal || 0), 0), [activeBatchSampleList]);

  // Paginated Batches
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBatches.slice(start, start + itemsPerPage);
  }, [filteredBatches, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4">
      
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 border border-gray-300 rounded-sm shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-sm bg-[#b81d24] text-white flex items-center justify-center shadow-xs">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                Pengiriman Sample & Evaluasi Sortir QC Pabrik
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Monitoring batch sample tembakau, status pengiriman ekspedisi, dan hasil evaluasi sortir lab buyer
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-sm transition flex items-center space-x-1.5 cursor-pointer border ${
              viewMode === 'list'
                ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Daftar Batch ({activeBatchSampleList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTujuanBuyer('');
              setSelectedBalItems([]);
              setErrorMessage('');
              setViewMode('create');
            }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-sm transition flex items-center space-x-1.5 cursor-pointer border ${
              viewMode === 'create'
                ? 'bg-[#b81d24] text-white border-[#b81d24] shadow-xs'
                : 'bg-white text-[#b81d24] border-red-200 hover:bg-red-50'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Batch Baru</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: LIST BATCHES & KPI */}
      {viewMode === 'list' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 border border-gray-200 rounded-sm shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500">Total Batch Sample</span>
                <FlaskConical className="w-4 h-4 text-gray-600" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-gray-900">{activeBatchSampleList.length}</span>
                <span className="text-xs text-gray-500 font-medium">{totalSampleBalCount} Bal Total</span>
              </div>
            </div>

            <div className="bg-white p-3.5 border border-amber-200 bg-amber-50/20 rounded-sm shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-800">Sedang Pengiriman Sample</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-amber-700">{countDiproses}</span>
                <span className="text-[11px] font-medium text-amber-600">Evaluasi QC Lab</span>
              </div>
            </div>

            <div className="bg-white p-3.5 border border-blue-200 bg-blue-50/20 rounded-sm shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-800">Sedang Berangkat</span>
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-blue-700">{countDikirim}</span>
                <span className="text-[11px] font-medium text-blue-600">Dalam Perjalanan</span>
              </div>
            </div>

            <div className="bg-white p-3.5 border border-emerald-200 bg-emerald-50/20 rounded-sm shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800">Selesai / DO Terbit</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-emerald-700">{countSelesai}</span>
                <span className="text-[11px] font-medium text-emerald-600">Disetujui Buyer</span>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-gray-300 rounded-sm shadow-xs overflow-hidden">
            
            {/* Toolbar */}
            <div className="p-3.5 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari Kode Batch, Buyer, Bal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
                  />
                </div>
              </div>

              
            </div>

            {/* Batch Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-100 text-gray-600 uppercase text-[10px] font-bold tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-3.5 py-2.5">No</th>
                    <th className="px-3.5 py-2.5">Kode Batch & Info</th>
                    <th className="px-3.5 py-2.5">Tujuan Buyer / Pabrik</th>
                    <th className="px-3.5 py-2.5 text-center">Jml Bal</th>
                    <th className="px-3.5 py-2.5 text-right">Berat (Bruto / Netto)</th>
                    <th className="px-3.5 py-2.5">Gudang Asal & Tanggal</th>
                    <th className="px-3.5 py-2.5 text-right">Nilai Deal / Tawar</th>
                    <th className="px-3.5 py-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedBatches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        Tidak ada data batch sample yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedBatches.map((batch, index) => {
                      const balCount = batch.items?.length || batch.total_sample_bal || 0;
                      const approved = batch.total_bal_disetujui || batch.items?.filter(it => it.status_item === 'disetujui').length || 0;
                      const rejected = batch.total_bal_ditolak || batch.items?.filter(it => it.status_item === 'ditolak').length || 0;
                      const nego = batch.total_bal_nego || batch.items?.filter(it => it.status_item === 'nego').length || 0;

                      const batchNetto = batch.items?.reduce((sum, it) => sum + (it.berat_bal_kg || 0), 0) || 0;
                      const batchBruto = batch.items?.reduce((sum, it) => {
                        if (it.berat_bruto_kg && it.berat_bruto_kg > 0) return sum + it.berat_bruto_kg;
                        const netto = it.berat_bal_kg || 0;
                        const tara = it.potongan_tara_kg !== undefined ? it.potongan_tara_kg : 2;
                        return sum + (netto > 0 ? (netto + tara) : 0);
                      }, 0) || 0;

                      return (
                        <tr key={batch.batch_id} className="hover:bg-gray-50/80 transition">
                          <td className="px-3.5 py-3 font-mono text-gray-400">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-bold text-gray-900 font-mono">{batch.kode_batch}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{batch.batch_id}</div>
                            {batch.permintaan_buyer && (
                              <div className="text-[10px] text-gray-600 italic line-clamp-1 max-w-[200px] mt-0.5">
                                {batch.permintaan_buyer}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-semibold text-gray-800 flex items-center space-x-1.5">
                              <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{batch.tujuan_buyer}</span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              QC: {batch.dikirim_oleh || '-'}
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-xs border border-gray-200">
                              {balCount} Bal
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-right font-mono">
                            <div className="font-bold text-gray-900">
                              Netto: {formatNumber(batchNetto, 1)} kg
                            </div>
                            <div className="text-[10px] text-gray-500">
                              Bruto: {formatNumber(batchBruto, 1)} kg
                            </div>
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="text-gray-800 font-medium text-[11px] truncate max-w-[180px]">
                              {batch.sumber_gudang}
                            </div>
                            <div className="text-[10px] text-gray-500 flex items-center space-x-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>Kirim: {batch.tanggal_kirim}</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-right">
                            {batch.total_nilai_deal && batch.total_nilai_deal > 0 ? (
                              <div>
                                <div className="font-bold text-emerald-700">
                                  {formatRupiah(batch.total_nilai_deal)}
                                </div>
                                <div className="text-[10px] text-gray-400 line-through">
                                  {formatRupiah(batch.total_estimasi_nilai || 0)}
                                </div>
                              </div>
                            ) : (
                              <div className="font-semibold text-gray-700">
                                {formatRupiah(batch.total_estimasi_nilai || 0)}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              
                              <button
                                type="button"
                                title="Edit Info Batch"
                                onClick={() => {
                                  setViewMode('create');
                                  // Populate the form
                                  setEditingBatchId(batch.batch_id);
                                  setTujuanBuyer(batch.tujuan_buyer || '');
                                  setPermintaanBuyer(batch.permintaan_buyer || '');
                                  setSumberGudang(batch.sumber_gudang || '');
                                  setTanggalKirim(batch.tanggal_kirim || '');
                                  setDikirimOleh(batch.dikirim_oleh || '');
                                  setCatatanBatchForm(batch.catatan || '');
                                  
                                  const items = batch.items?.map(it => {
                                    const matchedBal = barangList.find(b => b.barang_id === it.barang_id || b.no_bal === it.no_bal);
                                    const netto = it.berat_bal_kg || resolveBeratNetto(matchedBal);
                                    const bruto = it.berat_bruto_kg || resolveBeratBruto(matchedBal, netto);
                                    const tara = it.potongan_tara_kg !== undefined ? it.potongan_tara_kg : (matchedBal?.potongan_tara_kg || 0);
                                    const hrgBeli = it.harga_beli_kg || resolveHargaBeli(matchedBal);

                                    return {
                                      barangId: it.barang_id,
                                      noBal: it.no_bal,
                                      kodeBalPembeli: it.kode_bal_pembeli || it.no_bal,
                                      grade: it.kode_grade,
                                      beratBalKg: netto,
                                      beratBrutoKg: bruto,
                                      potonganTaraKg: tara,
                                      hargaBeliKg: hrgBeli,
                                      kodeHargaJual: it.kode_harga_jual || '-',
                                      hargaTawaranKg: it.harga_tawaran_kg
                                    };
                                  }) || [];
                                  setSelectedBalItems(items);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-2 py-1 text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xs transition cursor-pointer flex items-center space-x-1"
                              >
                                <Edit3 className="w-3 h-3 text-gray-600" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                title="Cetak Surat Dokumen Sample"
                                onClick={() => setPrintingBatch(batch)}
                                className="px-2 py-1 text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xs transition cursor-pointer flex items-center space-x-1"
                              >
                                <Printer className="w-3 h-3 text-gray-600" />
                                <span>Cetak</span>
                              </button>
                              <button
                                type="button"
                                title="Hapus Batch"
                                onClick={() => {
                                  setBatchToDelete(batch.batch_id);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xs transition cursor-pointer flex items-center space-x-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {filteredBatches.length > itemsPerPage && (
              <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
                <span>
                  Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredBatches.length)} dari {filteredBatches.length} batch
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 bg-white border border-gray-300 rounded-xs disabled:opacity-40 cursor-pointer text-xs"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-2 font-bold text-gray-700">{currentPage}</span>
                  <button
                    type="button"
                    disabled={currentPage * itemsPerPage >= filteredBatches.length}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-2.5 py-1 bg-white border border-gray-300 rounded-xs disabled:opacity-40 cursor-pointer text-xs"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CREATE BATCH SAMPLE */}
      {viewMode === 'create' && (
        <div className="bg-white border border-gray-300 rounded-sm shadow-xs p-5 space-y-5 animate-in fade-in duration-150">
          
          <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Form Pengiriman 1 Batch Sample Tembakau</h2>
              <p className="text-xs text-gray-500 mt-0.5">Pilih atau scan bal tembakau yang akan dikirimkan untuk uji lab mutu buyer</p>
            </div>
            <span className="text-xs font-mono font-bold bg-gray-100 text-gray-700 px-2.5 py-1 border border-gray-300 rounded-xs">
              ID Batch Baru: {generateBatchSampleId(activeBatchSampleList.length + 1)}
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-300 text-xs text-red-800 rounded-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Meta Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 border border-gray-200 rounded-xs">
            
            {/* Buyer Destination */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                Tujuan Gudang / Pabrik Penerima: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ketik tujuan gudang / pabrik penerima..."
                value={tujuanBuyer}
                onChange={(e) => setTujuanBuyer(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700 text-gray-900"
              />
              {!tujuanBuyer.trim() && (
                <p className="text-[10px] text-red-600 font-medium">
                  * Wajib diisi, ketik nama tujuan gudang secara manual.
                </p>
              )}
            </div>

            

            {/* Tanggal Kirim */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Tanggal Pengiriman:</label>
              <input
                type="date"
                value={tanggalKirim}
                onChange={(e) => setTanggalKirim(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-xs"
              />
            </div>

            {/* Dikirim Oleh */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Petugas QC / Pengirim:</label>
              <input
                type="text"
                value={dikirimOleh}
                onChange={(e) => setDikirimOleh(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-xs"
              />
            </div>
          </div>

          {/* Section: Scan / Input Bal Sample */}
          <div className="space-y-4">
            
            {/* Barcode Scanner & Manual Input Header */}
            <div className="bg-gray-50 p-3.5 border border-gray-300 rounded-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Barcode className="w-4 h-4 text-[#b81d24]" />
                    <span>Input Data Sample</span>
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 border border-emerald-200 rounded-xs">
                    {selectedBalItems.length} Bal Terpilih • Est. Nilai: {formatRupiah(selectedBalItems.reduce((s, it) => s + (it.beratBalKg * it.hargaTawaranKg), 0))}
                  </span>
                </div>
              </div>

              {/* Alert Feedback Banner for Bal Scan */}
              {scanSampleAlert && (
                <div
                  className={`p-3 rounded-xs flex items-start justify-between gap-2 text-xs border animate-in fade-in duration-150 ${
                    scanSampleAlert.type === 'error'
                      ? 'bg-red-50 text-red-900 border-red-300'
                      : scanSampleAlert.type === 'warning'
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {scanSampleAlert.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : scanSampleAlert.type === 'warning' ? (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">
                        {scanSampleAlert.type === 'error'
                          ? 'Perhatian: Bal Tidak Dapat Digunakan'
                          : scanSampleAlert.type === 'warning'
                          ? 'Peringatan No Bal'
                          : 'Status Scan Bal'}
                      </div>
                      <div className="text-[11px] mt-0.5 leading-relaxed">{scanSampleAlert.message}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScanSampleAlert(null)}
                    className="text-gray-400 hover:text-gray-700 cursor-pointer p-0.5 shrink-0"
                    title="Tutup Notifikasi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* 3-Step Scan Form */}
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">No Bal</label>
                    <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-8" />
                    <input
                      ref={inputGudangRef}
                      type="text"
                      placeholder="Scan / ketik No Bal"
                      value={scanGudang}
                      onChange={(e) => {
                         setScanGudang(e.target.value);
                         setIsBalDropdownOpen(true);
                         setHighlightedBalIndex(0);
                      }}
                      onFocus={() => {
                        if (scanGudang.trim().length > 0) setIsBalDropdownOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (isBalDropdownOpen && balSuggestions.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHighlightedBalIndex((prev) => Math.min(prev + 1, balSuggestions.length - 1));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlightedBalIndex((prev) => Math.max(prev - 1, 0));
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSelectSuggestedBal(balSuggestions[highlightedBalIndex]);
                          } else if (e.key === 'Escape') {
                            setIsBalDropdownOpen(false);
                          }
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          handleScanGudangSubmit();
                        }
                      }}
                      className="w-full pl-9 pr-2 py-2 text-xs font-mono bg-white border-2 border-gray-400 focus:border-[#b81d24] focus:ring-0 rounded-xs text-gray-900 font-bold"
                    />
                    
                    {isBalDropdownOpen && scanGudang.trim().length > 0 && (
                      <div
                        ref={balDropdownRef}
                        className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-300 rounded-sm shadow-xl max-h-72 overflow-y-auto divide-y divide-gray-100"
                      >
                        <div className="px-3 py-1.5 bg-gray-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between border-b border-gray-200">
                          <span>Rekomendasi Bal Gudang ({balSuggestions.length}):</span>
                          <span className="text-[10px] text-gray-400 font-normal lowercase">Pilih dgn Enter atau Klik</span>
                        </div>
                        {balSuggestions.length > 0 ? (
                          balSuggestions.map((bal, idx) => {
                            const isHighlighted = idx === highlightedBalIndex;
                            const usage = checkBalUsage(bal);
                            return (
                              <button
                                type="button"
                                key={bal.barang_id}
                                onClick={() => handleSelectSuggestedBal(bal)}
                                onMouseEnter={() => setHighlightedBalIndex(idx)}
                                className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center transition cursor-pointer ${
                                  isHighlighted
                                    ? 'bg-[#b81d24]/10 text-gray-900 border-l-2 border-[#b81d24]'
                                    : 'hover:bg-gray-50 border-l-2 border-transparent'
                                }`}
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono font-bold text-gray-900">{bal.no_bal || bal.barang_id}</span>
                                    <span className={`px-1.5 py-0.5 text-[9px] font-bold border rounded-2xs ${usage.badgeClass}`}>
                                      {usage.badgeText}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-gray-500 truncate mt-0.5">
                                    Grade {bal.kode_grade} • {bal.berat_kg} kg • Petani: {bal.nama_petani || '-'} • {usage.detail}
                                  </div>
                                </div>
                                {!usage.isAvailable && (
                                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-[11px] text-gray-500 text-center">
                            Tidak ada bal yang cocok dengan pencarian Anda.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">No Jadi</label>
                    <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-8" />
                    <input
                      ref={inputPembeliRef}
                      type="text"
                      disabled={!pendingScanBal}
                      placeholder={pendingScanBal ? "Scan / ketik No Jadi" : "Tunggu No Bal"}
                      value={scanPembeli}
                      onChange={(e) => setScanPembeli(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleScanPembeliSubmit();
                      }}
                      className="w-full pl-9 pr-2 py-2 text-xs font-mono bg-white border-2 border-gray-400 focus:border-[#b81d24] focus:ring-0 rounded-xs text-gray-900 font-bold disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Harga Jual</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          ref={inputHargaJualRef}
                          type="text"
                          disabled={!pendingScanBal}
                          placeholder={pendingScanBal ? "Scan/Pilih Kode Harga Jual" : "Tunggu No Jadi"}
                          value={scanHargaJual}
                          onChange={(e) => {
                            setScanHargaJual(e.target.value);
                            setIsHargaJualDropdownOpen(true);
                            setHighlightedHargaJualIndex(0);
                          }}
                          onFocus={() => setIsHargaJualDropdownOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (isHargaJualDropdownOpen && hargaJualSuggestions.length > 0) {
                                handleScanHargaJualSubmitWithCode(hargaJualSuggestions[highlightedHargaJualIndex]);
                                setIsHargaJualDropdownOpen(false);
                              } else {
                                handleScanHargaJualSubmit();
                              }
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setHighlightedHargaJualIndex((prev) => Math.min(prev + 1, hargaJualSuggestions.length - 1));
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setHighlightedHargaJualIndex((prev) => Math.max(prev - 1, 0));
                            } else if (e.key === 'Escape') {
                              setIsHargaJualDropdownOpen(false);
                            }
                          }}
                          className="w-full pl-9 pr-2 py-2 text-xs font-mono bg-white border-2 border-gray-400 focus:border-[#b81d24] focus:ring-0 rounded-xs text-gray-900 font-bold disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                        />
                        {isHargaJualDropdownOpen && scanHargaJual.trim().length > 0 && (
                          <div ref={hargaJualDropdownRef} className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xs shadow-lg max-h-48 overflow-y-auto">
                            {hargaJualSuggestions.length > 0 ? (
                              hargaJualSuggestions.map((hj, idx) => (
                                <button
                                  key={hj.harga_jual_id}
                                  type="button"
                                  onClick={() => {
                                    handleScanHargaJualSubmitWithCode(hj);
                                    setIsHargaJualDropdownOpen(false);
                                  }}
                                  onMouseEnter={() => setHighlightedHargaJualIndex(idx)}
                                  className={`w-full text-left px-3 py-2 flex flex-col gap-1 transition ${
                                    highlightedHargaJualIndex === idx ? 'bg-[#b81d24]/10 border-l-4 border-[#b81d24]' : 'hover:bg-gray-50 border-l-4 border-transparent'
                                  }`}
                                >
                                  <div className="font-bold text-xs text-gray-900">{hj.kode} - Rp {hj.harga_jual.toLocaleString('id-ID')}</div>
                                  <div className="text-[10px] text-gray-500 line-clamp-1">{hj.keterangan || 'Tidak ada keterangan'}</div>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-[11px] text-gray-500 text-center">
                                Kode tidak ditemukan.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!pendingScanBal || !scanHargaJual.trim()}
                        onClick={handleScanHargaJualSubmit}
                        className="px-3 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] disabled:bg-gray-400 rounded-xs cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        Enter ↵
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* List Table of Selected Bal */}
            <div className="overflow-x-auto border border-gray-300 rounded-xs bg-white shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300">
                  <tr>
                    <th className="p-2.5 w-10 text-center border-r border-gray-200">No</th>
                    <th className="p-2.5 w-28 border-r border-gray-200">No Bal</th>
                    <th className="p-2.5 w-28 border-r border-gray-200">No Jadi</th>
                    <th className="p-2.5 w-16 text-center border-r border-gray-200">Grade</th>
                    <th className="p-2.5 text-right w-32 border-r border-gray-200">Harga Beli (Rp/Kg)</th>
                    <th className="p-2.5 text-right w-24 border-r border-gray-200">Bruto (Kg)</th>
                    <th className="p-2.5 text-right w-24 border-r border-gray-200">Netto (Kg)</th>
                    <th className="p-2.5 text-right w-36 border-r border-gray-200">Harga Tawar/Deal (Rp)</th>
                    <th className="p-2.5 text-right w-36 border-r border-gray-200">Est. Subtotal (Rp)</th>
                    <th className="p-2.5 text-center w-14">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedBalItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-500">
                        <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <span className="font-semibold block text-gray-500">Belum ada bal dipilih</span>
                      </td>
                    </tr>
                  ) : (
                    selectedBalItems.map((item, idx) => {
                      const matchedBal = barangList.find(b => b.barang_id === item.barangId || b.no_bal === item.noBal);
                      const hrgBeli = item.hargaBeliKg || resolveHargaBeli(matchedBal);
                      const netto = item.beratBalKg || resolveBeratNetto(matchedBal);
                      const bruto = item.beratBrutoKg || resolveBeratBruto(matchedBal, netto);

                      return (
                        <tr key={item.barangId} className="hover:bg-gray-50 transition">
                          <td className="p-2.5 text-center font-mono text-gray-500 border-r border-gray-200">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-gray-900 border-r border-gray-200">{item.noBal}</td>
                          <td className="p-2.5 font-mono font-bold text-[#b81d24] border-r border-gray-200">{item.kodeBalPembeli}</td>
                          <td className="p-2.5 text-center border-r border-gray-200">
                            <span className="px-1.5 py-0.5 bg-gray-900 text-white font-mono text-[10px] font-bold rounded-2xs">
                              {item.grade}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono border-r border-gray-200 font-bold text-emerald-800 bg-emerald-50/30">
                            {formatRupiah(hrgBeli)}
                          </td>
                          <td className="p-2.5 text-right font-mono border-r border-gray-200 text-gray-700">
                            {formatNumber(bruto, 1)} kg
                          </td>
                          <td className="p-2.5 text-right font-mono border-r border-gray-200 font-bold text-gray-900">
                            {formatNumber(netto, 1)} kg
                          </td>
                          <td className="p-2.5 text-right font-mono border-r border-gray-200">
                            {formatRupiah(item.hargaTawaranKg)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold border-r border-gray-200 text-[#b81d24]">
                            {formatRupiah(netto * item.hargaTawaranKg)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBalFromSample(item.barangId)}
                              className="text-gray-400 hover:text-red-600 transition cursor-pointer p-1"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {selectedBalItems.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold border-t border-gray-300 text-gray-900">
                    <tr>
                      <td colSpan={4} className="p-2.5 text-right uppercase text-[11px] text-gray-600 tracking-wide border-r border-gray-200">
                        Total {selectedBalItems.length} Bal
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-gray-200 text-[11px] text-gray-500">
                        -
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-gray-200 text-gray-700">
                        {formatNumber(selectedBalItems.reduce((s, it) => {
                          const matchedBal = barangList.find(b => b.barang_id === it.barangId || b.no_bal === it.noBal);
                          return s + (it.beratBrutoKg || resolveBeratBruto(matchedBal, it.beratBalKg));
                        }, 0), 1)} kg
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-gray-200 font-bold text-gray-900">
                        {formatNumber(selectedBalItems.reduce((s, it) => s + it.beratBalKg, 0), 1)} kg
                      </td>
                      <td className="p-2.5 text-right border-r border-gray-200"></td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-800 border-r border-gray-200">
                        {formatRupiah(selectedBalItems.reduce((s, it) => s + (it.beratBalKg * it.hargaTawaranKg), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-2">
              <div className="w-full sm:w-1/2">
                <input
                  type="text"
                  placeholder="Opsional: Catatan untuk pihak QC pengirim..."
                  value={catatanBatchForm}
                  onChange={(e) => setCatatanBatchForm(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-sm focus:bg-white transition"
                />
              </div>
              <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                {selectedBalItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-sm transition cursor-pointer"
                  >
                    Kosongkan Tabel
                  </button>
                )}

                <button
                  type="button"
                  disabled={selectedBalItems.length === 0 || !tujuanBuyer.trim()}
                  onClick={() => {
                    if (!tujuanBuyer.trim()) {
                      setErrorMessage('Tujuan gudang / pabrik penerima sample wajib diisi!');
                      return;
                    }
                    if (selectedBalItems.length === 0) {
                      setErrorMessage('Pilih minimal 1 bal tembakau untuk sample batch!');
                      return;
                    }
                    setErrorMessage('');
                    setIsConfirmCreateOpen(true);
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                  title={!tujuanBuyer.trim() ? 'Tujuan gudang / pabrik penerima wajib diisi' : selectedBalItems.length === 0 ? 'Pilih minimal 1 bal' : 'Kirim Batch Sample'}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Kirim Batch Sample ({selectedBalItems.length} Bal)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* Modal 1: QC Sortir & Evaluation Modal */}
      
      

      {/* Modal 2: Printable Batch Sample PDF Document */}
      <BatchSamplePrintModal
        isOpen={!!printingBatch}
        onClose={() => setPrintingBatch(null)}
        batch={printingBatch}
      />

      {/* Modal 3: Single Item Update Modal */}
      <SampleStatusUpdateModal
        isOpen={!!updatingSingleSample}
        onClose={() => setUpdatingSingleSample(null)}
        sample={updatingSingleSample}
        onSaveStatus={(updated) => {
          onUpdateSample(updated);
          setUpdatingSingleSample(null);
        }}
      />

      {/* Confirm Create Modal */}
      <ConfirmModal
        isOpen={!!batchToDelete}
        title="Konfirmasi Hapus Batch"
        message="Apakah Anda yakin ingin menghapus batch sample ini? Data yang sudah dihapus tidak dapat dikembalikan."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={() => {
          if (batchToDelete && onDeleteBatchSample) {
            const batchToDel = batchSampleList.find((b) => b.batch_id === batchToDelete);
            if (batchToDel) {
              const revertedBarangs = batchToDel.items
                .map((item) => {
                  const b = barangList.find((br) => br.barang_id === item.barang_id);
                  if (b) {
                    return { ...b, status_stok: 'di_gudang' as const };
                  }
                  return undefined;
                })
                .filter((b): b is Barang => !!b);
              onDeleteBatchSample(batchToDelete, revertedBarangs);
            } else {
              onDeleteBatchSample(batchToDelete);
            }
          }
          setBatchToDelete(null);
        }}
        onClose={() => setBatchToDelete(null)}
      />

      <ConfirmModal
        isOpen={isConfirmCreateOpen}
        title="Konfirmasi Pengiriman Batch Sample Tembakau"
        message={`Apakah Anda yakin ingin mengirimkan Batch Sample berisi ${selectedBalItems.length} bal tembakau ke ${tujuanBuyer}? Bal yang terpilih akan ditandai berstatus "Terkirim Sample".`}
        confirmText="Ya, Kirim Batch Sample"
        cancelText="Periksa Lagi"
        onConfirm={handleSaveBatchForm}
        onClose={() => setIsConfirmCreateOpen(false)}
        onCancel={() => setIsConfirmCreateOpen(false)}
      />

    </div>
  );
};

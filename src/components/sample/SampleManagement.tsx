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
  MasterHargaJual 
} from '../../types';
import { loadHargaJualData, loadBatchSampleData } from '../../utils/storage';
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

  // Active batches fallback to localStorage if prop is empty
  const activeBatchSampleList = useMemo(() => {
    return (batchSampleList && batchSampleList.length > 0) ? batchSampleList : loadBatchSampleData();
  }, [batchSampleList]);

  // Main view mode: default to 'create_batch' (Input & Dispatch Sample Workstation)
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
    { barangId: string; noBal: string; kodeBalPembeli: string; grade: string; beratBalKg: number; kodeHargaJual: string; hargaTawaranKg: number }[]
  >([]);

  const availableBalList = useMemo(() => {
    return barangList.filter((b) => b.status_stok === 'di_gudang');
  }, [barangList]);

  // Compute bal suggestions dynamically based on scanGudang (mengecualikan bal yang sudah dipilih)
  const balSuggestions = useMemo(() => {
    const q = scanGudang.trim().toLowerCase();
    if (!q) return [];
    const qClean = q.replace(/[^a-zA-Z0-9]/g, '');
    const pool = availableBalList.length > 0 ? availableBalList : barangList;
    const selectedIds = new Set(selectedBalItems.map((it) => it.barangId));
    const selectedNoBals = new Set(selectedBalItems.map((it) => (it.noBal || '').trim().toLowerCase()).filter(Boolean));
    
    let matches = pool.filter((b) => {
      const bNo = (b.no_bal || b.barang_id).toLowerCase();
      const bNoClean = bNo.replace(/[^a-zA-Z0-9]/g, '');
      return bNoClean.includes(qClean) || (b.barang_id && b.barang_id.toLowerCase().includes(qClean));
    });

    // Bal harus berstatus di_gudang dan belum dipilih dalam tabel sample batch ini (tidak muncul di rekomendasi jika sudah dipilih)
    matches = matches.filter(
      (b) => b.status_stok === 'di_gudang' && !selectedIds.has(b.barang_id) && !selectedNoBals.has((b.no_bal || '').trim().toLowerCase())
    );

    matches.sort((a, b) => {
      const aNo = a.no_bal || a.barang_id;
      const bNo = b.no_bal || b.barang_id;
      const aStarts = aNo.toLowerCase().startsWith(qClean);
      const bStarts = bNo.toLowerCase().startsWith(qClean);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aNo.localeCompare(bNo, undefined, { numeric: true, sensitivity: 'base' });
    });

    return matches.slice(0, 20);
  }, [availableBalList, barangList, scanGudang, selectedBalItems]);

  const handleSelectSuggestedBal = (bal: Barang) => {
    if (selectedBalItems.some((it) => it.barangId === bal.barang_id)) {
      setScanSampleAlert({
        type: 'warning',
        message: `Bal #${bal.no_bal || bal.barang_id} sudah ada dalam tabel sample batch ini.`,
      });
      setIsBalDropdownOpen(false);
      setScanGudang('');
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    setPendingScanBal(bal);
    setScanSampleAlert({
      type: 'success',
      message: `LANGKAH 1 SUKSES: Bal Gudang #${bal.no_bal || bal.barang_id} dipilih. Lanjut scan Bal Pembeli.`,
    });
    setIsBalDropdownOpen(false);
    setScanGudang(bal.no_bal || bal.barang_id); // set display to the selected one
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
  const [printingBatch, setPrintingBatch] = useState<BatchPengirimanSample | null>(null);
  const [updatingSingleSample, setUpdatingSingleSample] = useState<PengirimanSample | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  // Create Batch Form State
  const [tujuanBuyer, setTujuanBuyer] = useState('PT Djarum Kudus - Lab QC & R&D');
  const [sumberGudang, setSumberGudang] = useState(gudangList[0]?.nama_gudang || 'Gudang Pusat Induk & Intake Pamekasan');
  const [tanggalKirim, setTanggalKirim] = useState(new Date().toISOString().split('T')[0]);
  const [dikirimOleh, setDikirimOleh] = useState('Hendra Gunawan (QC & Ekspedisi)');
  const [catatanBatchForm, setCatatanBatchForm] = useState('Sample batch resmi untuk evaluasi organoleptik dan uji kadar air sebelum DO.');

  // Bal selection filters inside Create Form
  const [filterGradeBal, setFilterGradeBal] = useState<string>('all');
  const [filterGudangBal, setFilterGudangBal] = useState<string>('all');
  const [filterPetaniBal, setFilterPetaniBal] = useState<string>('all');
  const [searchBalText, setSearchBalText] = useState<string>('');

  // Bulk set kode harga jual for all selected bales
  const [bulkKodeHarga, setBulkKodeHarga] = useState<string>('');

  const [isConfirmCreateOpen, setIsConfirmCreateOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const popularBuyers = [
    'PT Djarum Kudus - Lab QC & R&D',
    'PT Gudang Garam Tbk Kediri - QC Tembakau',
    'PT HM Sampoerna Surabaya - QA Plant',
    'Bentoel Group Malang - Lab Pengujian',
    'Pabrik Rokok Sukun Kudus',
    'PT Wismilak Inti Makmur Surabaya',
    'Lainnya (Tulis Manual)',
  ];

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
        message: `BAL TIDAK DITEMUKAN: Kode "${trimmed}" tidak terdaftar di database gudang!`,
      });
      setScanGudang('');
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }
    if (targetBal.status_stok !== 'di_gudang') {
      setScanSampleAlert({
        type: 'error',
        message: `BAL TIDAK DAPAT DIAMBIL SAMPLE: Status bal #${targetBal.no_bal || targetBal.barang_id} adalah "${targetBal.status_stok}" (Bukan di gudang)!`,
      });
      setScanGudang('');
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }
    if (selectedBalItems.some((it) => it.barangId === targetBal.barang_id)) {
      setScanSampleAlert({
        type: 'warning',
        message: `Bal #${targetBal.no_bal || targetBal.barang_id} sudah ada dalam tabel sample batch ini.`,
      });
      setScanGudang('');
      setTimeout(() => inputGudangRef.current?.focus(), 100);
      return;
    }

    setPendingScanBal(targetBal);
    setScanSampleAlert({
      type: 'success',
      message: `LANGKAH 1 SUKSES: Bal Gudang #${targetBal.no_bal || targetBal.barang_id} ditemukan. Lanjut scan Bal Pembeli.`,
    });
    setTimeout(() => inputPembeliRef.current?.focus(), 100);
  };

  const handleScanPembeliSubmit = () => {
    const trimmed = scanPembeli.trim();
    if (!trimmed) return;
    
    setScanSampleAlert({
      type: 'success',
      message: `LANGKAH 2 SUKSES: Kode Bal Pembeli tercatat "${trimmed}". Lanjut scan Harga Jual.`,
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

    const newItem = {
      barangId: pendingScanBal.barang_id,
      noBal: pendingScanBal.no_bal || pendingScanBal.barang_id,
      kodeBalPembeli: scanPembeli.trim() || (pendingScanBal.no_bal || pendingScanBal.barang_id),
      grade: pendingScanBal.kode_grade || '-',
      beratBalKg: pendingScanBal.berat_kg,
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
      setErrorMessage('Tujuan Buyer / Lab Pabrik wajib diisi!');
      return;
    }
    if (selectedBalItems.length === 0) {
      setErrorMessage('Pilih minimal 1 bal tembakau untuk dimasukkan ke dalam Batch Sample!');
      return;
    }
    

    const nextBatchId = generateBatchSampleId(activeBatchSampleList.length + 1);

    const items: SampleItemDetail[] = selectedBalItems.map((s, idx) => ({
      sample_item_id: generateSampleId(s.grade, null, idx + 1),
      barang_id: s.barangId,
      no_bal: s.noBal,
      kode_grade: s.grade,
      kode_harga_jual: s.kodeHargaJual,
      berat_bal_kg: s.beratBalKg,
      harga_tawaran_kg: s.hargaTawaranKg,
      status_item: 'dikirim',
      sudah_dikirim_do: false,
    }));

    const totalEstimasiNilai = items.reduce((sum, it) => sum + it.berat_bal_kg * it.harga_tawaran_kg, 0);

    const newBatch: BatchPengirimanSample = {
      batch_id: nextBatchId,
      kode_batch: nextBatchId,
      tujuan_buyer: finalTujuan,
      sumber_gudang: sumberGudang,
      tanggal_kirim: tanggalKirim,
      status: 'sample',
      dikirim_oleh: dikirimOleh.trim(),
      catatan: catatanBatchForm.trim(),
      items: items,
      total_sample_bal: items.length,
      total_bal_disetujui: 0,
      total_bal_ditolak: 0,
      total_bal_nego: 0,
      total_estimasi_nilai: totalEstimasiNilai,
      total_nilai_deal: 0,
    };

    // Update barang status to terkirim_sample
    const selectedIds = new Set(selectedBalItems.map((s) => s.barangId));
    const updatedBarangs = barangList.map((b) => {
      if (selectedIds.has(b.barang_id)) {
        return {
          ...b,
          status_stok: 'terkirim_sample' as const,
          catatan_qc: `Sample Batch ${nextBatchId} dikirim ke ${finalTujuan}`,
        };
      }
      return b;
    });

    if (onSaveBatchSample) {
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
        berat_sample_gram: it.berat_sample_gram,
        berat_bal_kg: it.berat_bal_kg,
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
  };

  // Filtered Batches for table
  const filteredBatches = useMemo(() => {
    return activeBatchSampleList.filter((b) => {
      if (selectedBatchStatus !== 'all' && b.status !== selectedBatchStatus) return false;
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
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: CREATE BATCH SAMPLE */}
      
        <div className="bg-white border border-gray-300 rounded-sm shadow-xs p-5 space-y-5 animate-in fade-in duration-150">
          
          <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Form Pengiriman 1 Batch Sample Tembakau</h2>
              
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
                Tujuan Buyer / Pabrik Penerima: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Tulis tujuan pabrik penerima"
                value={tujuanBuyer}
                onChange={(e) => setTujuanBuyer(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
              />
            </div>

            {/* Buyer Specification Request */}

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
                    <span>Mode Scan 3 Langkah Berurutan</span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Langkah: (1) Kode Bal Gudang, (2) Kode Bal Pembeli, (3) Grade Otomatis. Gunakan scanner barcode fisik.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 border border-emerald-200 rounded-xs">
                    {selectedBalItems.length} Bal Terpilih • Est. Nilai: {formatRupiah(selectedBalItems.reduce((s, it) => s + (it.beratBalKg * it.hargaTawaranKg), 0))}
                  </span>
                </div>
              </div>

              {/* 3-Step Scan Form */}
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                                        <label className="block text-[11px] font-bold text-gray-700 mb-1">No Bal</label>
                    <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-8" />
                    <input
                      ref={inputGudangRef}
                      type="text"
                      placeholder="Scan / ketik No Bal Gudang"
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
                            return (
                              <button
                                type="button"
                                key={bal.barang_id}
                                onClick={() => handleSelectSuggestedBal(bal)}
                                onMouseEnter={() => setHighlightedBalIndex(idx)}
                                className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center transition cursor-pointer ${
                                  isHighlighted ? 'bg-[#b81d24]/10 text-gray-900 border-l-2 border-[#b81d24]' : 'hover:bg-gray-50 border-l-2 border-transparent'
                                }`}
                              >
                                <div>
                                  <div className="font-mono font-bold">{bal.no_bal}</div>
                                  <div className="text-[10px] text-gray-500">Grade: {bal.kode_grade} | {bal.berat_kg}kg</div>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-[11px] text-gray-500 text-center">
                            Tidak ada bal tersedia yang cocok dengan pencarian Anda.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">LANGKAH 2: Bal Pembeli</label>
                    <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-8" />
                    <input
                      ref={inputPembeliRef}
                      type="text"
                      disabled={!pendingScanBal}
                      placeholder={pendingScanBal ? "Scan Bal Pembeli (atau scan ulang gudang)" : "Tunggu Langkah 1"}
                      value={scanPembeli}
                      onChange={(e) => setScanPembeli(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleScanPembeliSubmit();
                      }}
                      className="w-full pl-9 pr-2 py-2 text-xs font-mono bg-white border-2 border-gray-400 focus:border-[#b81d24] focus:ring-0 rounded-xs text-gray-900 font-bold disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">LANGKAH 3: Harga Jual</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          ref={inputHargaJualRef}
                          type="text"
                          disabled={!pendingScanBal}
                          placeholder={pendingScanBal ? "Scan/Pilih Kode Harga Jual" : "Tunggu Langkah 2"}
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
                                  key={hj.id}
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
                    <th className="p-2.5 w-32 border-r border-gray-200">No Bal Gudang</th>
                    <th className="p-2.5 w-32 border-r border-gray-200">Kode Bal Buyer</th>
                    <th className="p-2.5 text-center w-24 border-r border-gray-200">Grade</th>
                    <th className="p-2.5 text-right w-24 border-r border-gray-200">Berat (Kg)</th>
                    <th className="p-2.5 text-right w-36 border-r border-gray-200">Harga Tawar/Deal (Rp)</th>
                    <th className="p-2.5 text-right w-36 border-r border-gray-200">Est. Subtotal (Rp)</th>
                    <th className="p-2.5 text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedBalItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <span className="font-semibold block">Belum ada bal dipilih</span>
                        <span className="text-[10px]">Silakan scan atau ketik no bal di atas untuk mulai membuat sample batch.</span>
                      </td>
                    </tr>
                  ) : (
                    selectedBalItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="p-2.5 text-center font-mono text-gray-500 border-r border-gray-200">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-gray-900 border-r border-gray-200">{item.noBal}</td>
                        <td className="p-2.5 font-mono font-bold text-[#b81d24] border-r border-gray-200">{item.kodeBuyer}</td>
                        <td className="p-2.5 text-center border-r border-gray-200">
                          <span className="font-bold text-xs text-gray-800 bg-gray-200 px-2 py-0.5 rounded-sm">
                            {item.grade}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono border-r border-gray-200">{formatNumber(item.beratBalKg, 1)} kg</td>
                        <td className="p-2.5 text-right font-mono border-r border-gray-200">
                          {formatRupiah(item.hargaTawaranKg)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold border-r border-gray-200">
                          {formatRupiah(item.beratBalKg * item.hargaTawaranKg)}
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
                    ))
                  )}
                </tbody>
                {selectedBalItems.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold border-t border-gray-300 text-gray-900">
                    <tr>
                      <td colSpan={4} className="p-2.5 text-right uppercase text-[11px] text-gray-600 tracking-wide border-r border-gray-200">
                        Total {selectedBalItems.length} Bal
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-gray-200">
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
                  disabled={selectedBalItems.length === 0}
                  onClick={() => {
                    if (selectedBalItems.length === 0) {
                      setErrorMessage('Pilih minimal 1 bal tembakau untuk sample batch!');
                      return;
                    }
                    setErrorMessage('');
                    setIsConfirmCreateOpen(true);
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Kirim Batch Sample ({selectedBalItems.length} Bal)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Modal 1: QC Sortir & Evaluation Modal */}
      <BatchEvaluasiSortirModal
        isOpen={!!evaluatingBatch}
        onClose={() => setEvaluatingBatch(null)}
        batch={evaluatingBatch}
        barangList={barangList}
        onSaveEvaluasi={(updatedBatch, updatedBarangs) => {
          if (onUpdateBatchSample) {
            onUpdateBatchSample(updatedBatch, updatedBarangs);
          }
          setEvaluatingBatch(null);
        }}
        onNavigateToPengiriman={(b) => {
          setEvaluatingBatch(null);
          if (onNavigateToPengiriman) {
            onNavigateToPengiriman(b.batch_id);
          }
        }}
      />

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

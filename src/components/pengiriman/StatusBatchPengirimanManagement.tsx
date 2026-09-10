import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FlaskConical, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Barcode, 
  Search, 
  DollarSign, 
  ArrowRight, 
  Save, 
  FileText, 
  Printer, 
  Calendar, 
  Check, 
  ChevronRight,
  Filter,
  Layers,
  Scale,
  Building2,
  User,
  Zap,
  Info,
  Lock
} from 'lucide-react';
import { 
  BatchPengirimanSample, 
  PengirimanBarang, 
  Barang, 
  MasterHargaJual, 
  SampleItemDetail, 
  StatusSample, 
  StatusPengiriman 
} from '../../types';
import { formatNumber, formatRupiah } from '../../utils/formatters';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { SuratJalanPrintModal } from './SuratJalanPrintModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { openPrintDocument } from '../../utils/openDedicatedPrint';

interface StatusBatchPengirimanManagementProps {
  batchSampleList: BatchPengirimanSample[];
  pengirimanList: PengirimanBarang[];
  barangList: Barang[];
  hargaJualList: MasterHargaJual[];
  onUpdateBatchSample: (updatedBatch: BatchPengirimanSample, updatedBarangs?: Barang[]) => void;
  onUpdatePengirimanStatus: (pengirimanId: string, newStatus: StatusPengiriman) => void;
  onNavigateToPengirimanWithBatch: (batchId: string) => void;
  onDeleteBatchSample?: (batchId: string, revertedBarangs?: Barang[]) => void;
}

export const StatusBatchPengirimanManagement: React.FC<StatusBatchPengirimanManagementProps> = ({
  batchSampleList = [],
  pengirimanList = [],
  barangList = [],
  hargaJualList = [],
  onUpdateBatchSample,
  onUpdatePengirimanStatus,
  onNavigateToPengirimanWithBatch,
  onDeleteBatchSample,
}) => {
  // Main Module Tab
  const [activeMainTab, setActiveMainTab] = useState<'sample_batch' | 'pengiriman_batch'>('sample_batch');
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const [highlightedBatchIndex, setHighlightedBatchIndex] = useState(0);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [scanBatchId, setScanBatchId] = useState('');
  const batchDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(e.target as Node)) {
        setIsBatchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const batchSuggestions = useMemo(() => {
    const q = scanBatchId.trim().toLowerCase();
    if (!q) return batchSampleList.slice(0, 5); // show recent 5 by default
    return batchSampleList.filter((b) => 
      b.kode_batch.toLowerCase().includes(q) || 
      b.tujuan_buyer.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [batchSampleList, scanBatchId]);

  const handleSelectSuggestedBatch = (batchId: string) => {
    setScanBatchId(batchId);
    setIsBatchDropdownOpen(false);
    setSelectedBatchId(batchId);
  };


  // --- TAB 1 STATE: DETAIL BATCH SAMPLE & SORTIR BUYER ---
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [batchItems, setBatchItems] = useState<SampleItemDetail[]>([]);
  const [filterSortirStatus, setFilterSortirStatus] = useState<string>('all');
  const [scanSortirInput, setScanSortirInput] = useState('');
  const [isAccAllConfirmOpen, setIsAccAllConfirmOpen] = useState(false);
  const [scanSortirFeedback, setScanSortirFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    itemRef?: SampleItemDetail;
  } | null>(null);
  const [hasUnsavedSortir, setHasUnsavedSortir] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string>('');

  // --- TAB 2 STATE: MONITORING PENGIRIMAN (AKAN, SEDANG, SUDAH) ---
  const [filterPengirimanStatus, setFilterPengirimanStatus] = useState<'all' | 'akan' | 'sedang' | 'sudah'>('all');
  const [searchPengirimanText, setSearchPengirimanText] = useState('');
  const [printingSuratJalan, setPrintingSuratJalan] = useState<PengirimanBarang | null>(null);

  // Sync batchItems when selectedBatchId changes
  const activeBatch = useMemo(() => {
    return batchSampleList.find((b) => b.batch_id === selectedBatchId) || null;
  }, [batchSampleList, selectedBatchId]);

  React.useEffect(() => {
    if (activeBatch) {
      setBatchItems(JSON.parse(JSON.stringify(activeBatch.items || [])));
      setHasUnsavedSortir(false);
      setScanSortirFeedback(null);
    }
  }, [activeBatch]);

  // Barcode Scanner Hook for Tab 1
  useBarcodeScanner((scannedCode) => {
    if (activeMainTab === 'sample_batch' && activeBatch) {
      handleProcessScanSortir(scannedCode);
    }
  });

  // Handle Barcode Scan / Manual Search in Tab 1
  const handleProcessScanSortir = (code: string) => {
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) return;

    const matchedIndex = batchItems.findIndex((it) => {
      const matchNoBal = (it.no_bal || '').toLowerCase() === trimmed;
      const matchBarangId = (it.barang_id || '').toLowerCase() === trimmed;
      const matchSampleId = (it.sample_item_id || '').toLowerCase() === trimmed;
      return matchNoBal || matchBarangId || matchSampleId;
    });

    if (matchedIndex === -1) {
      // Look in barangList
      const matchedBarang = barangList.find(b => 
        (b.no_bal || '').toLowerCase() === trimmed || 
        (b.barang_id || '').toLowerCase() === trimmed
      );

      if (matchedBarang) {
        if (matchedBarang.status_stok === 'keluar') {
           setScanSortirFeedback({
             type: 'error',
             message: `Bal "${code.trim()}" sudah keluar gudang via Surat Jalan / DO.`
           });
        } else {
           // Add to batchItems
           const newItem: SampleItemDetail = {
             sample_item_id: `SPL-ITEM-${Date.now()}`,
             barang_id: matchedBarang.barang_id,
             no_bal: matchedBarang.no_bal,
             kode_grade: matchedBarang.kode_grade,
             kode_harga_jual: matchedBarang.kode_harga_jual || '',
             berat_bal_kg: matchedBarang.berat_kg,
             harga_tawaran_kg: 0,
             status_item: 'dikirim',
             sudah_dikirim_do: false,
           };
           setBatchItems(prev => [newItem, ...prev]);
           setHasUnsavedSortir(true);
           setScanSortirFeedback({
             type: 'success',
             message: `Bal "${code.trim()}" berhasil ditambahkan ke Batch ini!`,
             itemRef: newItem,
           });
        }
      } else {
        setScanSortirFeedback({
          type: 'error',
          message: `Barcode / Bal "${code.trim()}" tidak ditemukan dalam sistem!`,
        });
      }
      setScanSortirInput('');
      return;
    }

    const item = batchItems[matchedIndex];
    setScanSortirFeedback({
      type: 'success',
      message: `Bal #${item.no_bal} (${item.kode_grade} - ${item.berat_bal_kg}kg) ditemukan! Status saat ini: ${item.status_item.toUpperCase()}`,
      itemRef: item,
    });
    setScanSortirInput('');
  };

  // Change individual bal sortir status
  const handleChangeItemStatus = (sampleItemId: string, newStatus: StatusSample) => {
    if (newStatus === 'ditolak') {
      setItemToRemove(sampleItemId);
      return;
    }

    setBatchItems((prev) => {
      return prev.map((item) => {
        if (item.sample_item_id === sampleItemId) {
          const updated = { ...item, status_item: newStatus };
          const now = new Date();
          updated.tanggal_evaluasi = now.toISOString().split('T')[0];

          if (newStatus === 'disetujui') {
            if (!updated.harga_deal_kg) {
              updated.harga_deal_kg = updated.harga_tawaran_kg;
            }
          } else if (newStatus === 'nego') {
            if (!updated.catatan_nego) {
              updated.catatan_nego = 'Pembeli mengajukan penyesuaian harga jual';
            }
          }
          return updated;
        }
        return item;
      });
    });
    setHasUnsavedSortir(true);
  };

  // Change individual bal Kode Harga Jual from dropdown
  const handleChangeItemKodeHarga = (sampleItemId: string, newKode: string) => {
    const matched = hargaJualList.find((h) => h.kode === newKode);
    setBatchItems((prev) => {
      return prev.map((item) => {
        if (item.sample_item_id === sampleItemId) {
          return {
            ...item,
            kode_harga_jual: newKode,
            harga_deal_kg: matched ? matched.harga_jual : item.harga_deal_kg || item.harga_tawaran_kg,
            catatan_nego: matched ? `Disetujui pada harga master kode ${newKode} (${formatRupiah(matched.harga_jual)}/kg)` : item.catatan_nego,
          };
        }
        return item;
      });
    });
    setHasUnsavedSortir(true);
  };

  // Change individual bal custom deal price
  const handleChangeItemDealPrice = (sampleItemId: string, newPrice: number) => {
    setBatchItems((prev) => {
      return prev.map((item) => {
        if (item.sample_item_id === sampleItemId) {
          return {
            ...item,
            harga_deal_kg: newPrice,
          };
        }
        return item;
      });
    });
    setHasUnsavedSortir(true);
  };

  // Remove individual bal from batch
  const handleRemoveItemFromBatch = (sampleItemId: string) => {
    setItemToRemove(sampleItemId);
  };
  
  const confirmRemoveItem = () => {
    if (itemToRemove) {
      const updatedBatchItems = batchItems.filter((item) => item.sample_item_id !== itemToRemove);
      setBatchItems(updatedBatchItems);

      if (activeBatch) {
        // If the item was removed as a "Tolak" action from the scan/sortir table
        const itemToTolak = batchItems.find(i => i.sample_item_id === itemToRemove);
        
        if (itemToTolak) {
          const removedItems = activeBatch.items.filter(i => i.sample_item_id === itemToRemove);
          const countAcc = updatedBatchItems.filter((i) => i.status_item === 'disetujui').length;
          const countTolak = updatedBatchItems.filter((i) => i.status_item === 'ditolak').length;
          const countNego = updatedBatchItems.filter((i) => i.status_item === 'nego').length;
          const totalDeal = updatedBatchItems
            .filter((i) => i.status_item === 'disetujui')
            .reduce((sum, i) => sum + i.berat_bal_kg * (i.harga_deal_kg || i.harga_tawaran_kg), 0);
            
          let batchStatus: any = 'sample';
          if (countAcc > 0) batchStatus = 'diproses';
          else if (updatedBatchItems.length === 0) batchStatus = 'dibatalkan';

          const updatedBatch: BatchPengirimanSample = {
            ...activeBatch,
            status: batchStatus,
            items: updatedBatchItems,
            total_sample_bal: updatedBatchItems.length,
            total_bal_disetujui: countAcc,
            total_bal_ditolak: countTolak,
            total_bal_nego: countNego,
            total_nilai_deal: totalDeal,
            tanggal_respon: new Date().toISOString().split('T')[0],
          };

          const itemBeingRemoved = batchItems.find(i => i.sample_item_id === itemToRemove);
          const targetBarangId = itemBeingRemoved?.barang_id;
          const updatedBarangs = targetBarangId
            ? barangList
                .filter(br => br.barang_id === targetBarangId)
                .map(b => ({ ...b, status_stok: 'di_gudang' as const }))
            : removedItems
                .map(item => {
                  const b = barangList.find(br => br.barang_id === item.barang_id);
                  if (b) return { ...b, status_stok: 'di_gudang' as const };
                  return undefined;
                })
                .filter((b): b is Barang => !!b);

          onUpdateBatchSample(updatedBatch, updatedBarangs);
        }
      }

      setHasUnsavedSortir(true);
      setItemToRemove(null);
    }
  };

  // Save Batch Evaluation Changes
  
  const handleAccAllItems = () => {
    setBatchItems(prev => prev.map(item => ({
      ...item,
      status_item: 'disetujui',
      alasan_tolak: '',
      catatan_nego: ''
    })));
    setScanSortirFeedback({
      type: 'success',
      message: 'Semua bal dalam batch ini telah di-ACC. Silakan simpan hasil sortir.'
    });
    setHasUnsavedSortir(true);
    setIsAccAllConfirmOpen(false);
  };

  const handleSaveSortirChanges = () => {
    if (!activeBatch) return;

    const countAcc = batchItems.filter((i) => i.status_item === 'disetujui').length;
    const countTolak = batchItems.filter((i) => i.status_item === 'ditolak').length;
    const countNego = batchItems.filter((i) => i.status_item === 'nego').length;
    const totalDeal = batchItems
      .filter((i) => i.status_item === 'disetujui')
      .reduce((sum, i) => sum + i.berat_bal_kg * (i.harga_deal_kg || i.harga_tawaran_kg), 0);

    let batchStatus: any = 'sample';
    if (countAcc > 0) batchStatus = 'diproses';
    else if (countTolak === batchItems.length) batchStatus = 'dibatalkan';
    

    const updatedBatch: BatchPengirimanSample = {
      ...activeBatch,
      status: batchStatus,
      items: batchItems,
      total_bal_disetujui: countAcc,
      total_bal_ditolak: countTolak,
      total_bal_nego: countNego,
      total_nilai_deal: totalDeal,
      tanggal_respon: new Date().toISOString().split('T')[0],
    };

    // Find items that were removed
    const currentItemIds = new Set(batchItems.map(i => i.sample_item_id));
    const removedItems = activeBatch.items.filter(i => !currentItemIds.has(i.sample_item_id));
    
    let updatedBarangs: Barang[] | undefined = undefined;
    if (removedItems.length > 0) {
      updatedBarangs = removedItems
        .map(item => {
          const b = barangList.find(br => br.barang_id === item.barang_id);
          if (b) {
            return { ...b, status_stok: 'di_gudang' as const };
          }
          return undefined;
        })
        .filter((b): b is Barang => !!b);
    }

    onUpdateBatchSample(updatedBatch, updatedBarangs);
    setHasUnsavedSortir(false);
    setSuccessToast(`Hasil sortir buyer untuk batch ${activeBatch.kode_batch} berhasil disimpan!`);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const handleBuatDOReguler = () => {
    if (!activeBatch) return;

    // Filter items to keep only those not rejected
    const remainingItems = batchItems.filter((i) => i.status_item !== 'ditolak');
    const rejectedItems = batchItems.filter((i) => i.status_item === 'ditolak');
    
    // Update status_stok to 'di_gudang' for rejected items
    const updatedBarangs = rejectedItems
      .map(item => {
        const barang = barangList.find(b => b.barang_id === item.barang_id);
        if (barang) {
          return { ...barang, status_stok: 'di_gudang' as const };
        }
        return undefined;
      })
      .filter((b): b is Barang => !!b);

    const countAcc = remainingItems.filter((i) => i.status_item === 'disetujui').length;
    const countNego = remainingItems.filter((i) => i.status_item === 'nego').length;
    const totalDeal = remainingItems
      .filter((i) => i.status_item === 'disetujui')
      .reduce((sum, i) => sum + i.berat_bal_kg * (i.harga_deal_kg || i.harga_tawaran_kg), 0);

    const updatedBatch: BatchPengirimanSample = {
      ...activeBatch,
      status: 'diproses',
      is_locked: true,
      items: remainingItems,
      total_sample_bal: remainingItems.length,
      total_bal_disetujui: countAcc,
      total_bal_ditolak: 0,
      total_bal_nego: countNego,
      total_nilai_deal: totalDeal,
      tanggal_respon: new Date().toISOString().split('T')[0],
    };

    onUpdateBatchSample(updatedBatch, updatedBarangs);
    setHasUnsavedSortir(false);
    onNavigateToPengirimanWithBatch(activeBatch.batch_id);
  };

  // Filtered Items for Display in Tab 1
  const displayedBatchItems = useMemo(() => {
    return batchItems.filter((it) => {
      if (filterSortirStatus === 'disetujui') return it.status_item === 'disetujui';
      if (filterSortirStatus === 'ditolak') return it.status_item === 'ditolak';
      if (filterSortirStatus === 'nego') return it.status_item === 'nego';
      if (filterSortirStatus === 'dikirim') return it.status_item === 'dikirim' || it.status_item === 'diterima';
      return true;
    });
  }, [batchItems, filterSortirStatus]);

  // Tab 1 Metrics
  const countAcc = batchItems.filter((i) => i.status_item === 'disetujui').length;
  const countNego = batchItems.filter((i) => i.status_item === 'nego').length;
  const countTolak = batchItems.filter((i) => i.status_item === 'ditolak').length;
  const countPending = batchItems.filter((i) => i.status_item === 'dikirim' || i.status_item === 'diterima').length;
  const totalDealRp = batchItems
    .filter((i) => i.status_item === 'disetujui')
    .reduce((sum, i) => sum + i.berat_bal_kg * (i.harga_deal_kg || i.harga_tawaran_kg), 0);

  // --- TAB 2 FILTERED SHIPMENTS ---
  const filteredPengirimanList = useMemo(() => {
    return pengirimanList.filter((krm) => {
      // Filter status
      if (filterPengirimanStatus === 'akan') {
        if (krm.status !== 'dimuat' && krm.status !== 'dikirim') return false;
      } else if (filterPengirimanStatus === 'sedang') {
        if (krm.status !== 'dalam_perjalanan') return false;
      } else if (filterPengirimanStatus === 'sudah') {
        if (krm.status !== 'diterima') return false;
      }

      // Search text
      if (searchPengirimanText.trim()) {
        const q = searchPengirimanText.toLowerCase().trim();
        const matchNo = (krm.no_surat_jalan || '').toLowerCase().includes(q);
        const matchTujuan = (krm.tujuan || '').toLowerCase().includes(q);
        const matchDriver = (krm.driver_nama || '').toLowerCase().includes(q);
        const matchPlat = (krm.plat_nomor || '').toLowerCase().includes(q);
        return matchNo || matchTujuan || matchDriver || matchPlat;
      }

      return true;
    });
  }, [pengirimanList, filterPengirimanStatus, searchPengirimanText]);

  // Tab 2 Metrics
  const countAkanDikirim = pengirimanList.filter((k) => k.status === 'dimuat' || k.status === 'dikirim').length;
  const countSedangDikirim = pengirimanList.filter((k) => k.status === 'dalam_perjalanan').length;
  const countSudahSelesai = pengirimanList.filter((k) => k.status === 'diterima' || k.status === 'selesai').length;

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-xs font-semibold text-emerald-900 rounded-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-gray-300 rounded-sm p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-[#b81d24] text-white rounded-xs shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                Status & Detail Batch Pengiriman
              </h1>
              
            </div>
          </div>
        </div>

        {/* Master Navigation Switcher */}
        <div className="flex items-center p-1 bg-gray-100 border border-gray-300 rounded-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveMainTab('sample_batch')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              activeMainTab === 'sample_batch'
                ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-[#b81d24]" />
            <span>Detail Batch Sample & Sortir Pembeli</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('pengiriman_batch')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              activeMainTab === 'pengiriman_batch'
                ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-[#b81d24]" />
            <span>Status Pengiriman Barang (Akan / Sedang / Sudah)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: DETAIL BATCH SAMPLE & HASIL SORTIR PEMBELI                       */}
      {/* ========================================================================= */}
      {activeMainTab === 'sample_batch' && (
        <div className="space-y-4">
          
          {/* Top Selection & Meta Bar */}
          <div className="bg-white p-4 border border-gray-300 rounded-sm shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Batch Selector */}
              <div className="space-y-1 flex-1 max-w-lg">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Pilih Batch Pengiriman Sample yang Hendak Dicek Sortirnya:
                </label>
                <div className="relative">
                  <div className="flex items-center absolute left-3 top-2.5 text-gray-500">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Ketik kode batch (Misal: SPL0001)..."
                    value={scanBatchId}
                    onChange={(e) => {
                      setScanBatchId(e.target.value);
                      setIsBatchDropdownOpen(true);
                      setHighlightedBatchIndex(0);
                    }}
                    onFocus={() => {
                      setIsBatchDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (isBatchDropdownOpen && batchSuggestions.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setHighlightedBatchIndex((prev) => Math.min(prev + 1, batchSuggestions.length - 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setHighlightedBatchIndex((prev) => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSelectSuggestedBatch(batchSuggestions[highlightedBatchIndex].batch_id);
                          setScanBatchId(batchSuggestions[highlightedBatchIndex].kode_batch);
                        } else if (e.key === 'Escape') {
                          setIsBatchDropdownOpen(false);
                        }
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700 placeholder-gray-400 uppercase"
                  />
                  
                  {/* Dropdown Autocomplete Batch */}
                  {isBatchDropdownOpen && (
                    <div
                      ref={batchDropdownRef}
                      className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-300 rounded-sm shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100"
                    >
                      {batchSuggestions.length > 0 ? (
                        batchSuggestions.map((b, idx) => {
                          const isHighlighted = idx === highlightedBatchIndex;
                          
                          return (
                            <button
                              key={b.batch_id}
                              type="button"
                              onClick={() => {
                                handleSelectSuggestedBatch(b.batch_id);
                                setScanBatchId(b.kode_batch);
                              }}
                              onMouseEnter={() => setHighlightedBatchIndex(idx)}
                              className={`w-full px-3 py-2 text-left flex flex-col gap-0.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                isHighlighted ? 'bg-red-50 text-red-950 border-l-4 border-red-500' : 'hover:bg-gray-50 text-gray-800 border-l-4 border-transparent'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-xs text-red-900 bg-red-100 px-1.5 py-0.5 rounded-xs">
                                  {b.kode_batch}
                                </span>
                                <span className="font-bold text-xs">{b.tujuan_buyer}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 flex gap-2">
                                <span>Total: {b.items?.length || 0} Bal</span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 text-xs text-gray-500 text-center">
                          Tidak ada batch cocok dgn "{scanBatchId}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Active Batch Overview Pill */}
              {activeBatch && (
                <div className="flex items-center space-x-3 text-xs bg-gray-50 px-3.5 py-2.5 border border-gray-200 rounded-xs shrink-0">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Tujuan Buyer:</span>
                    <span className="font-bold text-gray-900">{activeBatch.tujuan_buyer}</span>
                  </div>
                  <div className="h-6 w-px bg-gray-300" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Tgl Kirim:</span>
                    <span className="font-mono text-gray-700">{activeBatch.tanggal_kirim}</span>
                  </div>
                  <div className="h-6 w-px bg-gray-300" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Pengirim QC:</span>
                    <span className="text-gray-700">{activeBatch.dikirim_oleh}</span>
                  </div>
                </div>
              )}
            </div>

            {/* KPI Metric Cards of this Batch */}
            {activeBatch && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="bg-white p-3 border border-gray-300 rounded-xs shadow-xs">
                <div className="text-[11px] font-medium text-gray-500">Total Bal Sample</div>
                <div className="text-xl font-bold text-gray-900 mt-0.5">{batchItems.length} Bal</div>
                <div className="text-[10px] text-gray-400">Total yang dikirim</div>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xs shadow-xs">
                <div className="text-[11px] font-bold text-emerald-800 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Diterima untuk Dibeli</span>
                </div>
                <div className="text-xl font-bold text-emerald-900 mt-0.5">{countAcc} Bal</div>
                <div className="text-[10px] font-semibold text-emerald-700">ACC & Lolos Sortir</div>
              </div>

              <div className="bg-amber-50 border border-amber-300 p-3 rounded-xs shadow-xs">
                <div className="text-[11px] font-bold text-amber-800 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Perlu Edit Harga (Nego)</span>
                </div>
                <div className="text-xl font-bold text-amber-900 mt-0.5">{countNego} Bal</div>
                <div className="text-[10px] font-semibold text-amber-700">Penawaran Balik</div>
              </div>

              <div className="bg-red-50 border border-red-300 p-3 rounded-xs shadow-xs">
                <div className="text-[11px] font-bold text-red-800 flex items-center space-x-1">
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>Ditolak Penuh</span>
                </div>
                <div className="text-xl font-bold text-red-900 mt-0.5">{countTolak} Bal</div>
                <div className="text-[10px] font-semibold text-red-700">Tidak Lolos Mutu</div>
              </div>

              <div className="bg-gray-900 text-white p-3 border border-gray-900 rounded-xs shadow-xs">
                <div className="text-[11px] font-medium text-gray-300">Total Nilai Deal (ACC)</div>
                <div className="text-base font-bold font-mono text-yellow-400 mt-0.5 truncate">
                  {formatRupiah(totalDealRp)}
                </div>
                <div className="text-[10px] text-gray-400">Siap Jadi DO Reguler</div>
              </div>
            </div>
            )}
          </div>

          {activeBatch ? (
          <>
          {/* Barcode Quick Sortir Scanner & Bulk Tool */}
          <div className="bg-gray-50 border border-gray-300 rounded-sm p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              {/* Barcode Search & Scan */}
              <div className="flex items-center space-x-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Scan barcode alat atau ketik No Bal untuk sortir..."
                    value={scanSortirInput}
                    onChange={(e) => setScanSortirInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleProcessScanSortir(scanSortirInput);
                      }
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleProcessScanSortir(scanSortirInput)}
                  className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xs cursor-pointer"
                >
                  Cari Bal
                </button>
              </div>
            </div>

            {/* Scan Feedback Banner */}
            {scanSortirFeedback && (
              <div className={`p-3 rounded-xs text-xs flex items-center justify-between border ${
                scanSortirFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}>
                <div className="flex items-center space-x-2">
                  {scanSortirFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span className="font-semibold">{scanSortirFeedback.message}</span>
                </div>

                {scanSortirFeedback.itemRef && (
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleChangeItemStatus(scanSortirFeedback.itemRef!.sample_item_id, 'disetujui')}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xs text-[10px] cursor-pointer"
                    >
                      Tandai ACC
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeItemStatus(scanSortirFeedback.itemRef!.sample_item_id, 'nego')}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xs text-[10px] cursor-pointer"
                    >
                      Tandai Nego
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeItemStatus(scanSortirFeedback.itemRef!.sample_item_id, 'ditolak')}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xs text-[10px] cursor-pointer"
                    >
                      Tolak
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table Container with Filter Tabs */}
          <div className="bg-white border border-gray-300 rounded-sm shadow-xs overflow-hidden">
            {/* Table Header Filter Bar */}
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setFilterSortirStatus('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    filterSortirStatus === 'all'
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Semua ({batchItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSortirStatus('disetujui')}
                  className={`px-3 py-1 text-xs font-semibold rounded-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    filterSortirStatus === 'disetujui'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  Diterima / ACC ({countAcc})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSortirStatus('nego')}
                  className={`px-3 py-1 text-xs font-semibold rounded-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    filterSortirStatus === 'nego'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  Perlu Edit Harga ({countNego})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSortirStatus('ditolak')}
                  className={`px-3 py-1 text-xs font-semibold rounded-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    filterSortirStatus === 'ditolak'
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'bg-white text-red-800 border border-red-300 hover:bg-red-50'
                  }`}
                >
                  Ditolak Penuh ({countTolak})
                </button>
              </div>

              {/* Save or Create DO Action */}
              <div className="flex items-center space-x-2">
                
                {batchItems.length > 0 && batchItems.some(i => i.status_item !== 'disetujui') && (
                  <button
                    type="button"
                    onClick={() => setIsAccAllConfirmOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ACC Semua</span>
                  </button>
                )}
                {hasUnsavedSortir && (
                  <button
                    type="button"
                    onClick={handleSaveSortirChanges}
                    className="px-4 py-1.5 bg-[#b81d24] hover:bg-[#991b1b] text-white text-xs font-bold rounded-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Hasil Sortir Buyer</span>
                  </button>
                )}

                {activeBatch?.is_locked && (
                  <div className="px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-700 font-bold text-[10px] rounded-xs flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Batch Terkunci (Diproses DO)</span>
                  </div>
                )}
                {countAcc > 0 && !activeBatch?.is_locked && (
                  <button
                    type="button"
                    onClick={handleBuatDOReguler}
                    className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Truck className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Buat DO Reguler ({countAcc} Bal ACC)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold">
                  <tr>
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3 w-36">No Bal / ID</th>
                    <th className="p-3 text-center w-20">Grade</th>
                    <th className="p-3 text-right w-24">Berat Bal (Kg)</th>
                    <th className="p-3 text-center w-48">Status Sortir Pembeli</th>
                    <th className="p-3 w-56">Kode Master Harga Jual</th>
                    <th className="p-3 text-right w-36">Harga Beli (Rp/Kg)</th>
                    <th className="p-3 text-right w-36">Harga Deal (Rp/Kg)</th>
                    <th className="p-3 text-right w-36">Subtotal Deal</th>
                    <th className="p-3">Catatan / Keterangan Sortir</th>
                    <th className="p-3 text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedBatchItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 bg-gray-50/50">
                        Tidak ada bal dengan filter status ini pada batch terpilih.
                      </td>
                    </tr>
                  ) : (
                    displayedBatchItems.map((item, idx) => {
                      const isAcc = item.status_item === 'disetujui';
                      const isNego = item.status_item === 'nego';
                      const isTolak = item.status_item === 'ditolak';
                      const currentPrice = item.harga_deal_kg || item.harga_tawaran_kg;
                      const subtotal = item.berat_bal_kg * currentPrice;

                      return (
                        <tr 
                          key={item.sample_item_id}
                          className={`hover:bg-gray-50 transition ${
                            isAcc ? 'bg-emerald-50/30' : isNego ? 'bg-amber-50/30' : isTolak ? 'bg-red-50/30' : ''
                          }`}
                        >
                          <td className="p-3 text-center font-mono text-gray-500">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-gray-900">
                            <div>{item.no_bal || item.barang_id}</div>
                            <div className="text-[10px] text-gray-400">{item.sample_item_id}</div>
                          </td>
                          <td className="p-3 text-center font-bold">
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-xs font-mono">
                              {item.kode_grade}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {formatNumber(item.berat_bal_kg, 1)} kg
                          </td>

                          {/* Sortir Toggle Buttons */}
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center space-x-1 p-0.5 bg-gray-200/80 rounded-xs">
                              <button
                                type="button"
                                onClick={() => handleChangeItemStatus(item.sample_item_id, 'disetujui')}
                                disabled={activeBatch?.is_locked}
                                title="Terima untuk dibeli"
                                className={`px-2 py-1 text-[10px] font-bold rounded-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isAcc
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-gray-700 hover:bg-white'
                                }`}
                              >
                                ACC
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChangeItemStatus(item.sample_item_id, 'nego')}
                                disabled={activeBatch?.is_locked}
                                title="Perlu negosiasi harga"
                                className={`px-2 py-1 text-[10px] font-bold rounded-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isNego
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-gray-700 hover:bg-white'
                                }`}
                              >
                                Nego
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChangeItemStatus(item.sample_item_id, 'ditolak')}
                                disabled={activeBatch?.is_locked}
                                title="Tolak penuh"
                                className={`px-2 py-1 text-[10px] font-bold rounded-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isTolak
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'text-gray-700 hover:bg-white'
                                }`}
                              >
                                Tolak
                              </button>
                            </div>
                          </td>

                          {/* Kode Master Harga Jual Dropdown */}
                          <td className="p-3">
                            <select
                              value={item.kode_harga_jual || ''}
                              onChange={(e) => handleChangeItemKodeHarga(item.sample_item_id, e.target.value)}
                              disabled={isTolak || activeBatch?.is_locked}
                              className="w-full px-2 py-1 text-xs font-mono font-bold bg-white border border-gray-300 rounded-xs disabled:bg-gray-100 disabled:text-gray-400 focus:ring-1 focus:ring-gray-700"
                            >
                              <option value="">-- Pilih Kode Harga --</option>
                              {hargaJualList.filter((h) => h.status_aktif !== false).map((h) => (
                                <option key={h.harga_jual_id} value={h.kode}>
                                  {h.kode} ({formatRupiah(h.harga_jual)}/kg)
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Harga Beli */}
                          <td className="p-3 text-right font-mono text-gray-500">
                            {formatRupiah(barangList.find(b => b.barang_id === item.barang_id)?.harga_per_kg || 0)}
                          </td>

                          {/* Harga Deal / Kirim */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <span className="text-[10px] text-gray-400 font-mono">Rp</span>
                              <input
                                type="number"
                                value={item.harga_deal_kg || item.harga_tawaran_kg}
                                onChange={(e) => handleChangeItemDealPrice(item.sample_item_id, Number(e.target.value))}
                                disabled={isTolak || activeBatch?.is_locked}
                                className="w-24 px-1.5 py-1 text-xs font-mono font-bold text-right bg-white border border-gray-300 rounded-xs disabled:bg-gray-100 disabled:text-gray-400 focus:ring-1 focus:ring-gray-700"
                              />
                            </div>
                          </td>

                          {/* Subtotal */}
                          <td className="p-3 text-right font-mono font-bold text-gray-900">
                            {isTolak ? (
                              <span className="text-gray-400 italic">Rp 0</span>
                            ) : (
                              formatRupiah(subtotal)
                            )}
                          </td>

                          {/* Catatan Sortir */}
                          <td className="p-3 text-gray-600">
                            {isTolak ? (
                              <span className="text-red-700 font-medium">{item.alasan_tolak || 'Ditolak pabrik'}</span>
                            ) : isNego ? (
                              <span className="text-amber-800 font-medium">{item.catatan_nego || 'Penyesuaian harga'}</span>
                            ) : isAcc ? (
                              <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                                <Check className="w-3.5 h-3.5" />
                                <span>Disetujui dibeli</span>
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Menunggu evaluasi</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={activeBatch?.is_locked}
                                onClick={() => handleRemoveItemFromBatch(item.sample_item_id)}
                              className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Hapus dari batch"
                            >
                              <XCircle className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {displayedBatchItems.length > 0 && (
                  <tfoot className="bg-gray-100 font-bold border-t border-gray-300">
                    <tr>
                      <td colSpan={3} className="p-3 text-right uppercase text-[11px]">
                        Total ({displayedBatchItems.length} Bal)
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatNumber(displayedBatchItems.reduce((s, it) => s + it.berat_bal_kg, 0), 1)} kg
                      </td>
                      <td colSpan={4} className="p-3 text-right uppercase text-[11px]">
                        Total Nilai Deal Bal Lolos:
                      </td>
                      <td className="p-3 text-right font-mono text-sm text-emerald-800">
                        {formatRupiah(
                          displayedBatchItems
                            .filter((it) => it.status_item === 'disetujui')
                            .reduce((s, it) => s + (it.berat_bal_kg * (it.harga_deal_kg || it.harga_tawaran_kg)), 0)
                        )}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 border-dashed rounded-sm p-12 flex flex-col items-center justify-center text-gray-500">
               <Layers className="w-12 h-12 text-gray-300 mb-3" />
               <h3 className="text-sm font-bold text-gray-700">Belum Ada Batch Terpilih</h3>
               
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: STATUS BATCH PENGIRIMAN BARANG (AKAN, SEDANG, SUDAH)              */}
      {/* ========================================================================= */}
      {/* Modal Konfirmasi Hapus Bal */}
      <ConfirmModal
        isOpen={!!itemToRemove}
        title="Konfirmasi Tolak & Kembalikan Bal"
        message="Apakah Anda yakin ingin menolak bal ini? Bal akan dihapus dari daftar batch dan statusnya otomatis direset kembali ke stok gudang sehingga dapat digunakan kembali."
        confirmText="Ya, Tolak & Kembalikan ke Gudang"
        cancelText="Batal"
        onConfirm={confirmRemoveItem}
        onClose={() => setItemToRemove(null)}
      />

      {activeMainTab === 'pengiriman_batch' && (
        <div className="space-y-4">
          
          {/* Status Counter Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div 
              onClick={() => setFilterPengirimanStatus('all')}
              className={`p-3.5 border rounded-sm shadow-xs cursor-pointer transition ${
                filterPengirimanStatus === 'all'
                  ? 'bg-gray-900 text-white border-gray-900 ring-2 ring-gray-900'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`text-[11px] font-medium ${filterPengirimanStatus === 'all' ? 'text-gray-300' : 'text-gray-500'}`}>
                Semua Surat Jalan
              </div>
              <div className="text-xl font-bold mt-0.5">{pengirimanList.length} Pengiriman</div>
              <div className={`text-[10px] ${filterPengirimanStatus === 'all' ? 'text-gray-400' : 'text-gray-400'}`}>
                Total riwayat DO pabrik
              </div>
            </div>

            <div 
              onClick={() => setFilterPengirimanStatus('akan')}
              className={`p-3.5 border rounded-sm shadow-xs cursor-pointer transition ${
                filterPengirimanStatus === 'akan'
                  ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-600'
                  : 'bg-amber-50 border-amber-200 text-amber-950 hover:bg-amber-100'
              }`}
            >
              <div className={`text-[11px] font-bold flex items-center space-x-1 ${filterPengirimanStatus === 'akan' ? 'text-amber-100' : 'text-amber-800'}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>Akan Dikirim</span>
              </div>
              <div className="text-xl font-bold mt-0.5">{countAkanDikirim} Surat Jalan</div>
              <div className={`text-[10px] font-semibold ${filterPengirimanStatus === 'akan' ? 'text-amber-200' : 'text-amber-700'}`}>
                Muatan & Truk Siap
              </div>
            </div>

            <div 
              onClick={() => setFilterPengirimanStatus('sedang')}
              className={`p-3.5 border rounded-sm shadow-xs cursor-pointer transition ${
                filterPengirimanStatus === 'sedang'
                  ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600'
                  : 'bg-blue-50 border-blue-200 text-blue-950 hover:bg-blue-100'
              }`}
            >
              <div className={`text-[11px] font-bold flex items-center space-x-1 ${filterPengirimanStatus === 'sedang' ? 'text-blue-100' : 'text-blue-800'}`}>
                <Truck className="w-3.5 h-3.5" />
                <span>Sedang Dikirim</span>
              </div>
              <div className="text-xl font-bold mt-0.5">{countSedangDikirim} Truk Jalan</div>
              <div className={`text-[10px] font-semibold ${filterPengirimanStatus === 'sedang' ? 'text-blue-200' : 'text-blue-700'}`}>
                Dalam Perjalanan Ekspedisi
              </div>
            </div>

            <div 
              onClick={() => setFilterPengirimanStatus('sudah')}
              className={`p-3.5 border rounded-sm shadow-xs cursor-pointer transition ${
                filterPengirimanStatus === 'sudah'
                  ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-600'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950 hover:bg-emerald-100'
              }`}
            >
              <div className={`text-[11px] font-bold flex items-center space-x-1 ${filterPengirimanStatus === 'sudah' ? 'text-emerald-100' : 'text-emerald-800'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sudah Selesai</span>
              </div>
              <div className="text-xl font-bold mt-0.5">{countSudahSelesai} Tiba</div>
              <div className={`text-[10px] font-semibold ${filterPengirimanStatus === 'sudah' ? 'text-emerald-200' : 'text-emerald-700'}`}>
                Diterima & Bongkar Pabrik
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-gray-300 rounded-sm shadow-xs overflow-hidden">
            {/* Table Filter Bar */}
            <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari No. Surat Jalan, Pabrik, Supir, Plat Nomor..."
                  value={searchPengirimanText}
                  onChange={(e) => setSearchPengirimanText(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
                />
              </div>

              <div className="text-xs text-gray-500 font-medium">
                Menampilkan <strong className="text-gray-900">{filteredPengirimanList.length}</strong> pengiriman
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold">
                  <tr>
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3 w-36">No. Surat Jalan</th>
                    <th className="p-3 w-28">Tgl Kirim</th>
                    <th className="p-3">Tujuan Pabrik</th>
                    <th className="p-3 w-48">Supir & Plat Kendaraan</th>
                    <th className="p-3 text-right w-24">Total Bal</th>
                    <th className="p-3 text-right w-28">Tonase (Kg)</th>
                    <th className="p-3 text-center w-36">Status Pengiriman</th>
                    <th className="p-3 text-center w-48">Aksi Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPengirimanList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 bg-gray-50/50">
                        <Truck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <div className="text-sm font-bold text-gray-700">Tidak ada data pengiriman</div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Ubah filter status atau buat surat jalan pengiriman reguler terlebih dahulu.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPengirimanList.map((item, idx) => {
                      const isAkan = item.status === 'dimuat' || item.status === 'dikirim';
                      const isSedang = item.status === 'dalam_perjalanan';
                      const isSudah = item.status === 'diterima' || item.status === 'selesai';

                      return (
                        <tr key={item.pengiriman_id} className="hover:bg-gray-50 transition">
                          <td className="p-3 text-center font-mono text-gray-500">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-gray-900">
                            <div>{item.no_surat_jalan}</div>
                            {item.batch_sample_id_ref && (
                              <div className="text-[10px] text-gray-500 font-normal">
                                Ref: {item.batch_sample_id_ref}
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-gray-700">{item.tanggal_kirim}</td>
                          <td className="p-3 font-semibold text-gray-900">{item.tujuan}</td>
                          <td className="p-3 text-gray-700">
                            <div className="font-semibold text-gray-900">{item.driver_nama || '-'}</div>
                            <div className="text-[10px] font-mono text-gray-500 bg-gray-100 inline-block px-1 rounded-xs">
                              {item.plat_nomor || '-'}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold">{item.total_bal} Bal</td>
                          <td className="p-3 text-right font-mono font-bold text-gray-900">
                            {formatNumber(item.total_berat_kg, 1)} kg
                          </td>

                          {/* Status Badge */}
                          <td className="p-3 text-center">
                            {isAkan && (
                              <span className="px-2.5 py-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 rounded-xs inline-flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>Akan Dikirim</span>
                              </span>
                            )}
                            {isSedang && (
                              <span className="px-2.5 py-1 text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-300 rounded-xs inline-flex items-center space-x-1 animate-pulse">
                                <Truck className="w-3 h-3 text-blue-700" />
                                <span>Sedang Dikirim</span>
                              </span>
                            )}
                            {isSudah && (
                              <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-xs inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Sudah Selesai</span>
                              </span>
                            )}
                          </td>

                          {/* Action Button to update state */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {isAkan && (
                                <button
                                  type="button"
                                  onClick={() => onUpdatePengirimanStatus(item.pengiriman_id, 'dalam_perjalanan')}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xs text-[10px] flex items-center space-x-1 cursor-pointer shadow-xs"
                                  title="Ubah status menjadi sedang dalam perjalanan"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>Berangkat</span>
                                </button>
                              )}

                              {isSedang && (
                                <button
                                  type="button"
                                  onClick={() => onUpdatePengirimanStatus(item.pengiriman_id, 'diterima')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xs text-[10px] flex items-center space-x-1 cursor-pointer shadow-xs"
                                  title="Konfirmasi truk telah tiba di pabrik tujuan"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Tiba di Pabrik</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => openPrintDocument('surat_jalan', item.pengiriman_id)}
                                className="p-1 text-[#b81d24] hover:text-white hover:bg-[#b81d24] rounded-xs border border-red-300 cursor-pointer transition"
                                title="Buka Halaman Cetak Surat Jalan Resmi (Pilih PDF atau Printer)"
                              >
                                <Printer className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* Print Surat Jalan Modal */}
      {printingSuratJalan && (
        <SuratJalanPrintModal
          isOpen={true}
          onClose={() => setPrintingSuratJalan(null)}
          pengiriman={printingSuratJalan}
          barangList={barangList}
        />
      )}
    </div>
  );
};

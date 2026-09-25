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
  ArrowRight,
  Save,
  Printer,
  Check,
  Layers,
  Lock,
  Trash2,
  Edit3,
  ArrowLeft
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
import { BatchSamplePrintModal } from '../sample/BatchSamplePrintModal';
import { openPrintDocument } from '../../utils/openDedicatedPrint';
import { isSuratJalanTerkunci, pesanSuratJalanTerkunci } from '../../utils/kunciHapus';
import { beratBrutoBal, beratBrutoItemSample } from '../../utils/beratKirim';
import { alasanBatchBelumFinal, isBatchDraft } from '../../utils/statusBatchSample';
import { hariIniLokal, formatTanggalLokal } from '../../utils/rentangTanggal';

interface StatusBatchPengirimanManagementProps {
  batchSampleList: BatchPengirimanSample[];
  pengirimanList: PengirimanBarang[];
  barangList: Barang[];
  hargaJualList: MasterHargaJual[];
  /** true bila server menerima; "berhasil" dan status tersimpan baru ditampilkan setelah itu. */
  onUpdateBatchSample: (updatedBatch: BatchPengirimanSample, updatedBarangs?: Barang[]) => Promise<boolean>;
  onUpdatePengirimanStatus: (pengirimanId: string, newStatus: StatusPengiriman) => Promise<void>;
  onNavigateToPengirimanWithBatch: (batchId: string) => void;
  /** Membuka batch sample di halaman Pengiriman Sample untuk diedit. */
  onEditBatchSample?: (batchId: string) => void;
  onDeleteBatchSample?: (batchId: string, revertedBarangs?: Barang[]) => void;
  onDeletePengiriman?: (pengirimanId: string) => Promise<void>;
  /** Membuka Surat Jalan yang belum Selesai di halaman Pengiriman untuk diedit. */
  onEditPengiriman?: (pengirimanId: string) => void;
  /** Tarik ulang batch sample/Surat Jalan/bal dari server; dipakai polling ringan agar perubahan dari
   * perangkat lain langsung terlihat di sini. */
  onRefreshPengirimanData?: () => Promise<void>;
}

export const StatusBatchPengirimanManagement: React.FC<StatusBatchPengirimanManagementProps> = ({
  batchSampleList = [],
  pengirimanList = [],
  barangList = [],
  hargaJualList = [],
  onUpdateBatchSample,
  onUpdatePengirimanStatus,
  onNavigateToPengirimanWithBatch,
  onEditBatchSample,
  onDeleteBatchSample,
  onDeletePengiriman,
  onEditPengiriman,
  onRefreshPengirimanData,
}) => {
  // Poll ringan: batch/Surat Jalan/bal yang baru diubah di perangkat lain langsung terlihat di sini.
  // Berhenti saat tab tidak terlihat (tidak membebani server) dan langsung menyegarkan begitu tab dibuka lagi.
  useEffect(() => {
    if (!onRefreshPengirimanData) return;
    const segarkan = () => {
      if (document.visibilityState === 'visible') onRefreshPengirimanData().catch(() => undefined);
    };
    const id = window.setInterval(segarkan, 8000);
    document.addEventListener('visibilitychange', segarkan);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', segarkan);
    };
  }, [onRefreshPengirimanData]);

  // Main Module Tab
  const [activeMainTab, setActiveMainTab] = useState<'sample_batch' | 'pengiriman_batch'>('pengiriman_batch');
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const [highlightedBatchIndex, setHighlightedBatchIndex] = useState(0);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [pengirimanToDelete, setPengirimanToDelete] = useState<string | null>(null);
  const [isDeletingPengiriman, setIsDeletingPengiriman] = useState(false);
  const [pengirimanToFinish, setPengirimanToFinish] = useState<string | null>(null);
  const [isFinishingPengiriman, setIsFinishingPengiriman] = useState(false);
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

  // Edit dan pembatalan batch hanya selama belum dibuatkan Surat Jalan (sama seperti Surat Jalan yang dikunci setelah Selesai)
  const [printingBatch, setPrintingBatch] = useState<BatchPengirimanSample | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [batchToFinalize, setBatchToFinalize] = useState<BatchPengirimanSample | null>(null);
  const [infoBatch, setInfoBatch] = useState('');

  // Cetak surat sample hanya untuk batch yang sudah final (bukan Draft)
  const mintaCetakBatch = (batch: BatchPengirimanSample) => {
    const alasan = alasanBatchBelumFinal(batch, 'cetak');
    if (alasan) {
      setInfoBatch(alasan);
      return;
    }
    setPrintingBatch(batch);
  };

  // Finalkan Draft: batch siap pakai dan surat sudah bisa dicetak. Bal tidak diubah: Reclass hanya harga ulang.
  const finalkanBatch = async (batch: BatchPengirimanSample) => {
    if (!isBatchDraft(batch)) return;
    setBatchToFinalize(null);
    if (!(await onUpdateBatchSample({ ...batch, status: 'sample' }))) return;
    setSuccessToast(`Batch ${batch.kode_batch} sudah final dan siap dipakai. Surat pengiriman sample sekarang bisa dicetak.`);
    setTimeout(() => setSuccessToast(''), 4000);
  };
  const infoKunciBatch = (batch: BatchPengirimanSample): { terkunci: boolean; alasan: string } => {
    const suratJalan = pengirimanList.filter(
      (p) => p.batch_sample_id_ref === batch.batch_id || p.batch_sample_id_ref === batch.kode_batch
    );
    const terkunci =
      suratJalan.length > 0 || (batch.items || []).some((it) => it.sudah_dikirim_do) || batch.status === 'selesai';
    const alasan = suratJalan.length > 0
      ? `Batch sudah dibuatkan Surat Jalan ${suratJalan.map((p) => p.no_surat_jalan).join(', ')}. Batalkan Surat Jalannya dulu (bila belum Selesai).`
      : 'Batch sudah dibuatkan Surat Jalan atau berstatus Selesai sehingga tidak dapat diubah.';
    return { terkunci, alasan };
  };
  const kunciBatchAktif = activeBatch ? infoKunciBatch(activeBatch) : { terkunci: false, alasan: '' };
  const batchTerkunci = kunciBatchAktif.terkunci;
  const alasanBatchTerkunci = kunciBatchAktif.alasan;
  const batchDraft = isBatchDraft(activeBatch);

  // Daftar batch sample (tab Detail Batch): kartu status dan pencarian, sama seperti tab Status Pengiriman
  const [filterBatchStatus, setFilterBatchStatus] = useState<'all' | 'draft' | 'uji' | 'berangkat' | 'selesai'>('all');
  const [searchBatchText, setSearchBatchText] = useState('');
  const kelompokStatusBatch = (batch: BatchPengirimanSample): 'draft' | 'uji' | 'berangkat' | 'selesai' =>
    batch.status === 'draft' ? 'draft' : batch.status === 'selesai' ? 'selesai' : batch.status === 'dikirim' ? 'berangkat' : 'uji';
  const nilaiBatch = (batch: BatchPengirimanSample): number =>
    batch.total_nilai_deal && batch.total_nilai_deal > 0 ? batch.total_nilai_deal : batch.total_estimasi_nilai || 0;
  const ringkasanBatch = useMemo(() => {
    const kosong = () => ({ jumlah: 0, nilai: 0 });
    const hasil = { semua: kosong(), draft: kosong(), uji: kosong(), berangkat: kosong(), selesai: kosong() };
    batchSampleList.forEach((b) => {
      const nilai = nilaiBatch(b);
      hasil.semua.jumlah += 1;
      hasil.semua.nilai += nilai;
      const kelompok = kelompokStatusBatch(b);
      hasil[kelompok].jumlah += 1;
      hasil[kelompok].nilai += nilai;
    });
    return hasil;
  }, [batchSampleList]);
  const batchTerfilter = useMemo(() => {
    const q = searchBatchText.toLowerCase().trim();
    return batchSampleList.filter((b) => {
      if (filterBatchStatus !== 'all' && kelompokStatusBatch(b) !== filterBatchStatus) return false;
      if (!q) return true;
      return (
        (b.kode_batch || '').toLowerCase().includes(q) ||
        (b.tujuan_buyer || '').toLowerCase().includes(q) ||
        (b.permintaan_buyer || '').toLowerCase().includes(q) ||
        (b.dikirim_oleh || '').toLowerCase().includes(q) ||
        (b.items || []).some((it) => (it.no_bal || '').toLowerCase().includes(q))
      );
    });
  }, [batchSampleList, filterBatchStatus, searchBatchText]);
  const totalNilaiBatchTerfilter = batchTerfilter.reduce((sum, b) => sum + nilaiBatch(b), 0);

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
    if (isBatchDraft(activeBatch)) return; // Draft disesuaikan lewat Edit, bukan lewat sortir

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
             berat_bruto_kg: beratBrutoBal(matchedBarang),
             potongan_tara_kg: matchedBarang.potongan_tara_kg,
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
      message: `Bal #${item.no_bal} (${formatNumber(beratBrutoItemSample(item), 1)} kg bruto) ditemukan! Status saat ini: ${item.status_item.toUpperCase()}`,
      itemRef: item,
    });
    setScanSortirInput('');
  };

  // Change individual bal sortir status
  const handleChangeItemStatus = (sampleItemId: string, newStatus: StatusSample) => {
    if (isBatchDraft(activeBatch)) return;
    if (newStatus === 'ditolak') {
      setItemToRemove(sampleItemId);
      return;
    }

    setBatchItems((prev) => {
      return prev.map((item) => {
        if (item.sample_item_id === sampleItemId) {
          const updated = { ...item, status_item: newStatus };
          const now = new Date();
          updated.tanggal_evaluasi = formatTanggalLokal(now);

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
    if (isBatchDraft(activeBatch)) return;
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
    if (isBatchDraft(activeBatch)) return;
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
    if (isBatchDraft(activeBatch)) return;
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
          const countAcc = updatedBatchItems.filter((i) => i.status_item === 'disetujui').length;
          const countTolak = updatedBatchItems.filter((i) => i.status_item === 'ditolak').length;
          const countNego = updatedBatchItems.filter((i) => i.status_item === 'nego').length;
          const totalDeal = updatedBatchItems
            .filter((i) => i.status_item === 'disetujui')
            .reduce((sum, i) => sum + beratBrutoItemSample(i) * (i.harga_deal_kg || i.harga_tawaran_kg), 0);
            
          let batchStatus: BatchPengirimanSample['status'] = 'sample';
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
            tanggal_respon: hariIniLokal(),
          };

          onUpdateBatchSample(updatedBatch);
        }
      }

      setHasUnsavedSortir(true);
      setItemToRemove(null);
    }
  };

  // Save Batch Evaluation Changes
  
  
  const handleAccAllItems = () => {
    if (isBatchDraft(activeBatch)) return;
    setBatchItems((prev) =>
      prev.map((item) => ({ ...item, status_item: 'disetujui' as const, alasan_tolak: '', catatan_nego: '' }))
    );
    setScanSortirFeedback({
      type: 'success',
      message: 'Semua bal dalam batch ini telah di-ACC. Silakan simpan hasil sortir.',
    });
    setHasUnsavedSortir(true);
    setIsAccAllConfirmOpen(false);
  };

  const handleSaveSortirChanges = async () => {
    if (!activeBatch || isBatchDraft(activeBatch)) return;

    const countAcc = batchItems.filter((i) => i.status_item === 'disetujui').length;
    const countTolak = batchItems.filter((i) => i.status_item === 'ditolak').length;
    const countNego = batchItems.filter((i) => i.status_item === 'nego').length;
    const totalDeal = batchItems
      .filter((i) => i.status_item === 'disetujui')
      .reduce((sum, i) => sum + beratBrutoItemSample(i) * (i.harga_deal_kg || i.harga_tawaran_kg), 0);

    let batchStatus: BatchPengirimanSample['status'] = 'sample';
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
      tanggal_respon: hariIniLokal(),
    };

    // Gagal: tanda "belum disimpan" tetap ada supaya bisa dicoba lagi
    if (!(await onUpdateBatchSample(updatedBatch))) return;
    setHasUnsavedSortir(false);
    setSuccessToast(`Hasil sortir buyer untuk batch ${activeBatch.kode_batch} berhasil disimpan!`);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  // Hasil Reclass langsung boleh dijadikan Surat Jalan (DO), termasuk dari Draft dan tanpa menunggu hasil sortir pembeli
  const handleBuatDOReguler = async () => {
    if (!activeBatch) return;

    // Filter items to keep only those not rejected
    const remainingItems = batchItems.filter((i) => i.status_item !== 'ditolak');

    const countAcc = remainingItems.filter((i) => i.status_item === 'disetujui').length;
    const countNego = remainingItems.filter((i) => i.status_item === 'nego').length;
    const totalDeal = remainingItems
      .filter((i) => i.status_item === 'disetujui')
      .reduce((sum, i) => sum + beratBrutoItemSample(i) * (i.harga_deal_kg || i.harga_tawaran_kg), 0);

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
      tanggal_respon: hariIniLokal(),
    };

    if (!(await onUpdateBatchSample(updatedBatch))) return;
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
  // Bal yang bisa langsung dibuatkan Surat Jalan: belum ditolak pembeli dan belum pernah dikirim
  const jumlahSiapDO = batchItems.filter((i) => i.status_item !== 'ditolak' && !i.sudah_dikirim_do).length;
  const totalDealRp = batchItems
    .filter((i) => i.status_item === 'disetujui')
    .reduce((sum, i) => sum + beratBrutoItemSample(i) * (i.harga_deal_kg || i.harga_tawaran_kg), 0);

  // --- TAB 2 FILTERED SHIPMENTS ---
  const filteredPengirimanList = useMemo(() => {
    return pengirimanList.filter((krm) => {
      // Filter status
      if (filterPengirimanStatus === 'akan') {
        if (krm.status !== 'dimuat' && krm.status !== 'dikirim') return false;
      } else if (filterPengirimanStatus === 'sedang') {
        if (krm.status !== 'dalam_perjalanan') return false;
      } else if (filterPengirimanStatus === 'sudah') {
        if (krm.status !== 'diterima' && krm.status !== 'selesai') return false;
      }

      // Search text
      if (searchPengirimanText.trim()) {
        const q = searchPengirimanText.toLowerCase().trim();
        const matchNo = (krm.no_surat_jalan || '').toLowerCase().includes(q);
        const matchTujuan = (krm.tujuan || '').toLowerCase().includes(q);
        const matchDriver = (krm.driver_nama || '').toLowerCase().includes(q);
        const matchPlat = (krm.plat_nomor || '').toLowerCase().includes(q);
        const matchBatch = (krm.batch_sample_id_ref || '').toLowerCase().includes(q);
        return matchNo || matchTujuan || matchDriver || matchPlat || matchBatch;
      }

      return true;
    });
  }, [pengirimanList, filterPengirimanStatus, searchPengirimanText]);

  // Tab 2 Metrics: Volume & Nilai Pengiriman
  const countAkanDikirim = pengirimanList.filter((k) => k.status === 'dimuat' || k.status === 'dikirim').length;
  const countSedangDikirim = pengirimanList.filter((k) => k.status === 'dalam_perjalanan').length;
  const countSudahSelesai = pengirimanList.filter((k) => k.status === 'diterima' || k.status === 'selesai').length;

  // Selesai bersifat final (nilai penjualan masuk laporan), jadi selalu lewat konfirmasi
  const ubahStatusPengiriman = (pengirimanId: string, status: StatusPengiriman) => {
    if (status === 'selesai') {
      setPengirimanToFinish(pengirimanId);
      return;
    }
    onUpdatePengirimanStatus(pengirimanId, status);
  };

  const totalNilaiSemua = useMemo(() => {
    return pengirimanList.reduce((sum, k) => sum + (k.total_nilai_deal || 0), 0);
  }, [pengirimanList]);

  const totalNilaiAkan = useMemo(() => {
    return pengirimanList
      .filter((k) => k.status === 'dimuat' || k.status === 'dikirim')
      .reduce((sum, k) => sum + (k.total_nilai_deal || 0), 0);
  }, [pengirimanList]);

  const totalNilaiSedang = useMemo(() => {
    return pengirimanList
      .filter((k) => k.status === 'dalam_perjalanan')
      .reduce((sum, k) => sum + (k.total_nilai_deal || 0), 0);
  }, [pengirimanList]);

  const totalNilaiSudah = useMemo(() => {
    return pengirimanList
      .filter((k) => k.status === 'diterima' || k.status === 'selesai')
      .reduce((sum, k) => sum + (k.total_nilai_deal || 0), 0);
  }, [pengirimanList]);

  // Tab 2 Filtered Aggregations
  const totalBalFiltered = useMemo(() => {
    return filteredPengirimanList.reduce((sum, k) => sum + (k.total_bal || 0), 0);
  }, [filteredPengirimanList]);

  const totalBeratKgFiltered = useMemo(() => {
    return filteredPengirimanList.reduce((sum, k) => sum + (k.total_berat_kg || 0), 0);
  }, [filteredPengirimanList]);

  const totalNilaiFiltered = useMemo(() => {
    return filteredPengirimanList.reduce((sum, k) => sum + (k.total_nilai_deal || 0), 0);
  }, [filteredPengirimanList]);

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
            onClick={() => setActiveMainTab('pengiriman_batch')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              activeMainTab === 'pengiriman_batch'
                ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-[#b81d24]" />
            <span>Status Pengiriman Barang</span>
          </button>

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
            <span>Batch Sample & Reclass</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: DETAIL BATCH SAMPLE & HASIL SORTIR PEMBELI                       */}
      {/* ========================================================================= */}
      {/* Daftar semua batch sample: langsung tampil saat tab dibuka, dengan kartu status seperti tab Status Pengiriman */}
      {activeMainTab === 'sample_batch' && !activeBatch && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {([
              {
                nilai: 'all' as const,
                judul: 'Semua Batch Sample',
                satuan: 'Batch',
                data: ringkasanBatch.semua,
                Ikon: FlaskConical,
                teks: 'text-gray-900',
                ikon: 'text-gray-500',
                aktif: 'bg-slate-50 border-gray-400 ring-1 ring-gray-400',
                biasa: 'bg-white border-gray-200 hover:bg-gray-50',
                garis: 'border-gray-100',
              },
              {
                nilai: 'draft' as const,
                judul: 'Draft',
                satuan: 'Belum Final',
                data: ringkasanBatch.draft,
                Ikon: Edit3,
                teks: 'text-slate-800',
                ikon: 'text-slate-500',
                aktif: 'bg-slate-100 border-slate-400 ring-1 ring-slate-400',
                biasa: 'bg-white border-slate-300 hover:bg-slate-50',
                garis: 'border-slate-100',
              },
              {
                nilai: 'uji' as const,
                judul: 'Sedang Pengujian Sample',
                satuan: 'Evaluasi QC Lab',
                data: ringkasanBatch.uji,
                Ikon: Clock,
                teks: 'text-amber-800',
                ikon: 'text-amber-600',
                aktif: 'bg-amber-50 border-amber-400 ring-1 ring-amber-400',
                biasa: 'bg-white border-amber-200 hover:bg-amber-50/50',
                garis: 'border-amber-100',
              },
              {
                nilai: 'berangkat' as const,
                judul: 'Sedang Berangkat',
                satuan: 'Dalam Perjalanan',
                data: ringkasanBatch.berangkat,
                Ikon: Truck,
                teks: 'text-red-800',
                ikon: 'text-red-600',
                aktif: 'bg-red-50 border-red-400 ring-1 ring-red-400',
                biasa: 'bg-white border-red-200 hover:bg-red-50/50',
                garis: 'border-red-100',
              },
              {
                nilai: 'selesai' as const,
                judul: 'Selesai / DO Terbit',
                satuan: 'Disetujui Buyer',
                data: ringkasanBatch.selesai,
                Ikon: CheckCircle2,
                teks: 'text-emerald-800',
                ikon: 'text-emerald-600',
                aktif: 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400',
                biasa: 'bg-white border-emerald-200 hover:bg-emerald-50/50',
                garis: 'border-emerald-100',
              },
            ]).map((k) => (
              <div
                key={k.nilai}
                onClick={() => setFilterBatchStatus(k.nilai)}
                className={`p-3.5 border rounded-sm shadow-xs cursor-pointer transition ${filterBatchStatus === k.nilai ? k.aktif : k.biasa}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${k.teks}`}>{k.judul}</span>
                  <k.Ikon className={`w-4 h-4 ${k.ikon}`} />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className={`text-xl font-bold ${k.teks}`}>{k.data.jumlah}</span>
                  <span className={`text-[11px] font-medium ${k.ikon}`}>{k.satuan}</span>
                </div>
                <div className={`mt-2 pt-2 border-t ${k.garis} flex items-center justify-between text-[11px]`}>
                  <span className={`font-medium ${k.teks}`}>Nilai Sample:</span>
                  <span className="font-mono font-bold text-gray-900">{formatRupiah(k.data.nilai)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-300 rounded-sm shadow-xs overflow-hidden">
            <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari no. surat, pabrik, petugas, no bal"
                  value={searchBatchText}
                  onChange={(e) => setSearchBatchText(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
                />
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-500 font-medium">
                <span>
                  Menampilkan <strong className="text-gray-900">{batchTerfilter.length}</strong> batch
                </span>
                <span className="text-gray-300">|</span>
                <span>
                  Total Nilai: <strong className="text-emerald-800 font-mono font-bold">{formatRupiah(totalNilaiBatchTerfilter)}</strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-xs border-collapse">
                <thead className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold">
                  <tr>
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3 w-40">No. Surat Sample</th>
                    <th className="p-3 w-28">Tgl Kirim</th>
                    <th className="p-3">Tujuan Pabrik</th>
                    <th className="p-3 w-36">Petugas QC</th>
                    <th className="p-3 text-right w-20">Total Bal</th>
                    <th className="p-3 text-right w-28">Bruto (Kg)</th>
                    <th className="p-3 text-right w-36">Nilai Sample</th>
                    <th className="p-3 text-center w-48 whitespace-nowrap">Status Sample</th>
                    <th className="p-3 text-center w-72 whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {batchTerfilter.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-500 bg-gray-50/50">
                        <FlaskConical className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <div className="text-sm font-bold text-gray-700">Tidak ada data batch sample</div>
                      </td>
                    </tr>
                  ) : (
                    batchTerfilter.map((batch, idx) => {
                      const kelompok = kelompokStatusBatch(batch);
                      const kunci = infoKunciBatch(batch);
                      const totalBruto = (batch.items || []).reduce((sum, it) => sum + beratBrutoItemSample(it), 0);
                      return (
                        <tr key={batch.batch_id} className="hover:bg-gray-50 transition">
                          <td className="p-3 text-center font-mono text-gray-500">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-gray-900">
                            <div>{batch.kode_batch}</div>
                            {batch.permintaan_buyer && (
                              <div className="text-[10px] text-gray-500 font-normal italic line-clamp-1">{batch.permintaan_buyer}</div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-gray-700">{batch.tanggal_kirim}</td>
                          <td className="p-3 font-semibold text-gray-900">{batch.tujuan_buyer}</td>
                          <td className="p-3 text-gray-700">{batch.dikirim_oleh || '-'}</td>
                          <td className="p-3 text-right font-mono font-bold">{(batch.items || []).length || batch.total_sample_bal || 0} Bal</td>
                          <td className="p-3 text-right font-mono font-bold text-gray-900">{formatNumber(totalBruto, 1)} kg</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-800">{formatRupiah(nilaiBatch(batch))}</td>
                          <td className="p-3 text-center">
                            {kelompok === 'draft' && (
                              <span className="px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-xs inline-flex items-center space-x-1 whitespace-nowrap">
                                <Edit3 className="w-3 h-3" />
                                <span>Draft</span>
                              </span>
                            )}
                            {kelompok === 'uji' && (
                              <span className="px-2.5 py-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 rounded-xs inline-flex items-center space-x-1 whitespace-nowrap">
                                <Clock className="w-3 h-3" />
                                <span>Pengujian Sample</span>
                              </span>
                            )}
                            {kelompok === 'berangkat' && (
                              <span className="px-2.5 py-1 text-[10px] font-bold text-red-800 bg-red-100 border border-red-300 rounded-xs inline-flex items-center space-x-1 whitespace-nowrap">
                                <Truck className="w-3 h-3 text-red-700" />
                                <span>Sedang Berangkat</span>
                              </span>
                            )}
                            {kelompok === 'selesai' && (
                              <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-xs inline-flex items-center space-x-1 whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Selesai (DO Terbit)</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-nowrap items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBatchId(batch.batch_id);
                                  setScanBatchId(batch.kode_batch);
                                }}
                                title="Buka detail batch dan hasil sortir pembeli"
                                className="px-2 py-1 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xs text-[10px] flex items-center space-x-1 cursor-pointer shadow-xs whitespace-nowrap"
                              >
                                <ArrowRight className="w-3 h-3" />
                                <span>Detail</span>
                              </button>
                              {onEditBatchSample && (
                                <button
                                  type="button"
                                  disabled={kunci.terkunci}
                                  onClick={() => onEditBatchSample(batch.batch_id)}
                                  title={kunci.terkunci ? kunci.alasan : 'Edit Batch Sample di halaman Pengiriman Sample'}
                                  className="p-1 text-amber-700 hover:text-white hover:bg-amber-600 rounded-xs border border-amber-300 cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-amber-700"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {kelompok === 'draft' && (
                                <button
                                  type="button"
                                  onClick={() => setBatchToFinalize(batch)}
                                  title="Finalkan: tandai siap pakai agar surat bisa dicetak"
                                  className="px-2 py-1 bg-[#b81d24] hover:bg-[#a0181e] text-white font-bold rounded-xs text-[10px] flex items-center space-x-1 cursor-pointer shadow-xs whitespace-nowrap"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Finalkan</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => mintaCetakBatch(batch)}
                                aria-disabled={kelompok === 'draft'}
                                title={kelompok === 'draft' ? 'Batch masih Draft. Finalkan dulu sebelum mencetak surat.' : 'Cetak Surat Pengiriman Sample'}
                                className={`p-1 rounded-xs border transition ${
                                  kelompok === 'draft'
                                    ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                                    : 'text-[#b81d24] hover:text-white hover:bg-[#b81d24] border-red-300 cursor-pointer'
                                }`}
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteBatchSample && (kunci.terkunci ? (
                                <span
                                  className="p-1 text-gray-300 rounded-xs border border-gray-200 inline-flex cursor-not-allowed"
                                  title={kunci.alasan}
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setBatchToDelete(batch.batch_id)}
                                  title="Batalkan Batch Sample (bal tidak berubah)"
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xs border border-gray-200 hover:border-red-200 cursor-pointer transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ))}
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

      {/* Detail satu batch sample & hasil sortir pembeli */}
      {activeMainTab === 'sample_batch' && activeBatch && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setSelectedBatchId('');
              setScanBatchId('');
              setBatchItems([]);
            }}
            className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xs transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Batch</span>
          </button>

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
                    placeholder="No. surat sample"
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

              {/* Aksi Batch: edit kembali ke Pengiriman Sample, cetak surat sample, batalkan draft */}
              {activeBatch && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {onEditBatchSample && (
                    <button
                      type="button"
                      disabled={batchTerkunci}
                      onClick={() => onEditBatchSample(activeBatch.batch_id)}
                      title={batchTerkunci ? alasanBatchTerkunci : 'Edit Batch Sample (tambah bal, ubah harga tawaran, tujuan, dll.) di halaman Pengiriman Sample'}
                      className="px-2.5 py-1.5 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xs transition cursor-pointer flex items-center space-x-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                  {batchDraft && (
                    <button
                      type="button"
                      onClick={() => setBatchToFinalize(activeBatch)}
                      title="Finalkan: tandai siap pakai agar surat bisa dicetak"
                      className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#b81d24] hover:bg-[#a0181e] text-white border border-[#b81d24] rounded-xs transition cursor-pointer flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Finalkan</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => mintaCetakBatch(activeBatch)}
                    aria-disabled={batchDraft}
                    title={batchDraft ? 'Batch masih Draft. Finalkan dulu sebelum mencetak surat.' : 'Cetak Surat Pengiriman Sample'}
                    className={`px-2.5 py-1.5 text-[11px] font-semibold border rounded-xs transition flex items-center space-x-1 ${
                      batchDraft ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300 cursor-pointer'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5 text-gray-600" />
                    <span>Cetak</span>
                  </button>
                  {onDeleteBatchSample && (
                    <button
                      type="button"
                      disabled={batchTerkunci}
                      onClick={() => setBatchToDelete(activeBatch.batch_id)}
                      title={batchTerkunci ? alasanBatchTerkunci : 'Batalkan Batch Sample (bal tidak berubah)'}
                      className="px-2.5 py-1.5 text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xs transition cursor-pointer flex items-center space-x-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Batal</span>
                    </button>
                  )}
                </div>
              )}

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
              </div>

              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xs shadow-xs">
                <div className="text-[11px] font-bold text-emerald-800 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ACC</span>
                </div>
                <div className="text-xl font-bold text-emerald-900 mt-0.5">{countAcc} Bal</div>
              </div>

              <div className="bg-amber-50 border border-amber-300 p-3 rounded-xs shadow-xs">
                <div className="text-[11px] font-bold text-amber-800 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Nego</span>
                </div>
                <div className="text-xl font-bold text-amber-900 mt-0.5">{countNego} Bal</div>
              </div>

              <div className="bg-red-50 border border-red-300 p-3 rounded-xs shadow-xs">
                <div className="text-[11px] font-bold text-red-800 flex items-center space-x-1">
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>Ditolak</span>
                </div>
                <div className="text-xl font-bold text-red-900 mt-0.5">{countTolak} Bal</div>
              </div>

              <div className="bg-white p-3 border border-gray-300 rounded-xs shadow-xs">
                <div className="text-[11px] font-medium text-gray-500">Total Nilai Deal (ACC)</div>
                <div className="text-base font-bold font-mono text-[#b81d24] mt-0.5 truncate">{formatRupiah(totalDealRp)}</div>
              </div>
            </div>
            )}
          </div>

          {activeBatch ? (
          <>
          {batchDraft && (
            <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-2.5 text-xs text-slate-800">
                <Edit3 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Batch masih Draft</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBatchToFinalize(activeBatch)}
                className="px-3 py-1.5 bg-[#b81d24] hover:bg-[#a0181e] text-white text-xs font-bold rounded-xs flex items-center space-x-1.5 shadow-xs cursor-pointer shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Finalkan (Siap Pakai)</span>
              </button>
            </div>
          )}
          {/* Barcode Quick Sortir Scanner & Bulk Tool */}
          <div className="bg-gray-50 border border-gray-300 rounded-sm p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              {/* Barcode Search & Scan */}
              <div className="flex items-center space-x-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Scan / ketik No Bal"
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
                  className="px-3 py-1.5 bg-[#b81d24] hover:bg-[#b81d24] text-white text-xs font-semibold rounded-xs cursor-pointer"
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
                      ? 'bg-[#b81d24] text-white shadow-xs'
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
                
                {!batchDraft && batchItems.length > 0 && batchItems.some(i => i.status_item !== 'disetujui') && (
                  <button
                    type="button"
                    onClick={() => setIsAccAllConfirmOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ACC Semua</span>
                  </button>
                )}
                {!batchDraft && hasUnsavedSortir && (
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
                {jumlahSiapDO > 0 && !activeBatch?.is_locked && (
                  <button
                    type="button"
                    onClick={handleBuatDOReguler}
                    className="px-4 py-1.5 bg-[#b81d24] hover:bg-[#b81d24] text-white text-xs font-bold rounded-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Truck className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Buat DO Reguler ({jumlahSiapDO} Bal)</span>
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
                    <th className="p-3 w-36">No Bal</th>
                    <th className="p-3 text-right w-24">Berat Bruto (Kg)</th>
                    <th className="p-3 text-center w-48">Status Sortir Pembeli</th>
                    <th className="p-3 w-56">Kode Master Harga Jual</th>
                    <th className="p-3 text-right w-36">Harga Beli (Rp/Kg)</th>
                    <th className="p-3 text-right w-36">Harga Deal (Rp/Kg)</th>
                    <th className="p-3 text-right w-36">Subtotal Deal</th>
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
                      const subtotal = beratBrutoItemSample(item) * currentPrice;

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
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {formatNumber(beratBrutoItemSample(item), 1)} kg
                          </td>

                          {/* Sortir Toggle Buttons */}
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center space-x-1 p-0.5 bg-gray-200/80 rounded-xs">
                              <button
                                type="button"
                                onClick={() => handleChangeItemStatus(item.sample_item_id, 'disetujui')}
                                disabled={activeBatch?.is_locked || batchDraft}
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
                                disabled={activeBatch?.is_locked || batchDraft}
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
                                disabled={activeBatch?.is_locked || batchDraft}
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
                              disabled={isTolak || activeBatch?.is_locked || batchDraft}
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
                                disabled={isTolak || activeBatch?.is_locked || batchDraft}
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

                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={activeBatch?.is_locked || batchDraft}
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
                      <td colSpan={2} className="p-3 text-right uppercase text-[11px]">
                        Total ({displayedBatchItems.length} Bal)
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatNumber(displayedBatchItems.reduce((s, it) => s + beratBrutoItemSample(it), 0), 1)} kg
                      </td>
                      <td colSpan={4} className="p-3 text-right uppercase text-[11px]">
                        Total Nilai Deal Bal Lolos:
                      </td>
                      <td className="p-3 text-right font-mono text-sm text-emerald-800">
                        {formatRupiah(
                          displayedBatchItems
                            .filter((it) => it.status_item === 'disetujui')
                            .reduce((s, it) => s + (beratBrutoItemSample(it) * (it.harga_deal_kg || it.harga_tawaran_kg)), 0)
                        )}
                      </td>
                      <td></td>
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
        message="Tolak bal ini? Bal dikeluarkan dari batch dan tetap di stok gudang."
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
                  ? 'bg-slate-50 border-gray-400 ring-1 ring-gray-400'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${filterPengirimanStatus === 'all' ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>Semua Surat Jalan</span>
                <Truck className="w-4 h-4 text-gray-500" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-gray-900">{pengirimanList.length}</span>
                <span className="text-xs text-gray-500 font-medium">Surat Jalan</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                <span className="text-gray-500 font-medium">Nilai Pengiriman:</span>
                <span className="font-mono font-bold text-gray-900">{formatRupiah(totalNilaiSemua)}</span>
              </div>
            </div>

            <div 
              onClick={() => setFilterPengirimanStatus('akan')}
              className={`p-3.5 border rounded-sm shadow-xs cursor-pointer transition ${
                filterPengirimanStatus === 'akan'
                  ? 'bg-slate-50 border-slate-500 ring-1 ring-slate-500'
                  : 'bg-white border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-800">Akan Dikirim</span>
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-800">{countAkanDikirim}</span>
                <span className="text-[11px] font-medium text-slate-500">Surat Jalan</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">Nilai Pengiriman:</span>
                <span className="font-mono font-bold text-slate-900">{formatRupiah(totalNilaiAkan)}</span>
              </div>
            </div>

            <div 
              onClick={() => setFilterPengirimanStatus('sedang')}
              className={`p-3.5 border rounded-sm shadow-xs cursor-pointer transition ${
                filterPengirimanStatus === 'sedang'
                  ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400'
                  : 'bg-white border-amber-200 hover:bg-amber-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-800">Sedang Dikirim</span>
                <Truck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-amber-700">{countSedangDikirim}</span>
                <span className="text-[11px] font-medium text-amber-600">Surat Jalan</span>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-100 flex items-center justify-between text-[11px]">
                <span className="text-amber-700 font-medium">Nilai Pengiriman:</span>
                <span className="font-mono font-bold text-amber-900">{formatRupiah(totalNilaiSedang)}</span>
              </div>
            </div>

            <div 
              onClick={() => setFilterPengirimanStatus('sudah')}
              className={`p-3.5 border rounded-sm shadow-xs cursor-pointer transition ${
                filterPengirimanStatus === 'sudah'
                  ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
                  : 'bg-white border-emerald-200 hover:bg-emerald-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800">Sudah Selesai</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-emerald-700">{countSudahSelesai}</span>
                <span className="text-[11px] font-medium text-emerald-600">Surat Jalan</span>
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-medium">Nilai Pengiriman:</span>
                <span className="font-mono font-bold text-emerald-900">{formatRupiah(totalNilaiSudah)}</span>
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
                  placeholder="Cari no. surat jalan, pabrik, sopir, nopol"
                  value={searchPengirimanText}
                  onChange={(e) => setSearchPengirimanText(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
                />
              </div>

              <div className="flex items-center space-x-3 text-xs text-gray-500 font-medium">
                <span>
                  Menampilkan <strong className="text-gray-900">{filteredPengirimanList.length}</strong> pengiriman
                </span>
                <span className="text-gray-300">|</span>
                <span>
                  Total Nilai: <strong className="text-emerald-800 font-mono font-bold">{formatRupiah(totalNilaiFiltered)}</strong>
                </span>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-xs border-collapse">
                <thead className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold">
                  <tr>
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3 w-36">No. Surat Jalan</th>
                    <th className="p-3 w-28">Tgl Kirim</th>
                    <th className="p-3">Tujuan Pabrik</th>
                    <th className="p-3 w-44">Supir & Plat Kendaraan</th>
                    <th className="p-3 text-right w-20">Total Bal</th>
                    <th className="p-3 text-right w-24">Tonase (Kg)</th>
                    <th className="p-3 text-right w-36">Nilai Pengiriman</th>
                    <th className="p-3 text-center w-48 whitespace-nowrap">Status Pengiriman</th>
                    <th className="p-3 text-center w-72 whitespace-nowrap">Aksi Kelola Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPengirimanList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-500 bg-gray-50/50">
                        <Truck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <div className="text-sm font-bold text-gray-700">Tidak ada data pengiriman</div>
                      </td>
                    </tr>
                  ) : (
                    filteredPengirimanList.map((item, idx) => {
                      const isAkan = item.status === 'dimuat' || item.status === 'dikirim';
                      const isSedang = item.status === 'dalam_perjalanan';
                      const isDiterima = item.status === 'diterima';
                      const isSelesai = item.status === 'selesai';
                      const nilaiPengiriman = item.total_nilai_deal || 0;

                      return (
                        <tr key={item.pengiriman_id} className="hover:bg-gray-50 transition">
                          <td className="p-3 text-center font-mono text-gray-500">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-gray-900">
                            <div>{item.no_surat_jalan}</div>
                            {item.batch_sample_id_ref && (
                              <div className="text-[10px] text-gray-500 font-normal">
                                Ref Batch: {batchSampleList.find((b) => b.batch_id === item.batch_sample_id_ref)?.kode_batch || item.batch_sample_id_ref}
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

                          {/* Nilai Pengiriman */}
                          <td className="p-3 text-right font-mono font-bold text-emerald-800">
                            <div className="text-xs">{formatRupiah(nilaiPengiriman)}</div>
                            {item.total_berat_kg > 0 && nilaiPengiriman > 0 && (
                              <div className="text-[10px] text-gray-500 font-normal">
                                Rp {formatNumber(Math.round(nilaiPengiriman / item.total_berat_kg))}/kg
                              </div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="p-3 text-center">
                            {isAkan && (
                              <span className="px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-xs inline-flex items-center space-x-1 whitespace-nowrap">
                                <Clock className="w-3 h-3" />
                                <span>Akan Dikirim</span>
                              </span>
                            )}
                            {isSedang && (
                              <span className="px-2.5 py-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded-xs inline-flex items-center space-x-1 whitespace-nowrap">
                                <Truck className="w-3 h-3 text-amber-700" />
                                <span>Sedang Dikirim</span>
                              </span>
                            )}
                            {isDiterima && (
                              <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-white border border-emerald-300 rounded-xs inline-flex items-center space-x-1 whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Tiba di Pabrik</span>
                              </span>
                            )}
                            {isSelesai && (
                              <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-xs inline-flex items-center space-x-1 whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Selesai (Tutup DO)</span>
                              </span>
                            )}
                          </td>

                          {/* Aksi Kelola Status Terpusat */}
                          <td className="p-3 text-center">
                            <div className="flex flex-nowrap items-center justify-center space-x-1.5">
                              {/* Direct Status Selector */}
                              <select
                                value={item.status}
                                disabled={isSelesai}
                                onChange={(e) => ubahStatusPengiriman(item.pengiriman_id, e.target.value as StatusPengiriman)}
                                className="text-[10px] font-semibold bg-white border border-gray-300 rounded px-1.5 py-1 text-gray-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-700 shadow-2xs disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                title={isSelesai ? 'Surat Jalan sudah Selesai; status tidak dapat diubah lagi' : 'Ubah langsung status pengiriman ini'}
                              >
                                <option value="dimuat">Dimuat</option>
                                <option value="dikirim">Akan Dikirim</option>
                                <option value="dalam_perjalanan">Sedang Dikirim</option>
                                <option value="diterima">Tiba di Pabrik</option>
                                <option value="selesai">Selesai</option>
                              </select>

                              {/* Quick Action Button for Next Stage */}
                              {isAkan && (
                                <button
                                  type="button"
                                  onClick={() => onUpdatePengirimanStatus(item.pengiriman_id, 'dalam_perjalanan')}
                                  className="px-2 py-1 bg-[#b81d24] hover:bg-[#a0181e] text-white font-bold rounded-xs text-[10px] flex items-center space-x-1 cursor-pointer shadow-xs whitespace-nowrap"
                                  title="Konfirmasi truk berangkat (jalan)"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>Berangkat</span>
                                </button>
                              )}

                              {isSedang && (
                                <button
                                  type="button"
                                  onClick={() => onUpdatePengirimanStatus(item.pengiriman_id, 'diterima')}
                                  className="px-2 py-1 bg-[#b81d24] hover:bg-[#a0181e] text-white font-bold rounded-xs text-[10px] flex items-center space-x-1 cursor-pointer shadow-xs whitespace-nowrap"
                                  title="Konfirmasi truk telah tiba di pabrik tujuan"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Tiba</span>
                                </button>
                              )}

                              {isDiterima && (
                                <button
                                  type="button"
                                  onClick={() => ubahStatusPengiriman(item.pengiriman_id, 'selesai')}
                                  className="px-2 py-1 bg-[#b81d24] hover:bg-[#a0181e] text-white font-bold rounded-xs text-[10px] flex items-center space-x-1 cursor-pointer shadow-xs whitespace-nowrap"
                                  title="Tandai pengiriman selesai; nilai penjualan masuk laporan dan Surat Jalan tidak dapat dihapus lagi"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Selesai</span>
                                </button>
                              )}

                              {/* Print Button */}
                              <button
                                type="button"
                                onClick={() => openPrintDocument('surat_jalan', item.pengiriman_id)}
                                className="p-1 text-[#b81d24] hover:text-white hover:bg-[#b81d24] rounded-xs border border-red-300 cursor-pointer transition"
                                title="Buka Halaman Cetak Surat Jalan Resmi (Pilih PDF atau Printer)"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Button: hanya selama Surat Jalan belum Selesai */}
                              {onEditPengiriman && !isSuratJalanTerkunci(item) && (
                                <button
                                  type="button"
                                  onClick={() => onEditPengiriman(item.pengiriman_id)}
                                  className="p-1 text-amber-700 hover:text-white hover:bg-amber-600 rounded-xs border border-amber-300 cursor-pointer transition"
                                  title="Edit Surat Jalan (tambah bal, ubah berat, harga, potongan, tujuan, dll.)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Button: terkunci bila Surat Jalan sudah Selesai */}
                              {onDeletePengiriman && isSuratJalanTerkunci(item) && (
                                <span
                                  className="p-1 text-gray-300 rounded-xs border border-gray-200 inline-flex cursor-not-allowed"
                                  title={pesanSuratJalanTerkunci(item)}
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {onDeletePengiriman && !isSuratJalanTerkunci(item) && (
                                <button
                                  type="button"
                                  onClick={() => setPengirimanToDelete(item.pengiriman_id)}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xs border border-gray-200 hover:border-red-200 cursor-pointer transition"
                                  title="Batalkan / hapus Surat Jalan (bal kembali ke stok gudang)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredPengirimanList.length > 0 && (
                  <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300 text-gray-800">
                    <tr>
                      <td colSpan={5} className="p-3 text-right uppercase text-[11px] tracking-wide text-gray-600">
                        Total Akumulasi ({filteredPengirimanList.length} Pengiriman Terfilter)
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">
                        {totalBalFiltered} Bal
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">
                        {formatNumber(totalBeratKgFiltered, 1)} kg
                      </td>
                      <td className="p-3 text-right font-mono text-xs text-emerald-800 font-bold">
                        {formatRupiah(totalNilaiFiltered)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Pengiriman DO Modal */}
      <ConfirmModal
        isOpen={!!pengirimanToDelete}
        title="Batalkan / Hapus Surat Jalan"
        message="Batalkan Surat Jalan ini? Bal di dalamnya kembali ke stok gudang."
        confirmText="Ya, Batalkan"
        cancelText="Kembali"
        variant="danger"
        onConfirm={async () => {
          if (pengirimanToDelete && onDeletePengiriman) {
            setIsDeletingPengiriman(true);
            // Wait for backend deletion before closing modal
            await onDeletePengiriman(pengirimanToDelete);
            setIsDeletingPengiriman(false);
          }
          setPengirimanToDelete(null);
        }}
        isLoading={isDeletingPengiriman}
        onClose={() => setPengirimanToDelete(null)}
        onCancel={() => setPengirimanToDelete(null)}
      />

      {/* Konfirmasi ACC semua bal batch sample */}
      <ConfirmModal
        isOpen={isAccAllConfirmOpen}
        title="ACC Semua Bal"
        message="Tandai seluruh bal pada batch ini ACC? Status Nego atau Tolak yang sudah diisi akan diganti."
        confirmText="Ya, ACC Semua"
        cancelText="Batal"
        variant="warning"
        onConfirm={handleAccAllItems}
        onClose={() => setIsAccAllConfirmOpen(false)}
      />

      {/* Cetak Surat Pengiriman Sample */}
      <BatchSamplePrintModal
        isOpen={!!printingBatch}
        onClose={() => setPrintingBatch(null)}
        batch={printingBatch}
      />

      {/* Konfirmasi pembatalan Batch Sample: bal tidak berubah */}
      {/* Finalkan Draft: setelah final batch siap dipakai dan surat bisa dicetak */}
      <ConfirmModal
        isOpen={!!batchToFinalize}
        title="Finalkan Batch Sample"
        message={`Finalkan Batch ${batchToFinalize?.kode_batch || ''} (${(batchToFinalize?.items || []).length} bal) untuk ${batchToFinalize?.tujuan_buyer || ''}? Setelah final, batch siap dipakai dan surat pengiriman sample bisa dicetak. Pastikan nomor bal dan harga jualnya sudah benar.`}
        confirmText="Ya, Finalkan"
        cancelText="Periksa Lagi"
        variant="primary"
        onConfirm={() => {
          if (batchToFinalize) finalkanBatch(batchToFinalize);
        }}
        onClose={() => setBatchToFinalize(null)}
      />

      {/* Info: aksi ditolak karena batch masih Draft */}
      <ConfirmModal
        isOpen={Boolean(infoBatch)}
        title="Batch Masih Draft"
        message={infoBatch}
        confirmText="Mengerti"
        variant="warning"
        hideCancel
        onConfirm={() => setInfoBatch('')}
        onClose={() => setInfoBatch('')}
      />

      <ConfirmModal
        isOpen={!!batchToDelete}
        title="Batalkan Batch Sample"
        message="Hapus batch sample ini? Bal di dalamnya tetap di stok gudang."
        confirmText="Ya, Batalkan Batch"
        cancelText="Kembali"
        variant="danger"
        onConfirm={() => {
          if (batchToDelete && onDeleteBatchSample) {
            onDeleteBatchSample(batchToDelete);
            if (selectedBatchId === batchToDelete) {
              setSelectedBatchId('');
              setScanBatchId('');
              setBatchItems([]);
            }
          }
          setBatchToDelete(null);
        }}
        onClose={() => setBatchToDelete(null)}
      />

      {/* Konfirmasi Selesai: final, nilai penjualan masuk laporan */}
      <ConfirmModal
        isOpen={!!pengirimanToFinish}
        title="Tandai Surat Jalan Selesai"
        message="Tandai Surat Jalan ini Selesai? Setelah Selesai, Surat Jalan tidak dapat diubah atau dibatalkan."
        confirmText="Ya, Selesai"
        cancelText="Belum"
        variant="warning"
        onConfirm={async () => {
          if (pengirimanToFinish) {
            setIsFinishingPengiriman(true);
            await onUpdatePengirimanStatus(pengirimanToFinish, 'selesai');
            setIsFinishingPengiriman(false);
          }
          setPengirimanToFinish(null);
        }}
        isLoading={isFinishingPengiriman}
        onClose={() => setPengirimanToFinish(null)}
        onCancel={() => setPengirimanToFinish(null)}
      />

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

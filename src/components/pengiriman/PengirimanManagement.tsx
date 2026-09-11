import { SearchableSelect } from '../common/SearchableSelect';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Printer, 
  FileText, 
  RefreshCw,
  X, 
  Info, 
  ArrowLeft, 
  CheckCircle2, 
  Filter, 
  CheckSquare, 
  Square, 
  Scale, 
  Building2, 
  Calendar, 
  User, 
  AlertCircle,
  AlertOctagon,
  FlaskConical,
  Barcode,
  Check,
  Zap,
  AlertTriangle,
  DollarSign,
  Trash2,
  Package,
  Edit3
} from 'lucide-react';
import { 
  PengirimanBarang, 
  Barang, 
  PengirimanSample, 
  BatchPengirimanSample, 
  SampleItemDetail,
  Gudang, 
  Petani, 
  UserRole, 
  TabelHarga, 
  TransaksiPembelian,
  MasterHargaJual 
} from '../../types';
import { loadHargaJualData, loadBatchSampleData } from '../../utils/storage';
import { SuratJalanPrintModal } from './SuratJalanPrintModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { Pagination } from '../common/Pagination';
import { openPrintDocument } from '../../utils/openDedicatedPrint';
import { formatNumber, formatRupiah, generateNoSuratJalanSimple } from '../../utils/formatters';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

interface PengirimanManagementProps {
  pengirimanList: PengirimanBarang[];
  barangList: Barang[];
  sampleList?: PengirimanSample[];
  batchSampleList?: BatchPengirimanSample[];
  selectedBatchId?: string;
  gudangList?: Gudang[];
  petaniList?: Petani[];
  hargaJualList?: MasterHargaJual[];
  tabelHarga?: TabelHarga[];
  transaksiList?: TransaksiPembelian[];
  userRole: UserRole;
  onSaveNewPengiriman: (pengiriman: PengirimanBarang, updatedBarangIds: string[]) => void;
  onUpdatePengiriman?: (pengiriman: PengirimanBarang) => void;
  onDeletePengiriman?: (pengirimanId: string, revertedBarangs?: Barang[]) => void;
}

export const PengirimanManagement: React.FC<PengirimanManagementProps> = ({
  pengirimanList = [],
  barangList = [],
  sampleList = [],
  batchSampleList = [],
  selectedBatchId,
  gudangList = [],
  petaniList = [],
  hargaJualList = [],
  tabelHarga = [],
  transaksiList = [],
  userRole,
  onSaveNewPengiriman,
  onUpdatePengiriman,
  onDeletePengiriman,
}) => {
  const activeHargaJualList = (hargaJualList && hargaJualList.length > 0) ? hargaJualList : loadHargaJualData();

  // Page mode: default to 'create' (In-page Delivery Order Creation) as requested by user
  const [viewMode, setViewMode] = useState<'list' | 'create'>('create');
  const [editingPengirimanId, setEditingPengirimanId] = useState<string | null>(null);
  const [pengirimanToDelete, setPengirimanToDelete] = useState<string | null>(null);
  
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const [highlightedBatchIndex, setHighlightedBatchIndex] = useState(0);
  const [scanBatchId, setScanBatchId] = useState('');
  const batchDropdownRef = useRef<HTMLDivElement>(null);
  const inputBatchRef = useRef<HTMLInputElement>(null);

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


  // List View State
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [printingSuratJalan, setPrintingSuratJalan] = useState<PengirimanBarang | null>(null);

  // In-Page Create Delivery Order State
  const [sourceMode, setSourceMode] = useState<'sample_batch' | 'gudang_reguler'>('sample_batch');
  const [selectedBatchSampleId, setSelectedBatchSampleId] = useState<string>('');
  
  const [noSuratJalan, setNoSuratJalan] = useState('');
  const [tanggalKirim, setTanggalKirim] = useState(new Date().toISOString().split('T')[0]);
  const [tujuanBuyer, setTujuanBuyer] = useState('');
  const [driverNama, setDriverNama] = useState('');
  const [platNomor, setPlatNomor] = useState('');
  const [noKontrak, setNoKontrak] = useState(`PO-DJA-${new Date().getFullYear()}-089`);

  // Create View Filters (Grade, Lokasi Gudang, Petani) for regular mode
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterGudang, setFilterGudang] = useState<string>('all');
  const [filterPetani, setFilterPetani] = useState<string>('all');
  const [filterSearchBal, setFilterSearchBal] = useState<string>('');

  // Selected Bal IDs for shipment (centang pada kolom kirim / bal yang dikeluarkan & di-scan)
  // By default: statusnya TIDAK DICENTANG DULU sesuai permintaan user
  const [selectedBalIds, setSelectedBalIds] = useState<string[]>([]);
  // Bal IDs yang dimuat ke dalam tabel muatan pengiriman reguler
  const [regulerManifestBalIds, setRegulerManifestBalIds] = useState<string[]>([]);
  const [scanInputText, setScanInputText] = useState('');
  const [scanAlert, setScanAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Dropdown Autocomplete for Shipment Scan Input
  const [isScanDropdownOpen, setIsScanDropdownOpen] = useState(false);
  const [highlightedScanIndex, setHighlightedScanIndex] = useState(0);
  const scanDropdownRef = useRef<HTMLDivElement>(null);

  // Custom prices & price codes editable directly in the shipment table
    const [customKodeHargaMap, setCustomKodeHargaMap] = useState<Record<string, string>>({});
  const [bulkKodeHarga, setBulkKodeHarga] = useState<string>('');

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modal Pilih dari Stok Gudang untuk Pengiriman Reguler
  const [isStokModalOpen, setIsStokModalOpen] = useState(false);
  const [stokModalSearch, setStokModalSearch] = useState('');
  const [stokModalGrade, setStokModalGrade] = useState('all');
  const [stokModalSelectedIds, setStokModalSelectedIds] = useState<string[]>([]);

  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Active batches fallback to localStorage if prop is empty
  const activeBatchSampleList = useMemo(() => {
    return (batchSampleList && batchSampleList.length > 0) ? batchSampleList : loadBatchSampleData();
  }, [batchSampleList]);

  // Helper to check if a batch is already shipped (sudah dikirim) or currently being shipped (sedang dikirim)
  const getBatchShipmentStatus = (batch: BatchPengirimanSample) => {
    const linkedShipments = pengirimanList.filter(
      (p) =>
        p.status !== 'batal' &&
        (p.batch_sample_id_ref === batch.batch_id ||
         p.batch_sample_id_ref === batch.kode_batch ||
         p.batch_sample_id_ref?.toLowerCase() === batch.batch_id.toLowerCase() ||
         p.batch_sample_id_ref?.toLowerCase() === batch.kode_batch.toLowerCase())
    );

    const isAlreadyShipped = 
      linkedShipments.length > 0 || 
      batch.status === 'selesai' || 
      batch.status === 'dibatalkan' ||
      ((batch.items || []).length > 0 && 
       (batch.items || []).every((it) => it.sudah_dikirim_do || it.status_item === 'ditolak') &&
       (batch.items || []).some(it => it.sudah_dikirim_do));

    const isCurrentlyShipping = 
      batch.status === 'dikirim' || 
      linkedShipments.some((p) => p.status === 'dalam_perjalanan' || p.status === 'dikirim');

    const isPendingSampleEvaluation =
      (batch.status === 'diproses' || batch.status === 'sample') &&
      !(batch.items || []).some((it) => (it.status_item === 'disetujui' || it.status_item === 'nego') && !it.sudah_dikirim_do);

    return {
      isAlreadyShipped,
      isCurrentlyShipping,
      isPendingSampleEvaluation,
      isEligibleForRegularDO: !isAlreadyShipped && !isCurrentlyShipping && !isPendingSampleEvaluation && (batch.items || []).length > 0,
      linkedShipments,
    };
  };

  // Available batches that have sample bales and are eligible for regular shipment (not currently shipping or already shipped)
  const availableBatches = useMemo(() => {
    return activeBatchSampleList.filter((b) => {
      const statusInfo = getBatchShipmentStatus(b);
      return statusInfo.isEligibleForRegularDO;
    });
  }, [activeBatchSampleList, pengirimanList]);

  const batchSuggestions = useMemo(() => {
    const qRaw = scanBatchId.trim().toLowerCase();
    const qClean = qRaw.replace(/[^a-z0-9]/g, '');
    if (!qRaw) return availableBatches.slice(0, 8); // show recent 8 eligible batches by default
    return availableBatches.filter((b) => {
      const kodeClean = (b.kode_batch || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const idClean = (b.batch_id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const buyer = (b.tujuan_buyer || '').toLowerCase();
      return (
        kodeClean.includes(qClean) ||
        idClean.includes(qClean) ||
        (b.kode_batch || '').toLowerCase().includes(qRaw) ||
        (b.batch_id || '').toLowerCase().includes(qRaw) ||
        buyer.includes(qRaw)
      );
    }).slice(0, 12);
  }, [availableBatches, scanBatchId]);

  const handleSelectSuggestedBatch = (batchId: string) => {
    const matched = activeBatchSampleList.find(
      (b) => b.batch_id === batchId || 
             b.kode_batch === batchId ||
             b.batch_id.toLowerCase() === batchId.toLowerCase() ||
             b.kode_batch.toLowerCase() === batchId.toLowerCase()
    );
    if (matched) {
      setScanBatchId(matched.kode_batch);
    }
    setIsBatchDropdownOpen(false);
    handleSelectBatchForShipment(batchId);
  };

  const handleCommitBatchSearch = () => {
    const qRaw = scanBatchId.trim();
    if (!qRaw) return;
    const qClean = qRaw.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Exact match on kode_batch or batch_id within availableBatches
    const exactMatch = availableBatches.find(
      (b) => (b.kode_batch || '').toLowerCase().replace(/[^a-z0-9]/g, '') === qClean ||
             (b.batch_id || '').toLowerCase().replace(/[^a-z0-9]/g, '') === qClean
    );
    if (exactMatch) {
      handleSelectSuggestedBatch(exactMatch.batch_id);
      return;
    }

    // 2. First suggestion in availableBatches
    if (batchSuggestions.length > 0) {
      const chosen = batchSuggestions[highlightedBatchIndex] || batchSuggestions[0];
      handleSelectSuggestedBatch(chosen.batch_id);
      return;
    }

    // 3. Partial match in availableBatches
    const partialMatch = availableBatches.find(
      (b) => (b.kode_batch || '').toLowerCase().includes(qRaw.toLowerCase()) ||
             (b.batch_id || '').toLowerCase().includes(qRaw.toLowerCase()) ||
             (b.tujuan_buyer || '').toLowerCase().includes(qRaw.toLowerCase())
    );
    if (partialMatch) {
      handleSelectSuggestedBatch(partialMatch.batch_id);
      return;
    }

    // 4. Check if it exists in activeBatchSampleList to give precise feedback why it's not available
    const anyMatch = activeBatchSampleList.find(
      (b) => (b.kode_batch || '').toLowerCase().replace(/[^a-z0-9]/g, '') === qClean ||
             (b.batch_id || '').toLowerCase().replace(/[^a-z0-9]/g, '') === qClean ||
             (b.kode_batch || '').toLowerCase().includes(qRaw.toLowerCase()) ||
             (b.batch_id || '').toLowerCase().includes(qRaw.toLowerCase())
    );

    if (anyMatch) {
      const statusInfo = getBatchShipmentStatus(anyMatch);
      if (statusInfo.isAlreadyShipped) {
        const sjStr = statusInfo.linkedShipments.map(s => s.no_surat_jalan).join(', ') || 'DO Selesai';
        setScanAlert({
          type: 'error',
          message: `Batch "${anyMatch.kode_batch}" SUDAH SELESAI DIKIRIM (${sjStr}) dan tidak dapat dipilih kembali untuk pengiriman reguler.`,
        });
        return;
      }
      if (statusInfo.isCurrentlyShipping) {
        setScanAlert({
          type: 'error',
          message: `Batch "${anyMatch.kode_batch}" SEDANG DALAM PENGIRIMAN (Status: Sedang Berangkat/Dalam Perjalanan) dan tidak dapat dibuatkan DO baru.`,
        });
        return;
      }
      if (statusInfo.isPendingSampleEvaluation) {
        setScanAlert({
          type: 'warning',
          message: `Batch "${anyMatch.kode_batch}" masih dalam proses pengujian sample / lab QC buyer. Tunggu hasil sortir/approval sebelum membuat DO reguler.`,
        });
        return;
      }
    }

    setScanAlert({
      type: 'error',
      message: `Batch "${qRaw}" tidak ditemukan atau tidak tersedia untuk pengiriman reguler baru.`,
    });
  };

  // Handle passed selectedBatchId from SampleManagement navigation
  useEffect(() => {
    if (selectedBatchId) {
      handleSelectBatchForShipment(selectedBatchId);
      setViewMode('create');
    }
  }, [selectedBatchId]);

  // Select a batch sample: automatically load items to table with editable status & prices
  const handleSelectBatchForShipment = (batchId: string) => {
    const targetBatch = activeBatchSampleList.find(
      (b) => b.batch_id === batchId || 
             b.kode_batch === batchId ||
             b.batch_id.toLowerCase() === batchId.toLowerCase() ||
             b.kode_batch.toLowerCase() === batchId.toLowerCase()
    );
    if (!targetBatch) return;

    setSelectedBatchSampleId(targetBatch.batch_id);
    setScanBatchId(targetBatch.kode_batch);
    setSourceMode('sample_batch');
    setTujuanBuyer(targetBatch.tujuan_buyer || '');
    setNoKontrak(`PO-${targetBatch.kode_batch}`);

    const items = targetBatch.items || [];
    const initialIncluded: string[] = [];
    const initialHarga: Record<string, number> = {};
    const initialKode: Record<string, string> = {};

    items.forEach((it) => {
      // By default, include all items that are not rejected and not already shipped
      if (it.status_item !== 'ditolak' && !it.sudah_dikirim_do) {
        initialIncluded.push(it.barang_id);
      }
      const balObj = barangList.find((b) => b.barang_id === it.barang_id);
      const agreedPrice = it.harga_deal_kg || it.harga_tawaran_kg || 0;
      initialHarga[it.barang_id] = agreedPrice;
      if (it.kode_harga_jual) {
        initialKode[it.barang_id] = it.kode_harga_jual;
      } else {
        const match = activeHargaJualList.find((h) => h.harga_jual === agreedPrice);
        if (match) {
          initialKode[it.barang_id] = match.kode;
        }
      }
    });

    // Fallback: if initialIncluded is empty but there are unsent non-rejected items, include them
    if (initialIncluded.length === 0 && items.some((it) => it.status_item !== 'ditolak' && !it.sudah_dikirim_do)) {
      items.forEach((it) => {
        if (it.status_item !== 'ditolak' && !it.sudah_dikirim_do) initialIncluded.push(it.barang_id);
      });
    }

    // Default: statusnya TIDAK DICENTANG DULU sesuai permintaan user
    // Centang jika sudah di-scan barcode atau dimasukkan ID-nya secara manual oleh petugas pengiriman
    setSelectedBalIds([]);
    setCustomKodeHargaMap(initialKode);

    // Cek apakah Batch ini sudah dalam status pengiriman (Peringatan Pengiriman Ganda / Double Shipment)
    const batchShipments = pengirimanList.filter(
      (p) =>
        p.status !== 'batal' &&
        (p.batch_sample_id_ref === targetBatch.batch_id ||
         p.batch_sample_id_ref === targetBatch.kode_batch ||
         p.batch_sample_id_ref?.toLowerCase() === targetBatch.batch_id.toLowerCase() ||
         p.batch_sample_id_ref?.toLowerCase() === targetBatch.kode_batch.toLowerCase())
    );
    const alreadyShipped = batchShipments.length > 0 || targetBatch.status === 'selesai' || (items.length > 0 && items.every((it) => it.sudah_dikirim_do || it.status_item === 'ditolak') && items.some(it => it.sudah_dikirim_do));

    if (alreadyShipped) {
      const sjListStr = batchShipments.map((s) => s.no_surat_jalan).join(', ') || 'DO Selesai';
      setScanAlert({
        type: 'error',
        message: `⚠️ PERINGATAN PENGIRIMAN GANDA: Batch ${targetBatch.kode_batch} SUDAH DALAM STATUS PENGIRIMAN (${sjListStr})! Surat Jalan telah diterbitkan sebelumnya. Harap periksa kembali untuk menghindari pengiriman ganda.`,
      });
    } else if (items.length === 0) {
      setScanAlert({
        type: 'warning',
        message: `Batch ${targetBatch.kode_batch} dipilih, namun belum ada bal yang terdaftar di dalamnya.`,
      });
    } else if (initialIncluded.length === 0) {
      setScanAlert({
        type: 'warning',
        message: `Semua bal pada Batch ${targetBatch.kode_batch} sudah terbit surat jalan (DO) sebelumnya.`,
      });
    } else {
      setScanAlert({
        type: 'success',
        message: `Batch ${targetBatch.kode_batch} (${targetBatch.tujuan_buyer}) aktif: ${initialIncluded.length} bal siap dimuat.`,
      });
    }
  };

  // Update Kode Harga Jual for a specific Bal row
  const handleUpdateBalKodeHarga = (barangId: string, kode: string) => {
    setCustomKodeHargaMap((prev) => ({ ...prev, [barangId]: kode }));
    const foundMaster = activeHargaJualList.find((h) => h.kode.toLowerCase() === kode.toLowerCase());
    if (foundMaster) {
      // price updated
    }
  };

  
  // Apply bulk price code to all currently selected bales
  const handleApplyBulkKodeHarga = () => {
    if (!bulkKodeHarga) return;
    const foundMaster = activeHargaJualList.find((h) => h.kode === bulkKodeHarga);
    if (!foundMaster) return;

    const newKodeMap = { ...customKodeHargaMap };
    selectedBalIds.forEach((id) => {
      newKodeMap[id] = foundMaster.kode;
    });
    setCustomKodeHargaMap(newKodeMap);
    
    setScanAlert({
      type: 'success',
      message: `Kode harga ${foundMaster.kode} (${formatRupiah(foundMaster.harga_jual)}/kg) diterapkan ke ${selectedBalIds.length} bal yang dipilih!`,
    });
  };

  // Toggle selection for a bal (jadi dikirim atau tidak)
  const handleToggleSelectBal = (id: string) => {
    setSelectedBalIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Remove a bal from current shipment
  const handleRemoveBal = (barangId: string) => {
    const balObj = barangList.find((b) => b.barang_id === barangId);
    setSelectedBalIds((prev) => prev.filter((id) => id !== barangId));
    setRegulerManifestBalIds((prev) => prev.filter((id) => id !== barangId));
    setScanAlert({
      type: 'warning',
      message: `Bal #${balObj?.no_bal || barangId} dikeluarkan dari muatan surat jalan.`,
    });
  };

  // Hardware/Manual Barcode Scanner Handler
  const handleProcessScan = (scannedCode: string) => {
    const trimmed = scannedCode.trim();
    if (!trimmed) return;

    // 1. Cek apakah yang di-scan atau diketik adalah Kode Batch / Batch ID
    const matchedBatch = activeBatchSampleList.find(
      (b) =>
        (b.kode_batch || '').toLowerCase() === trimmed.toLowerCase() ||
        (b.batch_id || '').toLowerCase() === trimmed.toLowerCase()
    );
    if (matchedBatch) {
      const statusInfo = getBatchShipmentStatus(matchedBatch);
      if (statusInfo.isAlreadyShipped) {
        const sjListStr = statusInfo.linkedShipments.map((s) => s.no_surat_jalan).join(', ') || 'DO Selesai';
        setScanAlert({
          type: 'error',
          message: `⚠️ BATCH SUDAH DIKIRIM: Batch ${matchedBatch.kode_batch} sudah selesai dikirim (${sjListStr}) dan tidak dapat dipilih untuk pengiriman reguler baru.`,
        });
        setScanInputText('');
        return;
      }
      if (statusInfo.isCurrentlyShipping) {
        setScanAlert({
          type: 'error',
          message: `⚠️ BATCH SEDANG DIKIRIM: Batch ${matchedBatch.kode_batch} sedang dalam proses perjalanan logistik ekspedisi. Tidak dapat dibuatkan DO baru.`,
        });
        setScanInputText('');
        return;
      }
      if (statusInfo.isPendingSampleEvaluation) {
        setScanAlert({
          type: 'warning',
          message: `Batch ${matchedBatch.kode_batch} masih dalam tahap pengujian sample / QC buyer. Belum siap untuk pembuatan DO reguler.`,
        });
        setScanInputText('');
        return;
      }

      handleSelectSuggestedBatch(matchedBatch.batch_id);
      setScanAlert({
        type: 'success',
        message: `Batch ${matchedBatch.kode_batch} dipilih.`,
      });
      setScanInputText('');
      return;
    }

    // 2. Cari Bal berdasarkan no_bal atau barang_id
    const targetBal = barangList.find(
      (b) =>
        (b.no_bal || '').toLowerCase() === trimmed.toLowerCase() ||
        (b.barang_id || '').toLowerCase() === trimmed.toLowerCase()
    );

    if (!targetBal) {
      setScanAlert({
        type: 'error',
        message: `BAL TIDAK DITEMUKAN: Kode "${trimmed}" tidak terdaftar di database gudang!`,
      });
      setScanInputText('');
      return;
    }

    // If in sample batch mode: check if bal is part of this batch
    if (sourceMode === 'sample_batch') {
      const activeBatch = activeBatchSampleList.find((b) => b.batch_id === selectedBatchSampleId);
      const batchItem = (activeBatch?.items || []).find((it) => it.barang_id === targetBal.barang_id);

      if (!batchItem) {
        setScanAlert({
          type: 'error',
          message: `PERINGATAN: Bal #${targetBal.no_bal || targetBal.barang_id} (${targetBal.kode_grade}) BUKAN bal dari Batch Sample ${activeBatch?.kode_batch || ''}!`,
        });
        setScanInputText('');
        return;
      }

      if (batchItem.status_item === 'ditolak') {
        setScanAlert({
          type: 'error',
          message: `PERINGATAN: Bal #${targetBal.no_bal || targetBal.barang_id} berstatus DITOLAK pembeli, tidak dapat dikirim!`,
        });
        setScanInputText('');
        return;
      }

      if (batchItem.sudah_dikirim_do) {
        setScanAlert({
          type: 'error',
          message: `PERINGATAN: Bal #${targetBal.no_bal || targetBal.barang_id} SUDAH PERNAH DIKIRIM (DO Selesai)! Hindari pengiriman ganda.`,
        });
        setScanInputText('');
        return;
      }

      if (selectedBalIds.includes(targetBal.barang_id)) {
        setScanAlert({
          type: 'warning',
          message: `Bal #${targetBal.no_bal || targetBal.barang_id} (${targetBal.kode_grade}) sudah dicentang siap kirim.`,
        });
      } else {
        setSelectedBalIds((prev) => [...prev, targetBal.barang_id]);
        setScanAlert({
          type: 'success',
          message: `✓ Bal #${targetBal.no_bal || targetBal.barang_id} (${targetBal.kode_grade} - ${formatNumber(targetBal.berat_kg, 1)}kg) berhasil di-scan & dicentang siap kirim!`,
        });
      }
      setScanInputText('');
    } else {
      // In regular mode
      if (targetBal.status_stok === 'keluar') {
        setScanAlert({
          type: 'error',
          message: `PERINGATAN: Bal #${targetBal.no_bal || targetBal.barang_id} sudah berstatus KELUAR / telah dikirim sebelumnya!`,
        });
        setScanInputText('');
        return;
      }

      setRegulerManifestBalIds((prev) => prev.includes(targetBal.barang_id) ? prev : [...prev, targetBal.barang_id]);

      if (selectedBalIds.includes(targetBal.barang_id)) {
        setScanAlert({
          type: 'warning',
          message: `Bal #${targetBal.no_bal || targetBal.barang_id} sudah dicentang dalam tabel muatan.`,
        });
      } else {
        setSelectedBalIds((prev) => [...prev, targetBal.barang_id]);
        setScanAlert({
          type: 'success',
          message: `✓ Bal #${targetBal.no_bal || targetBal.barang_id} (${targetBal.kode_grade} - ${formatNumber(targetBal.berat_kg, 1)}kg) berhasil di-scan & dicentang siap kirim!`,
        });
      }
      setScanInputText('');
    }

    setTimeout(() => scannerInputRef.current?.focus(), 100);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        scanDropdownRef.current &&
        !scanDropdownRef.current.contains(e.target as Node) &&
        scannerInputRef.current &&
        !scannerInputRef.current.contains(e.target as Node)
      ) {
        setIsScanDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Barcode Scanner Listener
  useBarcodeScanner((scanned) => {
    if (viewMode === 'create') {
      handleProcessScan(scanned);
    }
  });

  // Available bal in warehouse (status_stok === 'di_gudang' or 'terkirim_sample')
  const availableBalList = useMemo(() => {
    return barangList.filter((b) => b.status_stok === 'di_gudang' || b.status_stok === 'terkirim_sample');
  }, [barangList]);

  // Filtered bal for the warehouse selection modal
  const modalFilteredBalList = useMemo(() => {
    return availableBalList.filter((b) => {
      if (stokModalGrade !== 'all' && b.kode_grade !== stokModalGrade) return false;
      if (stokModalSearch.trim()) {
        const q = stokModalSearch.toLowerCase().trim();
        const noBal = (b.no_bal || '').toLowerCase();
        const bId = (b.barang_id || '').toLowerCase();
        const pet = (b.nama_petani || '').toLowerCase();
        const gud = (b.lokasi_gudang || '').toLowerCase();
        return noBal.includes(q) || bId.includes(q) || pet.includes(q) || gud.includes(q);
      }
      return true;
    });
  }, [availableBalList, stokModalGrade, stokModalSearch]);

  const handleConfirmStokModal = () => {
    if (stokModalSelectedIds.length === 0) return;
    setRegulerManifestBalIds((prev) => {
      const next = [...prev];
      stokModalSelectedIds.forEach((id) => {
        if (!next.includes(id)) next.push(id);
      });
      return next;
    });

    setScanAlert({
      type: 'success',
      message: `${stokModalSelectedIds.length} bal berhasil dimasukkan ke daftar muatan.`,
    });

    setIsStokModalOpen(false);
    setStokModalSelectedIds([]);
  };

  // Filtered bal for selection in regular mode
  const filteredBalForShipment = useMemo(() => {
    return availableBalList.filter((b) => {
      if (filterGrade !== 'all' && b.kode_grade !== filterGrade) return false;
      if (filterGudang !== 'all') {
        const matchGudang =
          (b.gudang_id && b.gudang_id === filterGudang) ||
          b.lokasi_gudang.toLowerCase().includes(filterGudang.toLowerCase());
        if (!matchGudang) return false;
      }
      if (filterPetani !== 'all') {
        const matchPetani =
          (b.petani_id && b.petani_id === filterPetani) ||
          (b.nama_petani && b.nama_petani.toLowerCase() === filterPetani.toLowerCase());
        if (!matchPetani) return false;
      }
      if (filterSearchBal.trim()) {
        const q = filterSearchBal.toLowerCase().trim();
        const matchNoBal = (b.no_bal || '').toLowerCase().includes(q);
        const matchId = (b.barang_id || '').toLowerCase().includes(q);
        const matchPetaniName = (b.nama_petani || '').toLowerCase().includes(q);
        return matchNoBal || matchId || matchPetaniName;
      }
      return true;
    });
  }, [availableBalList, filterGrade, filterGudang, filterPetani, filterSearchBal]);

  // Active batch object
  const activeBatchObj = useMemo(() => {
    return activeBatchSampleList.find(
      (b) => b.batch_id === selectedBatchSampleId || 
             b.kode_batch === selectedBatchSampleId ||
             b.batch_id.toLowerCase() === (selectedBatchSampleId || '').toLowerCase() ||
             b.kode_batch.toLowerCase() === (selectedBatchSampleId || '').toLowerCase()
    );
  }, [activeBatchSampleList, selectedBatchSampleId]);

  // Compute bal suggestions for shipment scan input (e.g. typing "A00", "BAL", etc.)
  const scanBalSuggestions = useMemo(() => {
    const q = scanInputText.trim().toLowerCase();
    if (!q) return [];

    const qClean = q.replace(/[^a-zA-Z0-9]/g, '');

    // If in sample batch mode, suggest from the active batch's items first
    let pool: Barang[] = [];
    if (sourceMode === 'sample_batch' && activeBatchObj?.items) {
      const batchItemBarangIds = activeBatchObj.items.map((it) => it.barang_id);
      pool = barangList.filter((b) => batchItemBarangIds.includes(b.barang_id));
    } else {
      pool = availableBalList.length > 0 ? availableBalList : barangList;
    }

    const matches = pool.filter((b) => {
      const noBal = (b.no_bal || '').toLowerCase();
      const bId = (b.barang_id || '').toLowerCase();
      const gr = (b.kode_grade || '').toLowerCase();
      const pet = (b.nama_petani || '').toLowerCase();
      const gName = (b.lokasi_gudang || '').toLowerCase();
      const noBalClean = noBal.replace(/[^a-zA-Z0-9]/g, '');

      return (
        noBal.includes(q) ||
        bId.includes(q) ||
        gr === q ||
        gr.startsWith(q) ||
        pet.includes(q) ||
        gName.includes(q) ||
        (qClean && noBalClean.includes(qClean))
      );
    });

    matches.sort((a, b) => {
      const aNo = (a.no_bal || '').toLowerCase();
      const bNo = (b.no_bal || '').toLowerCase();
      const aStarts = aNo.startsWith(q);
      const bStarts = bNo.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aNo.localeCompare(bNo, undefined, { numeric: true, sensitivity: 'base' });
    });

    return matches.slice(0, 20);
  }, [scanInputText, sourceMode, activeBatchObj, availableBalList, barangList]);

  // Select bal from suggestions
  const handleSelectSuggestedShipmentBal = (bal: Barang) => {
    if (sourceMode === 'sample_batch') {
      const activeBatch = activeBatchSampleList.find((b) => b.batch_id === selectedBatchSampleId);
      const batchItem = (activeBatch?.items || []).find((it) => it.barang_id === bal.barang_id);

      if (!batchItem) {
        setScanAlert({
          type: 'error',
          message: `PERINGATAN: Bal #${bal.no_bal || bal.barang_id} BUKAN bal dari Batch Sample ${activeBatch?.kode_batch || ''}!`,
        });
        setScanInputText('');
        setIsScanDropdownOpen(false);
        return;
      }

      if (batchItem.status_item === 'ditolak') {
        setScanAlert({
          type: 'error',
          message: `PERINGATAN: Bal #${bal.no_bal || bal.barang_id} berstatus DITOLAK pembeli, tidak dapat dikirim!`,
        });
        setScanInputText('');
        setIsScanDropdownOpen(false);
        return;
      }

      if (batchItem.sudah_dikirim_do) {
        setScanAlert({
          type: 'error',
          message: `PERINGATAN: Bal #${bal.no_bal || bal.barang_id} SUDAH PERNAH DIKIRIM (DO Selesai)! Hindari pengiriman ganda.`,
        });
        setScanInputText('');
        setIsScanDropdownOpen(false);
        return;
      }

      if (!selectedBalIds.includes(bal.barang_id)) {
        setSelectedBalIds((prev) => [...prev, bal.barang_id]);
      }

      setScanAlert({
        type: 'success',
        message: `✓ Bal #${bal.no_bal || bal.barang_id} (${bal.kode_grade} - ${formatNumber(bal.berat_kg, 1)}kg) berhasil dicentang siap kirim!`,
      });
      setScanInputText('');
      setIsScanDropdownOpen(false);
    } else {
      if (bal.status_stok === 'keluar') {
        setScanAlert({
          type: 'error',
          message: `PERINGATAN: Bal #${bal.no_bal || bal.barang_id} sudah berstatus KELUAR / telah dikirim!`,
        });
        setScanInputText('');
        setIsScanDropdownOpen(false);
        return;
      }

      setRegulerManifestBalIds((prev) => prev.includes(bal.barang_id) ? prev : [...prev, bal.barang_id]);

      if (selectedBalIds.includes(bal.barang_id)) {
        setScanAlert({
          type: 'warning',
          message: `Bal #${bal.no_bal || bal.barang_id} sudah dicentang dalam tabel muatan surat jalan.`,
        });
        setScanInputText('');
        setIsScanDropdownOpen(false);
        return;
      }

      setSelectedBalIds((prev) => [...prev, bal.barang_id]);
      setScanAlert({
        type: 'success',
        message: `✓ Bal #${bal.no_bal || bal.barang_id} (${bal.kode_grade} - ${formatNumber(bal.berat_kg, 1)}kg) berhasil dicentang ke muatan!`,
      });
      setScanInputText('');
      setIsScanDropdownOpen(false);
    }

    setHighlightedScanIndex(0);
    setTimeout(() => scannerInputRef.current?.focus(), 100);
  };

  // All Bal Objects loaded in Regular Manifest Table
  const regulerManifestObjects = useMemo(() => {
    return barangList.filter((b) => regulerManifestBalIds.includes(b.barang_id));
  }, [barangList, regulerManifestBalIds]);

  // Selected Bal Objects (Checked bales in shipment)
  const selectedBalObjects = useMemo(() => {
    if (sourceMode === 'sample_batch') {
      return barangList.filter((b) => selectedBalIds.includes(b.barang_id));
    } else {
      return barangList.filter((b) => regulerManifestBalIds.includes(b.barang_id) && selectedBalIds.includes(b.barang_id));
    }
  }, [sourceMode, barangList, selectedBalIds, regulerManifestBalIds]);

  const totalSelectedBal = selectedBalObjects.length;
  const totalSelectedBerat = selectedBalObjects.reduce((sum, b) => sum + (b.berat_kg || 0), 0);

  // Map of agreed prices from batch sample
  const hargaDealMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (activeBatchObj && activeBatchObj.items) {
      activeBatchObj.items.forEach((it) => {
        if (it.harga_deal_kg || it.harga_tawaran_kg) {
          map[it.barang_id] = it.harga_deal_kg || it.harga_tawaran_kg;
        }
      });
    }
    return map;
  }, [activeBatchObj]);

  
  // Calculate total transaction value of the shipment using customKodeHargaMap
  const totalNilaiSuratJalan = useMemo(() => {
    return selectedBalObjects.reduce((sum, b) => {
      let dealPrice = 0;
      const kode = customKodeHargaMap[b.barang_id];
      if (kode) {
        const master = activeHargaJualList.find(h => h.kode === kode);
        if (master) dealPrice = master.harga_jual;
      } else if (hargaDealMap[b.barang_id] !== undefined) {
        dealPrice = hargaDealMap[b.barang_id];
      }
      return sum + Math.round(b.berat_kg * dealPrice);
    }, 0);
  }, [selectedBalObjects, customKodeHargaMap, hargaDealMap, activeHargaJualList]);

  // Riwayat Pengiriman / Surat Jalan yang terkait dengan Batch yang sedang aktif
  const existingShipmentsForBatch = useMemo(() => {
    if (!selectedBatchSampleId || !activeBatchObj) return [];
    const targetId = selectedBatchSampleId.toLowerCase();
    const kode = (activeBatchObj.kode_batch || '').toLowerCase();
    const bId = (activeBatchObj.batch_id || '').toLowerCase();
    return pengirimanList.filter(
      (p) =>
        p.status !== 'batal' &&
        (p.batch_sample_id_ref?.toLowerCase() === targetId ||
         (kode && p.batch_sample_id_ref?.toLowerCase() === kode) ||
         (bId && p.batch_sample_id_ref?.toLowerCase() === bId))
    );
  }, [pengirimanList, selectedBatchSampleId, activeBatchObj]);

  // Cek apakah batch sudah pernah dikirim sebelumnya
  const isBatchAlreadyShipped = useMemo(() => {
    if (!activeBatchObj) return false;
    if (existingShipmentsForBatch.length > 0) return true;
    if (activeBatchObj.status === 'selesai') return true;
    const items = activeBatchObj.items || [];
    if (items.length > 0 && 
        items.every((it) => it.sudah_dikirim_do || it.status_item === 'ditolak') &&
        items.some((it) => it.sudah_dikirim_do)) return true;
    return false;
  }, [activeBatchObj, existingShipmentsForBatch]);

  // Bal pada batch yang valid untuk dikirim (bukan ditolak dan belum berstatus kirim)
  const eligibleBatchItems = useMemo(() => {
    if (!activeBatchObj?.items) return [];
    return activeBatchObj.items.filter((it) => it.status_item !== 'ditolak' && !it.sudah_dikirim_do);
  }, [activeBatchObj]);

  // Jumlah bal valid yang sudah dicentang
  const checkedEligibleCount = useMemo(() => {
    return eligibleBatchItems.filter((it) => selectedBalIds.includes(it.barang_id)).length;
  }, [eligibleBatchItems, selectedBalIds]);

  // Semua bal yang harus dikirim sudah dicentang
  const isAllEligibleChecked = useMemo(() => {
    return eligibleBatchItems.length > 0 && checkedEligibleCount === eligibleBatchItems.length;
  }, [eligibleBatchItems, checkedEligibleCount]);

  // Syarat tombol "Terbitkan Surat Jalan" bisa diklik:
  // Jika sample_batch: semua bal yang harus dikirim wajib dicentang (isAllEligibleChecked)
  // Jika gudang_reguler: minimal 1 bal dan semua bal dalam tabel muatan harus dicentang
  // Dan tujuan gudang / buyer wajib diisi
  const canSubmitShipment = useMemo(() => {
    if (!tujuanBuyer.trim()) return false;
    if (sourceMode === 'sample_batch') {
      return isAllEligibleChecked;
    } else {
      return regulerManifestBalIds.length > 0 && regulerManifestBalIds.every((id) => selectedBalIds.includes(id));
    }
  }, [sourceMode, isAllEligibleChecked, regulerManifestBalIds, selectedBalIds, tujuanBuyer]);


  // List View Filtering
  const filteredPengiriman = useMemo(() => {
    return pengirimanList.filter((krm) => {
      if (searchQuery.trim() === '') return true;
      const q = searchQuery.toLowerCase().trim();
      const matchNo = (krm.no_surat_jalan || '').toLowerCase().includes(q);
      const matchTujuan = (krm.tujuan || '').toLowerCase().includes(q);
      const matchDriver = (krm.driver_nama || '').toLowerCase().includes(q);
      const matchPlat = (krm.plat_nomor || '').toLowerCase().includes(q);
      const matchBatch = (krm.batch_sample_id_ref || '').toLowerCase().includes(q);
      return matchNo || matchTujuan || matchDriver || matchPlat || matchBatch;
    });
  }, [pengirimanList, searchQuery]);

  const paginatedPengiriman = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPengiriman.slice(start, start + itemsPerPage);
  }, [filteredPengiriman, currentPage, itemsPerPage]);

  const handleOpenCreatePage = () => {
    const nextSeq = pengirimanList.length + 1;
    setNoSuratJalan(generateNoSuratJalanSimple(nextSeq));
    setTanggalKirim(new Date().toISOString().split('T')[0]);
    setTujuanBuyer('');
    setSelectedBalIds([]);
    setRegulerManifestBalIds([]);
    setCustomKodeHargaMap({});
    setScanAlert(null);
    setFilterGrade('all');
    setFilterGudang('all');
    setFilterPetani('all');
    setFilterSearchBal('');
    setErrorMessage('');

    // Do not auto-populate batch code, leave blank initially
    setSelectedBatchSampleId('');
    setScanBatchId('');
    setSourceMode('sample_batch');

    setViewMode('create');
  };

  
  const handleSubmitShipment = () => {
    if (sourceMode === 'sample_batch') {
      if (!selectedBatchSampleId || !activeBatchObj) {
        setErrorMessage('Silakan cari dan pilih kode batch sample terlebih dahulu.');
        return;
      }
      if (isBatchAlreadyShipped && eligibleBatchItems.length === 0) {
        setErrorMessage(`PENGIRIMAN GANDA DIBLOKIR: Seluruh bal pada Batch ${activeBatchObj?.kode_batch} sudah pernah dikirimkan via Surat Jalan sebelumnya.`);
        return;
      }
      if (!isAllEligibleChecked) {
        setErrorMessage(`Belum semua bal dicentang / di-scan (${checkedEligibleCount}/${eligibleBatchItems.length} Bal). Seluruh bal yang dikeluarkan wajib di-scan atau dicentang terlebih dahulu oleh petugas pengiriman sebelum menerbitkan surat jalan.`);
        return;
      }
    } else {
      if (regulerManifestBalIds.length === 0) {
        setErrorMessage('Tabel muatan masih kosong. Silakan scan barcode atau masukkan bal tembakau yang akan dikirim.');
        return;
      }
      const uncheckedCount = regulerManifestBalIds.filter((id) => !selectedBalIds.includes(id)).length;
      if (uncheckedCount > 0) {
        setErrorMessage(`Belum semua bal dicentang / di-scan (${selectedBalObjects.length}/${regulerManifestBalIds.length} Bal). Masih ada ${uncheckedCount} bal dalam tabel muatan yang belum dicentang oleh petugas pengiriman.`);
        return;
      }
    }

    const finalTujuan = tujuanBuyer.trim();
    if (!finalTujuan) {
      setErrorMessage('Tujuan gudang / pabrik buyer wajib diisi.');
      return;
    }
    if (!driverNama.trim()) {
      setErrorMessage('Nama supir / driver wajib diisi.');
      return;
    }
    if (!platNomor.trim()) {
      setErrorMessage('Nomor polisi / plat kendaraan wajib diisi.');
      return;
    }

    setErrorMessage('');
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    const finalTujuan = tujuanBuyer.trim();
    if (!finalTujuan) return;

    // Group grades
    const gradesBreakdown: Record<string, { bal: number; kg: number }> = {};
    selectedBalObjects.forEach((b) => {
      if (!gradesBreakdown[b.kode_grade]) {
        gradesBreakdown[b.kode_grade] = { bal: 0, kg: 0 };
      }
      gradesBreakdown[b.kode_grade].bal += 1;
      gradesBreakdown[b.kode_grade].kg += b.berat_kg || 0;
    });

    
    const finalHargaDealMap: Record<string, number> = {};
    const finalKodeHargaMap: Record<string, string> = {};
    selectedBalIds.forEach((id) => {
      if (customKodeHargaMap[id]) {
        finalKodeHargaMap[id] = customKodeHargaMap[id];
        const master = activeHargaJualList.find(h => h.kode === customKodeHargaMap[id]);
        if (master) finalHargaDealMap[id] = master.harga_jual;
      } else if (hargaDealMap[id] !== undefined) {
        finalHargaDealMap[id] = hargaDealMap[id];
      }
    });


    const nextShipmentSeq = pengirimanList.length > 0
      ? Math.max(...pengirimanList.map(p => {
          const n = parseInt(p.pengiriman_id, 10);
          return isNaN(n) ? 0 : n;
        })) + 1
      : 1;

    const existingPengiriman = editingPengirimanId ? pengirimanList.find(p => p.pengiriman_id === editingPengirimanId) : null;

    const newPengiriman: PengirimanBarang = {
      pengiriman_id: editingPengirimanId || String(nextShipmentSeq),
      no_surat_jalan: noSuratJalan || generateNoSuratJalanSimple(nextShipmentSeq),
      tanggal_kirim: tanggalKirim,
      tujuan: finalTujuan,
      status: existingPengiriman ? existingPengiriman.status : 'dikirim',
      total_bal: totalSelectedBal,
      total_berat_kg: totalSelectedBerat,
      driver_nama: driverNama,
      plat_nomor: platNomor.toUpperCase(),
      nomor_kontrak: noKontrak,
      catatan: '',
      petugas: 'Petugas Ekspedisi PR. Sekar Maju Sejahtera',
      barang_ids: selectedBalIds,
      rincian_grade: gradesBreakdown,
      batch_sample_id_ref: sourceMode === 'sample_batch' ? selectedBatchSampleId : undefined,
      harga_deal_map: Object.keys(finalHargaDealMap).length > 0 ? finalHargaDealMap : undefined,
      kode_harga_jual_map: Object.keys(finalKodeHargaMap).length > 0 ? finalKodeHargaMap : undefined,
      total_nilai_deal: totalNilaiSuratJalan,
    };

    if (editingPengirimanId && onUpdatePengiriman) {
      onUpdatePengiriman(newPengiriman);
    } else {
      onSaveNewPengiriman(newPengiriman, selectedBalIds);
    }
    
    setEditingPengirimanId(null);
    setIsConfirmOpen(false);
    setTujuanBuyer('');
    setViewMode('list');
    setPrintingSuratJalan(newPengiriman);
  };

  return (
    <div className="space-y-4 font-sans text-gray-800">
      
      {/* ========================================================================= */}
      {/* 1. VIEW MODE: CREATE DELIVERY ORDER IN-PAGE                                */}
      {/* ========================================================================= */}
      {viewMode === 'create' && (
        <div className="space-y-4">
          
          {/* Header Bar */}
          <div className="bg-white p-4 sm:p-5 border border-gray-300 rounded-sm shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-sm bg-[#b81d24] text-white flex items-center justify-center shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  Buat Surat Jalan & Pengiriman Muatan (Delivery Order)
                </h1>
                
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Daftar</span>
              </button>
            </div>
          </div>

          {/* Source Mode Toggle Banner */}
          <div className="bg-white p-4 border border-gray-300 rounded-sm shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
              <div className="font-bold text-xs text-gray-900 flex items-center space-x-2">
                <span>Pilih Sumber Pengiriman Bal:</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSourceMode('sample_batch');
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xs transition flex items-center space-x-1.5 cursor-pointer ${
                    sourceMode === 'sample_batch'
                      ? 'bg-[#b81d24] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Tarik dari Batch Sample ({availableBatches.length} Batch Tersedia)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSourceMode('gudang_reguler');
                    setSelectedBatchSampleId('');
                    setSelectedBalIds([]);
                    setRegulerManifestBalIds([]);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xs transition flex items-center space-x-1.5 cursor-pointer ${
                    sourceMode === 'gudang_reguler'
                      ? 'bg-[#b81d24] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Pilih Bebas dari Stok Gudang (Reguler)</span>
                </button>
              </div>
            </div>

            {/* Batch Sample Selector Dropdown */}
            {sourceMode === 'sample_batch' && (
              <div className="bg-slate-50 border border-slate-300 p-3 rounded-xs space-y-2">
                {availableBatches.length === 0 ? (
                  <div className="p-3 bg-slate-100 border border-slate-300 rounded-xs text-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>Tidak Ada Batch Sample Siap Kirim (0 Batch Tersedia)</span>
                      </div>
                      <p className="text-slate-600 text-[11px]">
                        Semua batch sample saat ini berstatus <strong>Sedang Dikirim / Dalam Perjalanan</strong> atau <strong>Sudah Selesai Dikirim (DO Terbit)</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSourceMode('gudang_reguler');
                        setSelectedBatchSampleId('');
                        setSelectedBalIds([]);
                        setRegulerManifestBalIds([]);
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#b81d24] rounded-xs whitespace-nowrap cursor-pointer shadow-xs transition"
                    >
                      Pilih Bebas dari Stok Gudang →
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Pilih Batch Sample Siap Kirim (Evaluasi Selesai / Disetujui):
                      </label>
                      <div className="relative">
                        <div className="flex items-stretch gap-2">
                          <div className="relative flex-1">
                            <div className="flex items-center absolute left-3 top-2.5 text-slate-400 pointer-events-none">
                              <Search className="w-3.5 h-3.5" />
                            </div>
                            <input
                              ref={inputBatchRef}
                              type="text"
                              placeholder="Ketik kode batch siap kirim..."
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
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (batchSuggestions.length > 0) {
                                    setIsBatchDropdownOpen(true);
                                    setHighlightedBatchIndex((prev) => Math.min(prev + 1, batchSuggestions.length - 1));
                                  }
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (batchSuggestions.length > 0) {
                                    setIsBatchDropdownOpen(true);
                                    setHighlightedBatchIndex((prev) => Math.max(prev - 1, 0));
                                  }
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleCommitBatchSearch();
                                } else if (e.key === 'Escape') {
                                  setIsBatchDropdownOpen(false);
                                }
                              }}
                              className="w-full pl-8 pr-8 py-2 text-xs font-mono font-bold bg-white border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xs text-gray-900 placeholder-gray-400 uppercase shadow-2xs"
                            />
                            {scanBatchId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setScanBatchId('');
                                  setIsBatchDropdownOpen(false);
                                  inputBatchRef.current?.focus();
                                }}
                                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer text-xs"
                                title="Bersihkan input"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleCommitBatchSearch}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#b81d24] rounded-xs flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap transition"
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>Pilih Batch</span>
                          </button>
                        </div>
                        
                        {/* Dropdown Autocomplete Batch */}
                        {isBatchDropdownOpen && (
                          <div
                            ref={batchDropdownRef}
                            className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-300 rounded-sm shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100"
                          >
                            {batchSuggestions.length > 0 ? (
                              batchSuggestions.map((b, idx) => {
                                const isHighlighted = idx === highlightedBatchIndex;
                                const items = b.items || [];
                                const accCount = items.filter((it) => it.status_item === 'disetujui' && !it.sudah_dikirim_do).length;
                                const isSelected = selectedBatchSampleId === b.batch_id || selectedBatchSampleId === b.kode_batch;
                                
                                return (
                                  <button
                                    key={b.batch_id}
                                    type="button"
                                    onClick={() => {
                                      handleSelectSuggestedBatch(b.batch_id);
                                      setScanBatchId(b.kode_batch);
                                    }}
                                    onMouseEnter={() => setHighlightedBatchIndex(idx)}
                                    className={`w-full px-3 py-2 text-left flex flex-col gap-1 transition cursor-pointer ${
                                      isSelected
                                        ? 'bg-slate-100 text-slate-950 border-l-4 border-slate-800'
                                        : isHighlighted
                                        ? 'bg-slate-50 text-slate-950 border-l-4 border-slate-500'
                                        : 'hover:bg-gray-50 text-gray-800 border-l-4 border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-mono font-bold text-xs text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded-xs">
                                          {b.kode_batch}
                                        </span>
                                        <span className="font-bold text-xs text-gray-900">{b.tujuan_buyer}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-xs ${
                                          b.status === 'selesai_deal'
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : b.status === 'deal_sebagian'
                                            ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                                        }`}>
                                          {b.status === 'selesai_deal'
                                            ? 'ACC Semua'
                                            : b.status === 'deal_sebagian'
                                            ? 'ACC Sebagian'
                                            : 'Siap Kirim'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-gray-500 flex items-center gap-2">
                                      <span className="font-medium">Total: {items.length} Bal</span>
                                      {accCount > 0 ? (
                                        <span className="text-emerald-700 font-bold">Di-ACC: {accCount} Bal</span>
                                      ) : (
                                        <span className="text-rose-700 font-medium">Siap Muat: {items.length} Bal</span>
                                      )}
                                      <span className="text-gray-300">|</span>
                                      <span>Tgl Kirim: {b.tanggal_kirim}</span>
                                      {b.total_nilai_deal ? (
                                        <>
                                          <span className="text-gray-300">|</span>
                                          <span className="font-semibold text-emerald-800">Deal: {formatRupiah(b.total_nilai_deal)}</span>
                                        </>
                                      ) : null}
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="p-4 text-xs text-gray-500 text-center space-y-1">
                                <div>Tidak ada batch siap kirim yang cocok dengan "<strong>{scanBatchId}</strong>"</div>
                                <div className="text-[11px] text-gray-400">Batch yang sedang dikirim atau sudah selesai dikirim disembunyikan.</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {activeBatchObj && (
                      <div className="text-right text-xs bg-white px-3 py-2 border border-slate-300 rounded-xs shadow-2xs">
                        <div className="font-bold text-gray-900">{activeBatchObj.tujuan_buyer}</div>
                        <div className="text-[11px] text-gray-600">
                          Kode: <span className="font-mono font-bold text-slate-900">{activeBatchObj.kode_batch}</span>
                        </div>
                        {activeBatchObj.total_nilai_deal ? (
                          <div className="text-[11px] text-emerald-700 font-semibold font-mono mt-0.5">
                            Deal Disepakati: {formatRupiah(activeBatchObj.total_nilai_deal)}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {/* Banner Peringatan Pengiriman Ganda (Double Shipment) */}
                {isBatchAlreadyShipped && (
                  <div className="p-3 bg-red-50 border-2 border-red-400 rounded-xs flex items-start space-x-2.5 text-red-900 shadow-xs">
                    <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-sm text-red-700 flex items-center space-x-1.5">
                        <span>⚠️ PERINGATAN: BATCH INI SUDAH DALAM STATUS PENGIRIMAN!</span>
                      </div>
                      <p className="text-red-800">
                        Batch <strong>{activeBatchObj?.kode_batch}</strong> tercatat sudah memiliki riwayat Surat Jalan aktif sebelumnya
                        {existingShipmentsForBatch.length > 0 ? (
                          <span className="font-semibold font-mono ml-1">
                            ({existingShipmentsForBatch.map(s => `${s.no_surat_jalan} tgl ${s.tanggal_kirim}`).join(', ')})
                          </span>
                        ) : (
                          <span className="font-semibold ml-1">(Status: Selesai)</span>
                        )}
                        . Harap pastikan kembali ke pihak gudang/logistik agar <strong>tidak terjadi pengiriman ganda (double shipment)</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {activeBatchObj?.permintaan_buyer && (
                  <div className="text-[11px] text-slate-700 bg-white p-2 rounded-xs border border-slate-200">
                    <strong>Catatan Permintaan Buyer:</strong> {activeBatchObj.permintaan_buyer}
                  </div>
                )}

                {/* Quick Bal list badges */}
                {activeBatchObj && (
                  <div className="pt-1">
                    <div className="text-[11px] font-bold text-slate-900 mb-1 flex items-center justify-between">
                      <span>
                        Daftar Bal pada Batch {activeBatchObj.kode_batch} (
                        {(activeBatchObj.items || []).filter(it => it.status_item !== 'ditolak' && !it.sudah_dikirim_do).length} Bal Siap Dimuat):
                      </span>
                      <span className="text-[10px] text-gray-500 font-normal">
                        *Klik atau scan bal untuk menandai dicentang siap kirim
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(activeBatchObj.items || [])
                        .filter((it) => it.status_item !== 'ditolak' && !it.sudah_dikirim_do)
                        .map((it) => {
                          const isLoaded = selectedBalIds.includes(it.barang_id);
                          const isApproved = it.status_item === 'disetujui';
                          return (
                            <button
                              key={it.barang_id}
                              type="button"
                              onClick={() => handleProcessScan(it.no_bal || it.barang_id)}
                              className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-xs border transition flex items-center space-x-1 cursor-pointer ${
                                isLoaded
                                  ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-2xs'
                                  : isApproved
                                  ? 'bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-50'
                                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                              }`}
                              title={isLoaded ? 'Sudah dimuat ke DO (Klik untuk hapus)' : 'Klik untuk muat ke DO'}
                            >
                              {isLoaded && <Check className="w-3 h-3 text-emerald-700" />}
                              <span>{it.no_bal || it.barang_id}</span>
                              <span className="text-[10px] text-gray-500">({it.kode_grade})</span>
                              {isApproved && (
                                <span className="text-[9px] bg-emerald-700 text-white px-1 rounded-xs">ACC</span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Metadata Section */}
          <div className="bg-white p-4 sm:p-5 border border-gray-300 rounded-sm shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-gray-700" />
              <span>Informasi Surat Jalan (Delivery Order)</span>
            </h3>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-300 text-xs text-red-800 rounded-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              
              {/* No Surat Jalan */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-700">No. Surat Jalan (DO):</label>
                <input
                  type="text"
                  value={noSuratJalan}
                  onChange={(e) => setNoSuratJalan(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-xs font-mono font-bold text-gray-900"
                />
              </div>

              {/* Tanggal Kirim */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-700">Tanggal Pengiriman:</label>
                <input
                  type="date"
                  value={tanggalKirim}
                  onChange={(e) => setTanggalKirim(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xs"
                />
              </div>

              {/* Tujuan Pabrik / Gudang */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-700">
                  Tujuan Gudang / Pabrik Buyer: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ketik tujuan gudang / pabrik buyer..."
                  value={tujuanBuyer}
                  onChange={(e) => setTujuanBuyer(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xs text-xs text-gray-900 focus:outline-none focus:border-gray-800"
                />
                {!tujuanBuyer.trim() && (
                  <p className="text-[10px] text-red-600 font-medium">
                    * Wajib diisi, ketik tujuan gudang secara manual (bukan dropdown).
                  </p>
                )}
              </div>

              

              {/* Nama Supir */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-700">Nama Supir / Driver Ekspedisi:</label>
                <input
                  type="text"
                  value={driverNama}
                  onChange={(e) => setDriverNama(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xs"
                />
              </div>

              {/* Plat Nomor */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-700">Nomor Polisi Truk (Nopol):</label>
                <input
                  type="text"
                  value={platNomor}
                  onChange={(e) => setPlatNomor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xs font-mono uppercase font-bold"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SCAN & VERIFIKASI MUATAN FISIK (WAJIB SAMA PERSIS DENGAN LIST ACC)         */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 sm:p-5 border border-gray-300 rounded-sm shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
                  <Barcode className="w-4 h-4 text-[#b81d24]" />
                  <span>Scan Barcode / Input ID Bal Tembakau yang Dikeluarkan</span>
                </h3>
              </div>

              {/* Progress Tracker */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-[11px] font-bold text-gray-700">
                    Status Bal Siap Muat:
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-700">
                    {sourceMode === 'sample_batch'
                      ? `${checkedEligibleCount} / ${eligibleBatchItems.length} Bal Dicentang (${eligibleBatchItems.length > 0 ? Math.round((checkedEligibleCount / eligibleBatchItems.length) * 100) : 0}%)`
                      : `${selectedBalObjects.length} / ${regulerManifestBalIds.length} Bal Dicentang (${regulerManifestBalIds.length > 0 ? Math.round((selectedBalObjects.length / regulerManifestBalIds.length) * 100) : 0}%)`}
                  </div>
                </div>
              </div>
            </div>

            {/* Scanner Input & Action Bar with Autocomplete Dropdown */}
            <div className="bg-gray-50 p-3.5 border border-gray-300 rounded-xs space-y-3">
              <div className="relative">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      ref={scannerInputRef}
                      type="text"
                      placeholder="Scan Barcode / ketik No Bal / ID Batch..."
                      value={scanInputText}
                      onChange={(e) => {
                        setScanInputText(e.target.value);
                        setIsScanDropdownOpen(true);
                        setHighlightedScanIndex(0);
                      }}
                      onFocus={() => {
                        if (scanInputText.trim().length > 0) {
                          setIsScanDropdownOpen(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          if (scanBalSuggestions.length > 0) {
                            setIsScanDropdownOpen(true);
                            setHighlightedScanIndex((prev) => (prev + 1) % scanBalSuggestions.length);
                          }
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (scanBalSuggestions.length > 0) {
                            setIsScanDropdownOpen(true);
                            setHighlightedScanIndex((prev) => (prev - 1 + scanBalSuggestions.length) % scanBalSuggestions.length);
                          }
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (isScanDropdownOpen && scanBalSuggestions.length > 0 && highlightedScanIndex >= 0 && highlightedScanIndex < scanBalSuggestions.length) {
                            handleSelectSuggestedShipmentBal(scanBalSuggestions[highlightedScanIndex]);
                          } else {
                            handleProcessScan(scanInputText);
                          }
                        } else if (e.key === 'Escape') {
                          setIsScanDropdownOpen(false);
                        }
                      }}
                      className="w-full pl-9 pr-8 py-2 text-xs font-mono bg-white border-2 border-gray-400 focus:border-[#b81d24] focus:ring-0 rounded-xs text-gray-900 font-bold"
                    />
                    {scanInputText && (
                      <button
                        type="button"
                        onClick={() => {
                          setScanInputText('');
                          setIsScanDropdownOpen(false);
                          scannerInputRef.current?.focus();
                        }}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isScanDropdownOpen && scanBalSuggestions.length > 0 && highlightedScanIndex >= 0 && highlightedScanIndex < scanBalSuggestions.length) {
                        handleSelectSuggestedShipmentBal(scanBalSuggestions[highlightedScanIndex]);
                      } else {
                        handleProcessScan(scanInputText);
                      }
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-xs flex items-center justify-center space-x-1 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Scan / Input Bal</span>
                  </button>
                </div>

                {/* Autocomplete Suggestions Dropdown Menu */}
                {isScanDropdownOpen && scanInputText.trim().length > 0 && (
                  <div
                    ref={scanDropdownRef}
                    className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-300 rounded-sm shadow-xl max-h-72 overflow-y-auto divide-y divide-gray-100"
                  >
                    <div className="px-3 py-1.5 bg-gray-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between border-b border-gray-200">
                      <span>Rekomendasi Bal Muatan ({scanBalSuggestions.length}):</span>
                      <span className="text-[10px] text-gray-400 font-normal lowercase">Gunakan tombol ↑ ↓ & Enter atau klik untuk memilih</span>
                    </div>

                    {scanBalSuggestions.length > 0 ? (
                      scanBalSuggestions.map((bal, idx) => {
                        const isSelectedInShipment = selectedBalIds.includes(bal.barang_id);
                        const isHighlighted = idx === highlightedScanIndex;
                        return (
                          <button
                            key={bal.barang_id}
                            type="button"
                            onClick={() => handleSelectSuggestedShipmentBal(bal)}
                            onMouseEnter={() => setHighlightedScanIndex(idx)}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between transition cursor-pointer ${
                              isHighlighted ? 'bg-red-50 text-red-950 border-l-4 border-[#b81d24]' : 'hover:bg-gray-50 text-gray-800'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-xs border border-slate-300">
                                  #{bal.no_bal || bal.barang_id}
                                </span>
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 text-[10px] font-bold rounded-xs">
                                  Grade {bal.kode_grade}
                                </span>
                                <span className="text-[11px] font-mono font-semibold text-gray-600">
                                  {formatNumber(bal.berat_kg, 1)} Kg
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500 flex items-center space-x-2">
                                <span>Petani: <strong className="text-gray-700">{bal.nama_petani || 'Petani Madura'}</strong></span>
                                <span>•</span>
                                <span className="truncate max-w-[220px]">{bal.lokasi_gudang}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {isSelectedInShipment ? (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-300">
                                  ✓ Sudah Dicentang
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-xs border border-slate-300">
                                  Klik untuk Centang
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-xs text-gray-500 text-center">
                        Tidak ada nomor bal yang cocok dengan <strong className="font-mono text-gray-800">"{scanInputText}"</strong>.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Feedback Alert */}
              {scanAlert && (
                <div
                  className={`p-3 rounded-xs text-xs flex items-start space-x-2 border transition-all animate-in fade-in duration-150 ${
                    scanAlert.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                      : scanAlert.type === 'error'
                      ? 'bg-red-100 border-red-400 text-red-900 font-bold'
                      : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  {scanAlert.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : scanAlert.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">{scanAlert.message}</div>
                </div>
              )}
            </div>

            {/* List of Bales in this Shipment */}
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs border-b border-gray-200 pb-2">
                <div>
                  <span className="font-bold text-gray-900 text-sm">
                    {sourceMode === 'sample_batch'
                      ? `Tabel Bal Evaluasi Sample Batch (${selectedBalIds.length} dari ${activeBatchObj?.items?.length || 0} Bal Dipilih Jadi Kirim):`
                      : `Daftar Bal Tembakau yang Harus Dimuat (${selectedBalObjects.length} Bal):`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-600 font-mono text-xs">
                    Total Berat: <strong>{formatNumber(totalSelectedBerat, 1)} Kg</strong> • Grand Total DO: <strong className="text-emerald-800 text-sm">{formatRupiah(totalNilaiSuratJalan)}</strong>
                  </span>
                </div>
              </div>

              {/* Bulk & Quick Selection Action Bar */}
              <div className="bg-gray-50 p-2.5 border border-gray-300 rounded-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center space-x-2 flex-wrap">
                  {sourceMode === 'sample_batch' ? (
                    <>
                      {selectedBalIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBalIds([]);
                            setScanAlert({
                              type: 'warning',
                              message: 'Semua centang bal dikosongkan.',
                            });
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xs cursor-pointer transition"
                        >
                          Kosongkan Centang
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setStokModalSearch('');
                          setStokModalGrade('all');
                          setStokModalSelectedIds([]);
                          setIsStokModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#b81d24] hover:bg-[#b81d24] rounded-xs cursor-pointer transition flex items-center space-x-1 shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Pilih dari Stok Gudang ({availableBalList.length} Bal)</span>
                      </button>
                      {selectedBalIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBalIds([]);
                            setScanAlert({
                              type: 'warning',
                              message: 'Semua centang bal dikosongkan.',
                            });
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xs cursor-pointer transition"
                        >
                          Kosongkan Centang
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Bulk Master Price Code Selector */}
                <div className="flex items-center space-x-2 ml-auto flex-wrap">
                  <span className="text-[11px] font-bold text-gray-700">Terapkan Kode Harga Massal:</span>
                  <select
                    value={bulkKodeHarga}
                    onChange={(e) => setBulkKodeHarga(e.target.value)}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-[#b81d24] text-gray-900"
                  >
                    <option value="">-- Pilih Kode Harga Jual --</option>
                    {activeHargaJualList.map((h) => (
                      <option key={h.harga_jual_id} value={h.kode}>
                        {h.kode} ({formatRupiah(h.harga_jual)}/kg)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!bulkKodeHarga || selectedBalIds.length === 0}
                    onClick={handleApplyBulkKodeHarga}
                    className="px-3 py-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xs cursor-pointer transition shadow-2xs"
                  >
                    Terapkan ke {selectedBalIds.length} Bal Terpilih
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-gray-300 rounded-xs overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-100 sticky top-0 border-b border-gray-300 text-gray-700 font-bold z-10">
                    <tr>
                      {sourceMode === 'sample_batch' ? (
                        <>
                          <th className="p-2 w-16 text-center">Kirim</th>
                          <th className="p-2 w-28">No Bal</th>
                          <th className="p-2 text-center w-20">Grade</th>
                          <th className="p-2 text-right w-24">Berat (Kg)</th>
                          <th className="p-2 text-center w-32">Status Sample</th>
                          <th className="p-2 w-48">Kode Master Harga Jual</th>
                          <th className="p-2 text-right w-32">Harga (Rp/Kg)</th>
                          <th className="p-2 text-right w-36">Total Nilai</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2 w-16 text-center">Kirim</th>
                          <th className="p-2 w-28">No Bal</th>
                          <th className="p-2 text-center w-20">Grade</th>
                          <th className="p-2 text-right w-24">Berat Bal (Kg)</th>
                          <th className="p-2">Petani & Lokasi Gudang</th>
                          <th className="p-2 w-48">Kode Master Harga Jual</th>
                          <th className="p-2 text-right w-32">Harga (Rp/Kg)</th>
                          <th className="p-2 text-right w-36">Total Nilai Bal</th>
                          <th className="p-2 text-center w-16">Aksi</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {sourceMode === 'sample_batch' ? (
                      // ==========================================
                      // MODE 1: SAMPLE BATCH ITEMS
                      // ==========================================
                      (!activeBatchObj?.items || activeBatchObj.items.length === 0) ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center bg-gray-50/50">
                            <div className="max-w-md mx-auto space-y-2">
                              <Package className="w-8 h-8 mx-auto text-gray-300" />
                              <div className="text-sm font-bold text-gray-800">
                                {!selectedBatchSampleId ? 'Belum Ada Batch Sample yang Dipilih' : 'Tidak ada bal pada batch ini'}
                              </div>
                              <p className="text-xs text-gray-500">
                                {!selectedBatchSampleId 
                                  ? 'Silakan cari atau pilih kode batch sample pada kolom pencarian di atas untuk memuat daftar bal tembakau.' 
                                  : 'Silakan pilih batch sample lainnya pada dropdown di atas.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        activeBatchObj.items.map((it, idx) => {
                          const isIncluded = selectedBalIds.includes(it.barang_id);
                          const balObj = barangList.find((b) => b.barang_id === it.barang_id);
                          const berat = balObj?.berat_kg || it.berat_bal_kg || 0;
                          
                          const currentKode = customKodeHargaMap[it.barang_id] ?? it.kode_harga_jual ?? '';
                          let currentPrice = it.harga_deal_kg ?? it.harga_tawaran_kg ?? 45000;
                          if (currentKode) {
                            const master = activeHargaJualList.find(h => h.kode === currentKode);
                            if (master) currentPrice = master.harga_jual;
                          }

                          const subtotal = Math.round(berat * currentPrice);

                          return (
                            <tr
                              key={it.barang_id}
                              className={`transition ${
                                isIncluded
                                  ? 'bg-emerald-50/70 font-medium'
                                  : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              {/* Checkbox Kirim */}
                              <td className="p-2 text-center">
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isIncluded}
                                    disabled={it.sudah_dikirim_do}
                                    onChange={() => handleToggleSelectBal(it.barang_id)}
                                    className="w-4 h-4 text-[#b81d24] rounded-xs border-gray-300 focus:ring-[#b81d24] cursor-pointer disabled:opacity-40"
                                  />
                                </label>
                              </td>

                              {/* No Bal */}
                              <td className="p-2 font-mono font-bold text-gray-900">
                                <div className="flex items-center space-x-1.5">
                                  <span>{it.no_bal || it.barang_id}</span>
                                  {it.sudah_dikirim_do ? (
                                    <span className="text-[9px] font-semibold bg-gray-200 text-gray-700 px-1 rounded-xs">
                                      DO Selesai
                                    </span>
                                  ) : isIncluded && (
                                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1 rounded-xs">
                                      Siap Kirim
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Grade */}
                              <td className="p-2 text-center font-bold">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-xs font-mono text-[11px]">
                                  {it.kode_grade}
                                </span>
                              </td>

                              {/* Berat */}
                              <td className="p-2 text-right font-mono font-semibold text-gray-800">
                                {formatNumber(berat, 1)} Kg
                              </td>

                              {/* Status Sample Evaluasi */}
                              <td className="p-2 text-center">
                                {it.status_item === 'disetujui' ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xs font-bold text-[10px]">
                                    ✓ Di-ACC
                                  </span>
                                ) : it.status_item === 'nego' ? (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 rounded-xs font-bold text-[10px]">
                                    Nego Harga
                                  </span>
                                ) : it.status_item === 'ditolak' ? (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded-xs font-bold text-[10px]">
                                    ✕ Ditolak
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-xs font-semibold text-[10px]">
                                    Sample Dikirim
                                  </span>
                                )}
                              </td>

                              {/* Dropdown Kode Master Harga Jual */}
                              <td className="p-2">
                                <SearchableSelect
                                  value={currentKode}
                                  onChange={(v) => handleUpdateBalKodeHarga(it.barang_id, v)}
                                  options={activeHargaJualList.map(h => ({ value: h.kode, label: `${h.kode} (${formatRupiah(h.harga_jual)}/kg)` }))}
                                  placeholder="-- Pilih Kode --"
                                />
                              </td>

                              {/* Display Harga (Rp/Kg) */}
                              <td className="p-2 text-right font-mono font-bold text-emerald-800">
                                {formatRupiah(currentPrice)}
                              </td>

                              {/* Total Nilai Bal */}
                              <td className="p-2 text-right font-mono font-bold text-gray-900">
                                {formatRupiah(subtotal)}
                              </td>
                            </tr>
                          );
                        })
                      )
                    ) : (
                      // ==========================================
                      // MODE 2: GUDANG REGULER ITEMS
                      // ==========================================
                      regulerManifestObjects.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center bg-gray-50/50">
                            <div className="max-w-md mx-auto space-y-2.5">
                              <Package className="w-9 h-9 mx-auto text-gray-300" />
                              <div className="text-sm font-bold text-gray-800">Tabel Muatan Masih Kosong</div>
                              <p className="text-xs text-gray-500">
                                Scan barcode bal tembakau atau ketik nomor bal/ID di atas untuk memasukkan bal ke dalam daftar muatan surat jalan.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setStokModalSearch('');
                                  setStokModalGrade('all');
                                  setStokModalSelectedIds([]);
                                  setIsStokModalOpen(true);
                                }}
                                className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#b81d24] rounded-xs cursor-pointer shadow-xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Pilih dari Stok Gudang ({availableBalList.length} Bal Tersedia)</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        regulerManifestObjects.map((bal, idx) => {
                          const isChecked = selectedBalIds.includes(bal.barang_id);
                          
                          const currentKode = customKodeHargaMap[bal.barang_id] ?? '';
                          let currentPrice = 0;
                          if (currentKode) {
                            const master = activeHargaJualList.find(h => h.kode === currentKode);
                            if (master) currentPrice = master.harga_jual;
                          }

                          const subtotalBal = Math.round(bal.berat_kg * currentPrice);

                          return (
                            <tr
                              key={bal.barang_id}
                              className={`transition ${
                                isChecked ? 'bg-emerald-50/70 font-medium' : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              <td className="p-2 text-center">
                                <label className="inline-flex items-center justify-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleSelectBal(bal.barang_id)}
                                    className="w-4 h-4 text-[#b81d24] rounded-xs border-gray-300 focus:ring-[#b81d24] cursor-pointer"
                                  />
                                </label>
                              </td>
                              <td className="p-2 font-mono font-bold text-gray-900">
                                <div className="flex items-center space-x-1.5">
                                  <span>{bal.no_bal || bal.barang_id}</span>
                                  {isChecked && (
                                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1 rounded-xs">
                                      Siap Kirim
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 text-center font-bold">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-xs font-mono">
                                  {bal.kode_grade}
                                </span>
                              </td>
                              <td className="p-2 text-right font-mono font-semibold">
                                {formatNumber(bal.berat_kg, 1)} Kg
                              </td>
                              <td className="p-2 text-[11px] text-gray-600">
                                <strong>{bal.nama_petani || '-'}</strong> • <span className="text-gray-400">{bal.lokasi_gudang || '-'}</span>
                              </td>

                              {/* Dropdown Kode Master Harga Jual */}
                              <td className="p-2">
                                <SearchableSelect
                                  value={currentKode}
                                  onChange={(v) => handleUpdateBalKodeHarga(bal.barang_id, v)}
                                  options={activeHargaJualList.map(h => ({ value: h.kode, label: `${h.kode} (${formatRupiah(h.harga_jual)}/kg)` }))}
                                  placeholder="-- Pilih Kode --"
                                />
                              </td>

                              {/* Display Harga (Rp/Kg) */}
                              <td className="p-2 text-right font-mono font-bold text-emerald-800">
                                {formatRupiah(currentPrice)}
                              </td>

                              <td className="p-2 text-right font-mono font-bold text-gray-900">
                                {formatRupiah(subtotalBal)}
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBal(bal.barang_id)}
                                  title="Hapus bal dari pengiriman ini"
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xs transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )
                    )}
                  </tbody>
                  {selectedBalIds.length > 0 && (
                    <tfoot className="bg-gray-100 font-bold border-t border-gray-300">
                      <tr>
                        <td colSpan={3} className="p-2 text-right uppercase text-[11px]">
                          Total Dicentang ({totalSelectedBal} Bal)
                        </td>
                        <td className="p-2 text-right font-mono">
                          {formatNumber(totalSelectedBerat, 1)} Kg
                        </td>
                        <td colSpan={3} className="p-2 text-right uppercase text-[11px]">
                          Grand Total Nilai Surat Jalan:
                        </td>
                        <td className="p-2 text-right font-mono text-sm text-emerald-800">
                          {formatRupiah(totalNilaiSuratJalan)}
                        </td>
                        {sourceMode === 'gudang_reguler' && <td></td>}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* Action Bottom Bar */}
          <div className="bg-white p-4 border border-gray-300 rounded-sm shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs text-gray-600">
                Muatan Siap Kirim: <strong className="text-gray-900">{totalSelectedBal} Bal</strong> ({formatNumber(totalSelectedBerat, 1)} Kg) tujuan <strong className={tujuanBuyer ? 'text-gray-900' : 'text-red-600 italic'}>{tujuanBuyer || '(Wajib diisi)'}</strong>.
              </div>
              {!canSubmitShipment && (
                <div className="text-[11px] font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-xs border border-slate-200 inline-flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>
                    {!tujuanBuyer.trim()
                      ? 'Tujuan gudang / pabrik buyer wajib diisi sebelum menerbitkan surat jalan.'
                      : sourceMode === 'sample_batch'
                      ? `Belum semua bal dicentang (${checkedEligibleCount}/${eligibleBatchItems.length} Bal). Centang atau scan seluruh bal muatan sebelum menerbitkan surat jalan.`
                      : regulerManifestBalIds.length === 0
                      ? 'Tabel muatan masih kosong. Silakan scan barcode atau masukkan bal tembakau terlebih dahulu.'
                      : `Belum semua bal dicentang (${selectedBalObjects.length}/${regulerManifestBalIds.length} Bal). Centang atau scan seluruh bal muatan sebelum menerbitkan surat jalan.`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {totalSelectedBal > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBalIds([]);
                    setScanAlert(null);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-sm transition cursor-pointer"
                >
                  Kosongkan Centang
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition cursor-pointer"
              >
                Lihat Riwayat DO
              </button>

              <button
                type="button"
                disabled={!canSubmitShipment}
                onClick={handleSubmitShipment}
                className="px-5 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] disabled:opacity-40 disabled:cursor-not-allowed rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                title={!tujuanBuyer.trim() ? 'Tujuan gudang / pabrik buyer wajib diisi' : !canSubmitShipment ? 'Wajib scan atau centang seluruh bal muatan terlebih dahulu' : 'Terbitkan Surat Jalan'}
              >
                <Truck className="w-4 h-4" />
                <span>Terbitkan Surat Jalan & Kirim ({totalSelectedBal} Bal)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW MODE: DELIVERY ORDER LIST & PRINT HISTORY                          */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          
          {/* Header Banner */}
          <div className="bg-white p-4 sm:p-5 border border-gray-300 rounded-sm shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-sm bg-[#b81d24] text-white flex items-center justify-center shadow-xs">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                    Surat Jalan & Pengiriman Tembakau (Delivery Order)
                  </h1>
                  
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenCreatePage}
                className="px-4 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Pengiriman & Surat Jalan Baru</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 border border-gray-300 rounded-sm shadow-xs">
              <div className="text-[11px] font-medium text-gray-500">Total Pengiriman (DO)</div>
              <div className="text-xl font-bold text-gray-900 mt-0.5">{pengirimanList.length} Surat Jalan</div>
              <div className="text-[10px] text-gray-400">Terdokumentasi</div>
            </div>

            <div className="bg-white p-3.5 border border-gray-300 rounded-sm shadow-xs">
              <div className="text-[11px] font-medium text-gray-500">Total Bal Terdistribusi</div>
              <div className="text-xl font-bold text-gray-900 mt-0.5">
                {pengirimanList.reduce((sum, p) => sum + (p.total_bal || 0), 0)} Bal
              </div>
              <div className="text-[10px] text-gray-400">Keluar Gudang</div>
            </div>

            <div className="bg-white p-3.5 border border-gray-300 rounded-sm shadow-xs">
              <div className="text-[11px] font-medium text-gray-500">Total Tonase Terkirim</div>
              <div className="text-xl font-bold text-gray-900 mt-0.5">
                {formatNumber(pengirimanList.reduce((sum, p) => sum + (p.total_berat_kg || 0), 0) / 1000, 2)} Ton
              </div>
              <div className="text-[10px] text-gray-400">
                {formatNumber(pengirimanList.reduce((sum, p) => sum + (p.total_berat_kg || 0), 0), 1)} Kg
              </div>
            </div>

            <div className="bg-[#b81d24] text-white p-3.5 border border-[#b81d24] rounded-sm shadow-xs">
              <div className="text-[11px] font-medium text-gray-300">Estimasi Nilai DO</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5 truncate font-mono">
                {formatRupiah(pengirimanList.reduce((sum, p) => sum + (p.total_nilai_deal || (p.total_berat_kg * 125000)), 0))}
              </div>
              <div className="text-[10px] text-gray-400">Transaksi Terbit</div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-gray-300 rounded-sm shadow-xs p-4 sm:p-5 space-y-4">
            
            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
              <div className="relative min-w-[260px]">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari No. Surat Jalan / Tujuan / Driver / Batch..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
                />
              </div>

              <div className="text-xs text-gray-500 font-mono">
                Menampilkan {paginatedPengiriman.length} dari {filteredPengiriman.length} Surat Jalan
              </div>
            </div>

            {/* Table */}
            <div className="border border-gray-300 rounded-xs overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold">
                  <tr>
                    <th className="p-2.5">No. Surat Jalan & Kontrak</th>
                    <th className="p-2.5">Tujuan Pabrik / Buyer</th>
                    <th className="p-2.5 text-center w-20">Total Bal</th>
                    <th className="p-2.5 text-right w-24">Tonase (Kg)</th>
                    <th className="p-2.5 text-right w-32">Nilai Transaksi</th>
                    <th className="p-2.5">Driver & Truk</th>
                    <th className="p-2.5 text-center w-28">Status</th>
                    <th className="p-2.5 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedPengiriman.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        Tidak ada catatan pengiriman surat jalan yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedPengiriman.map((krm) => {
                      const nilaiDeal = krm.total_nilai_deal || (krm.total_berat_kg * 125000);

                      return (
                        <tr key={krm.pengiriman_id} className="hover:bg-gray-50 transition">
                          <td className="p-2.5">
                            <div className="font-mono font-bold text-gray-900">{krm.no_surat_jalan}</div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              {krm.nomor_kontrak || '-'} • Kirim: {krm.tanggal_kirim}
                            </div>
                            {krm.batch_sample_id_ref && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-slate-100 text-slate-800 border border-slate-200 rounded-xs font-mono">
                                Ref Sample: {krm.batch_sample_id_ref}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-gray-800">{krm.tujuan}</div>
                            <div className="text-[10px] text-gray-400">Petugas: {krm.petugas || '-'}</div>
                          </td>
                          <td className="p-2.5 text-center font-bold font-mono text-gray-900">
                            {krm.total_bal} Bal
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold">
                            {formatNumber(krm.total_berat_kg, 1)} Kg
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-800">
                            {formatRupiah(nilaiDeal)}
                          </td>
                          <td className="p-2.5 text-gray-600 text-[11px]">
                            <div><strong>{krm.driver_nama || '-'}</strong></div>
                            <div className="text-gray-400 font-mono">{krm.plat_nomor || '-'}</div>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-xs">
                              Terkirim DO
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => openPrintDocument('surat_jalan', krm.pengiriman_id)}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#b81d24] hover:bg-[#9e161c] rounded-xs flex items-center space-x-1 cursor-pointer shadow-2xs"
                                title="Buka Halaman Cetak Surat Jalan Resmi (Download PDF / Cetak ke Printer)"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Cetak DO</span>
                              </button>
                              
                              {(userRole === 'superadmin' || userRole === 'admin_utama') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPengirimanId(krm.pengiriman_id);
                                      setNoSuratJalan(krm.no_surat_jalan);
                                      setTujuanBuyer(krm.tujuan);
                                      setTanggalKirim(krm.tanggal_kirim);
                                      setDriverNama(krm.driver_nama || '');
                                      setPlatNomor(krm.plat_nomor || '');
                                      setNoKontrak(krm.nomor_kontrak || '');
                                      setSourceMode(krm.batch_sample_id_ref ? 'sample_batch' : 'gudang_reguler');
                                      if (krm.batch_sample_id_ref) {
                                        setSelectedBatchSampleId(krm.batch_sample_id_ref);
                                      }
                                      // Note: To fully edit items, we must load krm.barang_ids into selectedBalIds
                                      // and their respective objects into selectedBalObjects.
                                      const relatedBarangs = barangList.filter(b => krm.barang_ids.includes(b.barang_id));
                                      setSelectedBalIds(relatedBarangs.map(b => b.barang_id));
                                      setRegulerManifestBalIds(relatedBarangs.map(b => b.barang_id));
                                      
                                      if (krm.kode_harga_jual_map) setCustomKodeHargaMap(krm.kode_harga_jual_map);
                                      
                                      setViewMode('create');
                                    }}
                                    className="p-1 text-gray-500 hover:text-[#b81d24] hover:bg-rose-50 rounded-xs transition cursor-pointer"
                                    title="Edit Pengiriman DO"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => setPengirimanToDelete(krm.pengiriman_id)}
                                    className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xs transition cursor-pointer"
                                    title="Hapus Pengiriman DO"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredPengiriman.length > itemsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredPengiriman.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(p) => setCurrentPage(p)}
                onItemsPerPageChange={(limit) => {
                  setItemsPerPage(limit);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Surat Jalan Printable PDF Document Modal */}
      <SuratJalanPrintModal
        isOpen={!!printingSuratJalan}
        onClose={() => setPrintingSuratJalan(null)}
        pengiriman={printingSuratJalan}
        barangList={barangList}
        tabelHarga={tabelHarga}
        transaksiList={transaksiList}
      />

      {/* Confirm Delete DO Modal */}
      <ConfirmModal
        isOpen={!!pengirimanToDelete}
        title="Konfirmasi Hapus Pengiriman DO"
        message="Apakah Anda yakin ingin menghapus surat jalan pengiriman ini? Bal tembakau yang terikat akan dikembalikan ke status Gudang."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
        onConfirm={() => {
          if (pengirimanToDelete && onDeletePengiriman) {
            const pToDel = pengirimanList.find(p => p.pengiriman_id === pengirimanToDelete);
            if (pToDel) {
              const revertedBarangs = barangList
                .filter(b => pToDel.barang_ids.includes(b.barang_id))
                .map(b => ({ ...b, status_stok: 'di_gudang' as const }));
              onDeletePengiriman(pengirimanToDelete, revertedBarangs);
            } else {
              onDeletePengiriman(pengirimanToDelete);
            }
          }
          setPengirimanToDelete(null);
        }}
        onClose={() => setPengirimanToDelete(null)}
        onCancel={() => setPengirimanToDelete(null)}
      />

      {/* Confirm Save Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Konfirmasi Penerbitan Surat Jalan DO"
        message={`Apakah Anda yakin ingin menerbitkan Surat Jalan ${noSuratJalan} untuk pengiriman ${totalSelectedBal} bal tembakau (${formatNumber(totalSelectedBerat, 1)} Kg) ke ${tujuanBuyer}?`}
        confirmText="Ya, Terbitkan Surat Jalan"
        cancelText="Periksa Lagi"
        onConfirm={handleConfirmSave}
        onClose={() => setIsConfirmOpen(false)}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {/* Modal: Pilih Bal dari Stok Gudang untuk Pengiriman Reguler */}
      {isStokModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#b81d24]/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-sm border border-gray-300 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#b81d24] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Package className="w-5 h-5 text-slate-300" />
                <div>
                  <h3 className="font-bold text-sm">Pilih Bal Tembakau dari Stok Gudang</h3>
                  <p className="text-[11px] text-gray-300">
                    Tersedia {availableBalList.length} bal tembakau yang siap dimuat ke dalam surat jalan reguler.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStokModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-xs transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filters & Toolbar */}
            <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari No. Bal / ID / Petani / Gudang..."
                    value={stokModalSearch}
                    onChange={(e) => setStokModalSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700 text-xs"
                  />
                </div>
                <select
                  value={stokModalGrade}
                  onChange={(e) => setStokModalGrade(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-xs text-xs font-semibold"
                >
                  <option value="all">Semua Grade</option>
                  {Array.from(new Set(availableBalList.map((b) => b.kode_grade))).filter(Boolean).sort().map((gr) => (
                    <option key={gr} value={gr}>Grade {gr}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                {stokModalSelectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStokModalSelectedIds([])}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xs transition cursor-pointer"
                  >
                    Batal Pilih ({stokModalSelectedIds.length})
                  </button>
                )}
              </div>
            </div>

            {/* Modal Items Table */}
            <div className="flex-1 overflow-y-auto max-h-[460px] p-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 sticky top-0 border-b border-gray-300 text-gray-700 font-bold z-10">
                  <tr>
                    <th className="p-2.5 w-10 text-center">Pilih</th>
                    <th className="p-2.5 w-28">No. Bal</th>
                    <th className="p-2.5 text-center w-20">Grade</th>
                    <th className="p-2.5 text-right w-24">Berat (Kg)</th>
                    <th className="p-2.5">Petani & Asal Gudang</th>
                    <th className="p-2.5 text-center w-28">Status Muatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {modalFilteredBalList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        Tidak ada bal tembakau di gudang yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    modalFilteredBalList.map((b) => {
                      const isChecked = stokModalSelectedIds.includes(b.barang_id);
                      const isAlreadyInManifest = regulerManifestBalIds.includes(b.barang_id);

                      return (
                        <tr
                          key={b.barang_id}
                          onClick={() => {
                            setStokModalSelectedIds((prev) =>
                              prev.includes(b.barang_id)
                                ? prev.filter((id) => id !== b.barang_id)
                                : [...prev, b.barang_id]
                            );
                          }}
                          className={`transition cursor-pointer ${
                            isChecked
                              ? 'bg-slate-100 font-medium'
                              : isAlreadyInManifest
                              ? 'bg-emerald-50/40 text-gray-600 hover:bg-emerald-50/60'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setStokModalSelectedIds((prev) =>
                                  prev.includes(b.barang_id)
                                    ? prev.filter((id) => id !== b.barang_id)
                                    : [...prev, b.barang_id]
                                );
                              }}
                              className="w-4 h-4 text-[#b81d24] rounded-xs border-gray-300 focus:ring-[#b81d24] cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5 font-mono font-bold text-gray-900">
                            #{b.no_bal || b.barang_id}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-xs font-mono font-bold text-[11px]">
                              {b.kode_grade}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-gray-800">
                            {formatNumber(b.berat_kg, 1)} Kg
                          </td>
                          <td className="p-2.5 text-[11px] text-gray-600">
                            <strong>{b.nama_petani || 'Petani Madura'}</strong> • <span className="text-gray-400">{b.lokasi_gudang || '-'}</span>
                          </td>
                          <td className="p-2.5 text-center">
                            {isAlreadyInManifest ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-xs">
                                Sudah di Muatan
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 rounded-xs">
                                Siap Muat
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-gray-100 border-t border-gray-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-gray-700 font-medium">
                Terpilih: <strong className="text-gray-900">{stokModalSelectedIds.length} Bal</strong> (
                {formatNumber(
                  availableBalList
                    .filter((b) => stokModalSelectedIds.includes(b.barang_id))
                    .reduce((sum, b) => sum + (b.berat_kg || 0), 0),
                  1
                )}{' '}
                Kg)
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsStokModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-200 border border-gray-300 rounded-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={stokModalSelectedIds.length === 0}
                  onClick={handleConfirmStokModal}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#b81d24] disabled:opacity-50 disabled:cursor-not-allowed rounded-xs transition cursor-pointer shadow-xs"
                >
                  Masukkan ke Daftar Muatan ({stokModalSelectedIds.length} Bal)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

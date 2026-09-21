import { SearchableSelect } from '../common/SearchableSelect';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Truck,
  Plus,
  Search,
  FileText,
  X,
  Info,
  CheckCircle2,
  Scale,
  AlertCircle,
  AlertOctagon,
  FlaskConical,
  Barcode,
  Check,
  Zap,
  AlertTriangle,
  Trash2,
  Package,
  Edit3,
  Layers,
  Scissors
} from 'lucide-react';
import {
  PengirimanBarang,
  Barang,
  BatchPengirimanSample,
  Petani,
  UserRole,
  TabelHarga,
  TransaksiPembelian,
  MasterHargaJual
} from '../../types';
import { loadCurrentUser } from '../../utils/storage';
import { SuratJalanPrintModal } from './SuratJalanPrintModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { formatNumber, formatRupiah, normalizeKg } from '../../utils/formatters';
import { cekNomorDokumen, normalisasiNomor, pesanNomorKembar } from '../../utils/nomorDokumen';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

import { useSessionDraft } from '../../hooks/useSessionDraft';
import { beratBrutoBal, beratBrutoItemSample } from '../../utils/beratKirim';
import { AturanNettoBaris, NettoJualHasil, barisAturanBaru, bacaAturanNetto, hitungNettoJual } from '../../utils/aturanNetto';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { isSuratJalanTerkunci } from '../../utils/kunciHapus';

/** Penanda bal yang belum punya harga jual (pengganti "Rp 0" / angka karangan). */
const BelumAdaHarga: React.FC = () => (
  <span className="font-sans text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-xs">
    Belum ada harga
  </span>
);

interface PengirimanManagementProps {
  pengirimanList: PengirimanBarang[];
  barangList: Barang[];
  batchSampleList?: BatchPengirimanSample[];
  selectedBatchId?: string;
  petaniList?: Petani[];
  hargaJualList?: MasterHargaJual[];
  tabelHarga?: TabelHarga[];
  transaksiList?: TransaksiPembelian[];
  userRole: UserRole;
  onSaveNewPengiriman: (pengiriman: PengirimanBarang, updatedBarangIds: string[]) => void;
  /** Menyimpan perubahan Surat Jalan yang belum Selesai; mengembalikan false bila ditolak (mis. bal dipakai Surat Jalan lain). */
  onUpdatePengiriman?: (pengiriman: PengirimanBarang, balDitambah: string[], balDikeluarkan: string[]) => boolean;
  onDeletePengiriman?: (pengirimanId: string) => void;
  onNavigateToStatusBatch?: () => void;
  /** Surat Jalan yang sedang diedit (dipilih dari halaman Status Pengiriman). */
  editPengirimanId?: string | null;
  /** Dipanggil saat mode edit berakhir (disimpan atau dibatalkan). */
  onSelesaiEdit?: () => void;
}

export const PengirimanManagement: React.FC<PengirimanManagementProps> = ({
  pengirimanList = [],
  barangList = [],
  batchSampleList = [],
  selectedBatchId,
  petaniList = [],
  hargaJualList = [],
  tabelHarga = [],
  transaksiList = [],
  userRole,
  onSaveNewPengiriman,
  onUpdatePengiriman,
  onDeletePengiriman,
  onNavigateToStatusBatch,
  editPengirimanId = null,
  onSelesaiEdit,
}) => {
  const activeHargaJualList = hargaJualList;

  const [editingPengirimanId, setEditingPengirimanId] = useState<string | null>(null);
  // Surat Jalan yang menunggu konfirmasi karena draf Surat Jalan baru akan tergantikan
  const [editMenunggu, setEditMenunggu] = useState<PengirimanBarang | null>(null);
  const editDimuatRef = useRef<string | null>(null);
  // Harga jual bawaan Surat Jalan yang diedit (snapshot saat diterbitkan), dipakai selama kode harga tidak dipilih ulang
  const [hargaBawaanMap, setHargaBawaanMap] = useState<Record<string, number>>({});
  const suratJalanDiedit = useMemo(
    () => (editingPengirimanId ? pengirimanList.find((p) => p.pengiriman_id === editingPengirimanId) || null : null),
    [editingPengirimanId, pengirimanList]
  );
  // Bal yang tercatat di Surat Jalan yang diedit: berstatus keluar tetapi masih milik Surat Jalan ini
  const idBalSuratJalanDiedit = useMemo(() => new Set(suratJalanDiedit?.barang_ids || []), [suratJalanDiedit]);

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

  // Print & success notification state
  const [printingSuratJalan, setPrintingSuratJalan] = useState<PengirimanBarang | null>(null);
  const [successNotification, setSuccessNotification] = useState<{
    noSuratJalan: string;
    totalBal: number;
    totalBerat: number;
    tujuan: string;
    /** True bila Surat Jalan yang sudah ada diubah, bukan diterbitkan baru. */
    diperbarui?: boolean;
  } | null>(null);

  // In-Page Create Delivery Order State
  const [sourceMode, setSourceMode] = useSessionDraft<'sample_batch' | 'gudang_reguler'>('kirim_source_mode', undefined, 'sample_batch');
  const [selectedBatchSampleId, setSelectedBatchSampleId] = useSessionDraft<string>('kirim_batch_sample_id', undefined, '');
  
  const [noSuratJalan, setNoSuratJalan] = useState('');
  const [tanggalKirim, setTanggalKirim] = useState(new Date().toISOString().split('T')[0]);
  const [tujuanBuyer, setTujuanBuyer] = useSessionDraft<string>('kirim_tujuan_buyer', undefined, '');
  const [driverNama, setDriverNama] = useState('');
  const [platNomor, setPlatNomor] = useState('');


  // Selected Bal IDs for shipment (centang pada kolom kirim / bal yang dikeluarkan & di-scan)
  // By default: statusnya TIDAK DICENTANG DULU sesuai permintaan user
  const [selectedBalIds, setSelectedBalIds] = useSessionDraft<string[]>('kirim_selected_bal_ids', undefined, []);
  // Bal IDs yang dimuat ke dalam tabel muatan pengiriman reguler
  const [regulerManifestBalIds, setRegulerManifestBalIds] = useSessionDraft<string[]>('kirim_manifest_bal_ids', undefined, []);
  const [scanInputText, setScanInputText] = useState('');
  const [scanAlert, setScanAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Dropdown Autocomplete for Shipment Scan Input
  const [isScanDropdownOpen, setIsScanDropdownOpen] = useState(false);
  const [highlightedScanIndex, setHighlightedScanIndex] = useState(0);
  const scanDropdownRef = useRef<HTMLDivElement>(null);

  // Custom prices & price codes editable directly in the shipment table
  const [customKodeHargaMap, setCustomKodeHargaMap] = useSessionDraft<Record<string, string>>('kirim_kode_harga', undefined, {});
  const [bulkKodeHarga, setBulkKodeHarga] = useState<string>('');

  // Koreksi berat per bal saat dikirim (mis. susut selama disimpan), disimpan apa adanya seperti diketik.
  // Hanya tercatat di DO; data bal di gudang tidak diubah.
  const [beratKirimInputMap, setBeratKirimInputMap] = useSessionDraft<Record<string, string>>('kirim_berat_kirim', undefined, {});

  // Aturan potongan bruto ke netto jual. Berbeda tiap pembeli dan sering berubah, jadi diisi per Surat Jalan.
  const [aturanNettoBaris, setAturanNettoBaris] = useSessionDraft<AturanNettoBaris[]>('kirim_aturan_netto', undefined, []);
  const aturanNetto = useMemo(() => bacaAturanNetto(aturanNettoBaris), [aturanNettoBaris]);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useUnsavedChangesWarning(selectedBalIds.length > 0 || regulerManifestBalIds.length > 0);

  const scannerInputRef = useRef<HTMLInputElement>(null);

  const activeBatchSampleList = batchSampleList;

  // Helper to check if a batch is already shipped (sudah dikirim) or currently being shipped (sedang dikirim)
  const getBatchShipmentStatus = (batch: BatchPengirimanSample) => {
    const linkedShipments = pengirimanList.filter(
      (p) =>
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

    // Hasil Reclass (harga ulang) langsung boleh dipakai membuat Surat Jalan, tanpa menunggu hasil sortir pembeli
    // dan tanpa harus difinalkan dulu: bal dan harganya sudah ada di batch.
    return {
      isAlreadyShipped,
      isCurrentlyShipping,
      isEligibleForRegularDO: !isAlreadyShipped && !isCurrentlyShipping && (batch.items || []).length > 0,
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

    const items = targetBatch.items || [];
    const initialIncluded: string[] = [];
    const initialHarga: Record<string, number> = {};
    const initialKode: Record<string, string> = {};

    items.forEach((it) => {
      // By default, include all items that are not rejected and not already shipped
      if (it.status_item !== 'ditolak' && !it.sudah_dikirim_do) {
        initialIncluded.push(it.barang_id);
      }
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
    setBeratKirimInputMap({});

    // Cek apakah Batch ini sudah dalam status pengiriman (Peringatan Pengiriman Ganda / Double Shipment)
    const batchShipments = pengirimanList.filter(
      (p) =>
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
        message: `Batch ${targetBatch.kode_batch} sudah punya Surat Jalan (${sjListStr}).`,
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

  const parseBeratInput = (raw: string): number => normalizeKg(parseFloat(raw.replace(',', '.')));

  // Berat yang dipakai DO: hasil koreksi operator bila ada, selain itu berat bal di gudang.
  // Isian tidak valid dihitung 0 agar total tidak diam-diam memakai berat lama.
  const getBeratKirim = (barangId: string, beratGudangKg: number): number => {
    const raw = beratKirimInputMap[barangId];
    if (raw === undefined) return beratGudangKg;
    const val = parseBeratInput(raw);
    return val > 0 ? val : 0;
  };

  // Bruto timbang ulang dikurangi potongan sesuai aturan netto. Dasar Netto Jual dan Total Nilai.
  const hitungBal = (barangId: string, beratGudangKg: number): NettoJualHasil =>
    hitungNettoJual(getBeratKirim(barangId, beratGudangKg), aturanNetto.aturan);

  const handleTambahBarisAturan = () => setAturanNettoBaris((prev) => [...prev, barisAturanBaru()]);

  const handleUbahBarisAturan = (id: string, kolom: 'min' | 'max' | 'potongan', raw: string) => {
    // Angka dengan satu pemisah desimal (koma atau titik) dan maksimal 3 desimal
    if (!/^\d*[.,]?\d{0,3}$/.test(raw)) return;
    setAturanNettoBaris((prev) => prev.map((b) => (b.id === id ? { ...b, [kolom]: raw } : b)));
  };

  const handleHapusBarisAturan = (id: string) => setAturanNettoBaris((prev) => prev.filter((b) => b.id !== id));

  // Surat Jalan terbaru yang memakai aturan netto (diutamakan yang tujuannya sama) untuk disalin
  const aturanTerakhir = useMemo(() => {
    const tujuan = tujuanBuyer.trim().toLowerCase();
    const punya = pengirimanList
      .filter((p) => p.aturan_netto && p.aturan_netto.length > 0)
      .sort(
        (a, b) =>
          (b.tanggal_kirim || '').localeCompare(a.tanggal_kirim || '') ||
          (parseInt(b.pengiriman_id, 10) || 0) - (parseInt(a.pengiriman_id, 10) || 0)
      );
    return (tujuan ? punya.find((p) => (p.tujuan || '').trim().toLowerCase() === tujuan) : punya[0]) || null;
  }, [pengirimanList, tujuanBuyer]);

  const handlePakaiAturanTerakhir = () => {
    if (!aturanTerakhir?.aturan_netto) return;
    const teks = (n: number) => String(n).replace('.', ',');
    setAturanNettoBaris(
      aturanTerakhir.aturan_netto.map((a) => ({
        ...barisAturanBaru(),
        min: teks(a.min),
        max: a.max === null ? '' : teks(a.max),
        potongan: teks(a.potongan),
      }))
    );
  };

  const handleUpdateBeratKirim = (barangId: string, raw: string) => {
    // Angka dengan satu pemisah desimal (koma atau titik) dan maksimal 3 desimal
    if (!/^\d*[.,]?\d{0,3}$/.test(raw)) return;
    setBeratKirimInputMap((prev) => ({ ...prev, [barangId]: raw }));
  };

  // Isian kosong atau sama dengan berat gudang dianggap tidak dikoreksi
  const handleCommitBeratKirim = (barangId: string, beratGudangKg: number) => {
    setBeratKirimInputMap((prev) => {
      const raw = prev[barangId];
      if (raw === undefined) return prev;
      if (raw.trim() === '' || parseBeratInput(raw) === normalizeKg(beratGudangKg)) {
        const { [barangId]: _removed, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  };

  const renderBeratKirimInput = (barangId: string, beratGudangKg: number, disabled = false) => {
    const raw = beratKirimInputMap[barangId];
    const beratKirim = getBeratKirim(barangId, beratGudangKg);
    const isInvalid = raw !== undefined && raw.trim() !== '' && beratKirim <= 0;
    const selisih = normalizeKg(beratKirim - beratGudangKg);
    const isChanged = raw !== undefined && raw.trim() !== '' && !isInvalid && selisih !== 0;

    return (
      <div className="flex flex-col items-end">
        <div className="relative w-24">
          <input
            type="text"
            inputMode="decimal"
            data-scanner-ignore
            value={raw ?? String(beratGudangKg).replace('.', ',')}
            disabled={disabled}
            onChange={(e) => handleUpdateBeratKirim(barangId, e.target.value)}
            onBlur={() => handleCommitBeratKirim(barangId, beratGudangKg)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            title="Isi bruto hasil timbang ulang bila ada susut. Berat bruto bal dan laporan pembelian tidak ikut berubah."
            className={`w-full pl-2 pr-7 py-1 text-right text-xs font-mono font-semibold text-gray-900 border rounded-xs focus:outline-none focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400 ${
              isInvalid
                ? 'bg-red-50 border-red-500 focus:ring-red-500'
                : isChanged
                ? 'bg-amber-50 border-amber-500 focus:ring-amber-500'
                : 'bg-white border-gray-300 focus:ring-[#b81d24]'
            }`}
          />
          <span className="absolute inset-y-0 right-2 flex items-center text-[10px] text-gray-500 pointer-events-none">Kg</span>
        </div>
        {isInvalid ? (
          <span className="mt-0.5 text-[10px] font-semibold text-red-600">Berat wajib lebih dari 0</span>
        ) : isChanged ? (
          <span className="mt-0.5 text-[10px] font-semibold text-amber-700 text-right leading-tight">
            {selisih < 0 ? 'Susut' : 'Naik'} {formatNumber(Math.abs(selisih))} Kg
          </span>
        ) : null}
      </div>
    );
  };


  const renderNettoJual = (hasil: NettoJualHasil) => (
    <div className="flex flex-col items-end">
      <span className={`font-mono font-bold whitespace-nowrap ${hasil.tercakup && hasil.netto > 0 ? 'text-gray-900' : 'text-red-700'}`}>
        {formatNumber(hasil.netto, 1)} Kg
      </span>
      {!hasil.tercakup ? (
        <span className="text-[10px] font-semibold text-amber-700 whitespace-nowrap">Di luar aturan</span>
      ) : hasil.potongan > 0 ? (
        <span className="text-[10px] text-gray-500 whitespace-nowrap">Potongan {formatNumber(hasil.potongan)} Kg</span>
      ) : null}
    </div>
  );

  // Harga jual dipilih dari Master Harga Jual; harga deal sample tanpa kode tampil sebagai isian awal.
  const renderHargaJual = (barangId: string) => {
    const kode = getKodeHargaJual(barangId);
    const harga = getHargaJualKg(barangId);
    return (
      <div className="space-y-0.5">
        <SearchableSelect
          value={kode}
          onChange={(v) => handleUpdateBalKodeHarga(barangId, v)}
          options={activeHargaJualList.map((h) => ({ value: h.kode, label: `${formatRupiah(h.harga_jual)}/kg (${h.kode})` }))}
          placeholder={harga > 0 ? `${formatRupiah(harga)}/kg` : '-- Pilih Harga --'}
        />
        {harga <= 0 && <BelumAdaHarga />}
      </div>
    );
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
    setBeratKirimInputMap((prev) => {
      const { [barangId]: _removed, ...rest } = prev;
      return rest;
    });
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
          message: `Batch ${matchedBatch.kode_batch} sudah selesai dikirim (${sjListStr}).`,
        });
        setScanInputText('');
        return;
      }
      if (statusInfo.isCurrentlyShipping) {
        setScanAlert({
          type: 'error',
          message: `Batch ${matchedBatch.kode_batch} sedang dikirim.`,
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
          message: `PERINGATAN: Bal #${targetBal.no_bal || targetBal.barang_id} BUKAN bal dari Batch Sample ${activeBatch?.kode_batch || ''}!`,
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
          message: `Bal #${targetBal.no_bal || targetBal.barang_id} sudah dicentang siap kirim.`,
        });
      } else {
        setSelectedBalIds((prev) => [...prev, targetBal.barang_id]);
        setScanAlert({
          type: 'success',
          message: `✓ Bal #${targetBal.no_bal || targetBal.barang_id} (${formatNumber(beratBrutoBal(targetBal), 1)} kg bruto) berhasil di-scan & dicentang siap kirim!`,
        });
      }
      setScanInputText('');
    } else {
      // In regular mode
      if (targetBal.status_stok === 'keluar' && !idBalSuratJalanDiedit.has(targetBal.barang_id)) {
        setScanAlert({
          type: 'error',
          message: `PERINGATAN: Bal #${targetBal.no_bal || targetBal.barang_id} sudah berstatus KELUAR / telah dikirim sebelumnya!`,
        });
        setScanInputText('');
        return;
      }
      if (targetBal.status_stok !== 'di_gudang' && !idBalSuratJalanDiedit.has(targetBal.barang_id)) {
        setScanAlert({
          type: 'error',
          message: `PERINGATAN: Bal #${targetBal.no_bal || targetBal.barang_id} masih berstatus PROSES SORTIR (belum ditimbang) sehingga belum bisa dikirim.`,
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
          message: `✓ Bal #${targetBal.no_bal || targetBal.barang_id} (${formatNumber(beratBrutoBal(targetBal), 1)} kg bruto) berhasil di-scan & dicentang siap kirim!`,
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
    handleProcessScan(scanned);
  });

  // Active batch object
  const activeBatchObj = useMemo(() => {
    return activeBatchSampleList.find(
      (b) => b.batch_id === selectedBatchSampleId || 
             b.kode_batch === selectedBatchSampleId ||
             b.batch_id.toLowerCase() === (selectedBatchSampleId || '').toLowerCase() ||
             b.kode_batch.toLowerCase() === (selectedBatchSampleId || '').toLowerCase()
    );
  }, [activeBatchSampleList, selectedBatchSampleId]);

  // Bal yang sudah dikirim lewat Surat Jalan lain (bal milik Surat Jalan yang sedang diedit tidak termasuk)
  const isBalSudahDikirim = (bal: Barang): boolean => {
    if (idBalSuratJalanDiedit.has(bal.barang_id)) return false;
    if (bal.status_stok === 'keluar') return true;
    if (sourceMode === 'sample_batch') {
      return Boolean(activeBatchObj?.items?.find((it) => it.barang_id === bal.barang_id)?.sudah_dikirim_do);
    }
    return false;
  };

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
      // Bal di gudang, ditambah bal yang sudah dikirim agar tampil di urutan paling bawah
      pool = barangList.filter((b) => b.status_stok === 'di_gudang' || b.status_stok === 'keluar');
      if (pool.length === 0) pool = barangList;
    }

    const matches = pool.filter((b) => {
      const noBal = (b.no_bal || '').toLowerCase();
      const bId = (b.barang_id || '').toLowerCase();
      const pet = (b.nama_petani || '').toLowerCase();
      const noBalClean = noBal.replace(/[^a-zA-Z0-9]/g, '');

      return (
        noBal.includes(q) ||
        bId.includes(q) ||
        pet.includes(q) ||
        (qClean && noBalClean.includes(qClean))
      );
    });

    // Urutan: bal yang belum dipilih dan belum dikirim paling atas, lalu yang sudah dicentang,
    // dan yang sudah dikirim paling bawah. Di tiap kelompok, yang paling mirip dengan ketikan didahulukan
    // (persis sama, lalu diawali ketikan), sisanya menurut urutan nomor bal.
    const kelompok = (b: Barang) => (isBalSudahDikirim(b) ? 2 : selectedBalIds.includes(b.barang_id) ? 1 : 0);
    matches.sort((a, b) => {
      const selisihKelompok = kelompok(a) - kelompok(b);
      if (selisihKelompok !== 0) return selisihKelompok;
      const aNo = (a.no_bal || '').toLowerCase();
      const bNo = (b.no_bal || '').toLowerCase();
      const aExact = aNo === q;
      const bExact = bNo === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      const aStarts = aNo.startsWith(q);
      const bStarts = bNo.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aNo.localeCompare(bNo, undefined, { numeric: true, sensitivity: 'base' });
    });

    return matches.slice(0, 20);
  }, [scanInputText, sourceMode, activeBatchObj, barangList, selectedBalIds, idBalSuratJalanDiedit]);

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
        message: `✓ Bal #${bal.no_bal || bal.barang_id} (${formatNumber(beratBrutoBal(bal), 1)} kg bruto) berhasil dicentang siap kirim!`,
      });
      setScanInputText('');
      setIsScanDropdownOpen(false);
    } else {
      if (bal.status_stok === 'keluar' && !idBalSuratJalanDiedit.has(bal.barang_id)) {
        setScanAlert({
          type: 'error',
          message: `PERINGATAN: Bal #${bal.no_bal || bal.barang_id} sudah berstatus KELUAR / telah dikirim!`,
        });
        setScanInputText('');
        setIsScanDropdownOpen(false);
        return;
      }
      if (bal.status_stok !== 'di_gudang' && !idBalSuratJalanDiedit.has(bal.barang_id)) {
        setScanAlert({
          type: 'error',
          message: `PERINGATAN: Bal #${bal.no_bal || bal.barang_id} masih berstatus PROSES SORTIR (belum ditimbang) sehingga belum bisa dikirim.`,
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
        message: `✓ Bal #${bal.no_bal || bal.barang_id} (${formatNumber(beratBrutoBal(bal), 1)} kg bruto) berhasil dicentang ke muatan!`,
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
  const totalSelectedBerat = normalizeKg(
    selectedBalObjects.reduce((sum, b) => sum + getBeratKirim(b.barang_id, beratBrutoBal(b)), 0)
  );
  const totalSelectedBeratGudang = normalizeKg(selectedBalObjects.reduce((sum, b) => sum + beratBrutoBal(b), 0));
  const totalSelisihBerat = normalizeKg(totalSelectedBerat - totalSelectedBeratGudang);

  // Bal terpilih yang isian beratnya tidak valid (kosong, nol, atau bukan angka)
  const invalidBeratBalObjects = selectedBalObjects.filter(
    (b) => beratKirimInputMap[b.barang_id] !== undefined && getBeratKirim(b.barang_id, beratBrutoBal(b)) <= 0
  );

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

  
  // Kode harga jual sebuah bal: pilihan petugas, atau bawaan item batch sample.
  const getKodeHargaJual = (barangId: string): string =>
    customKodeHargaMap[barangId] ??
    (sourceMode === 'sample_batch'
      ? activeBatchObj?.items?.find((it) => it.barang_id === barangId)?.kode_harga_jual ?? ''
      : '');

  // Harga jual per kg: dari Master Harga Jual, lalu harga deal/tawaran batch sample.
  // 0 berarti belum ada harga; sengaja tanpa angka pengganti agar nilai DO tidak karangan.
  const getHargaJualKg = (barangId: string): number => {
    const kode = getKodeHargaJual(barangId);
    if (kode) {
      const master = activeHargaJualList.find((h) => h.kode === kode);
      if (master) return master.harga_jual;
    }
    return sourceMode === 'sample_batch' ? hargaDealMap[barangId] ?? 0 : hargaBawaanMap[barangId] ?? 0;
  };

  // Nilai Surat Jalan = netto jual (bruto timbang ulang - potongan aturan netto) x harga jual
  const hasilNettoBal = selectedBalObjects.map((b) => ({ b, hasil: hitungBal(b.barang_id, beratBrutoBal(b)) }));
  const totalNettoJual = normalizeKg(hasilNettoBal.reduce((sum, r) => sum + r.hasil.netto, 0));
  const totalPotongan = normalizeKg(totalSelectedBerat - totalNettoJual);
  const totalNilaiSuratJalan = hasilNettoBal.reduce(
    (sum, r) => sum + Math.round(r.hasil.netto * getHargaJualKg(r.b.barang_id)),
    0
  );
  // Bal yang berat timbang ulangnya tidak masuk rentang aturan mana pun, atau nettonya habis dipotong
  const balDiLuarAturan = hasilNettoBal.filter((r) => !r.hasil.tercakup).map((r) => r.b);
  const balNettoHabis = hasilNettoBal.filter((r) => r.hasil.tercakup && r.hasil.netto <= 0).map((r) => r.b);

  // Bal terpilih yang belum punya harga jual
  const balTanpaHargaObjects = selectedBalObjects.filter((b) => getHargaJualKg(b.barang_id) <= 0);

  // Riwayat Pengiriman / Surat Jalan yang terkait dengan Batch yang sedang aktif
  const existingShipmentsForBatch = useMemo(() => {
    if (!selectedBatchSampleId || !activeBatchObj) return [];
    const targetId = selectedBatchSampleId.toLowerCase();
    const kode = (activeBatchObj.kode_batch || '').toLowerCase();
    const bId = (activeBatchObj.batch_id || '').toLowerCase();
    return pengirimanList.filter(
      (p) =>
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


  // No. Surat Jalan wajib diisi manual dan tidak boleh kembar dengan surat jalan lain
  const cekNoSuratJalan = cekNomorDokumen(
    noSuratJalan,
    pengirimanList
      .filter((p) => p.pengiriman_id !== editingPengirimanId)
      .sort((a, b) => (parseInt(a.pengiriman_id, 10) || 0) - (parseInt(b.pengiriman_id, 10) || 0))
      .map((p) => p.no_surat_jalan || '')
  );

  const handleResetForm = () => {
    setNoSuratJalan('');
    setTanggalKirim(new Date().toISOString().split('T')[0]);
    setTujuanBuyer('');
    setDriverNama('');
    setPlatNomor('');
    setSelectedBalIds([]);
    setRegulerManifestBalIds([]);
    setCustomKodeHargaMap({});
    setBeratKirimInputMap({});
    setHargaBawaanMap({});
    setAturanNettoBaris([]);
    setScanAlert(null);
    setErrorMessage('');
    setSelectedBatchSampleId('');
    setScanBatchId('');
    setSourceMode('sample_batch');
    setEditingPengirimanId(null);
  };

  // Mengisi formulir dengan isi Surat Jalan yang belum Selesai agar bisa diubah (bal, berat, harga, potongan, tujuan, dll.)
  const muatUntukEdit = (p: PengirimanBarang) => {
    const idBal = p.barang_ids || [];
    const hilang = idBal.filter((id) => !barangList.some((b) => b.barang_id === id));
    if (hilang.length > 0) {
      setErrorMessage(`Surat Jalan ${p.no_surat_jalan} belum bisa diedit: data bal ${hilang.join(', ')} tidak ditemukan. Muat ulang data lalu coba lagi.`);
      onSelesaiEdit?.();
      return;
    }

    // Harga: pakai kode dari Master Harga Jual bila harganya masih sama; bila master sudah berubah,
    // harga saat Surat Jalan diterbitkan dipertahankan sampai petugas memilih kode harga baru.
    const kodeMap: Record<string, string> = {};
    const hargaBawaan: Record<string, number> = {};
    idBal.forEach((id) => {
      const snapshot = p.harga_deal_map?.[id];
      const kode = p.kode_harga_jual_map?.[id];
      const master = kode ? activeHargaJualList.find((h) => h.kode === kode) : undefined;
      if (master && (snapshot === undefined || master.harga_jual === snapshot)) kodeMap[id] = master.kode;
      else if (snapshot && snapshot > 0) hargaBawaan[id] = snapshot;
    });

    // Bruto timbang ulang: hanya yang berbeda dari bruto bal yang dianggap dikoreksi
    const beratMap: Record<string, string> = {};
    idBal.forEach((id) => {
      const bal = barangList.find((b) => b.barang_id === id);
      const snapshot = p.berat_kirim_map?.[id];
      if (bal && snapshot && normalizeKg(snapshot) !== normalizeKg(beratBrutoBal(bal))) {
        beratMap[id] = String(snapshot).replace('.', ',');
      }
    });

    const teks = (n: number) => String(n).replace('.', ',');
    editDimuatRef.current = p.pengiriman_id;
    setEditingPengirimanId(p.pengiriman_id);
    setSourceMode('gudang_reguler');
    setSelectedBatchSampleId('');
    setScanBatchId('');
    setNoSuratJalan(p.no_surat_jalan || '');
    setTanggalKirim(p.tanggal_kirim || new Date().toISOString().split('T')[0]);
    setTujuanBuyer(p.tujuan || '');
    setDriverNama(p.driver_nama || '');
    setPlatNomor(p.plat_nomor || '');
    setRegulerManifestBalIds(idBal);
    setSelectedBalIds(idBal);
    setCustomKodeHargaMap(kodeMap);
    setHargaBawaanMap(hargaBawaan);
    setBeratKirimInputMap(beratMap);
    setAturanNettoBaris(
      (p.aturan_netto || []).map((a) => ({
        ...barisAturanBaru(),
        min: teks(a.min),
        max: a.max === null ? '' : teks(a.max),
        potongan: teks(a.potongan),
      }))
    );
    setScanAlert(null);
    setErrorMessage('');
    setSuccessNotification(null);
    setEditMenunggu(null);
  };

  // Surat Jalan yang dipilih dari halaman Status Pengiriman dimuat ke formulir untuk diedit
  useEffect(() => {
    if (!editPengirimanId) {
      editDimuatRef.current = null;
      return;
    }
    if (editDimuatRef.current === editPengirimanId) return;
    const target = pengirimanList.find((p) => p.pengiriman_id === editPengirimanId);
    if (!target) return;

    editDimuatRef.current = editPengirimanId;
    if (isSuratJalanTerkunci(target)) {
      setErrorMessage(`Surat Jalan ${target.no_surat_jalan} sudah Selesai dan tidak dapat diedit lagi.`);
      onSelesaiEdit?.();
      return;
    }
    // Draf Surat Jalan baru yang belum disimpan akan tergantikan, jadi minta konfirmasi dulu
    if (selectedBalIds.length > 0 || regulerManifestBalIds.length > 0) {
      setEditMenunggu(target);
      return;
    }
    muatUntukEdit(target);
  }, [editPengirimanId, pengirimanList]);

  // Sisa draf dari edit yang terputus (mis. halaman dimuat ulang): bal yang sudah keluar bukan muatan baru
  useEffect(() => {
    if (editingPengirimanId || editPengirimanId || editMenunggu) return;
    const basi = new Set(
      regulerManifestBalIds.filter((id) => barangList.find((b) => b.barang_id === id)?.status_stok === 'keluar')
    );
    if (basi.size === 0) return;
    setRegulerManifestBalIds((prev) => prev.filter((id) => !basi.has(id)));
    setSelectedBalIds((prev) => prev.filter((id) => !basi.has(id)));
  }, [barangList, regulerManifestBalIds, editingPengirimanId, editPengirimanId, editMenunggu]);

  const handleBatalEdit = () => {
    handleResetForm();
    onSelesaiEdit?.();
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

    if (cekNoSuratJalan.kosong) {
      setErrorMessage('No. Surat Jalan wajib diisi manual.');
      return;
    }
    if (cekNoSuratJalan.kembar) {
      setErrorMessage(pesanNomorKembar('Surat Jalan', noSuratJalan, cekNoSuratJalan));
      return;
    }

    // Cegah bal ganda: bal yang sudah keluar hanya boleh tercatat di Surat Jalan yang sedang diedit
    const balBentrok = selectedBalObjects.filter(
      (b) => b.status_stok === 'keluar' && !idBalSuratJalanDiedit.has(b.barang_id)
    );
    if (balBentrok.length > 0) {
      const daftarBal = balBentrok.map((b) => `#${b.no_bal || b.barang_id}`).join(', ');
      setErrorMessage(`Bal ${daftarBal} sudah keluar lewat Surat Jalan lain. Keluarkan bal itu dari muatan terlebih dahulu.`);
      return;
    }

    const finalTujuan = tujuanBuyer.trim();
    if (!finalTujuan) {
      setErrorMessage('Tujuan gudang / pabrik buyer wajib diisi.');
      return;
    }
    if (invalidBeratBalObjects.length > 0) {
      const daftarBal = invalidBeratBalObjects.map((b) => `#${b.no_bal || b.barang_id}`).join(', ');
      setErrorMessage(`Berat kirim belum valid pada bal ${daftarBal}. Isi berat lebih dari 0 Kg.`);
      return;
    }
    if (aturanNetto.masalah.length > 0) {
      setErrorMessage(`Atur Netto belum benar. ${aturanNetto.masalah[0]}`);
      return;
    }
    if (aturanNetto.aturan.length > 0 && balDiLuarAturan.length > 0) {
      const daftarBal = balDiLuarAturan.map((b) => `#${b.no_bal || b.barang_id}`).join(', ');
      setErrorMessage(`Berat bal ${daftarBal} di luar semua rentang Atur Netto. Tambahkan baris aturan untuk berat tersebut.`);
      return;
    }
    if (balNettoHabis.length > 0) {
      const daftarBal = balNettoHabis.map((b) => `#${b.no_bal || b.barang_id}`).join(', ');
      setErrorMessage(`Netto jual bal ${daftarBal} menjadi 0 Kg setelah dipotong. Periksa Atur Netto atau bruto timbang ulangnya.`);
      return;
    }
    if (balTanpaHargaObjects.length > 0) {
      const daftarBal = balTanpaHargaObjects.map((b) => `#${b.no_bal || b.barang_id}`).join(', ');
      setErrorMessage(`${balTanpaHargaObjects.length} bal belum punya harga jual (${daftarBal}). Pilih Harga Jual terlebih dahulu.`);
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

    // Group grades & snapshot berat kirim tiap bal agar riwayat DO tidak ikut berubah bila data bal diedit
    const gradesBreakdown: Record<string, { bal: number; kg: number }> = {};
    const finalBeratKirimMap: Record<string, number> = {};
    selectedBalObjects.forEach((b) => {
      const beratKirim = getBeratKirim(b.barang_id, beratBrutoBal(b));
      finalBeratKirimMap[b.barang_id] = beratKirim;
      if (!gradesBreakdown[b.kode_grade]) {
        gradesBreakdown[b.kode_grade] = { bal: 0, kg: 0 };
      }
      gradesBreakdown[b.kode_grade].bal += 1;
      gradesBreakdown[b.kode_grade].kg = normalizeKg(gradesBreakdown[b.kode_grade].kg + beratKirim);
    });

    
    const finalNettoJualMap: Record<string, number> = {};
    selectedBalObjects.forEach((b) => {
      finalNettoJualMap[b.barang_id] = hitungBal(b.barang_id, beratBrutoBal(b)).netto;
    });

    const finalHargaDealMap: Record<string, number> = {};
    const finalKodeHargaMap: Record<string, string> = {};
    selectedBalIds.forEach((id) => {
      const kode = getKodeHargaJual(id);
      if (kode) finalKodeHargaMap[id] = kode;
      const harga = getHargaJualKg(id);
      if (harga > 0) finalHargaDealMap[id] = harga;
    });


    const nextShipmentSeq = pengirimanList.length > 0
      ? Math.max(...pengirimanList.map(p => {
          const n = parseInt(p.pengiriman_id, 10);
          return isNaN(n) ? 0 : n;
        })) + 1
      : 1;

    const existingPengiriman = editingPengirimanId ? pengirimanList.find(p => p.pengiriman_id === editingPengirimanId) : null;

    const newPengiriman: PengirimanBarang = {
      // Saat edit, data lain milik Surat Jalan (status, petugas penerbit, rujukan batch, dll.) dipertahankan
      ...(existingPengiriman || {}),
      pengiriman_id: editingPengirimanId || String(nextShipmentSeq),
      no_surat_jalan: normalisasiNomor(noSuratJalan),
      tanggal_kirim: tanggalKirim,
      tujuan: finalTujuan,
      status: existingPengiriman ? existingPengiriman.status : 'dikirim',
      total_bal: totalSelectedBal,
      total_berat_kg: totalSelectedBerat,
      driver_nama: driverNama,
      plat_nomor: platNomor.toUpperCase(),
      catatan: existingPengiriman?.catatan || '',
      petugas: existingPengiriman?.petugas || loadCurrentUser()?.nama_lengkap || '',
      barang_ids: selectedBalIds,
      rincian_grade: gradesBreakdown,
      batch_sample_id_ref: existingPengiriman
        ? existingPengiriman.batch_sample_id_ref
        : sourceMode === 'sample_batch' ? selectedBatchSampleId : undefined,
      harga_deal_map: Object.keys(finalHargaDealMap).length > 0 ? finalHargaDealMap : undefined,
      kode_harga_jual_map: Object.keys(finalKodeHargaMap).length > 0 ? finalKodeHargaMap : undefined,
      berat_kirim_map: finalBeratKirimMap,
      // Tanpa aturan netto, nilai tetap bruto x harga seperti Surat Jalan sebelumnya
      netto_jual_map: aturanNetto.aturan.length > 0 ? finalNettoJualMap : undefined,
      aturan_netto: aturanNetto.aturan.length > 0 ? aturanNetto.aturan : undefined,
      total_nilai_deal: totalNilaiSuratJalan,
    };

    const sedangEdit = Boolean(existingPengiriman);
    if (existingPengiriman) {
      if (!onUpdatePengiriman) return;
      const idLama = existingPengiriman.barang_ids || [];
      const balDitambah = selectedBalIds.filter((id) => !idLama.includes(id));
      const balDikeluarkan = idLama.filter((id) => !selectedBalIds.includes(id));
      const berhasil = onUpdatePengiriman(newPengiriman, balDitambah, balDikeluarkan);
      if (!berhasil) {
        setIsConfirmOpen(false);
        return;
      }
    } else {
      onSaveNewPengiriman(newPengiriman, selectedBalIds);
    }

    setEditingPengirimanId(null);
    setIsConfirmOpen(false);
    setPrintingSuratJalan(newPengiriman);
    setSuccessNotification({
      noSuratJalan: newPengiriman.no_surat_jalan,
      totalBal: totalSelectedBal,
      totalBerat: totalSelectedBerat,
      tujuan: finalTujuan,
      diperbarui: sedangEdit,
    });
    handleResetForm();
    if (sedangEdit) onSelesaiEdit?.();
  };

  return (
    <div className="space-y-4 font-sans text-gray-800">
      
      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-5 border border-gray-300 rounded-sm shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-sm bg-[#b81d24] text-white flex items-center justify-center shadow-xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Pengiriman Reguler (DO)</h1>
          </div>
        </div>

      </div>

      {/* Banner Mode Edit Surat Jalan */}
      {editingPengirimanId && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-sm shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Mengedit Surat Jalan {suratJalanDiedit?.no_surat_jalan || ''}
              </h4>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBatalEdit}
            className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-white hover:bg-amber-100 border border-amber-400 rounded-xs transition cursor-pointer shrink-0"
          >
            Batal Edit
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {successNotification && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-sm shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-900">
                Surat Jalan {successNotification.noSuratJalan} Berhasil {successNotification.diperbarui ? 'Diperbarui' : 'Diterbitkan'}!
              </h4>
              <p className="text-xs text-emerald-800">
                <strong>{successNotification.totalBal} Bal</strong> ({formatNumber(successNotification.totalBerat, 1)} Kg) • {successNotification.tujuan}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {onNavigateToStatusBatch && (
              <button
                type="button"
                onClick={onNavigateToStatusBatch}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xs transition flex items-center space-x-1 cursor-pointer shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Status & Detail Batch</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSuccessNotification(null)}
              className="p-1 text-emerald-700 hover:text-emerald-900 cursor-pointer"
              title="Tutup pesan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

          {/* Source Mode Toggle Banner */}
          <div className="bg-white p-4 border border-gray-300 rounded-sm shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
              <div className="font-bold text-xs text-gray-900 flex items-center space-x-2">
                <span>Sumber Bal</span>
              </div>

              {editingPengirimanId ? (
                <span className="text-[11px] font-semibold text-gray-600">{sourceMode === 'sample_batch' ? 'Batch Sample' : 'Stok Gudang'}</span>
              ) : (
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
                  <span>Batch Sample ({availableBatches.length})</span>
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
                  <span>Stok Gudang</span>
                </button>
              </div>
              )}
            </div>

            {/* Batch Sample Selector Dropdown */}
            {sourceMode === 'sample_batch' && (
              <div className="bg-slate-50 border border-slate-300 p-3 rounded-xs space-y-2">
                {availableBatches.length === 0 ? (
                  <div className="p-3 bg-slate-100 border border-slate-300 rounded-xs text-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>Tidak ada batch sample siap kirim</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSourceMode('gudang_reguler');
                        setSelectedBatchSampleId('');
                        setSelectedBalIds([]);
                        setRegulerManifestBalIds([]);
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-xs whitespace-nowrap cursor-pointer shadow-xs transition"
                    >
                      Pilih dari Stok Gudang
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
                              placeholder="Kode batch"
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
                                          accCount > 0 && accCount === items.length
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : accCount > 0
                                            ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                            : 'bg-red-100 text-red-800 border border-red-300'
                                        }`}>
                                          {accCount > 0 && accCount === items.length
                                            ? 'ACC Semua'
                                            : accCount > 0
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
                                        <span className="text-red-700 font-medium">Siap Muat: {items.length} Bal</span>
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
                        <span>Batch ini sudah punya Surat Jalan</span>
                      </div>
                      <p className="text-red-800">
                        Batch <strong>{activeBatchObj?.kode_batch}</strong>
                        {existingShipmentsForBatch.length > 0 ? (
                          <span className="font-semibold font-mono ml-1">
                            ({existingShipmentsForBatch.map(s => `${s.no_surat_jalan} tgl ${s.tanggal_kirim}`).join(', ')})
                          </span>
                        ) : (
                          <span className="font-semibold ml-1">(Status: Selesai)</span>
                        )}

                      </p>
                    </div>
                  </div>
                )}

                {activeBatchObj?.permintaan_buyer && (
                  <div className="text-[11px] text-slate-700 bg-white p-2 rounded-xs border border-slate-200">
                    <strong>Permintaan Buyer:</strong> {activeBatchObj.permintaan_buyer}
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
              <span>Surat Jalan</span>
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
                <label className="block font-semibold text-gray-700">
                  No. Surat Jalan <span className="text-[#b81d24]">*</span>
                </label>
                <input
                  type="text"
                  value={noSuratJalan}
                  onChange={(e) => setNoSuratJalan(e.target.value.toUpperCase())}
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-xs font-mono font-bold text-gray-900 uppercase placeholder:font-normal placeholder:normal-case focus:outline-none focus:ring-1 ${
                    cekNoSuratJalan.kembar ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-700'
                  }`}
                />
                {cekNoSuratJalan.kembar ? (
                  <p className="text-[10px] font-semibold text-red-600">
                    {pesanNomorKembar('Surat Jalan', noSuratJalan, cekNoSuratJalan)}
                  </p>
                ) : cekNoSuratJalan.terakhir ? (
                  <p className="text-[10px] text-gray-500">
                    Nomor terakhir: <span className="font-mono font-semibold text-gray-700">{cekNoSuratJalan.terakhir}</span>
                  </p>
                ) : null}
              </div>

              {/* Tanggal Kirim */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-700">Tanggal Pengiriman</label>
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
                  Tujuan Gudang / Pabrik <span className="text-[#b81d24]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Tujuan"
                  value={tujuanBuyer}
                  onChange={(e) => setTujuanBuyer(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xs text-xs text-gray-900 focus:outline-none focus:border-gray-800"
                />
              </div>

              

              {/* Nama Supir */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-700">Nama Sopir</label>
                <input
                  type="text"
                  value={driverNama}
                  onChange={(e) => setDriverNama(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-xs"
                />
              </div>

              {/* Plat Nomor */}
              <div className="space-y-1">
                <label className="block font-semibold text-gray-700">No. Polisi Truk</label>
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
          {/* ATUR NETTO: potongan bruto ke netto jual, aturannya berbeda tiap pembeli   */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 sm:p-5 border border-gray-300 rounded-sm shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Scissors className="w-4 h-4 text-gray-700" />
                <span>Atur Netto</span>
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {aturanNettoBaris.length === 0 && aturanTerakhir && (
                  <button
                    type="button"
                    onClick={handlePakaiAturanTerakhir}
                    title={`Salin aturan dari Surat Jalan ${aturanTerakhir.no_surat_jalan}`}
                    className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xs cursor-pointer transition"
                  >
                    Pakai aturan {aturanTerakhir.no_surat_jalan} ({aturanTerakhir.tujuan})
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTambahBarisAturan}
                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-xs cursor-pointer transition flex items-center space-x-1 shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah Baris</span>
                </button>
              </div>
            </div>

            {aturanNettoBaris.length === 0 ? (
              <div className="p-3 bg-gray-50 border border-dashed border-gray-300 text-xs text-gray-600 rounded-xs">Tanpa potongan</div>
            ) : (
              <div className="space-y-1.5 max-w-xl">
                <div className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 text-[10px] font-bold uppercase text-gray-500">
                  <span>Bruto dari (Kg)</span>
                  <span>Sampai (Kg)</span>
                  <span>Potongan Netto (Kg)</span>
                  <span />
                </div>
                {aturanNettoBaris.map((b, i) => (
                  <div key={b.id} className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 items-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      data-scanner-ignore
                      value={b.min}
                      placeholder="1"
                      onChange={(e) => handleUbahBarisAturan(b.id, 'min', e.target.value)}
                      className="w-full px-2 py-1.5 text-right text-xs font-mono font-semibold bg-white border border-gray-300 rounded-xs focus:outline-none focus:ring-1 focus:ring-[#b81d24]"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      data-scanner-ignore
                      value={b.max}
                      placeholder="ke atas"
                      onChange={(e) => handleUbahBarisAturan(b.id, 'max', e.target.value)}
                      className="w-full px-2 py-1.5 text-right text-xs font-mono font-semibold bg-white border border-gray-300 rounded-xs focus:outline-none focus:ring-1 focus:ring-[#b81d24] placeholder:font-sans placeholder:font-normal"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      data-scanner-ignore
                      value={b.potongan}
                      placeholder="4"
                      onChange={(e) => handleUbahBarisAturan(b.id, 'potongan', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (i === aturanNettoBaris.length - 1) handleTambahBarisAturan();
                        }
                      }}
                      className="w-full px-2 py-1.5 text-right text-xs font-mono font-semibold bg-white border border-gray-300 rounded-xs focus:outline-none focus:ring-1 focus:ring-[#b81d24]"
                    />
                    <button
                      type="button"
                      onClick={() => handleHapusBarisAturan(b.id)}
                      title="Hapus baris aturan"
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xs transition cursor-pointer justify-self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {aturanNetto.masalah.length > 0 && (
              <ul className="text-[11px] font-semibold text-red-700 space-y-0.5 list-disc pl-4">
                {aturanNetto.masalah.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}

            {aturanNetto.aturan.length > 0 && balDiLuarAturan.length > 0 && (
              <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xs">
                {balDiLuarAturan.length} bal di luar semua rentang aturan (tanpa potongan):{' '}
                {balDiLuarAturan.slice(0, 6).map((b) => `#${b.no_bal || b.barang_id}`).join(', ')}
                {balDiLuarAturan.length > 6 ? ', ...' : ''}
              </p>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SCAN & VERIFIKASI MUATAN FISIK (WAJIB SAMA PERSIS DENGAN LIST ACC)         */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 sm:p-5 border border-gray-300 rounded-sm shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
                  <Barcode className="w-4 h-4 text-[#b81d24]" />
                  <span>Muatan Bal</span>
                </h3>
              </div>

              {/* Progress Tracker */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-[11px] font-bold text-gray-700">
                    Bal Siap Muat
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
                      placeholder="Scan / ketik No Bal"
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
                            } ${isBalSudahDikirim(bal) ? 'opacity-60' : ''}`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-xs border border-slate-300">
                                  #{bal.no_bal || bal.barang_id}
                                </span>
                                <span className="text-[11px] font-mono font-semibold text-gray-600">
                                  {formatNumber(beratBrutoBal(bal), 1)} Kg bruto
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {isBalSudahDikirim(bal) ? (
                                <span className="text-[10px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-xs border border-red-300">
                                  Sudah Dikirim
                                </span>
                              ) : isSelectedInShipment ? (
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
                    Bruto Timbang Ulang: <strong>{formatNumber(totalSelectedBerat, 1)} Kg</strong> • Netto Jual: <strong>{formatNumber(totalNettoJual, 1)} Kg</strong> • Grand Total DO: <strong className="text-emerald-800 text-sm">{formatRupiah(totalNilaiSuratJalan)}</strong>
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
                  <span className="text-[11px] font-bold text-gray-700">Harga Jual Semua Bal</span>
                  <select
                    value={bulkKodeHarga}
                    onChange={(e) => setBulkKodeHarga(e.target.value)}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-[#b81d24] text-gray-900"
                  >
                    <option value="">-- Pilih Harga Jual --</option>
                    {activeHargaJualList.map((h) => (
                      <option key={h.harga_jual_id} value={h.kode}>
                        {formatRupiah(h.harga_jual)}/kg ({h.kode})
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
              <div className="border border-gray-300 rounded-xs overflow-x-auto max-h-[62vh] overflow-y-auto">
                <table className={`w-full table-fixed text-left text-xs border-collapse ${sourceMode === 'sample_batch' ? 'min-w-[1080px]' : 'min-w-[1000px]'}`}>
                  {/* Lebar kolom proporsional agar tidak ada kolom yang menelan sisa ruang */}
                  {sourceMode === 'sample_batch' ? (
                    <colgroup>
                      <col className="w-[5%]" />
                      <col className="w-[14%]" />
                      <col className="w-[12%]" />
                      <col className="w-[11%]" />
                      <col className="w-[15%]" />
                      <col className="w-[12%]" />
                      <col className="w-[17%]" />
                      <col className="w-[14%]" />
                    </colgroup>
                  ) : (
                    <colgroup>
                      <col className="w-[5%]" />
                      <col className="w-[15%]" />
                      <col className="w-[12%]" />
                      <col className="w-[15%]" />
                      <col className="w-[13%]" />
                      <col className="w-[19%]" />
                      <col className="w-[16%]" />
                      <col className="w-[5%]" />
                    </colgroup>
                  )}
                  <thead className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold z-10 sticky top-0 shadow-[0_1px_0_0_#d1d5db]">
                    <tr>
                      <th className="p-2 text-center">Kirim</th>
                      <th className="p-2 text-center">No Bal</th>
                      {sourceMode === 'sample_batch' && <th className="p-2 text-center">Status Sample</th>}
                      <th className="p-2 text-center">Berat Bruto</th>
                      <th className="p-2 text-center">Bruto Timbang Ulang</th>
                      <th className="p-2 text-center">Netto Jual</th>
                      <th className="p-2 text-center">Harga Jual /Kg</th>
                      <th className="p-2 text-center">
                        Total Nilai
                      </th>
                      {sourceMode === 'gudang_reguler' && <th className="p-2 text-center">Aksi</th>}
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
                            </div>
                          </td>
                        </tr>
                      ) : (
                        activeBatchObj.items.map((it) => {
                          const isIncluded = selectedBalIds.includes(it.barang_id);
                          const balObj = barangList.find((b) => b.barang_id === it.barang_id);
                          const beratGudang = beratBrutoBal(balObj) || beratBrutoItemSample(it);
                          const hasil = hitungBal(it.barang_id, beratGudang);
                          const currentPrice = getHargaJualKg(it.barang_id);
                          const subtotal = Math.round(hasil.netto * currentPrice);

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
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="truncate" title={it.no_bal || it.barang_id}>{it.no_bal || it.barang_id}</span>
                                  {it.sudah_dikirim_do ? (
                                    <span className="shrink-0 whitespace-nowrap text-[9px] font-semibold bg-gray-200 text-gray-700 px-1 rounded-xs">
                                      DO Selesai
                                    </span>
                                  ) : isIncluded && (
                                    <span className="shrink-0 whitespace-nowrap text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1 rounded-xs">
                                      Siap Kirim
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Status Sample Evaluasi */}
                              <td className="p-2 text-center whitespace-nowrap">
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
                                  <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded-xs font-semibold text-[10px]">
                                    Sample Dikirim
                                  </span>
                                )}
                              </td>

                              {/* Berat Bruto (dari timbangan pembelian, tidak bisa diubah) */}
                              <td className="p-2 text-right font-mono font-semibold text-gray-700 whitespace-nowrap">
                                {formatNumber(beratGudang, 1)} Kg
                              </td>

                              {/* Bruto Timbang Ulang (hanya berubah bila ada penyusutan) */}
                              <td className="p-2 text-right">
                                {renderBeratKirimInput(it.barang_id, beratGudang, it.sudah_dikirim_do)}
                              </td>

                              {/* Netto Jual otomatis dari Atur Netto */}
                              <td className="p-2 text-right">{renderNettoJual(hasil)}</td>

                              {/* Harga Jual */}
                              <td className="p-2">{renderHargaJual(it.barang_id)}</td>

                              {/* Total Nilai */}
                              <td className="p-2 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                                {currentPrice > 0 ? formatRupiah(subtotal) : '-'}
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
                          <td colSpan={8} className="p-8 text-center bg-gray-50/50">
                            <div className="max-w-md mx-auto space-y-2.5">
                              <Package className="w-9 h-9 mx-auto text-gray-300" />
                              <div className="text-sm font-bold text-gray-800">Muatan masih kosong</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        regulerManifestObjects.map((bal) => {
                          const isChecked = selectedBalIds.includes(bal.barang_id);
                          const beratGudang = beratBrutoBal(bal);
                          const hasil = hitungBal(bal.barang_id, beratGudang);
                          const currentPrice = getHargaJualKg(bal.barang_id);
                          const subtotalBal = Math.round(hasil.netto * currentPrice);

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
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="truncate" title={bal.no_bal || bal.barang_id}>{bal.no_bal || bal.barang_id}</span>
                                  {isChecked && (
                                    <span className="shrink-0 whitespace-nowrap text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1 rounded-xs">
                                      Siap Kirim
                                    </span>
                                  )}
                                </div>
                              </td>
                              {/* Berat Bruto (dari timbangan pembelian, tidak bisa diubah) */}
                              <td className="p-2 text-right font-mono font-semibold text-gray-700 whitespace-nowrap">
                                {formatNumber(beratGudang, 1)} Kg
                              </td>

                              {/* Bruto Timbang Ulang (hanya berubah bila ada penyusutan) */}
                              <td className="p-2 text-right">
                                {renderBeratKirimInput(bal.barang_id, beratGudang)}
                              </td>

                              {/* Netto Jual otomatis dari Atur Netto */}
                              <td className="p-2 text-right">{renderNettoJual(hasil)}</td>

                              {/* Harga Jual */}
                              <td className="p-2">{renderHargaJual(bal.barang_id)}</td>

                              <td className="p-2 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                                {currentPrice > 0 ? formatRupiah(subtotalBal) : '-'}
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
                    <tfoot className="bg-gray-100 font-bold border-t border-gray-300 sticky bottom-0 shadow-[0_-1px_0_0_#d1d5db]">
                      <tr>
                        <td colSpan={sourceMode === 'sample_batch' ? 3 : 2} className="p-2 text-right uppercase text-[11px]">
                          Total Dicentang ({totalSelectedBal} Bal)
                        </td>
                        <td className="p-2 text-right font-mono whitespace-nowrap">
                          {formatNumber(totalSelectedBeratGudang, 1)} Kg
                        </td>
                        <td className="p-2 text-right font-mono whitespace-nowrap">
                          <div>{formatNumber(totalSelectedBerat, 1)} Kg</div>
                          {totalSelisihBerat !== 0 && (
                            <div className="text-[10px] font-semibold text-amber-700 whitespace-nowrap">
                              {totalSelisihBerat < 0 ? 'Susut' : 'Naik'} {formatNumber(Math.abs(totalSelisihBerat))} Kg
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono whitespace-nowrap">
                          <div>{formatNumber(totalNettoJual, 1)} Kg</div>
                          {totalPotongan > 0 && (
                            <div className="text-[10px] font-semibold text-gray-500 whitespace-nowrap">
                              Potongan {formatNumber(totalPotongan, 1)} Kg
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right uppercase text-[11px]">Grand Total:</td>
                        <td className="p-2 text-right font-mono text-sm text-emerald-800 whitespace-nowrap">
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
                Muatan Siap Kirim: <strong className="text-gray-900">{totalSelectedBal} Bal</strong> ({formatNumber(totalSelectedBerat, 1)} Kg bruto{totalPotongan > 0 ? `, ${formatNumber(totalNettoJual, 1)} Kg netto jual` : ''}) tujuan <strong className={tujuanBuyer ? 'text-gray-900' : 'text-red-600'}>{tujuanBuyer || '-'}</strong>
              </div>
              {!canSubmitShipment && (
                <div className="text-[11px] font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-xs border border-slate-200 inline-flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>
                    {!tujuanBuyer.trim()
                      ? 'Tujuan belum diisi'
                      : sourceMode === 'sample_batch'
                      ? `Bal dicentang ${checkedEligibleCount}/${eligibleBatchItems.length}`
                      : regulerManifestBalIds.length === 0
                      ? 'Muatan masih kosong'
                      : `Bal dicentang ${selectedBalObjects.length}/${regulerManifestBalIds.length}`}
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
                disabled={!canSubmitShipment}
                onClick={handleSubmitShipment}
                className="px-5 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] disabled:opacity-40 disabled:cursor-not-allowed rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                title={!tujuanBuyer.trim() ? 'Tujuan gudang / pabrik buyer wajib diisi' : !canSubmitShipment ? 'Wajib scan atau centang seluruh bal muatan terlebih dahulu' : editingPengirimanId ? 'Simpan perubahan Surat Jalan' : 'Terbitkan Surat Jalan'}
              >
                <Truck className="w-4 h-4" />
                <span>{editingPengirimanId ? `Simpan Perubahan Surat Jalan (${totalSelectedBal} Bal)` : `Terbitkan Surat Jalan & Kirim (${totalSelectedBal} Bal)`}</span>
              </button>
            </div>
          </div>


      {/* Surat Jalan Printable PDF Document Modal */}
      <SuratJalanPrintModal
        isOpen={!!printingSuratJalan}
        onClose={() => setPrintingSuratJalan(null)}
        pengiriman={printingSuratJalan}
        barangList={barangList}
        tabelHarga={tabelHarga}
        transaksiList={transaksiList}
      />

      {/* Confirm Save Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title={editingPengirimanId ? 'Konfirmasi Perubahan Surat Jalan DO' : 'Konfirmasi Penerbitan Surat Jalan DO'}
        message={`Apakah Anda yakin ingin ${editingPengirimanId ? 'menyimpan perubahan' : 'menerbitkan'} Surat Jalan ${noSuratJalan} untuk pengiriman ${totalSelectedBal} bal tembakau (${formatNumber(totalSelectedBerat, 1)} Kg bruto${totalPotongan > 0 ? `, netto jual ${formatNumber(totalNettoJual, 1)} Kg` : ''}${
          totalSelisihBerat !== 0
            ? `, ${totalSelisihBerat < 0 ? 'susut' : 'naik'} ${formatNumber(Math.abs(totalSelisihBerat))} Kg dari berat gudang ${formatNumber(totalSelectedBeratGudang, 1)} Kg`
            : ''
        }) ke ${tujuanBuyer} dengan total nilai ${formatRupiah(totalNilaiSuratJalan)}?`}
        confirmText={editingPengirimanId ? 'Ya, Simpan Perubahan' : 'Ya, Terbitkan Surat Jalan'}
        cancelText="Periksa Lagi"
        onConfirm={handleConfirmSave}
        onClose={() => setIsConfirmOpen(false)}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {/* Konfirmasi: draf Surat Jalan baru akan tergantikan oleh Surat Jalan yang diedit */}
      <ConfirmModal
        isOpen={!!editMenunggu}
        title="Ganti Draf dengan Surat Jalan yang Diedit"
        message={`Ada draf Surat Jalan baru yang belum disimpan. Membuka Surat Jalan ${editMenunggu?.no_surat_jalan || ''} untuk diedit akan mengganti draf itu. Lanjutkan?`}
        confirmText="Ya, Edit Surat Jalan"
        cancelText="Batal"
        variant="warning"
        onConfirm={() => {
          if (editMenunggu) muatUntukEdit(editMenunggu);
        }}
        onClose={() => {
          setEditMenunggu(null);
          onSelesaiEdit?.();
        }}
        onCancel={() => {
          setEditMenunggu(null);
          onSelesaiEdit?.();
        }}
      />

    </div>
  );
};

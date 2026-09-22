import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  Edit3,
  X,
  AlertCircle,
  Trash2,
  Barcode,
  Package
} from 'lucide-react';
import {
  BatchPengirimanSample,
  SampleItemDetail,
  Barang,
  Petani,
  UserRole,
  MasterHargaJual,
  TabelHarga,
  TransaksiPembelian,
  StatusBatchSample
} from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

import { generateBatchSampleId, generateSampleId, formatRupiah, formatNumber } from '../../utils/formatters';
import { cekNomorDokumen, normalisasiNomor, pesanNomorKembar } from '../../utils/nomorDokumen';
import { beratBrutoBal, beratBrutoItemSample } from '../../utils/beratKirim';
import { isBatchDraft } from '../../utils/statusBatchSample';

import { useSessionDraft } from '../../hooks/useSessionDraft';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';

interface SampleManagementProps {
  batchSampleList?: BatchPengirimanSample[];
  barangList: Barang[];
  petaniList?: Petani[];
  hargaJualList?: MasterHargaJual[];
  hargaList?: TabelHarga[];
  transaksiList?: TransaksiPembelian[];
  userRole: UserRole;
  onSaveBatchSample: (newBatch: BatchPengirimanSample, updatedBarangs: Barang[]) => void;
  onUpdateBatchSample: (updatedBatch: BatchPengirimanSample, updatedBarangs?: Barang[]) => void;
  onNavigateToPengiriman?: (batchId?: string) => void;
  /** Membuka halaman Status & Detail Batch (daftar batch, status, hasil sortir, cetak, batal). */
  onNavigateToStatusBatch?: () => void;
  /** Batch yang sedang diedit (dipilih dari halaman Status & Detail Batch). */
  editBatchId?: string | null;
  /** Dipanggil saat mode edit berakhir (disimpan atau dibatalkan). */
  onSelesaiEdit?: () => void;
}

export const SampleManagement: React.FC<SampleManagementProps> = ({
  batchSampleList = [],
  barangList = [],
  petaniList = [],
  hargaJualList = [],
  hargaList = [],
  transaksiList = [],
  userRole,
  onSaveBatchSample,
  onUpdateBatchSample,
  onNavigateToPengiriman,
  onNavigateToStatusBatch,
  editBatchId = null,
  onSelesaiEdit,
}) => {
  const activeHargaJualList = hargaJualList;
  const activeHargaList = hargaList;
  const activeTransaksiList = transaksiList;
  const activeBatchSampleList = batchSampleList;

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

  // Pengiriman sample memakai berat bruto hasil timbangan (tanpa tara tebakan)
  const resolveBeratBruto = (bal: Partial<Barang> | undefined): number => beratBrutoBal(bal);

  // Batch yang sedang diedit (dipilih dari halaman Status & Detail Batch); null berarti membuat batch baru
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  // Batch yang menunggu konfirmasi karena draf batch baru akan tergantikan
  const [editMenunggu, setEditMenunggu] = useState<BatchPengirimanSample | null>(null);
  const editDimuatRef = useRef<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<{
    kodeBatch: string;
    totalBal: number;
    tujuan: string;
    diperbarui: boolean;
    /** Disimpan sebagai Draft: belum final, surat belum bisa dicetak */
    draft: boolean;
  } | null>(null);
  const batchDiedit = useMemo(
    () => (editingBatchId ? activeBatchSampleList.find((b) => b.batch_id === editingBatchId) || null : null),
    [editingBatchId, activeBatchSampleList]
  );

  // Tombol utama memfinalkan batch baru atau Draft; batch final yang diedit hanya menyimpan perubahan
  const akanDifinalkan = !editingBatchId || isBatchDraft(batchDiedit);

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
  const [selectedBalItems, setSelectedBalItems, resetDraftSampleItems] = useSessionDraft<
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
  >('sample_bal_items', undefined, []);

  useUnsavedChangesWarning(selectedBalItems.length > 0);

  
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
        message: `Bal ${bal.no_bal || bal.barang_id} sudah ada di batch ini.`,
        detail: 'Sudah tercantum di tabel draft di bawah.',
      };
    }

    // 2. Cek apakah sudah pernah digunakan pada Batch Pengiriman Sample lain yang tercatat
    // Batch yang sedang diedit tidak dihitung: bal miliknya boleh dipilih lagi
    const matchedBatch = activeBatchSampleList.find(
      (b) =>
        b.batch_id !== editingBatchId &&
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
        matchedBatch.status === 'draft'
          ? 'Draft'
          : matchedBatch.status === 'sample' || matchedBatch.status === 'diproses'
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
        message: `Bal ${bal.no_bal || bal.barang_id} sudah dipakai di Batch Sample ${matchedBatch.kode_batch} (${matchedBatch.tujuan_buyer} • ${statusText}).`,
        detail: `Batch: ${matchedBatch.kode_batch} (${matchedBatch.tujuan_buyer})`,
        batch: matchedBatch,
      };
    }

    // 3. Cek status fisik bal. Reclass tidak mengubah bal, jadi hanya bal yang sudah keluar gudang lewat Surat Jalan yang ditolak.
    // Bal yang baru disortir (sudah ada No Bal dan harga) sudah terkumpul, jadi boleh dipilih walau belum ditimbang atau dibayar.
    const milikBatchDiedit = Boolean(batchDiedit?.items?.some((it) => it.barang_id === bal.barang_id));
    if (bal.status_stok === 'keluar' && !milikBatchDiedit) {
      const alasan = `Bal ini sudah keluar gudang melalui Surat Jalan / DO pengiriman.`;
      return {
        isAvailable: false,
        statusType: 'not_in_warehouse' as const,
        badgeText: `STATUS: ${bal.status_stok.toUpperCase()}`,
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
        message: `Bal ${bal.no_bal || bal.barang_id} tidak tersedia: ${alasan}`,
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
      detail: beratBrutoBal(bal) > 0 ? `${formatNumber(beratBrutoBal(bal), 1)} kg bruto` : 'Baru disortir, belum ditimbang',
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
  }, [barangList, scanGudang, selectedBalItems, activeBatchSampleList, editingBatchId]);

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
      message: `✓ No Bal #${bal.no_bal || bal.barang_id} (${formatNumber(beratBrutoBal(bal), 1)} kg bruto) dipilih. Lanjut ke No Jadi.`,
    });
    setIsBalDropdownOpen(false);
    setScanGudang(bal.no_bal || bal.barang_id);
    setTimeout(() => inputPembeliRef.current?.focus(), 100);
  };

  // Filter & Search State

  // Modals State
  // No. Surat Pengiriman Sample diisi manual dan tidak boleh kembar
  const [noSuratSample, setNoSuratSample] = useState('');
  const cekNoSuratSample = cekNomorDokumen(
    noSuratSample,
    [...activeBatchSampleList]
      .filter((b) => b.batch_id !== editingBatchId)
      .sort((a, b) => (a.tanggal_kirim || '').localeCompare(b.tanggal_kirim || ''))
      .map((b) => b.kode_batch || '')
  );

  // Create Batch Form State
  const [tujuanBuyer, setTujuanBuyer] = useSessionDraft<string>('sample_tujuan_buyer', undefined, '');
  const [permintaanBuyer, setPermintaanBuyer] = useState('');
  const [sumberGudang, setSumberGudang] = useState('Gudang Utama Pamekasan');
  const [tanggalKirim, setTanggalKirim] = useState(new Date().toISOString().split('T')[0]);
  const [dikirimOleh, setDikirimOleh] = useState('');
  const [catatanBatchForm, setCatatanBatchForm] = useState('');

  // Bal selection filters inside Create Form
      

  const [isConfirmCreateOpen, setIsConfirmCreateOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
        message: `No Bal "${trimmed}" tidak ditemukan.`,
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
      message: `✓ No Bal #${targetBal.no_bal || targetBal.barang_id} (${formatNumber(beratBrutoBal(targetBal), 1)} kg bruto) ditemukan. Lanjut ke No Jadi.`,
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
    // Check in all existing batches (kecuali batch yang sedang diedit)
    for (const batch of activeBatchSampleList) {
      if (batch.batch_id === editingBatchId) continue;
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
  // Dicocokkan HANYA lewat kode (bukan nominal harga): dua kode berbeda bisa punya harga yang sama persis,
  // jadi mencocokkan lewat angka harga akan memunculkan kode yang salah.
  const hargaJualSuggestions = useMemo(() => {
    const q = scanHargaJual.trim().toLowerCase();
    let matches = activeHargaJualList.filter((h) =>
      h.status_aktif !== false &&
      (!q || h.kode.toLowerCase().includes(q))
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
    const finalBruto = resolveBeratBruto(pendingScanBal);
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

    
  
  
  // Deselect all
  const handleDeselectAll = () => {
    resetDraftSampleItems();
  };

  // Formulir kembali kosong seperti batch baru setelah edit selesai atau dibatalkan
  const resetFormSetelahEdit = () => {
    resetDraftSampleItems();
    setEditingBatchId(null);
    setTujuanBuyer('');
    setNoSuratSample('');
    setPermintaanBuyer('');
    setSumberGudang('Gudang Utama Pamekasan');
    setTanggalKirim(new Date().toISOString().split('T')[0]);
    setDikirimOleh('');
    setCatatanBatchForm('');
    setErrorMessage('');
    setScanSampleAlert(null);
    setPendingScanBal(null);
    setScanGudang('');
  };

  // Mengisi formulir dengan isi batch yang belum punya Surat Jalan agar bisa diubah
  const muatUntukEdit = (batch: BatchPengirimanSample) => {
    const items = (batch.items || []).map((it) => {
      const matchedBal = barangList.find((b) => b.barang_id === it.barang_id || b.no_bal === it.no_bal);
      return {
        barangId: it.barang_id,
        noBal: it.no_bal,
        kodeBalPembeli: it.kode_bal_pembeli || it.no_bal,
        grade: it.kode_grade,
        beratBalKg: it.berat_bal_kg || resolveBeratNetto(matchedBal),
        beratBrutoKg: it.berat_bruto_kg || resolveBeratBruto(matchedBal),
        potonganTaraKg: it.potongan_tara_kg !== undefined ? it.potongan_tara_kg : (matchedBal?.potongan_tara_kg || 0),
        hargaBeliKg: it.harga_beli_kg || resolveHargaBeli(matchedBal),
        kodeHargaJual: it.kode_harga_jual || '-',
        hargaTawaranKg: it.harga_tawaran_kg,
      };
    });

    editDimuatRef.current = batch.batch_id;
    setEditingBatchId(batch.batch_id);
    setNoSuratSample(batch.kode_batch || '');
    setTujuanBuyer(batch.tujuan_buyer || '');
    setPermintaanBuyer(batch.permintaan_buyer || '');
    setSumberGudang(batch.sumber_gudang || '');
    setTanggalKirim(batch.tanggal_kirim || '');
    setDikirimOleh(batch.dikirim_oleh || '');
    setCatatanBatchForm(batch.catatan || '');
    setSelectedBalItems(items);
    setErrorMessage('');
    setScanSampleAlert(null);
    setPendingScanBal(null);
    setScanGudang('');
    setSuccessNotification(null);
    setEditMenunggu(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Batch yang dipilih dari halaman Status & Detail Batch dimuat ke formulir untuk diedit
  useEffect(() => {
    if (!editBatchId) {
      editDimuatRef.current = null;
      return;
    }
    if (editDimuatRef.current === editBatchId) return;
    const target = activeBatchSampleList.find((b) => b.batch_id === editBatchId);
    if (!target) return;

    editDimuatRef.current = editBatchId;
    if ((target.items || []).some((it) => it.sudah_dikirim_do)) {
      setErrorMessage(`Batch ${target.kode_batch} sudah dibuatkan Surat Jalan sehingga tidak dapat diedit. Batalkan Surat Jalannya dulu bila belum Selesai.`);
      onSelesaiEdit?.();
      return;
    }
    // Draf batch baru yang belum disimpan akan tergantikan, jadi minta konfirmasi dulu
    if (selectedBalItems.length > 0) {
      setEditMenunggu(target);
      return;
    }
    muatUntukEdit(target);
  }, [editBatchId, activeBatchSampleList]);

  const handleBatalEdit = () => {
    resetFormSetelahEdit();
    onSelesaiEdit?.();
  };

  // Submit Create Batch Form
  // sebagai 'draft': simpan sebagai Draft (belum final, surat belum bisa dicetak); 'final': siap pakai
  const handleSaveBatchForm = (sebagai: 'draft' | 'final' = 'final') => {
    const tolak = (pesan: string) => {
      setErrorMessage(pesan);
      setIsConfirmCreateOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    if (cekNoSuratSample.kosong) {
      tolak('No. Surat Pengiriman Sample wajib diisi manual.');
      return;
    }
    if (cekNoSuratSample.kembar) {
      tolak(pesanNomorKembar('Surat Pengiriman Sample', noSuratSample, cekNoSuratSample));
      return;
    }
    const finalTujuan = tujuanBuyer.trim();
    if (!finalTujuan) {
      tolak('Tujuan gudang / pabrik penerima sample wajib diisi!');
      return;
    }
    if (selectedBalItems.length === 0) {
      tolak('Pilih minimal 1 bal tembakau untuk dimasukkan ke dalam Batch Sample!');
      return;
    }
    // Cegah bal ganda: bal yang sudah ada di batch lain (mis. sisa draf dari edit yang terputus) tidak boleh masuk batch baru
    const balBentrok = selectedBalItems.filter((s) =>
      activeBatchSampleList.some(
        (b) =>
          b.batch_id !== editingBatchId &&
          b.status !== 'dibatalkan' &&
          (b.items || []).some((it) => it.barang_id === s.barangId && it.status_item !== 'ditolak')
      )
    );
    if (balBentrok.length > 0) {
      setErrorMessage(`Bal ${balBentrok.map((s) => `#${s.noBal}`).join(', ')} sudah tercatat di batch sample lain. Keluarkan dari tabel terlebih dahulu.`);
      setIsConfirmCreateOpen(false);
      return;
    }


    let nextSeq = activeBatchSampleList.length + 1;
    while (!editingBatchId && activeBatchSampleList.some((b) => b.batch_id === generateBatchSampleId(nextSeq))) {
      nextSeq += 1;
    }
    const nextBatchId = editingBatchId || generateBatchSampleId(nextSeq);
    const kodeBatch = normalisasiNomor(noSuratSample);
    const existingBatch = activeBatchSampleList.find(b => b.batch_id === editingBatchId);
    
    const items: SampleItemDetail[] = selectedBalItems.map((s, idx) => {
      const existingItem = existingBatch?.items.find(i => i.barang_id === s.barangId);
      const matchedBal = barangList.find(b => b.barang_id === s.barangId || b.no_bal === s.noBal);
      const finalHargaBeli = s.hargaBeliKg || existingItem?.harga_beli_kg || resolveHargaBeli(matchedBal);
      const finalNetto = s.beratBalKg || resolveBeratNetto(matchedBal);
      const finalBruto = s.beratBrutoKg || existingItem?.berat_bruto_kg || resolveBeratBruto(matchedBal);
      const finalTara = s.potonganTaraKg || existingItem?.potongan_tara_kg || matchedBal?.potongan_tara_kg || 0;
      const finalPetani = matchedBal?.nama_petani || txItemMap.get(s.barangId)?.nama_petani || txItemMap.get(s.noBal)?.nama_petani || existingItem?.nama_petani || '-';

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
      };
    });

    const totalEstimasiNilai = items.reduce((sum, it) => sum + beratBrutoItemSample(it) * it.harga_tawaran_kg, 0);

    // Draft tetap Draft; batch final yang diedit mempertahankan tahapnya; Draft yang difinalkan menjadi 'sample'
    const statusBatch: StatusBatchSample =
      sebagai === 'draft' ? 'draft' : existingBatch && !isBatchDraft(existingBatch) ? existingBatch.status : 'sample';

    const newBatch: BatchPengirimanSample = {
      ...existingBatch,
      batch_id: nextBatchId,
      kode_batch: kodeBatch,
      tujuan_buyer: finalTujuan,
      permintaan_buyer: permintaanBuyer,
      sumber_gudang: sumberGudang,
      tanggal_kirim: tanggalKirim,
      status: statusBatch,
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

    // Reclass / Batch Sample tidak mempengaruhi bal: status dan data bal tidak diubah sama sekali.
    // Bal baru keluar dari gudang saat masuk Surat Jalan / DO.
    const updatedBarangs: Barang[] = [];

    const sedangEdit = Boolean(editingBatchId);
    if (sedangEdit) {
      onUpdateBatchSample(newBatch, updatedBarangs);
    } else {
      onSaveBatchSample(newBatch, updatedBarangs);
    }
    setIsConfirmCreateOpen(false);
    setSuccessNotification({
      kodeBatch: kodeBatch,
      totalBal: items.length,
      tujuan: finalTujuan,
      diperbarui: sedangEdit,
      draft: sebagai === 'draft',
    });
    if (sedangEdit) {
      resetFormSetelahEdit();
      onSelesaiEdit?.();
    } else {
      resetDraftSampleItems();
      setTujuanBuyer('');
      setNoSuratSample('');
    }
  };

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
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">Pengiriman Sample</h1>
            </div>
          </div>
        </div>

      </div>

      {/* Banner Mode Edit Batch Sample */}
      {editingBatchId && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-sm shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Mengedit Batch Sample {batchDiedit?.kode_batch || ''}
                {isBatchDraft(batchDiedit) && (
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-xs align-middle">
                    DRAFT
                  </span>
                )}
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

      {/* Notifikasi Berhasil Disimpan */}
      {successNotification && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-sm shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-900">
                Batch Sample {successNotification.kodeBatch} Berhasil {successNotification.diperbarui ? 'Diperbarui' : 'Disimpan'}
                {successNotification.draft ? ' sebagai Draft' : ''}!
              </h4>
              <p className="text-xs text-emerald-800">
                <strong>{successNotification.totalBal} Bal</strong> • {successNotification.tujuan}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {onNavigateToStatusBatch && (
              <button
                type="button"
                onClick={onNavigateToStatusBatch}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xs transition cursor-pointer shadow-xs"
              >
                Status & Detail Batch
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

      {/* Form Pengiriman Batch Sample */}
        <div className="bg-white border border-gray-300 rounded-sm shadow-xs p-5 space-y-5 animate-in fade-in duration-150">
          
          <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Batch Sample</h2>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-300 text-xs text-red-800 rounded-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Meta Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 border border-gray-200 rounded-xs">
            
            {/* No. Surat Pengiriman Sample (manual) */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                No. Surat Pengiriman Sample <span className="text-[#b81d24]">*</span>
              </label>
              <input
                type="text"
                value={noSuratSample}
                onChange={(e) => setNoSuratSample(e.target.value.toUpperCase())}
                className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-xs font-mono font-bold uppercase text-gray-900 placeholder:font-sans placeholder:font-normal placeholder:normal-case focus:outline-none focus:ring-1 ${
                  cekNoSuratSample.kembar ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-700'
                }`}
              />
              {cekNoSuratSample.kembar ? (
                <p className="text-[10px] text-red-600 font-semibold">
                  {pesanNomorKembar('Surat Pengiriman Sample', noSuratSample, cekNoSuratSample)}
                </p>
              ) : cekNoSuratSample.terakhir ? (
                <p className="text-[10px] text-gray-500">
                  Nomor terakhir: <span className="font-mono font-semibold text-gray-700">{cekNoSuratSample.terakhir}</span>
                </p>
              ) : null}
            </div>

            {/* Buyer Destination */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                Tujuan Gudang / Pabrik <span className="text-[#b81d24]">*</span>
              </label>
              <input
                type="text"
                placeholder="Tujuan"
                value={tujuanBuyer}
                onChange={(e) => setTujuanBuyer(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700 text-gray-900"
              />
            </div>

            

            {/* Tanggal Kirim */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Tanggal Pengiriman</label>
              <input
                type="date"
                value={tanggalKirim}
                onChange={(e) => setTanggalKirim(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-xs"
              />
            </div>

            {/* Dikirim Oleh */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Petugas Pengirim</label>
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
                    {selectedBalItems.length} Bal Terpilih • Est. Nilai: {formatRupiah(selectedBalItems.reduce((s, it) => s + (it.beratBrutoKg * it.hargaTawaranKg), 0))}
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
                                    {beratBrutoBal(bal) > 0 ? `${formatNumber(beratBrutoBal(bal), 1)} kg bruto • ` : ''}Petani: {bal.nama_petani || '-'} • {usage.detail}
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
                    <th className="p-2.5 text-right w-32 border-r border-gray-200">Harga Beli (Rp/Kg)</th>
                    <th className="p-2.5 text-right w-24 border-r border-gray-200">Bruto (Kg)</th>
                    <th className="p-2.5 text-right w-36 border-r border-gray-200">Harga Tawar/Deal (Rp)</th>
                    <th className="p-2.5 text-right w-36 border-r border-gray-200">Est. Subtotal (Rp)</th>
                    <th className="p-2.5 text-center w-14">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedBalItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <span className="font-semibold block text-gray-500">Belum ada bal dipilih</span>
                      </td>
                    </tr>
                  ) : (
                    selectedBalItems.map((item, idx) => {
                      const matchedBal = barangList.find(b => b.barang_id === item.barangId || b.no_bal === item.noBal);
                      const hrgBeli = item.hargaBeliKg || resolveHargaBeli(matchedBal);
                      const bruto = item.beratBrutoKg || resolveBeratBruto(matchedBal);

                      return (
                        <tr key={item.barangId} className="hover:bg-gray-50 transition">
                          <td className="p-2.5 text-center font-mono text-gray-500 border-r border-gray-200">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-gray-900 border-r border-gray-200">{item.noBal}</td>
                          <td className="p-2.5 font-mono font-bold text-[#b81d24] border-r border-gray-200">{item.kodeBalPembeli}</td>
                          <td className="p-2.5 text-right font-mono border-r border-gray-200 font-bold text-emerald-800 bg-emerald-50/30">
                            {formatRupiah(hrgBeli)}
                          </td>
                          <td className="p-2.5 text-right font-mono border-r border-gray-200 font-bold text-gray-900">
                            {formatNumber(bruto, 1)} kg
                          </td>
                          <td className="p-2.5 text-right font-mono border-r border-gray-200">
                            {formatRupiah(item.hargaTawaranKg)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold border-r border-gray-200 text-[#b81d24]">
                            {formatRupiah(bruto * item.hargaTawaranKg)}
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
                      <td colSpan={3} className="p-2.5 text-right uppercase text-[11px] text-gray-600 tracking-wide border-r border-gray-200">
                        Total {selectedBalItems.length} Bal
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-gray-200 text-[11px] text-gray-500">
                        -
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-gray-200 font-bold text-gray-900">
                        {formatNumber(selectedBalItems.reduce((s, it) => {
                          const matchedBal = barangList.find(b => b.barang_id === it.barangId || b.no_bal === it.noBal);
                          return s + (it.beratBrutoKg || resolveBeratBruto(matchedBal));
                        }, 0), 1)} kg
                      </td>
                      <td className="p-2.5 text-right border-r border-gray-200"></td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-800 border-r border-gray-200">
                        {formatRupiah(selectedBalItems.reduce((s, it) => s + (it.beratBrutoKg * it.hargaTawaranKg), 0))}
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
                  placeholder="Catatan (opsional)"
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

                {/* Draft: bal dan harga jual masih bisa disesuaikan; hanya untuk batch baru atau batch yang masih Draft */}
                {(!editingBatchId || isBatchDraft(batchDiedit)) && (
                  <button
                    type="button"
                    disabled={selectedBalItems.length === 0 || !tujuanBuyer.trim() || cekNoSuratSample.kosong}
                    onClick={() => {
                      setErrorMessage('');
                      handleSaveBatchForm('draft');
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{`Simpan sebagai Draft (${selectedBalItems.length} Bal)`}</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={selectedBalItems.length === 0 || !tujuanBuyer.trim() || cekNoSuratSample.kosong}
                  onClick={() => {
                    if (cekNoSuratSample.kosong) {
                      setErrorMessage('No. Surat Pengiriman Sample wajib diisi manual.');
                      return;
                    }
                    if (cekNoSuratSample.kembar) {
                      setErrorMessage(pesanNomorKembar('Surat Pengiriman Sample', noSuratSample, cekNoSuratSample));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      return;
                    }
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
                  title={!tujuanBuyer.trim() ? 'Tujuan gudang / pabrik penerima wajib diisi' : selectedBalItems.length === 0 ? 'Pilih minimal 1 bal' : akanDifinalkan ? 'Finalkan batch: siap pakai dan surat bisa dicetak' : 'Simpan perubahan batch sample'}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingBatchId && !akanDifinalkan ? `Simpan Perubahan Batch Sample (${selectedBalItems.length} Bal)` : `Simpan & Finalkan Batch Sample (${selectedBalItems.length} Bal)`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      
      {/* Modal 1: QC Sortir & Evaluation Modal */}
      
      


      <ConfirmModal
        isOpen={isConfirmCreateOpen}
        title={editingBatchId && !akanDifinalkan ? 'Konfirmasi Perubahan Batch Sample' : 'Konfirmasi Finalkan Batch Sample'}
        message={editingBatchId && !akanDifinalkan
          ? `Simpan perubahan Batch Sample ${normalisasiNomor(noSuratSample)} berisi ${selectedBalItems.length} bal tembakau untuk ${tujuanBuyer}? Bal yang dikeluarkan dari batch tidak berubah dan tetap di stok gudang.`
          : `Finalkan Batch Sample ${normalisasiNomor(noSuratSample)} berisi ${selectedBalItems.length} bal tembakau untuk ${tujuanBuyer}? Setelah final, batch siap dipakai dan surat pengiriman sample bisa dicetak. Bal tidak berubah dan tetap di stok gudang sampai masuk Surat Jalan.`}
        confirmText={editingBatchId && !akanDifinalkan ? 'Ya, Simpan Perubahan' : 'Ya, Finalkan Batch Sample'}
        cancelText="Periksa Lagi"
        onConfirm={() => handleSaveBatchForm('final')}
        onClose={() => setIsConfirmCreateOpen(false)}
        onCancel={() => setIsConfirmCreateOpen(false)}
      />

      {/* Konfirmasi: draf batch baru akan tergantikan oleh batch yang diedit */}
      <ConfirmModal
        isOpen={!!editMenunggu}
        title="Ganti Draf dengan Batch yang Diedit"
        message={`Ada draf batch sample baru yang belum disimpan. Membuka Batch ${editMenunggu?.kode_batch || ''} untuk diedit akan mengganti draf itu. Lanjutkan?`}
        confirmText="Ya, Edit Batch"
        cancelText="Batal"
        variant="warning"
        onConfirm={() => {
          if (editMenunggu) muatUntukEdit(editMenunggu);
        }}
        onClose={() => {
          setEditMenunggu(null);
          onSelesaiEdit?.();
        }}
      />

    </div>
  );
};

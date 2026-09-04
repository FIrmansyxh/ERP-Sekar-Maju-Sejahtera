import React, { useState, useEffect, useRef } from 'react';
import { 
  Scale, 
  Scan, 
  ArrowLeft, 
  CheckCircle2, 
  MapPin, 
  Layers, 
  Box, 
  AlertCircle, 
  Search,
  Building,
  Info,
  Calendar,
  Check,
  Package,
  Barcode as BarcodeIcon,
  DollarSign,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { TransaksiPembelian, TransaksiItemBal, Barang, Gudang, User as UserType } from '../../types';
import { formatRupiah, formatDateHariBulanTahun, hitungPotonganTaraKg } from '../../utils/formatters';
import { recordLogAktivitas } from '../../utils/storage';
import { ConfirmModal } from '../common/ConfirmModal';

interface Proses2TimbangModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksiList: TransaksiPembelian[];
  gudangList?: Gudang[];
  currentUser?: UserType | null;
  initialTransaksi?: TransaksiPembelian | null;
  initialBarcodeToSelect?: string;
  onSaveTimbang: (
    updatedTx: TransaksiPembelian, 
    newBarangList: Barang[]
  ) => void;
}

export const BLOK_GUDANG_OPTIONS = [
  'Blok A (Induk Utama)',
  'Blok B (Grade Super A-B)',
  'Blok C (Grade Standard C-D)',
  'Blok D (Grade Ekonomis E-F)',
  'Blok E (Penyimpanan Khusus)',
  'Blok F (Area Karantina / Transit)',
];

export const Proses2TimbangModal: React.FC<Proses2TimbangModalProps> = ({
  isOpen,
  onClose,
  transaksiList,
  gudangList = [],
  currentUser,
  initialTransaksi,
  initialBarcodeToSelect,
  onSaveTimbang,
}) => {
  const [selectedTxId, setSelectedTxId] = useState('');
  const [selectedItemBalId, setSelectedItemBalId] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scannerFeedback, setScannerFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  
  // Timbang Input State for Active Bal
  const [beratBrutoInput, setBeratBrutoInput] = useState<number | ''>('');
  const [lokasiBlokInput, setLokasiBlokInput] = useState(BLOK_GUDANG_OPTIONS[0]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Local working copy of items in active transaction
  const [workingItems, setWorkingItems] = useState<TransaksiItemBal[]>([]);
  
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const beratInputRef = useRef<HTMLInputElement>(null);

  // Pending transactions that need weighing (either not all bal weighed or berat_kg is 0)
  const pendingTransactions = transaksiList.filter((t) => {
    if (!t.items || t.items.length === 0) return t.status_transaksi === 'menunggu';
    return t.items.some((it) => (it.berat_kg || 0) <= 0);
  });

  // Handle initialization on modal open or when initialBarcodeToSelect changes
  useEffect(() => {
    if (isOpen) {
      // 1. If an initial barcode was passed (e.g. from outer standby scanner)
      if (initialBarcodeToSelect) {
        handleLookupAndSelectBarcode(initialBarcodeToSelect);
        return;
      }

      // 2. Otherwise load initial transaction or first pending transaction
      const targetTx = initialTransaksi || (pendingTransactions.length > 0 ? pendingTransactions[0] : transaksiList[0]);
      if (targetTx) {
        setSelectedTxId(targetTx.transaksi_id);
        const clonedItems: TransaksiItemBal[] = (targetTx.items || []).map((it) => ({
          ...it,
          potongan_kuli: it.potongan_kuli ?? 7000,
          potongan_tali: it.potongan_tali ?? 3000,
          potongan_tikar: it.potongan_tikar ?? (it.ganti_tikar ? 75000 : 0),
          potongan_tara_kg: it.potongan_tara_kg ?? (it.ganti_tikar ? 2 : 3),
        }));
        setWorkingItems(clonedItems);

        // Auto select first unweighed bal
        const firstPending = clonedItems.find((it) => (it.berat_kg || 0) <= 0) || clonedItems[0];
        if (firstPending) {
          setSelectedItemBalId(firstPending.item_id);
          setBeratBrutoInput(firstPending.berat_bruto_kg || '');
          setLokasiBlokInput(firstPending.lokasi_simpan || BLOK_GUDANG_OPTIONS[0]);
        }
      }
      setScannedBarcode('');
      setScannerFeedback(null);

      // Auto-focus scanner on open
      setTimeout(() => {
        if (scannerInputRef.current) {
          scannerInputRef.current.focus();
        }
      }, 150);
    }
  }, [isOpen, initialTransaksi, initialBarcodeToSelect]);

  if (!isOpen) return null;

  const currentTx = transaksiList.find((t) => t.transaksi_id === selectedTxId);
  const activeBalItem = workingItems.find((it) => it.item_id === selectedItemBalId);

  const handleSelectTransaction = (txId: string) => {
    setSelectedTxId(txId);
    const tx = transaksiList.find((t) => t.transaksi_id === txId);
    if (tx) {
      const clonedItems: TransaksiItemBal[] = (tx.items || []).map((it) => ({
        ...it,
        potongan_kuli: it.potongan_kuli ?? 7000,
        potongan_tali: it.potongan_tali ?? 3000,
        potongan_tikar: it.potongan_tikar ?? (it.ganti_tikar ? 75000 : 0),
        potongan_tara_kg: it.potongan_tara_kg ?? (it.ganti_tikar ? 2 : 3),
      }));
      setWorkingItems(clonedItems);
      const firstPending = clonedItems.find((it) => (it.berat_kg || 0) <= 0) || clonedItems[0];
      if (firstPending) {
        setSelectedItemBalId(firstPending.item_id);
        setBeratBrutoInput(firstPending.berat_bruto_kg || '');
        setLokasiBlokInput(firstPending.lokasi_simpan || BLOK_GUDANG_OPTIONS[0]);
      }
    }
  };

  // Handle selecting a bal from table or via scanner
  const handleSelectBal = (item: TransaksiItemBal) => {
    setSelectedItemBalId(item.item_id);
    setBeratBrutoInput(item.berat_bruto_kg || '');
    setLokasiBlokInput(item.lokasi_simpan || BLOK_GUDANG_OPTIONS[0]);
    setScannerFeedback({
      text: `✓ Bal "${item.no_bal}" (Grade ${item.kode_grade}) terpilih! Masukkan berat timbangan di bawah.`,
      isError: false,
    });

    // Auto-focus to weight input so operator can type directly
    setTimeout(() => {
      if (beratInputRef.current) {
        beratInputRef.current.focus();
        beratInputRef.current.select();
      }
    }, 100);
  };

  // Dedicated function to lookup any bal across all transactions by physical sticker barcode
  const handleLookupAndSelectBarcode = (rawCode: string) => {
    const cleanCode = rawCode.trim().toUpperCase();
    if (!cleanCode) return;
    const cleanNormalized = rawCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // 1. First check if it matches in the currently selected transaction's working items
    let matchedItem = workingItems.find(
      (it) => 
        (it.barcode && it.barcode.toUpperCase() === cleanCode) ||
        (it.no_bal && it.no_bal.toUpperCase() === cleanCode) ||
        (it.no_bal && it.no_bal.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanNormalized)
    );

    if (matchedItem) {
      handleSelectBal(matchedItem);
      return;
    }

    // 2. Search across ALL transactions in the system (lintas kupon)
    let foundTx: TransaksiPembelian | undefined;
    let foundItem: TransaksiItemBal | undefined;

    // Step A: Exact or normalized match
    for (const tx of transaksiList) {
      const match = (tx.items || []).find(
        (it) => 
          (it.barcode && it.barcode.toUpperCase() === cleanCode) ||
          (it.no_bal && it.no_bal.toUpperCase() === cleanCode) ||
          (it.no_bal && it.no_bal.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanNormalized)
      );
      if (match) {
        foundTx = tx;
        foundItem = match;
        break;
      }
    }

    // Step B: Partial match
    if (!foundTx || !foundItem) {
      for (const tx of transaksiList) {
        const match = (tx.items || []).find(
          (it) => 
            (it.barcode && it.barcode.toUpperCase().includes(cleanCode)) ||
            (it.no_bal && it.no_bal.toUpperCase().includes(cleanCode))
        );
        if (match) {
          foundTx = tx;
          foundItem = match;
          break;
        }
      }
    }

    if (foundTx && foundItem) {
      setSelectedTxId(foundTx.transaksi_id);
      const clonedItems: TransaksiItemBal[] = (foundTx.items || []).map((it) => ({
        ...it,
        potongan_kuli: it.potongan_kuli ?? 7000,
        potongan_tali: it.potongan_tali ?? 3000,
        potongan_tikar: it.potongan_tikar ?? (it.ganti_tikar ? 75000 : 0),
        potongan_tara_kg: it.potongan_tara_kg ?? (it.ganti_tikar ? 2 : 3),
      }));
      setWorkingItems(clonedItems);
      setSelectedItemBalId(foundItem.item_id);
      setBeratBrutoInput(foundItem.berat_bruto_kg || '');
      setLokasiBlokInput(foundItem.lokasi_simpan || BLOK_GUDANG_OPTIONS[0]);

      setScannerFeedback({
        text: `✓ Bal "${foundItem.no_bal}" (Grade ${foundItem.kode_grade}) langsung terbuka! Kupon ${foundTx.no_kupon || '-'} (${foundTx.nama_petani}). Masukkan berat timbangan:`,
        isError: false,
      });

      // Auto focus weight input
      setTimeout(() => {
        if (beratInputRef.current) {
          beratInputRef.current.focus();
          beratInputRef.current.select();
        }
      }, 100);
    } else {
      setScannerFeedback({
        text: `✗ No Bal "${cleanCode}" tidak ditemukan pada antrian intake sortir. Pastikan stiker telah diinput pada Proses 1 Sortir.`,
        isError: true,
      });
    }
  };

  // Handle scanning barcode gun on weighing scale (Admin / Petugas Timbang scan)
  const handleBarcodeScan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = scannedBarcode.trim();
    if (!cleanCode) return;

    handleLookupAndSelectBarcode(cleanCode);
    setScannedBarcode('');
  };

  const handleToggleGantiTikar = (itemId: string) => {
    setWorkingItems((prev) =>
      prev.map((it) => {
        if (it.item_id === itemId) {
          const nextGanti = !it.ganti_tikar;
          const tara = nextGanti ? 2 : 3;
          const potTikar = nextGanti ? 75000 : 0;
          const bBruto = it.berat_bruto_kg || (typeof beratBrutoInput === 'number' ? beratBrutoInput : parseFloat(String(beratBrutoInput)) || 0);
          const netto = bBruto > 0 ? Math.max(0, Number((bBruto - tara).toFixed(1))) : 0;
          const kotor = Math.round(netto * it.harga_per_kg);
          const potTotal = (it.potongan_kuli || 7000) + (it.potongan_tali || 3000) + potTikar;
          const bersih = Math.max(0, kotor - potTotal);
          return {
            ...it,
            ganti_tikar: nextGanti,
            potongan_tara_kg: tara,
            potongan_tikar: potTikar,
            berat_kg: netto,
            total_kotor: kotor,
            potongan: potTotal,
            subtotal_bersih: bersih,
          };
        }
        return it;
      })
    );
  };

  // Save weighing for the currently selected bal
  const handleApplyWeightForActiveBal = () => {
    if (!activeBalItem || !currentTx) return;
    const bruto = typeof beratBrutoInput === 'number' ? beratBrutoInput : parseFloat(String(beratBrutoInput)) || 0;
    if (bruto <= 0) {
      alert('Mohon masukkan berat bruto timbangan yang valid (lebih dari 0 kg).');
      if (beratInputRef.current) beratInputRef.current.focus();
      return;
    }

    const isGanti = Boolean(activeBalItem.ganti_tikar);
    const taraKg = hitungPotonganTaraKg(bruto, isGanti);
    const nettoKg = Math.max(0, Number((bruto - taraKg).toFixed(1)));
    const totalKotor = Math.round(nettoKg * activeBalItem.harga_per_kg);
    const potonganTikar = isGanti ? 75000 : 0;
    const totalPotonganBal = (activeBalItem.potongan_kuli || 7000) + (activeBalItem.potongan_tali || 3000) + potonganTikar;
    const subtotalBersih = Math.max(0, totalKotor - totalPotonganBal);

    const updatedItems = workingItems.map((it) => {
      if (it.item_id === activeBalItem.item_id) {
        return {
          ...it,
          berat_bruto_kg: bruto,
          potongan_tara_kg: taraKg,
          berat_kg: nettoKg,
          total_kotor: totalKotor,
          potongan_tikar: potonganTikar,
          potongan: totalPotonganBal,
          subtotal_bersih: subtotalBersih,
          status_timbang: 'selesai_timbang' as const,
          lokasi_simpan: lokasiBlokInput,
        };
      }
      return it;
    });

    setWorkingItems(updatedItems);
    setScannerFeedback({
      text: `✓ Bal "${activeBalItem.no_bal}" TERSIMPAN! (Bruto: ${bruto}kg • Tara: ${taraKg}kg • Netto: ${nettoKg}kg • Bersih: ${formatRupiah(subtotalBersih)}). Siap scan bal berikutnya...`,
      isError: false,
    });

    // Auto navigate to next pending bal if any in this same coupon
    const nextPending = updatedItems.find((it) => (it.berat_kg || 0) <= 0);
    if (nextPending) {
      setSelectedItemBalId(nextPending.item_id);
      setBeratBrutoInput(nextPending.berat_bruto_kg || '');
      setLokasiBlokInput(nextPending.lokasi_simpan || BLOK_GUDANG_OPTIONS[0]);
      setTimeout(() => {
        if (beratInputRef.current) {
          beratInputRef.current.focus();
          beratInputRef.current.select();
        }
      }, 100);
    } else {
      // Re-focus scanner for next physical bal gun scan
      setTimeout(() => {
        if (scannerInputRef.current) {
          scannerInputRef.current.focus();
        }
      }, 100);
    }
  };

  // Overall calculations for the working transaction
  const totalBalCount = workingItems.length;
  const weighedBalCount = workingItems.filter((it) => (it.berat_kg || 0) > 0).length;
  const isAllWeighed = totalBalCount > 0 && weighedBalCount === totalBalCount;

  const totalBeratBruto = workingItems.reduce((acc, curr) => acc + (curr.berat_bruto_kg || 0), 0);
  const totalTaraKg = workingItems.reduce((acc, curr) => acc + (curr.potongan_tara_kg || (curr.ganti_tikar ? 2 : 3)), 0);
  const totalBeratNetto = Number(workingItems.reduce((acc, curr) => acc + (curr.berat_kg || 0), 0).toFixed(1));
  const totalKotorAll = workingItems.reduce((acc, curr) => acc + (curr.total_kotor || 0), 0);
  const totalPotonganAll = workingItems.reduce((acc, curr) => acc + (curr.potongan || 0), 0);
  const totalHargaFinalAll = Math.max(0, totalKotorAll - totalPotonganAll);

  // Submit complete transaction
  const handleFinalSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTx) return;

    if (!isAllWeighed) {
      const confirmIncomplete = window.confirm(
        `Perhatian: Baru ${weighedBalCount} dari ${totalBalCount} bal yang selesai ditimbang.\nApakah Anda yakin ingin menyimpan progres timbangan saat ini? Status transaksi akan tetap "Menunggu Timbang" sampai seluruh bal selesai.`
      );
      if (!confirmIncomplete) return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleConfirmFinalSave = () => {
    if (!currentTx) return;

    const allFinished = totalBalCount > 0 && weighedBalCount === totalBalCount;
    const finalStatus: 'lengkap' | 'menunggu' = allFinished ? 'lengkap' : 'menunggu';

    // 1. Prepare generated Barangs for warehouse inventory
    const newBarangList: Barang[] = workingItems
      .filter((it) => (it.berat_kg || 0) > 0)
      .map((it) => {
        const barangId = it.barang_id || `BRG-${currentTx.transaksi_id.replace('TRX-', '')}-${it.item_id}`;
        return {
          barang_id: barangId,
          barcode: it.barcode || it.no_bal,
          kode_grade: it.kode_grade,
          no_bal: it.no_bal,
          berat_kg: it.berat_kg,
          status_stok: 'di_gudang' as const,
          gudang_id: 'GDG-001',
          lokasi_gudang: `${currentTx.lokasi_gudang || 'Gudang Pusat'} - ${it.lokasi_simpan || BLOK_GUDANG_OPTIONS[0]}`,
          tanggal_masuk: currentTx.tanggal_transaksi ? currentTx.tanggal_transaksi.split(' ')[0].split('T')[0] : new Date().toISOString().split('T')[0],
          petani_id: currentTx.petani_id,
          transaksi_pembelian_id: currentTx.transaksi_id,
          nama_petani: currentTx.nama_petani,
          desa_kecamatan: currentTx.desa_kecamatan || '-',
          catatan: `Penimbangan proses 2 selesai. Bruto: ${it.berat_bruto_kg}kg, Tara: ${it.potongan_tara_kg}kg (${it.ganti_tikar ? 'Ganti Tikar' : 'Tikar Standar'}). ${it.catatan || ''}`,
        };
      });

    // 2. Updated TransaksiPembelian object
    const updatedTx: TransaksiPembelian = {
      ...currentTx,
      items: workingItems,
      total_bal: totalBalCount,
      bal_selesai_timbang: weighedBalCount,
      barang_ids: newBarangList.map((b) => b.barang_id),
      berat_terukur_kg: totalBeratBruto,
      potongan_tara_kg: totalTaraKg,
      berat_kg: totalBeratNetto,
      total_kotor: totalKotorAll,
      potongan_kuli: workingItems.reduce((acc, curr) => acc + (curr.potongan_kuli || 7000), 0),
      potongan_tali: workingItems.reduce((acc, curr) => acc + (curr.potongan_tali || 3000), 0),
      potongan_tikar: workingItems.reduce((acc, curr) => acc + (curr.potongan_tikar || (curr.ganti_tikar ? 75000 : 0)), 0),
      total_potongan: totalPotonganAll,
      total_harga_beli: totalKotorAll,
      harga_final: totalHargaFinalAll,
      status_transaksi: finalStatus,
      status_tahap: allFinished ? 'lengkap' : 'menunggu_timbang',
      petugas_timbang: currentUser?.nama_lengkap || 'Operator Timbang Digital',
    };

    onSaveTimbang(updatedTx, newBarangList);

    // Record activity log for Super Admin accountability audit trail
    recordLogAktivitas({
      user_id: currentUser?.user_id || 'USR-AUTO',
      username: currentUser?.username || 'admintimbang',
      nama_lengkap: currentUser?.nama_lengkap || 'Operator Timbang Digital',
      role: currentUser?.role || 'operator_timbang',
      modul: 'timbangan',
      aksi: 'Penyelesaian Timbang Batch',
      no_kupon: currentTx.no_kupon,
      berat_kg: totalBeratNetto,
      rincian: `Selesai penimbangan Kupon ${currentTx.no_kupon} (${currentTx.nama_petani}): ${weighedBalCount}/${totalBalCount} bal, Total Netto ${totalBeratNetto} Kg, Total Bayar Bersih ${formatRupiah(totalHargaFinalAll)}. Akun operator bertugas: ${currentUser?.nama_lengkap || 'Operator Timbang'}.`,
      status: 'sukses',
    });

    setIsConfirmModalOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
        <div className="bg-white border border-gray-300 w-full max-w-6xl rounded-none shadow-2xl max-h-[94vh] flex flex-col text-xs text-gray-800">
          
          {/* Top Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-sm bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-emerald-700 text-white text-[10px] font-black rounded-xs uppercase">
                    PROSES 2 • MEJA TIMBANG & BLOK GUDANG
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Standby Auto-Scan Barcode Bal Fisik ➔ Auto Open & Input Berat
                  </span>
                </div>
                <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate mt-0.5">
                  Workstation Standby Penimbangan & Alokasi Blok Gudang
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>
          </div>

          {/* Workflow Steps Indicator Banner */}
          <div className="bg-slate-50 border-b border-gray-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                1
              </span>
              <span><strong>Standby Scan:</strong> Tembak stiker barcode fisik bal di timbangan</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="w-5 h-5 rounded-full bg-indigo-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                2
              </span>
              <span><strong>Auto-Open Bal:</strong> Sistem otomatis memuat data bal & kupon terkait</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="w-5 h-5 rounded-full bg-[#b81d24] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                3
              </span>
              <span><strong>Input Berat (Kg):</strong> Ketik berat bruto & pilih Blok Gudang</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                4
              </span>
              <span><strong>Simpan & Masuk Blok:</strong> Selesai timbang ➔ masuk stok ➔ nota aktif</span>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleFinalSaveSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* Top Bar: Barcode Scanner Gun Standby & Selector Kupon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Barcode Gun Fast Standby Scanner */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-teal-50 border-2 border-emerald-400 flex flex-col justify-between shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                      <Scan className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                    <span className="font-black text-emerald-950 text-xs tracking-wide uppercase">
                      STANDBY SCANNER MEJA TIMBANG (AUTO-OPEN)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-mono text-[10px] font-bold rounded-xs">
                    Auto-Detect
                  </span>
                </div>

                <p className="text-[11px] text-gray-600 mb-2">
                  Tembakkan scanner ke stiker barcode fisik karung (misal: <code className="bg-emerald-100 text-emerald-950 px-1 py-0.5 rounded font-mono font-bold">A0001</code>). Halaman bal akan langsung terbuka untuk diisi beratnya!
                </p>

                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      ref={scannerInputRef}
                      type="text"
                      value={scannedBarcode}
                      onChange={(e) => setScannedBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleBarcodeScan(e);
                        }
                      }}
                      placeholder="Scan stiker barcode bal fisik..."
                      className="w-full bg-white border-2 border-emerald-600 font-mono font-black text-sm rounded-sm px-3 py-1.5 text-gray-900 shadow-inner focus:outline-none focus:border-emerald-800"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBarcodeScan()}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-sm transition cursor-pointer text-xs shrink-0 shadow-xs"
                  >
                    Scan Bal
                  </button>
                </div>
              </div>

              {/* Select Transaction / Kupon Dropdown */}
              <div className="p-4 bg-gray-50 border border-gray-200 flex flex-col justify-between">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Kupon / Transaksi Intake Aktif:
                  </label>
                  <select
                    value={selectedTxId}
                    onChange={(e) => handleSelectTransaction(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-900 font-bold focus:outline-none focus:border-emerald-600"
                  >
                    {transaksiList.map((tx) => {
                      const isDone = (tx.items || []).every((it) => (it.berat_kg || 0) > 0) && (tx.items?.length || 0) > 0;
                      return (
                        <option key={tx.transaksi_id} value={tx.transaksi_id}>
                          {tx.no_kupon || 'KUP?'} • {tx.nama_petani} ({tx.total_bal || tx.items?.length || 1} Bal) - {isDone ? '✓ Selesai Ditimbang' : '⏳ Menunggu Timbang'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {currentTx && (
                  <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-2 text-[11px] text-gray-600 font-mono">
                    <div>Petani: <strong className="text-gray-900">{currentTx.nama_petani}</strong></div>
                    <div>Tgl: <strong className="text-gray-900">{formatDateHariBulanTahun(currentTx.tanggal_transaksi)}</strong></div>
                  </div>
                )}
              </div>

            </div>

            {/* Scanner Live Feedback Toast */}
            {scannerFeedback && (
              <div className={`px-3.5 py-2 rounded-xs text-xs font-bold flex items-center space-x-2 transition-all ${
                scannerFeedback.isError 
                  ? 'bg-red-100 text-red-900 border border-red-300' 
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs animate-in fade-in'
              }`}>
                {scannerFeedback.isError ? (
                  <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                )}
                <span>{scannerFeedback.text}</span>
              </div>
            )}

            {/* Active Weighing Form Card (Input Berat & Alokasi Blok) */}
            {activeBalItem ? (
              <div className="p-4 bg-white border-2 border-emerald-600 rounded-none shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-gray-200 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-emerald-700 text-white font-black text-[10px] rounded-xs uppercase tracking-wider">
                      BAL AKTIF DITIMBANG
                    </span>
                    <span className="font-mono font-black text-base text-gray-900 bg-gray-100 px-2 py-0.5 border border-gray-300">
                      {activeBalItem.no_bal}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-900 text-white font-bold text-[11px] rounded-xs">
                      GRADE {activeBalItem.kode_grade}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-gray-500">Tarif Acuan:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {formatRupiah(activeBalItem.harga_per_kg)}/kg
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleGantiTikar(activeBalItem.item_id)}
                      className={`px-2.5 py-1 rounded-xs font-bold text-[11px] flex items-center space-x-1.5 transition cursor-pointer border shadow-2xs ${
                        activeBalItem.ganti_tikar 
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-400 font-black' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                      }`}
                      title="Klik untuk ubah status Ganti Tikar (+Rp 75.000, potongan tara bertingkat)"
                    >
                      <input 
                        type="checkbox" 
                        checked={activeBalItem.ganti_tikar} 
                        onChange={() => {}} 
                        className="cursor-pointer accent-[#b81d24] w-3.5 h-3.5"
                      />
                      <span>{activeBalItem.ganti_tikar ? 'Ganti Tikar (+Rp 75rb)' : 'Tikar Madura / Bawaan'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  
                  {/* Input Berat Bruto (Auto Focused when scanned!) */}
                  <div>
                    <label className="block text-gray-800 font-bold mb-1">
                      1. Berat Bruto Timbangan Fisik (Kg) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={beratInputRef}
                        type="number"
                        step="0.1"
                        min="1"
                        value={beratBrutoInput}
                        onChange={(e) => setBeratBrutoInput(e.target.value === '' ? '' : Number(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyWeightForActiveBal();
                          }
                        }}
                        placeholder="Contoh: 53.5"
                        className="w-full bg-emerald-50/40 border-2 border-emerald-500 rounded-sm px-3 py-2 font-mono font-black text-lg text-gray-900 focus:outline-none focus:border-emerald-800"
                        required
                      />
                      <span className="absolute right-3 top-2.5 font-bold text-gray-500">kg</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Tara: <strong>{activeBalItem.ganti_tikar ? '2-4 kg (Ganti Tikar)' : '3-5 kg (Tikar Bawaan)'}</strong> • Tekan <strong>Enter ↵</strong> untuk simpan
                    </div>
                  </div>

                  {/* Dropdown Lokasi Simpan / Blok Gudang */}
                  <div>
                    <label className="block text-gray-800 font-bold mb-1">
                      2. Lokasi Simpan / Blok Gudang <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={lokasiBlokInput}
                      onChange={(e) => setLokasiBlokInput(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-sm px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                      required
                    >
                      {BLOK_GUDANG_OPTIONS.map((blok) => (
                        <option key={blok} value={blok}>
                          {blok}
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Bal akan otomatis tercatat di blok ini pada inventaris gudang
                    </div>
                  </div>

                  {/* Realtime Live Calculation & Apply Button */}
                  <div className="flex flex-col justify-between p-3 bg-gray-50 border border-gray-200">
                    {(() => {
                      const bBruto = typeof beratBrutoInput === 'number' ? beratBrutoInput : parseFloat(String(beratBrutoInput)) || 0;
                      const tara = hitungPotonganTaraKg(bBruto, Boolean(activeBalItem.ganti_tikar));
                      const netto = Math.max(0, Number((bBruto - tara).toFixed(1)));
                      const kotor = Math.round(netto * activeBalItem.harga_per_kg);
                      const potTikar = activeBalItem.ganti_tikar ? 75000 : 0;
                      const potTotal = (activeBalItem.potongan_kuli || 7000) + (activeBalItem.potongan_tali || 3000) + potTikar;
                      const bersih = Math.max(0, kotor - potTotal);

                      return (
                        <>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Berat Netto:</span>
                              <span className="font-mono font-bold text-gray-900">{netto} kg</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Total Kotor:</span>
                              <span className="font-mono text-gray-800">{formatRupiah(kotor)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Potongan Bal:</span>
                              <span className="font-mono text-red-600">-{formatRupiah(potTotal)}</span>
                            </div>
                            <div className="flex justify-between font-bold border-t border-gray-200 pt-1">
                              <span className="text-gray-700">Subtotal Bersih:</span>
                              <span className="font-mono text-[#b81d24]">{formatRupiah(bersih)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleApplyWeightForActiveBal}
                            className="mt-2 w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-sm transition flex items-center justify-center space-x-1.5 cursor-pointer text-xs shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Simpan Berat Bal ({activeBalItem.no_bal})</span>
                          </button>
                        </>
                      );
                    })()}
                  </div>

                </div>
              </div>
            ) : (
              <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 text-center text-gray-500">
                <Scan className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="font-bold text-gray-800 text-xs">Belum ada bal yang dipilih untuk ditimbang</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Tembakkan scanner ke stiker barcode fisik atau klik tombol "Timbang" pada tabel di bawah.
                </p>
              </div>
            )}

            {/* Bal Items Status Table in Active Transaction */}
            <div className="border border-gray-200">
              <div className="p-3 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide">
                    Daftar Bal Dalam Kupon ({weighedBalCount} dari {totalBalCount} Selesai Ditimbang)
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 text-[11px] font-bold rounded-xs ${
                    isAllWeighed ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {isAllWeighed ? '✓ Seluruh Bal Selesai Ditimbang' : '⏳ Masih Ada Bal Belum Ditimbang'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8f9fa] border-b border-gray-200 text-gray-700 font-bold">
                      <th className="py-2 px-2.5 text-center border-r border-gray-200 w-10">No</th>
                      <th className="py-2 px-3 border-r border-gray-200">No Bal / Barcode</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-center">Grade</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-right">Tarif / Kg</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-center">Status Tikar</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-center">Berat Bruto</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-center">Tara</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-center">Berat Netto</th>
                      <th className="py-2 px-3 border-r border-gray-200">Lokasi Simpan</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-right">Potongan</th>
                      <th className="py-2 px-3 border-r border-gray-200 text-right">Subtotal Bersih</th>
                      <th className="py-2 px-2.5 text-center w-20">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {workingItems.map((item, index) => {
                      const isWeighed = (item.berat_kg || 0) > 0;
                      const isSelected = item.item_id === selectedItemBalId;

                      return (
                        <tr 
                          key={item.item_id} 
                          className={`hover:bg-gray-50/80 cursor-pointer ${
                            isSelected ? 'bg-emerald-50/60 font-medium' : ''
                          }`}
                          onClick={() => handleSelectBal(item)}
                        >
                          <td className="py-2 px-2.5 text-center border-r border-gray-200 font-mono text-gray-500">
                            {index + 1}
                          </td>

                          <td className="py-2 px-3 border-r border-gray-200 font-mono font-bold text-gray-900">
                            {item.no_bal}
                          </td>

                          <td className="py-2 px-3 border-r border-gray-200 text-center font-bold text-gray-800">
                            Grade {item.kode_grade}
                          </td>

                          <td className="py-2 px-3 border-r border-gray-200 text-right font-mono text-gray-700">
                            {formatRupiah(item.harga_per_kg)}
                          </td>

                          <td className="py-2 px-3 border-r border-gray-200 text-center">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-xs ${
                              item.ganti_tikar ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {item.ganti_tikar ? 'Ganti (+75rb)' : 'Standar'}
                            </span>
                          </td>

                          <td className="py-2 px-3 border-r border-gray-200 text-center font-mono font-bold text-gray-900">
                            {isWeighed ? `${item.berat_bruto_kg} kg` : <span className="text-amber-600">Belum timbang</span>}
                          </td>

                          <td className="py-2 px-3 border-r border-gray-200 text-center font-mono text-gray-600">
                            {item.potongan_tara_kg || (item.ganti_tikar ? 2 : 3)} kg
                          </td>

                          <td className="py-2 px-3 border-r border-gray-200 text-center font-mono font-black text-emerald-800">
                            {isWeighed ? `${item.berat_kg} kg` : '-'}
                          </td>

                          <td className="py-2 px-3 border-r border-gray-200 font-medium text-gray-800">
                            {item.lokasi_simpan || '-'}
                          </td>

                          <td className="py-2 px-3 border-r border-gray-200 text-right font-mono text-red-600 font-medium">
                            {isWeighed ? `-${formatRupiah(item.potongan)}` : '-'}
                          </td>

                          <td className="py-2 px-3 border-r border-gray-200 text-right font-mono font-bold text-[#b81d24]">
                            {isWeighed ? formatRupiah(item.subtotal_bersih) : '-'}
                          </td>

                          <td className="py-2 px-2.5 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectBal(item);
                              }}
                              className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-xs text-[10px]"
                            >
                              Timbang
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Summary Strip */}
              <div className="p-3.5 bg-gray-50 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="flex justify-between border-r border-gray-200 pr-3">
                  <span className="text-gray-500">Total Berat Netto:</span>
                  <span className="font-black font-mono text-emerald-800 text-sm">{totalBeratNetto} kg</span>
                </div>
                <div className="flex justify-between border-r border-gray-200 pr-3">
                  <span className="text-gray-500">Total Kotor:</span>
                  <span className="font-bold font-mono text-gray-900">{formatRupiah(totalKotorAll)}</span>
                </div>
                <div className="flex justify-between border-r border-gray-200 pr-3">
                  <span className="text-gray-500">Total Potongan:</span>
                  <span className="font-bold font-mono text-red-600">-{formatRupiah(totalPotonganAll)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-bold">Total Pembayaran Bersih:</span>
                  <span className="font-black font-mono text-[#b81d24] text-sm">{formatRupiah(totalHargaFinalAll)}</span>
                </div>
              </div>
            </div>

            {/* Petugas Timbang & Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Petugas Timbang (Otomatis by Akun Logged-in):
                </label>
                <div className="w-full bg-gray-50 border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-900 flex items-center justify-between">
                  <span className="font-bold text-gray-900">
                    {currentUser?.nama_lengkap || 'Operator Timbang Digital'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-xs font-semibold border border-emerald-200">
                    Audit Log Aktif
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-200 text-[11px] text-blue-950 flex items-center space-x-2">
                <Info className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  Setelah penimbangan disimpan, seluruh bal otomatis terdaftar di inventaris <strong>Barang Gudang</strong> dan status kupon dapat dicetak notanya.
                </span>
              </div>
            </div>

            {/* Form Footer Action */}
            <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="text-[11px] text-gray-500 font-mono">
                {isAllWeighed ? '✓ Semua bal telah ditimbang dan siap dicetak nota' : `⏳ ${weighedBalCount} dari ${totalBalCount} bal selesai ditimbang`}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Selesaikan Penimbangan & Masukkan ke Blok Gudang</span>
                </button>
              </div>
            </div>

          </form>

        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        title="Konfirmasi Penimbangan Selesai & Simpan Inventaris"
        message={`Apakah Anda yakin ingin menyimpan penimbangan ${weighedBalCount} bal tembakau untuk Petani ${currentTx?.nama_petani}?\n\nTotal Berat Netto: ${totalBeratNetto} kg\nTotal Bayar Bersih: ${formatRupiah(totalHargaFinalAll)}\n\nBal akan otomatis didaftarkan ke inventaris stok gudang di blok masing-masing.`}
        confirmLabel="Ya, Selesaikan & Masukkan ke Gudang"
        isDestructive={false}
        onConfirm={handleConfirmFinalSave}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </>
  );
};

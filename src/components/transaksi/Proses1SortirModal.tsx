import { SearchableSelect } from '../common/SearchableSelect';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  CheckCircle2, 
  Tag, 
  AlertCircle, 
  Layers, 
  Barcode as BarcodeIcon,
  Sparkles,
  Info,
  Calendar,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Petani, TabelHarga, TransaksiPembelian, TransaksiItemBal, Gudang, User as UserType, Barang } from '../../types';
import { formatRupiah, formatNoKupon, generateTransaksiId, hitungPotonganTaraKg } from '../../utils/formatters';
import { loadTransaksiData } from '../../utils/storage';
import { ConfirmModal } from '../common/ConfirmModal';

interface Proses1SortirModalProps {
  isOpen: boolean;
  onClose: () => void;
  petaniList: Petani[];
  hargaList: TabelHarga[];
  gudangList?: Gudang[];
  barangList: Barang[];
  currentUser?: UserType | null;
  onSaveSortir: (newTx: TransaksiPembelian) => void;
}

interface SortirBalItem {
  id: string;
  barcode: string; // Barcode stiker fisik eksternal (misal: A0001)
  noBal: string;   // Nomor bal identik dengan stiker
  kodeGrade: string;
  hargaPerKg: number;
  potonganKuli: number; // 7.000
  potonganTali: number; // 3.000
    catatan?: string;
  scannedAt?: string;
}

export const Proses1SortirModal: React.FC<Proses1SortirModalProps> = ({
  isOpen,
  onClose,
  petaniList,
  hargaList,
  gudangList = [],
  barangList,
  currentUser,
  onSaveSortir,
}) => {
  const [noKupon, setNoKupon] = useState(() => {
    try {
      const existingTx = loadTransaksiData();
      let maxNum = 0;
      existingTx.forEach((tx) => {
        const m = (tx.no_kupon || '').match(/\d+/);
        if (m) {
          const n = parseInt(m[0], 10);
          if (n > maxNum) maxNum = n;
        }
      });
      return `KUP${String(maxNum + 1).padStart(4, '0')}`;
    } catch {
      return 'KUP0001';
    }
  });
  const [selectedPetaniId, setSelectedPetaniId] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [lokasiGudang, setLokasiGudang] = useState(gudangList?.[0]?.nama_gudang || 'Gudang Utama Pamekasan');
  const [adminSortirNama, setAdminSortirNama] = useState('Admin 1 & 2 (Meja Sortir Intake)');
  const [petugasSortirNama, setPetugasSortirNama] = useState(currentUser?.nama_lengkap || 'Sistem');
  const [catatan, setCatatan] = useState('');

  // Default active options for new scanned rows
  const activeFarmers = petaniList.filter((p) => p.status_aktif);
  const activeGrades = hargaList.filter((h) => h.status === 'aktif');
  const defaultGrade = activeGrades[0]?.kode_grade || '50';
  const defaultPrice = activeGrades[0]?.harga_per_kg || 50000;

  const [activeDefaultGrade, setActiveDefaultGrade] = useState('');
  const [activeDefaultGantiTikar, setActiveDefaultGantiTikar] = useState(false);

  // Barcode Gun Scanner input state
  const [scannerInputValue, setScannerInputValue] = useState('');
  const [scannerFeedback, setScannerFeedback] = useState<{ text: string; isError: boolean; code?: string } | null>(null);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const gradeSelectRef = useRef<HTMLSelectElement>(null);

  // Bal items on Sortir Table
  const [balItems, setBalItems] = useState<SortirBalItem[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      const existingTx = loadTransaksiData();
      let maxNum = 0;
      existingTx.forEach(tx => {
        const match = (tx.no_kupon || '').match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      const nextNum = maxNum + 1;
      setNoKupon(`KUP${String(nextNum).padStart(4, '0')}`);

      if (activeFarmers.length > 0 && !selectedPetaniId) {
        setSelectedPetaniId(activeFarmers[0].petani_id);
      }
      setActiveDefaultGrade(activeGrades[0]?.kode_grade || 'A');
      setActiveDefaultGantiTikar(false);
      setBalItems([]); // Empty start: scanner gun creates rows as external stickers are scanned
      setScannerInputValue('');
      setScannerFeedback(null);
      setLastScannedId(null);
      setIsConfirmOpen(false);

      // Auto-focus scanner input
      setTimeout(() => {
        if (scannerInputRef.current) {
          scannerInputRef.current.focus();
        }
      }, 200);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPetani = activeFarmers.find((p) => p.petani_id === selectedPetaniId) || activeFarmers[0];

  const getPriceForGrade = (grade: string) => {
    const found = activeGrades.find((h) => h.kode_grade === grade);
    return found?.harga_per_kg || defaultPrice;
  };

  // Add a manual row (if barcode scanner is not used or to type manually)
  const handleAddManualRow = () => {
    if (!activeDefaultGrade) {
      alert('Pilih Mutu/Grade terlebih dahulu sebelum menambah baris!');
      return;
    }
    const isValidGrade = activeGrades.some(g => g.kode_grade === activeDefaultGrade);
    if (!isValidGrade) {
      alert(`Grade "${activeDefaultGrade}" tidak terdaftar di Master Harga Beli!`);
      return;
    }
    const newId = `sortir-${Date.now()}-${balItems.length + 1}`;
    const price = getPriceForGrade(activeDefaultGrade);
    const newRow: SortirBalItem = {
      id: newId,
      barcode: '',
      noBal: '',
      kodeGrade: activeDefaultGrade,
      hargaPerKg: price,
            potonganKuli: 7000,
      potonganTali: 3000,
            catatan: '',
      scannedAt: new Date().toLocaleTimeString('id-ID'),
    };
    setBalItems((prev) => [...prev, newRow]);
    setLastScannedId(newId);
    setActiveDefaultGrade('');
  };

  // Continuous Barcode Gun Scanner Handler:
  // When scanner guns read external sticker (e.g. A0001):
  // 1st scan -> fills 1st row (or creates it)
  // 2nd scan -> automatically adds a new row below with code A0002
  // 3rd scan -> automatically adds 3rd row with code A0003, and keeps focus ready for next scan!
  const handleScannerSubmit = (e?: React.FormEvent) => {
    if (!activeDefaultGrade) {
      gradeSelectRef.current?.focus();
      setScannerFeedback({ text: 'Pilih Mutu/Grade terlebih dahulu!', isError: true });
      return;
    }
    const isValidGrade = activeGrades.some(g => g.kode_grade === activeDefaultGrade);
    if (!isValidGrade) {
      gradeSelectRef.current?.focus();
      setScannerFeedback({ text: `Grade "${activeDefaultGrade}" tidak terdaftar di Master Harga Beli!`, isError: true });
      return;
    }
    if (e) e.preventDefault();
    const cleanCode = scannerInputValue.trim();
    if (!cleanCode) return;

    // 1. Check for duplicates in current session
    const existingIndex = balItems.findIndex(
      (item) => item.barcode.toUpperCase() === cleanCode.toUpperCase() || item.noBal.toUpperCase() === cleanCode.toUpperCase()
    );

    if (existingIndex !== -1) {
      setScannerFeedback({
        text: `Peringatan: Stiker Barcode "${cleanCode}" sudah pernah discan pada Baris No. ${existingIndex + 1}!`,
        isError: true,
        code: cleanCode,
      });
      setScannerInputValue('');
      if (scannerInputRef.current) {
        scannerInputRef.current.focus();
      }
      return;
    }

    const price = getPriceForGrade(activeDefaultGrade);
    const newId = `sortir-${Date.now()}-${balItems.length + 1}`;

    // 2. Check if there's an existing empty row at the end to fill
    const lastEmptyIndex = balItems.findIndex((it) => !it.barcode && !it.noBal);

    if (lastEmptyIndex !== -1) {
      // Fill the empty row
      setBalItems((prev) =>
        prev.map((it, idx) =>
          idx === lastEmptyIndex
            ? {
                ...it,
                barcode: cleanCode,
                noBal: cleanCode,
                kodeGrade: activeDefaultGrade,
                hargaPerKg: price,
                                                scannedAt: new Date().toLocaleTimeString('id-ID'),
              }
            : it
        )
      );
      setLastScannedId(balItems[lastEmptyIndex].id);
    } else {
      // Create a brand new row below
      const newRow: SortirBalItem = {
        id: newId,
        barcode: cleanCode,
        noBal: cleanCode,
        kodeGrade: activeDefaultGrade,
        hargaPerKg: price,
                potonganKuli: 7000,
        potonganTali: 3000,
                catatan: '',
        scannedAt: new Date().toLocaleTimeString('id-ID'),
      };
      setBalItems((prev) => [...prev, newRow]);
      setLastScannedId(newId);
    }

    setScannerFeedback({
      text: `✓ Stiker Barcode "${cleanCode}" BERHASIL MASUK (Grade ${activeDefaultGrade}). Siap scan bal berikutnya...`,
      isError: false,
      code: cleanCode,
    });

    setScannerInputValue('');

    // Re-focus scanner input for continuous gun scanning
    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
    setActiveDefaultGrade('');
  };

  // Update item field
  const handleUpdateItem = (id: string, field: keyof SortirBalItem, value: any) => {
    setBalItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };
        if (field === 'kodeGrade') {
          updated.hargaPerKg = getPriceForGrade(value);
        }
        return updated;
      })
    );
  };

  // Remove row
  const handleRemoveRow = (id: string) => {
    setBalItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations for sorting summary
  const totalBal = balItems.length;
  const countGantiTikar = balItems.filter((i) => i.gantiTikar).length;
  const totalPotonganKuli = totalBal * 7000;
  const totalPotonganTali = totalBal * 3000;
  const totalPotonganTikar = countGantiTikar * 75000;
  const totalPotonganSortir = totalPotonganKuli + totalPotonganTali + totalPotonganTikar;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPetani) {
      alert('Pilih petani penyetor terlebih dahulu.');
      return;
    }

    if (balItems.length === 0) {
      alert('Belum ada bal tembakau yang discan. Silakan tembak stiker barcode eksternal pada karung bal tembakau.');
      if (scannerInputRef.current) scannerInputRef.current.focus();
      return;
    }

    // Check if any barcodes are empty
    const emptyRow = balItems.find((item) => !item.barcode.trim() && !item.noBal.trim());
    if (emptyRow) {
      alert('Ada baris bal yang belum memiliki kode stiker barcode. Silakan scan barcode atau hapus baris kosong.');
      return;
    }

    
    // Check for duplicates
    const duplicateBals: string[] = [];
    const localSet = new Set<string>();
    
    for (const item of balItems) {
      const code = item.noBal.trim().toUpperCase();
      if (!code) continue;
      
      const isDuplicateMaster = barangList.some(b => b.no_bal.toUpperCase() === code);
      if (isDuplicateMaster || localSet.has(code)) {
        duplicateBals.push(code);
      }
      localSet.add(code);
    }

    if (duplicateBals.length > 0) {
      alert(`Nomor Bal berikut sudah dipakai (ada di master data Gudang atau ganda di form ini):
- ${duplicateBals.join(', ')}

Silakan ganti nomor bal tersebut sebelum melanjutkan!`);
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    const existingTx = loadTransaksiData();
    const txId = generateTransaksiId(tanggal, existingTx);
    const seqPart = txId.split('-')[2] || '001';
    const kuponNo = noKupon.trim() || `KUP${seqPart.padStart(4, '0')}`;

    // Distinct grades summary
    const uniqueGrades: string[] = Array.from(new Set(balItems.map((i) => i.kodeGrade)));
    const primaryGrade: string = uniqueGrades.length === 1 ? uniqueGrades[0] : uniqueGrades.join(', ');

    // Prepare items for transaction
    const transactionItems: TransaksiItemBal[] = balItems.map((item, idx) => {
      const potonganTikarVal = item.gantiTikar ? 75000 : 0;
      const totalPotonganPerBal = 7000 + 3000 + potonganTikarVal;
      const taraKg = 2; // Default tara

      return {
        item_id: `tx-item-${idx + 1}`,
        no_bal: item.noBal.trim() || item.barcode.trim(),
        barcode: item.barcode.trim() || item.noBal.trim(),
        kode_grade: item.kodeGrade,
        harga_per_kg: item.hargaPerKg,
        ganti_tikar: false,
        berat_bruto_kg: 0, // Belum ditimbang di proses 1
        potongan_tara_kg: taraKg,
        berat_kg: 0, // Menunggu proses timbang
        potongan_kuli: 7000,
        potongan_tali: 3000,
        potongan_tikar: potonganTikarVal,
        potongan: totalPotonganPerBal,
        total_kotor: 0,
        subtotal_bersih: 0,
        status_timbang: 'menunggu_timbang',
        sample_label_code: item.barcode.trim() || item.noBal.trim(),
        sample_label_printed: true,
        catatan: item.catatan || '',
      };
    });

    const newTx: TransaksiPembelian = {
      transaksi_id: txId,
      no_kupon: kuponNo,
      petani_id: currentPetani.petani_id,
      nama_petani: currentPetani.nama_petani,
            no_hp: currentPetani.no_hp,
      desa_kecamatan: (currentPetani.alamat || currentPetani.desa_kecamatan || '') as string,
      no_bal: balItems.map((i) => i.noBal.trim()).join(', '),
      kode_grade: primaryGrade,
      total_bal: totalBal,
      bal_selesai_timbang: 0,
      items: transactionItems,
      barang_ids: [],
      jenis_timbang: 'bruto',
      berat_terukur_kg: 0,
      potongan_tara_kg: balItems.reduce((acc, curr) => acc + hitungPotonganTaraKg(0, curr.gantiTikar || false, curr.noBal), 0),
      berat_kg: 0,
      lokasi_gudang: lokasiGudang.trim() || 'Gudang Utama Pamekasan',
      harga_per_kg: balItems[0]?.hargaPerKg || 0,
      total_kotor: 0,
      potongan_kuli: totalPotonganKuli,
      potongan_tali: totalPotonganTali,
      potongan_tikar: totalPotonganTikar,
      total_potongan: totalPotonganSortir,
      total_harga_beli: 0,
      harga_final: 0,
      status_transaksi: 'menunggu',
      status_tahap: 'menunggu_timbang',
      status_nota: 'belum_cetak',
      tanggal_transaksi: tanggal, // YYYY-MM-DD
      operator_nama: adminSortirNama,
      petugas_sortir: petugasSortirNama,
      catatan: catatan.trim(),
    };

    onSaveSortir(newTx);

    // Record audit log for Sortir & Intake Bal registration
    

    setIsConfirmOpen(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#b81d24]/40 flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
        <div className="bg-white border border-gray-300 w-full max-w-6xl rounded-none shadow-2xl max-h-[94vh] flex flex-col text-xs text-gray-800">
          
          {/* Top Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Scan className="w-4 h-4 text-[#b81d24]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2"></div>
                <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate mt-0.5">
                  Input Sortir & Perekaman Stiker Barcode Tembakau
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
                <span>Batal / Tutup</span>
              </button>
            </div>
          </div>

          {/* Workflow Steps Indicator Banner */}
          <div className="bg-slate-50 border-b border-gray-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="w-5 h-5 rounded-full bg-[#b81d24] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                1
              </span>
              <span><strong>Pilih Petani:</strong> Verifikasi data penyetor tembakau</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="w-5 h-5 rounded-full bg-[#b81d24] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                2
              </span>
              <span><strong>Scan Stiker Fisik:</strong> Tembak barcode (misal A0001 ➔ auto baris baru A0002)</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                3
              </span>
              <span><strong>Tentukan Grade & Tikar:</strong> Grade A-F & centang ganti tikar (+75rb)</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                4
              </span>
              <span><strong>Simpan & Sampel QC:</strong> Cetak label sampel & antrian siap ditimbang</span>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* Header Metadata Section (Kupon, Petani, Tanggal, Lokasi, Petugas) */}
            <div className="p-4 bg-gray-50 border border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              
              {/* No Kupon Input */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  1. No. Kupon Antrian <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={noKupon}
                  onChange={(e) => setNoKupon(formatNoKupon(e.target.value))}
                  className="w-full bg-white border-2 border-red-500 rounded-sm px-2.5 py-1.5 text-xs text-gray-900 font-mono font-bold focus:outline-none focus:border-[#b81d24]"
                  placeholder="Contoh: KUP0001"
                  required
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Sesuai kupon antrian fisik petani
                </p>
              </div>

              {/* Petani Dropdown */}
              <div className="sm:col-span-1 md:col-span-1">
                <label className="block text-gray-700 font-bold mb-1">
                  2. Petani Penyetor <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={selectedPetaniId}
                  onChange={(v) => setSelectedPetaniId(v)}
                  options={activeFarmers.map(p => ({ value: p.petani_id, label: `${p.nama_petani} (${p.petani_id})` }))}
                  placeholder="Cari Petani..."
                />
                {currentPetani && (
                  <p className="text-[10px] text-gray-500 mt-1 font-mono truncate">
                    Desa: {currentPetani.alamat}
                  </p>
                )}
              </div>

              {/* Tanggal Transaksi (YYYY-MM-DD) */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  3. Tanggal Masuk <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-900 font-mono focus:outline-none focus:border-[#b81d24]"
                  required
                />
              </div>

              {/* Lokasi Gudang Intake */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  4. Gudang Intake
                </label>
                <SearchableSelect
                  value={lokasiGudang}
                  onChange={(val) => setLokasiGudang(val)}
                  options={gudangList && gudangList.length > 0
                    ? gudangList.map((g) => ({ value: g.nama_gudang, label: g.nama_gudang }))
                    : [
                        { value: 'Gudang Utama Pamekasan', label: 'Gudang Utama Pamekasan' },
                        { value: 'Gudang Produksi Rokok', label: 'Gudang Produksi Rokok' },
                        { value: 'Gudang Sumenep', label: 'Gudang Sumenep' }
                      ]}
                />
              </div>

              {/* Petugas Sortir & Grader */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  5. Petugas Sortir / Grader
                </label>
                <input
                  type="text"
                  value={petugasSortirNama}
                  readOnly
                  disabled
                  className="w-full bg-gray-50 border border-gray-200 rounded-sm px-2.5 py-1.5 text-xs text-gray-500 cursor-not-allowed"
                />
              </div>

            </div>

            {/* Quick Defaults Configuration Bar */}
            <div className="p-3 bg-white border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-700">Preset Default Bal Baru Saat Scan:</span>
              </div>

              <div className="flex flex-wrap items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Grade Default:</span>
                  <SearchableSelect
                    value={activeDefaultGrade}
                    onChange={(val) => {
                       setActiveDefaultGrade(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (activeDefaultGrade) {
                          if (scannerInputValue.trim()) {
                            handleScannerSubmit();
                          } else {
                            handleAddManualRow();
                          }
                        }
                      }
                    }}
                    allowCustom={true}
                    options={activeGrades.map(g => ({ value: g.kode_grade, label: `Grade ${g.kode_grade} (${formatRupiah(g.harga_per_kg)}/kg)` }))}
                    placeholder="Contoh: A0001..."
                  />
                </div>

                <label className="inline-flex items-center space-x-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={activeDefaultGantiTikar}
                    onChange={(e) => setActiveDefaultGantiTikar(e.target.checked)}
                    className="w-4 h-4 text-[#b81d24] rounded-xs border-gray-300 focus:ring-[#b81d24]"
                  />
                  <span className="font-bold text-gray-700 text-[11px]">
                    Default Ganti Tikar (+Rp 75rb)
                  </span>
                </label>
              </div>
            </div>

            {/* Barcode Gun Fast-Input Continuous Box (Admin 1 & 2) */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 via-indigo-50/70 to-blue-50 border-2 border-rose-300 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <div className="w-9 h-9 rounded-sm bg-[#b81d24] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Scan className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-rose-900 uppercase block tracking-wider">
                    SCANNER GUN STIKER EKSTERNAL (CONTINUOUS AUTO-ROW)
                  </span>
                  <span className="text-xs font-semibold text-gray-900">
                    Tembak stiker barcode fisik karung (misal: <code className="bg-rose-100 text-rose-900 px-1 py-0.5 rounded font-mono font-bold">A0001</code> ➔ <code className="bg-rose-100 text-rose-900 px-1 py-0.5 rounded font-mono font-bold">A0002</code>):
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto flex-1 max-w-lg">
                <div className="relative flex-1">
                  <input
                    ref={scannerInputRef}
                    type="text"
                    value={scannerInputValue}
                    onChange={(e) => setScannerInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScannerSubmit(e);
                      }
                    }}
                    placeholder="Scan stiker barcode fisik (misal: A0001)..."
                    className="w-full bg-white border-2 border-[#b81d24] font-mono font-black text-sm rounded-sm px-3 py-2 text-gray-900 shadow-inner focus:outline-none focus:border-rose-800"
                    autoFocus
                  />
                  <span className="absolute right-2.5 top-2.5 text-[10px] text-gray-400 font-mono">
                    Auto-Focus ↵
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleScannerSubmit()}
                  className="px-4 py-2 bg-[#b81d24] hover:bg-[#9e161c] text-white font-bold rounded-sm transition cursor-pointer text-xs shrink-0 shadow-xs"
                >
                  Scan Bal
                </button>
              </div>
            </div>

            {/* Scanner Live Feedback Toast */}
            {scannerFeedback && (
              <div className={`px-3 py-2 rounded-xs text-xs font-bold flex items-center space-x-2 transition-all ${
                scannerFeedback.isError 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs animate-in fade-in'
              }`}>
                {scannerFeedback.isError ? (
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                )}
                <span>{scannerFeedback.text}</span>
              </div>
            )}

            {/* Sortir Bal Items Table */}
            <div className="border border-gray-200">
              
              <div className="p-3 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide">
                    Daftar Bal Tembakau di Meja Sortir ({balItems.length} Bal Terdata)
                  </h3>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 font-mono text-[10px] rounded-xs">
                    Berat masih 0 kg (Ditimbang pada Meja Timbang Proses 2)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleAddManualRow}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 font-bold rounded-sm transition flex items-center space-x-1 cursor-pointer text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#b81d24]" />
                    <span>Tambah Baris Manual</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8f9fa] border-b border-gray-200 text-gray-700 font-bold">
                      <th className="py-2 px-2.5 text-center border-r border-gray-200 w-10">No</th>
                      <th className="py-2 px-3 border-r border-gray-200 w-44">
                        <div className="flex items-center space-x-1">
                          <BarcodeIcon className="w-3.5 h-3.5 text-rose-700" />
                          <span>Kode Stiker Barcode / Bal</span>
                        </div>
                      </th>
                      <th className="py-2 px-3 border-r border-gray-200 w-36">
                        Grade Tembakau
                      </th>
                      <th className="py-2 px-3 border-r border-gray-200 w-36 text-right">
                        Tarif Acuan / Kg (Rp)
                      </th>
                      
                      <th className="py-2 px-3 border-r border-gray-200 text-right w-36">
                        Potongan Biaya Bal
                      </th>
                      <th className="py-2 px-3 border-r border-gray-200 text-center w-28">
                        Tara Timbang
                      </th>
                      <th className="py-2 px-2.5 text-center w-12">Hapus</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {balItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-500 bg-gray-50/50">
                          <div className="max-w-md mx-auto space-y-2">
                            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-[#b81d24]">
                              <Scan className="w-5 h-5" />
                            </div>
                            <p className="font-bold text-gray-800 text-xs">
                              Belum ada bal yang discan.
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Tembak stiker barcode fisik (misal: <strong>A0001</strong>) dengan scanner gun di atas. Sistem akan otomatis mengisi nomor bal dan membuat baris baru setiap kali scan berikutnya dilakukan.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      balItems.map((item, index) => {
                        const totalPotonganItem = item.potonganKuli + item.potonganTali;
                        const taraKg = 2; // Default tara
                        const isLatest = item.id === lastScannedId;

                        return (
                          <tr 
                            key={item.id} 
                            className={`transition-colors ${
                              isLatest ? 'bg-rose-50/60 font-semibold' : 'hover:bg-gray-50/80'
                            }`}
                          >
                            
                            <td className="py-2 px-2.5 text-center border-r border-gray-200 font-mono text-gray-500">
                              {index + 1}
                            </td>

                            {/* Barcode & No Bal Input */}
                            <td className="py-2 px-3 border-r border-gray-200">
                              {(() => {
                                const code = item.barcode.trim().toUpperCase();
                                const isDupMaster = code ? barangList.some(b => b.no_bal.toUpperCase() === code) : false;
                                const isDupLocal = code ? balItems.filter(b => b.id !== item.id).some(b => b.barcode.toUpperCase() === code) : false;
                                const hasError = isDupMaster || isDupLocal;
                                return (
                                  <>
                                    <input
                                      id={`nobal-${item.id}`}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          document.getElementById(`grade-${item.id}`)?.focus();
                                        }
                                      }}
                                      type="text"
                                      autoComplete="off"
                                      value={item.barcode}
                                      onChange={(e) => {
                                        let val = e.target.value.toUpperCase();
                                        // Auto-remove hyphens if user types them (optional, but good UX based on user req)
                                        val = val.replace(/-/g, '');
                                        handleUpdateItem(item.id, 'barcode', val);
                                        handleUpdateItem(item.id, 'noBal', val);
                                      }}
                                      onBlur={() => {
                                        if (hasError) {
                                          alert(`Nomor Bal "${item.barcode}" sudah terpakai! Silakan ganti dengan yang lain.`);
                                        }
                                      }}
                                      className={`w-full bg-white border rounded-sm px-2.5 py-1 font-mono font-bold text-xs focus:outline-none ${hasError ? 'border-red-500 text-red-600 focus:border-red-600 bg-red-50' : 'border-gray-300 text-gray-900 focus:border-[#b81d24]'}`}
                                      placeholder="Contoh: SB0001"
                                      required
                                    />
                                    {hasError && (
                                      <p className="text-[10px] text-red-600 mt-0.5 leading-tight text-left">
                                        Sudah dipakai
                                      </p>
                                    )}
                                  </>
                                );
                              })()}
                            </td>

                            {/* Grade Selection */}
                            <td className="py-2 px-3 border-r border-gray-200">
                              <SearchableSelect
                                inputId={`grade-${item.id}`}
                                value={item.kodeGrade}
                                onChange={(v) => {
                                  handleUpdateItem(item.id, 'kodeGrade', v);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddManualRow();
                                  }
                                }}
                                options={activeGrades.map(g => ({ value: g.kode_grade, label: `Grade ${g.kode_grade} (${formatRupiah(g.harga_per_kg)}/kg)` }))}
                                placeholder="Grade..."
                              />
                            </td>

                            {/* Harga / Kg */}
                            <td className="py-2 px-3 border-r border-gray-200 text-right font-mono">
                              <input
                                id={`harga-${item.id}`}
                                type="number"
                                disabled
                                value={item.hargaPerKg}
                                onChange={(e) => handleUpdateItem(item.id, 'hargaPerKg', Number(e.target.value) || 0)}
                                className="w-28 bg-gray-100 border border-gray-300 rounded-sm px-2 py-1 text-right font-mono font-bold text-gray-500 text-xs focus:outline-none cursor-not-allowed"
                              />
                            </td>

                            

                            {/* Potongan Biaya Rincian */}
                            <td className="py-2 px-3 border-r border-gray-200 text-right font-mono">
                              <div className="font-bold text-red-600">
                                -{formatRupiah(totalPotonganItem)}
                              </div>
                              <div className="text-[9px] text-gray-500">
                                Kuli 7rb + Tali 3rb 
                              </div>
                            </td>

                            {/* Tara Timbang */}
                            <td className="py-2 px-3 border-r border-gray-200 text-center">
                              <span className={`px-2 py-0.5 rounded-xs font-mono font-bold text-xs ${
                                item.gantiTikar ? 'bg-amber-100 text-amber-800' : 'bg-rose-50 text-rose-800'
                              }`}>
                                {taraKg} kg
                              </span>
                              <div className="text-[9px] text-gray-400 mt-0.5">
                                'Tara Standar'
                              </div>
                            </td>

                            {/* Remove row */}
                            <td className="py-2 px-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(item.id)}
                                className="text-gray-400 hover:text-red-600 cursor-pointer"
                                title="Hapus Baris Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Summary Strip */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="flex justify-between border-r border-gray-200 pr-3">
                  <span className="text-gray-500">Total Bal Disortir:</span>
                  <span className="font-bold font-mono text-gray-900">{totalBal} Karung</span>
                </div>
                <div className="flex justify-between border-r border-gray-200 pr-3">
                  <span className="text-gray-500">Ganti Tikar:</span>
                  <span className="font-bold font-mono text-[#b81d24]">{countGantiTikar} Bal</span>
                </div>
                <div className="flex justify-between border-r border-gray-200 pr-3">
                  <span className="text-gray-500">Potongan Kuli & Tali:</span>
                  <span className="font-bold font-mono text-gray-800">{formatRupiah(totalPotonganKuli + totalPotonganTali)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold">Total Potongan Biaya:</span>
                  <span className="font-bold font-mono text-red-600">-{formatRupiah(totalPotonganSortir)}</span>
                </div>
              </div>

            </div>

            {/* Catatan Tambahan */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Catatan Sortir / Kondisi Fisik Tembakau:
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Mutu daun petikan tengah, warna kuning kemerahan merata..."
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#b81d24]"
              />
            </div>

            {/* Form Footer Action */}
            <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="text-[11px] text-gray-500 font-mono">
                * Barcode stiker fisik (misal: A0001) tersimpan tanpa generate internal ERP
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
                  disabled={balItems.length === 0}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-sm transition flex items-center space-x-1.5 shadow-sm ${
                    balItems.length > 0 
                      ? 'bg-[#b81d24] hover:bg-[#a0181e] cursor-pointer' 
                      : 'bg-gray-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Simpan Sortir & Buka Label Sample (Admin 3)</span>
                </button>
              </div>
            </div>

          </form>

        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Konfirmasi Penyelesaian Proses 1 Sortir"
        message={`Apakah Anda yakin ingin menyelesaikan proses sortir untuk Petani ${currentPetani?.nama_petani} sebanyak ${totalBal} bal tembakau?\n\nKode stiker barcode fisik (${balItems.map((b) => b.barcode).join(', ')}) akan disimpan dalam status "Menunggu Timbang" dan dilanjutkan ke Proses 2 Timbang.`}
        confirmLabel="Ya, Simpan & Buka Label Sample"
        isDestructive={false}
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
};

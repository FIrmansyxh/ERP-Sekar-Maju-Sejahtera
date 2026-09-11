import { SearchableSelect } from '../common/SearchableSelect';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  ChevronUp,
  ArrowLeft,
  Scale,
  Plus,
  Trash2,
  Copy,
  Layers,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { Petani, TabelHarga, TransaksiPembelian, Barang, Gudang, TransaksiItemBal } from '../../types';
import { getGudangLocationOptions } from '../../data/initialGudangData';
import { formatRupiah, generateBalId, generateNoBalSimple, generateNextUniqueNoBal, generateTransaksiId } from '../../utils/formatters';
import { loadTransaksiData } from '../../utils/storage';
import { ConfirmModal } from '../common/ConfirmModal';

interface TransaksiFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  petaniList: Petani[];
  hargaList: TabelHarga[];
  barangList?: Barang[];
  gudangList?: Gudang[];
  onSaveTransaksi: (newTx: TransaksiPembelian, generatedBarang: Barang | Barang[]) => void;
}

interface FormBalItem {
  id: string;
  noBal: string;
  kodeGrade: string;
  beratKg: number;
  potongan: number;
  catatan?: string;
}

export const TransaksiFormModal: React.FC<TransaksiFormModalProps> = ({
  isOpen,
  onClose,
  petaniList,
  hargaList,
  barangList = [],
  gudangList,
  onSaveTransaksi,
}) => {
  const gudangOptions = getGudangLocationOptions(gudangList);
  const [selectedPetaniId, setSelectedPetaniId] = useState('');
  const [operatorNama, setOperatorNama] = useState('Budi Hartono (Loket 1 - Pamekasan)');
  const [lokasiGudang, setLokasiGudang] = useState(gudangOptions[0] || 'Gudang Utama Pamekasan');
  const [catatan, setCatatan] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Active farmers & active grades
  const activePetani = petaniList.filter((p) => p.status_aktif);
  const activeGrades = hargaList.filter((h) => h.status === 'aktif');
  const defaultGrade = activeGrades[0]?.kode_grade || '50';

  // Batch Bal Items
  const [balItems, setBalItems] = useState<FormBalItem[]>([]);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (activePetani.length > 0 && !selectedPetaniId) {
        setSelectedPetaniId(activePetani[0].petani_id);
      }
      const initialNoBal = generateNextUniqueNoBal(defaultGrade, barangList, []);
      setBalItems([
        {
          id: `item-${Date.now()}-0`,
          noBal: initialNoBal,
          kodeGrade: defaultGrade,
          beratKg: 45.0,
          potongan: 9000,
          catatan: '',
        }
      ]);
      setIsConfirmOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPetani = activePetani.find((p) => p.petani_id === selectedPetaniId) || activePetani[0];

  // Helper to get price for a given grade
  const getGradePrice = (gradeCode: string) => {
    const found = activeGrades.find((h) => h.kode_grade === gradeCode);
    return found?.harga_per_kg || 0;
  };

  // Add 1 row with guaranteed unique No Bal
  const handleAddBalRow = (gradeToUse?: string) => {
    const grade = gradeToUse || defaultGrade;
    const uniqueNo = generateNextUniqueNoBal(grade, barangList, balItems);
    const newRow: FormBalItem = {
      id: `item-${Date.now()}-${balItems.length}`,
      noBal: uniqueNo,
      kodeGrade: grade,
      beratKg: 45.0,
      potongan: 9000,
      catatan: '',
    };
    setBalItems([...balItems, newRow]);
  };

  // Add 3 rows batch with guaranteed unique No Bal
  const handleAddMultipleBal = (count: number) => {
    const newRows: FormBalItem[] = [];
    const currentList = [...balItems];
    for (let i = 0; i < count; i++) {
      const uniqueNo = generateNextUniqueNoBal(defaultGrade, barangList, [...currentList, ...newRows]);
      newRows.push({
        id: `item-${Date.now()}-${balItems.length + i}`,
        noBal: uniqueNo,
        kodeGrade: defaultGrade,
        beratKg: 45.0,
        potongan: 9000,
        catatan: '',
      });
    }
    setBalItems([...balItems, ...newRows]);
  };

  // Remove row
  const handleRemoveRow = (id: string) => {
    if (balItems.length <= 1) return;
    setBalItems(balItems.filter((item) => item.id !== id));
  };

  // Duplicate row with guaranteed unique No Bal
  const handleDuplicateRow = (item: FormBalItem) => {
    const uniqueNo = generateNextUniqueNoBal(item.kodeGrade, barangList, balItems);
    const newRow: FormBalItem = {
      id: `item-${Date.now()}-${balItems.length}`,
      noBal: uniqueNo,
      kodeGrade: item.kodeGrade,
      beratKg: item.beratKg,
      potongan: item.potongan,
      catatan: item.catatan,
    };
    setBalItems([...balItems, newRow]);
  };

  // Update item field
  const handleItemChange = (id: string, field: keyof FormBalItem, value: any) => {
    setBalItems(
      balItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // If grade changed and user hasn't typed custom code, generate unique prefix for that grade
          if (field === 'kodeGrade') {
            const currentOthers = balItems.filter((b) => b.id !== id);
            updated.noBal = generateNextUniqueNoBal(value, barangList, currentOthers);
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Calculations & duplicate checks across all batch items
  const computedItems = balItems.map((item, index) => {
    const tarif = getGradePrice(item.kodeGrade);
    const berat = Number(item.beratKg) || 0;
    const totalKotor = berat * tarif;
    const potongan = Number(item.potongan) || 0;
    const subtotalBersih = Math.round(Math.max(0, totalKotor - potongan));

    const cleanNoBal = (item.noBal || '').trim();
    const isEmpty = cleanNoBal.length === 0;

    // Check duplicate in current batch
    const duplicateIndices = balItems
      .map((b, i) => (b.noBal.trim().toLowerCase() === cleanNoBal.toLowerCase() && cleanNoBal !== '' ? i + 1 : null))
      .filter((i): i is number => i !== null);
    const isDuplicateInBatch = duplicateIndices.length > 1;
    const otherDuplicateRows = duplicateIndices.filter((idx) => idx !== index + 1);

    // Check duplicate in warehouse inventory
    const existingInGudang = cleanNoBal !== ''
      ? barangList.find(
          (b) =>
            (b.no_bal && b.no_bal.trim().toLowerCase() === cleanNoBal.toLowerCase()) ||
            (b.barang_id && b.barang_id.trim().toLowerCase() === cleanNoBal.toLowerCase())
        )
      : undefined;

    let validationError: string | null = null;
    let errorType: 'empty' | 'batch_duplicate' | 'warehouse_exists' | 'invalid_grade' | null = null;

    if (isEmpty) {
      validationError = 'No Bal wajib diisi';
      errorType = 'empty';
    } else if (isDuplicateInBatch) {
      validationError = `No Bal duplikat dengan baris #${otherDuplicateRows.join(', #')}`;
      errorType = 'batch_duplicate';
    } else if (existingInGudang) {
      validationError = `No Bal sudah terdaftar di gudang (${existingInGudang.status_stok === 'di_gudang' ? 'Stok Aktif' : 'Terkirim'})`;
      errorType = 'warehouse_exists';
    } else if (!activeGrades.some((g) => g.kode_grade === item.kodeGrade)) {
      validationError = `Grade tidak valid / tidak terdaftar di Master Harga Beli`;
      errorType = 'invalid_grade';
    }

    return {
      ...item,
      tarif,
      totalKotor,
      potongan,
      subtotalBersih,
      validationError,
      errorType,
      isInvalid: Boolean(validationError),
    };
  });

  const invalidItems = computedItems.filter((i) => i.isInvalid);
  const hasValidationErrors = invalidItems.length > 0;

  const totalBalCount = computedItems.length;
  const totalBeratNetto = computedItems.reduce((acc, curr) => acc + (Number(curr.beratKg) || 0), 0);
  const totalKotorKeseluruhan = computedItems.reduce((acc, curr) => acc + curr.totalKotor, 0);
  const totalPotonganKeseluruhan = computedItems.reduce((acc, curr) => acc + curr.potongan, 0);
  const totalPembayaranPetani = computedItems.reduce((acc, curr) => acc + curr.subtotalBersih, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPetani || balItems.length === 0) return;

    // Validate weights
    const hasInvalidWeight = balItems.some((item) => !item.beratKg || item.beratKg <= 0);
    if (hasInvalidWeight) {
      alert('Mohon periksa kembali berat setiap bal (harus lebih dari 0 kg).');
      return;
    }

    // Validate duplicate / existing No Bal
    if (hasValidationErrors) {
      alert(
        `Terdapat ${invalidItems.length} baris dengan No Bal yang tidak valid, duplikat, atau sudah terdaftar di inventaris gudang.\n\nHarap perbaiki No Bal yang ditandai merah sebelum menyimpan transaksi.`
      );
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    const now = new Date();
    const dateFormatted = `${tanggal} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const existingTx = loadTransaksiData();
    const txId = generateTransaksiId(tanggal, existingTx);
    const seqPart = txId.split('-')[2] || '001';
    const seqNum = parseInt(seqPart, 10) || 1;

    // Distinct grades summary
    const uniqueGrades: string[] = Array.from(new Set(computedItems.map((i) => i.kodeGrade)));
    const primaryGrade: string = uniqueGrades.length === 1 ? uniqueGrades[0] : uniqueGrades.join(', ');

    // Generate individual Barang records for each bal
    const generatedBarangs: Barang[] = [];
    const transactionItems: TransaksiItemBal[] = [];
    const balNoList: string[] = [];

    computedItems.forEach((item, idx) => {
      const balSeq = seqNum * 10 + idx;
      const balId = generateBalId(item.kodeGrade, now, balSeq);
      const cleanNoBal = item.noBal.trim() || generateNoBalSimple(item.kodeGrade, balSeq);
      balNoList.push(cleanNoBal);

      transactionItems.push({
        item_id: `tx-item-${idx + 1}`,
        no_bal: cleanNoBal,
        kode_grade: item.kodeGrade,
        berat_kg: Number(item.beratKg),
        harga_per_kg: item.tarif,
        total_kotor: item.totalKotor,
        potongan: item.potongan,
        subtotal_bersih: item.subtotalBersih,
        barang_id: balId,
        catatan: item.catatan || '',
      });

      generatedBarangs.push({
        barang_id: balId,
        kode_grade: item.kodeGrade,
        no_bal: cleanNoBal,
        berat_kg: Number(item.beratKg),
        harga_per_kg: item.tarif,
        total_harga: Number(item.beratKg) * item.tarif,
        status_stok: 'di_gudang',
        lokasi_gudang: lokasiGudang.trim() || 'Gudang Utama Pamekasan',
        tanggal_masuk: dateFormatted,
        petani_id: currentPetani.petani_id,
        transaksi_pembelian_id: txId,
        nama_petani: currentPetani.nama_petani,
        desa_kecamatan: (currentPetani.alamat || currentPetani.desa_kecamatan || '') as string,
        catatan: item.catatan || catatan.trim() || `Timbang Intake Petani ${currentPetani.nama_petani} (Bal #${idx + 1})`,
      });
    });

    const newTx: TransaksiPembelian = {
      transaksi_id: txId,
      no_kupon: `KUP${String(seqNum).padStart(4, '0')}`,
      petani_id: currentPetani.petani_id,
      nama_petani: currentPetani.nama_petani,
            no_hp: currentPetani.no_hp,
      desa_kecamatan: (currentPetani.alamat || currentPetani.desa_kecamatan || '') as string,
      no_bal: balNoList.join(', '),
      kode_grade: primaryGrade,
      total_bal: totalBalCount,
      items: transactionItems,
      barang_ids: generatedBarangs.map((b) => b.barang_id),
      jenis_timbang: 'bruto',
      berat_terukur_kg: totalBeratNetto + totalBalCount * 2,
      potongan_tara_kg: totalBalCount * 2,
      berat_kg: totalBeratNetto,
      lokasi_gudang: lokasiGudang.trim() || 'Gudang Utama Pamekasan',
      harga_per_kg: computedItems[0]?.tarif || 0,
      total_kotor: totalKotorKeseluruhan,
      potongan_kuli: 7000 * totalBalCount,
      potongan_tikar: 2000 * totalBalCount,
      total_potongan: totalPotonganKeseluruhan,
      total_harga_beli: totalKotorKeseluruhan,
      harga_final: totalPembayaranPetani,
      status_transaksi: 'lengkap',
      tanggal_transaksi: dateFormatted,
      operator_nama: operatorNama.trim() || 'Budi Hartono (Loket 1 - Pamekasan)',
      barang_id_terkait: generatedBarangs[0]?.barang_id,
      barcode_terkait: generatedBarangs[0]?.barang_id,
      catatan: catatan.trim(),
    };

    onSaveTransaksi(newTx, generatedBarangs);
    setIsConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#b81d24]/40 flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
        <div className="bg-white border border-gray-300 w-full max-w-6xl rounded-none shadow-2xl max-h-[94vh] flex flex-col text-xs text-gray-800">
          
          {/* Top Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 text-[#b81d24]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                  Tambah Transaksi / Intake Tembakau (Batch Input)
                </h2>
                <p className="text-[11px] text-gray-500 font-medium">
                  Loket Timbang PR. Sekar Maju Sejahtera Pusat Pamekasan • Kupon Intake Petani
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap ${
                  hasValidationErrors
                    ? 'bg-red-600 hover:bg-red-700 ring-2 ring-red-300'
                    : 'bg-[#b81d24] hover:bg-[#a0181e]'
                }`}
              >
                {hasValidationErrors ? <AlertCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>Simpan Transaksi ({totalBalCount} Bal)</span>
              </button>
            </div>
          </div>

          {/* Form Body Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#f8f9fa]">
            
            {/* Intake Notice */}
            <div className="bg-rose-50/80 border border-rose-200 p-2.5 rounded-sm text-xs text-rose-900 flex items-start space-x-2">
              <Scale className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold">Proses Intake & Timbang 1 Kupon Petani:</span> Satu nomor kupon antri petani dapat memuat <span className="font-bold">lebih dari 1 bal</span> tembakau dengan grade dan berat berbeda. Isi data transaksi petani di atas, lalu tambahkan baris bal tembakau pada tabel detail di bawah untuk input langsung sekaligus dalam 1 kali transaksi.
              </div>
            </div>

            {/* Top Form Grid (Header Informasi Transaksi & Petani) */}
            <div className="bg-white p-4 border border-gray-300 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              
              {/* Left Column: Transaction Metadata */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <label className="w-32 text-gray-700 font-bold">No. Transaksi</label>
                  <input
                    type="text"
                    disabled
                    value="[Otomatis Digenerate]"
                    className="flex-1 bg-[#e9ecef] border border-[#ced4da] rounded-sm px-2.5 py-1.5 text-gray-500 font-mono text-xs"
                  />
                </div>

                <div className="flex items-center">
                  <label className="w-32 text-gray-700 font-bold">Tanggal Timbang</label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="flex-1 border border-[#ced4da] rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#b81d24] bg-white font-medium"
                  />
                </div>

                <div className="flex items-center">
                  <label className="w-32 text-gray-700 font-bold">Petugas Loket</label>
                  <input
                    type="text"
                    value={operatorNama}
                    onChange={(e) => setOperatorNama(e.target.value)}
                    className="flex-1 border border-[#ced4da] rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#b81d24] bg-white"
                  />
                </div>

                <div className="flex items-center">
                  <label className="w-32 text-gray-700 font-bold">Lokasi Gudang Masuk</label>
                  <SearchableSelect
                    value={lokasiGudang}
                    onChange={(val) => setLokasiGudang(val)}
                    options={gudangOptions.map(opt => ({ value: opt, label: opt }))}
                    placeholder="Pilih Gudang..."
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Right Column: Petani Lookup & Autofill */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <label className="w-32 text-gray-700 font-bold">Pilih Petani <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    value={selectedPetaniId}
                    onChange={(val) => setSelectedPetaniId(val)}
                    options={activePetani.map(p => ({ value: p.petani_id, label: `${p.nama_petani} (${p.petani_id}) - ${p.alamat || p.desa_kecamatan}` }))}
                    placeholder="Pilih Petani..."
                    className="flex-1"
                  />
                </div>

                <div className="flex items-center">
                  <label className="w-32 text-gray-700 font-medium">ID Petani</label>
                  <input
                    type="text"
                    disabled
                    value={currentPetani?.petani_id || '-'}
                    className="flex-1 bg-[#e9ecef] border border-[#ced4da] rounded-sm px-2.5 py-1.5 text-gray-700 font-mono font-bold text-xs"
                  />
                </div>

                <div className="flex items-center">
                  <label className="w-32 text-gray-700 font-medium">Alamat / Asal</label>
                  <input
                    type="text"
                    disabled
                    value={currentPetani?.alamat || currentPetani?.desa_kecamatan || '-'}
                    className="flex-1 bg-[#e9ecef] border border-[#ced4da] rounded-sm px-2.5 py-1.5 text-gray-700 text-xs"
                  />
                </div>

                <div className="flex items-center">
                  <label className="w-32 text-gray-700 font-medium">Telepon Petani</label>
                  <input
                    type="text"
                    disabled
                    value={currentPetani?.no_hp || '-'}
                    className="flex-1 bg-[#e9ecef] border border-[#ced4da] rounded-sm px-2.5 py-1.5 text-gray-700 font-mono text-xs font-semibold"
                  />
                </div>
              </div>

            </div>

            {/* Validation Banner if Duplicate or Existing No Bal Detected */}
            {hasValidationErrors && (
              <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-3 text-xs text-red-900 flex items-start space-x-2 rounded-xs shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Peringatan Validasi No Bal:</span>
                  <p className="mt-0.5 text-red-800">
                    Terdapat <strong>{invalidItems.length} baris</strong> dengan No Bal yang duplikat dalam antrean timbang ini atau sudah terdaftar di inventaris gudang. Harap perbaiki No Bal yang bertanda merah sebelum menyimpan.
                  </p>
                </div>
              </div>
            )}

            {/* Sub-Section: DETAIL TIMBANGAN & ORDER INTAKE BAL (Batch Add) */}
            <div className="border border-gray-300 rounded-none overflow-hidden bg-white shadow-xs">
              
              {/* Table Header Bar & Batch Controls */}
              <div className="bg-[#e9ecef] px-4 py-2.5 border-b border-gray-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">
                    DETAIL TIMBANGAN & ORDER INTAKE BAL
                  </span>
                  <span className="px-2 py-0.5 bg-red-100 text-[#b81d24] font-bold text-[10px] rounded-xs">
                    {totalBalCount} Bal
                  </span>
                  {hasValidationErrors && (
                    <span className="px-2 py-0.5 bg-red-600 text-white font-bold text-[10px] rounded-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {invalidItems.length} Bermasalah
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleAddBalRow()}
                    className="px-2.5 py-1 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-xs transition flex items-center space-x-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah 1 Bal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddMultipleBal(3)}
                    className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xs transition flex items-center space-x-1 cursor-pointer shadow-xs"
                  >
                    <Layers className="w-3.5 h-3.5 text-gray-500" />
                    <span>Tambah 3 Bal</span>
                  </button>
                </div>
              </div>

              {/* Bal Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f8f9fa] border-b border-gray-200 text-[11px] font-bold text-gray-700">
                      <th className="py-2.5 px-3 text-center border-r border-gray-200 w-12">No.</th>
                      <th className="py-2.5 px-3 border-r border-gray-200 min-w-[160px]">No Bal</th>
                      <th className="py-2.5 px-3 border-r border-gray-200 min-w-[200px]">Grade Tembakau</th>
                      <th className="py-2.5 px-3 border-r border-gray-200 text-center w-28">Berat (Kg)</th>
                      <th className="py-2.5 px-3 border-r border-gray-200 text-right w-36">Tarif Acuan / Kg</th>
                      <th className="py-2.5 px-3 border-r border-gray-200 text-right w-36">Total Kotor</th>
                      <th className="py-2.5 px-3 border-r border-gray-200 text-right w-32">Potongan</th>
                      <th className="py-2.5 px-3 text-right w-36">Subtotal Bersih</th>
                      <th className="py-2.5 px-2 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs">
                    {computedItems.map((item, index) => (
                      <tr key={item.id} className={`transition-colors ${item.isInvalid ? 'bg-red-50/40' : 'bg-white hover:bg-amber-50/30'}`}>
                        
                        {/* Number Index */}
                        <td className="py-2.5 px-3 text-center border-r border-gray-200 font-mono text-gray-500 font-bold align-top pt-3">
                          {index + 1}
                        </td>

                        {/* No Bal with validation alert */}
                        <td className="py-2 px-3 border-r border-gray-200 align-top">
                          <div className="space-y-1">
                            <div className="relative">
                              <input
                                type="text"
                                value={item.noBal}
                                onChange={(e) => handleItemChange(item.id, 'noBal', e.target.value)}
                                className={`w-full border rounded-xs px-2.5 py-1 font-mono text-xs font-bold transition ${
                                  item.isInvalid
                                    ? 'border-red-500 bg-red-50 text-red-900 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-600'
                                    : 'border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-[#b81d24]'
                                }`}
                                placeholder="A0031"
                              />
                              {item.isInvalid && (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 absolute right-2 top-2 pointer-events-none" />
                              )}
                            </div>

                            {/* Validation error message */}
                            {item.isInvalid && item.validationError && (
                              <div className="flex items-start gap-1 text-[10.5px] font-semibold text-red-600 leading-tight">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                                <span>{item.validationError}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Grade Tembakau Dropdown */}
                        <td className="py-2 px-3 border-r border-gray-200">
                          <SearchableSelect allowCustom={true} value={item.kodeGrade}
                            onChange={(val) => handleItemChange(item.id, 'kodeGrade', val)}
                            options={activeGrades.map(h => ({ value: h.kode_grade, label: `Grade ${h.kode_grade} (${formatRupiah(h.harga_per_kg)}/kg)` }))}
                            placeholder="Grade..."
                          />
                        </td>

                        {/* Berat (Kg) */}
                        <td className="py-2 px-3 border-r border-gray-200 text-center">
                          <div className="flex items-center space-x-1 justify-center">
                            <input
                              type="number"
                              step="0.1"
                              min="1"
                              value={item.beratKg}
                              onChange={(e) => handleItemChange(item.id, 'beratKg', Number(e.target.value))}
                              className="w-20 border border-gray-300 rounded-xs px-2 py-1 text-center font-bold font-mono text-xs focus:outline-none focus:border-[#b81d24] bg-white"
                            />
                            <span className="text-gray-500 font-medium text-[11px]">kg</span>
                          </div>
                        </td>

                        {/* Tarif Acuan / Kg */}
                        <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono text-gray-700">
                          {formatRupiah(item.tarif)}
                        </td>

                        {/* Total Kotor */}
                        <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono text-gray-900 font-medium">
                          {formatRupiah(item.totalKotor)}
                        </td>

                        {/* Potongan (Rp) */}
                        <td className="py-2 px-3 border-r border-gray-200 text-right font-mono text-red-600">
                          <div className="flex items-center justify-end space-x-1">
                            <span className="text-red-600 font-bold">-Rp</span>
                            <input
                              type="number"
                              step="1000"
                              min="0"
                              value={item.potongan}
                              onChange={(e) => handleItemChange(item.id, 'potongan', Number(e.target.value))}
                              className="w-20 border border-gray-300 rounded-xs px-1.5 py-1 text-right font-mono text-xs text-red-600 font-bold focus:outline-none focus:border-[#b81d24] bg-white"
                            />
                          </div>
                        </td>

                        {/* Subtotal Bersih */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#b81d24]">
                          {formatRupiah(item.subtotalBersih)}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateRow(item)}
                              title="Duplikat baris bal"
                              className="p-1 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(item.id)}
                              disabled={balItems.length <= 1}
                              title={balItems.length <= 1 ? 'Minimal 1 bal diperlukan' : 'Hapus baris'}
                              className={`p-1 transition ${
                                balItems.length <= 1
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-red-500 hover:text-red-700 cursor-pointer'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Quick Row Adder */}
              <div className="p-2.5 bg-[#f8f9fa] border-t border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-500 text-[11px]">
                  Total Baris Bal: <strong className="text-gray-800">{totalBalCount} Bal</strong> (Total Berat: <strong className="text-gray-800">{totalBeratNetto.toFixed(1)} Kg</strong>)
                </span>
                <button
                  type="button"
                  onClick={() => handleAddBalRow()}
                  className="text-xs font-bold text-[#b81d24] hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris Bal Lagi</span>
                </button>
              </div>
            </div>

            {/* Bottom Summary Section */}
            <div className="bg-white p-4 border border-gray-300 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Catatan Transaksi Intake</label>
                <textarea
                  rows={4}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan penerimaan tembakau, kondisi fisik bal, kadar air, atau catatan mutu dari loket..."
                  className="w-full border border-[#ced4da] rounded-sm p-2 text-xs focus:outline-none focus:border-[#b81d24] bg-white"
                />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Total Bal Ditimbang</span>
                  <input
                    type="text"
                    disabled
                    value={`${totalBalCount} Bal (${totalBeratNetto.toFixed(1)} Kg)`}
                    className="w-48 bg-[#e9ecef] border border-[#ced4da] rounded-sm px-2.5 py-1 text-right font-mono text-gray-800 text-xs font-bold"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Subtotal Kotor</span>
                  <input
                    type="text"
                    disabled
                    value={formatRupiah(totalKotorKeseluruhan)}
                    className="w-48 bg-[#e9ecef] border border-[#ced4da] rounded-sm px-2.5 py-1 text-right font-mono text-gray-700 text-xs"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Total Potongan ({totalBalCount} Bal)</span>
                  <input
                    type="text"
                    disabled
                    value={`-${formatRupiah(totalPotonganKeseluruhan)}`}
                    className="w-48 bg-[#e9ecef] border border-[#ced4da] rounded-sm px-2.5 py-1 text-right font-mono text-red-600 text-xs font-semibold"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-900 font-bold text-sm">Total Pembayaran Petani</span>
                  <input
                    type="text"
                    disabled
                    value={formatRupiah(totalPembayaranPetani)}
                    className="w-48 bg-[#fcf0f0] border border-red-300 rounded-sm px-2.5 py-1.5 text-right font-mono text-[#b81d24] text-sm font-bold"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Konfirmasi Simpan Transaksi Pembelian Tembakau"
        message={`Apakah Anda yakin ingin menyimpan transaksi intake untuk petani ${currentPetani?.nama_petani}?`}
        detail={`Total ${totalBalCount} Bal | Berat: ${totalBeratNetto.toFixed(1)} Kg | Total Pembayaran: ${formatRupiah(totalPembayaranPetani)}`}
        variant="primary"
        confirmText="Ya, Simpan Transaksi"
        cancelText="Periksa Kembali"
        onConfirm={handleConfirmSave}
        onClose={() => setIsConfirmOpen(false)}
      />
    </>
  );
};

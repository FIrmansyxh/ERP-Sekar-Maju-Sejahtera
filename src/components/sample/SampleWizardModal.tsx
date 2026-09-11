import { formatDateHariBulanTahun } from '../../utils/formatters';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Scan, 
  Search, 
  CheckCircle2, 
  Trash2, 
  Send, 
  ArrowRight, 
  ArrowLeft, 
  FileText, 
  AlertCircle, 
  Layers, 
  Scale, 
  Building2, 
  UserCheck, 
  Printer, 
  X,
  Zap
} from 'lucide-react';
import { Barang, PengirimanSample, BatchPengirimanSample } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { loadBatchSampleData } from '../../utils/storage';

interface SampleWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  barangList: Barang[];
  sampleList?: PengirimanSample[];
  batchSampleList?: BatchPengirimanSample[];
  onSaveBatchSamples: (
    newSamples: PengirimanSample[],
    updatedBarangList: Barang[]
  ) => void;
}

export const SampleWizardModal: React.FC<SampleWizardModalProps> = ({
  isOpen,
  onClose,
  barangList,
  sampleList = [],
  batchSampleList = [],
  onSaveBatchSamples,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBarangIds, setSelectedBarangIds] = useState<string[]>([]);
  const [balInput, setBalInput] = useState<string>('');
  const [searchBalQuery, setSearchBalQuery] = useState<string>('');
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [beratGramPerBal, setBeratGramPerBal] = useState<number>(250);
  const [tujuanBuyer, setTujuanBuyer] = useState<string>('');
  const [sumberGudang, setSumberGudang] = useState<string>('Gudang Utama Tembakau A1');
  const [dikirimOleh, setDikirimOleh] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('Pengujian organoleptik dan kadar air laboratorium');

  const scannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTujuanBuyer('');
      setStep(1);
      setSelectedBarangIds([]);
      setScanFeedback(null);
      setIsConfirmOpen(false);
    }
  }, [isOpen]);

  const activeBatchList = batchSampleList.length > 0 ? batchSampleList : loadBatchSampleData();

  // Helper untuk cek penggunaan nomor bal di modul sample
  const checkBalUsage = (bal: Barang) => {
    const isSelectedInCurrent = selectedBarangIds.includes(bal.barang_id);
    if (isSelectedInCurrent) {
      return {
        isAvailable: false,
        statusType: 'in_current_batch' as const,
        badgeText: 'SUDAH DIPILIH',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        message: `⚠️ BAL SUDAH DIPILIH: Bal #${bal.no_bal || bal.barang_id} (${bal.kode_grade}) sudah ada dalam daftar sampel yang dipilih!`,
      };
    }

    const matchedBatch = activeBatchList.find(
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
      return {
        isAvailable: false,
        statusType: 'used_in_batch' as const,
        badgeText: `SUDAH DIPAKAI (${matchedBatch.kode_batch})`,
        badgeClass: 'bg-red-100 text-red-800 border-red-300',
        message: `⚠️ NO BAL SUDAH DIPAKAI: Bal #${bal.no_bal || bal.barang_id} (Grade ${bal.kode_grade}) SUDAH DIGUNAKAN pada Batch Sample "${matchedBatch.kode_batch}" (${matchedBatch.tujuan_buyer})!`,
      };
    }

    return {
      isAvailable: true,
      statusType: 'available' as const,
      badgeText: 'TERSEDIA',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      message: `Bal #${bal.no_bal || bal.barang_id} siap digunakan.`,
    };
  };

  const availableBal = barangList.filter(
    (b) => b.status_stok === 'di_gudang' || b.status_stok === 'terkirim_sample'
  );

  const handleScanNoBal = (codeToScan: string) => {
    const trimmed = codeToScan.trim();
    if (!trimmed) return;

    const matched = availableBal.find(
      (b) =>
        b.no_bal.toLowerCase() === trimmed.toLowerCase() ||
        b.barang_id.toLowerCase() === trimmed.toLowerCase()
    );

    if (!matched) {
      setScanFeedback({
        type: 'error',
        message: `No Bal "${trimmed}" tidak ditemukan di gudang!`,
      });
      setBalInput('');
      return;
    }

    const usage = checkBalUsage(matched);
    if (!usage.isAvailable) {
      setScanFeedback({
        type: 'info',
        message: usage.message,
      });
      setBalInput('');
      return;
    }

    if (matched.status_stok === 'terkirim_sample') {
      setScanFeedback({
        type: 'info',
        message: `ℹ️ PERHATIAN: Bal #${matched.no_bal || matched.barang_id} berstatus sampel (${matched.catatan || 'Dalam proses pengujian'}), namun dapat dipilih ulang untuk batch sampel baru.`,
      });
    }

    setSelectedBarangIds((prev) => [...prev, matched.barang_id]);
    setScanFeedback({
      type: 'success',
      message: `BERHASIL SCAN: Bal #${matched.no_bal} (${matched.kode_grade} - ${matched.berat_kg}kg) berhasil ditambahkan!`,
    });
    setBalInput('');
    setTimeout(() => scannerInputRef.current?.focus(), 100);
  };

  // Hardware barcode scanner hook
  useBarcodeScanner((scannedBal) => {
    if (isOpen && step === 1) {
      handleScanNoBal(scannedBal);
    }
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scannerInputRef.current?.focus(), 150);
    } else {
      setSelectedBarangIds([]);
      setScanFeedback(null);
      setBalInput('');
      setStep(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredAvailableBal = availableBal.filter((b) => {
    return (
      searchBalQuery === '' ||
      b.no_bal.toLowerCase().includes(searchBalQuery.toLowerCase()) ||
      b.barang_id.toLowerCase().includes(searchBalQuery.toLowerCase()) ||
      b.kode_grade.toLowerCase().includes(searchBalQuery.toLowerCase()) ||
      (b.nama_petani && b.nama_petani.toLowerCase().includes(searchBalQuery.toLowerCase()))
    );
  });

  const selectedBalObjects = barangList.filter((b) => selectedBarangIds.includes(b.barang_id));

  const toggleSelectBal = (id: string) => {
    setSelectedBarangIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleScannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScanNoBal(balInput);
  };

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredAvailableBal.map((b) => b.barang_id);
    setSelectedBarangIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const handleDeselectAll = () => {
    setSelectedBarangIds([]);
  };

  const totalPenguranganKg = (selectedBalObjects.length * beratGramPerBal) / 1000;

  const handleConfirmSubmit = () => {
    const today = new Date().toISOString().split('T')[0];
    const finalTujuan = tujuanBuyer.trim();
    if (!finalTujuan) return;

    // Generate batch sample records
    const newSamples: PengirimanSample[] = selectedBalObjects.map((bal, idx) => {
      const sampleId = `SMP-${today.replace(/-/g, '').slice(2)}-${String(idx + 1).padStart(3, '0')}`;
      return {
        sample_id: sampleId,
        barang_id: bal.barang_id,
        kode_grade: bal.kode_grade,
        sumber: bal.lokasi_gudang || 'Gudang Pusat',
        tujuan: finalTujuan,
        berat_sample_gram: beratGramPerBal,
        tanggal_kirim: today,
        status: 'dikirim',
        catatan: `${catatan} (Dari Bal #${bal.no_bal})`,
        dikirim_oleh: 'Petugas QC Lab',
        nama_petani: bal.nama_petani,
      };
    });

    // Update original barang weight
    const updatedBarangList: Barang[] = selectedBalObjects.map((bal) => {
      const weightReductionKg = beratGramPerBal / 1000;
      const newWeight = Math.max(0.1, Math.round((bal.berat_kg - weightReductionKg) * 100) / 100);
      return {
        ...bal,
        berat_kg: newWeight,
        status_stok: 'terkirim_sample',
      };
    });

    onSaveBatchSamples(newSamples, updatedBarangList);
    setIsConfirmOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-gray-300 w-full max-w-3xl rounded-none shadow-2xl flex flex-col text-xs text-gray-800 max-h-[94vh]">
        
        {/* Header Modal */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sm bg-gray-100 border border-gray-300 flex items-center justify-center">
              <Layers className="w-4 h-4 text-gray-700" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-800 font-bold text-[10px] rounded-none uppercase">
                  Quality Control Lab
                </span>
                <span className="text-[11px] text-gray-500 font-medium">
                  Langkah {step} dari 3
                </span>
              </div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                Pengiriman Sample Uji Mutu (Batch & Scanner)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-sm transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Steps Navigation Indicator */}
        <div className="bg-[#f8f9fa] border-b border-gray-200 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-6">
            <div className={`flex items-center space-x-1.5 ${step === 1 ? 'font-bold text-[#b81d24]' : 'text-gray-500'}`}>
              <span className={`w-5 h-5 rounded-none flex items-center justify-center text-[10px] font-mono ${step === 1 ? 'bg-[#b81d24] text-white' : 'bg-gray-200 text-gray-700'}`}>
                1
              </span>
              <span>Pilih Bal / Scan</span>
            </div>

            <div className="text-gray-300">➔</div>

            <div className={`flex items-center space-x-1.5 ${step === 2 ? 'font-bold text-[#b81d24]' : 'text-gray-500'}`}>
              <span className={`w-5 h-5 rounded-none flex items-center justify-center text-[10px] font-mono ${step === 2 ? 'bg-[#b81d24] text-white' : 'bg-gray-200 text-gray-700'}`}>
                2
              </span>
              <span>Tujuan & Gramasi</span>
            </div>

            <div className="text-gray-300">➔</div>

            <div className={`flex items-center space-x-1.5 ${step === 3 ? 'font-bold text-[#b81d24]' : 'text-gray-500'}`}>
              <span className={`w-5 h-5 rounded-none flex items-center justify-center text-[10px] font-mono ${step === 3 ? 'bg-[#b81d24] text-white' : 'bg-gray-200 text-gray-700'}`}>
                3
              </span>
              <span>Konfirmasi & Cetak</span>
            </div>
          </div>

          <div className="font-mono text-gray-600 font-bold text-[11px]">
            Terpilih: <span className="text-[#b81d24]">{selectedBarangIds.length}</span> Bal
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* STEP 1: SCAN OR SELECT BAL BATCH */}
          {step === 1 && (
            <div className="space-y-3.5">
              
              {/* Scanner Box */}
              <div className="p-3 bg-[#f8f9fa] border border-gray-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                    <Scan className="w-4 h-4 text-gray-700" />
                    <span>SCANNER / INPUT NO. BAL (AUTO CENTANG)</span>
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    Scan = Otomatis Tercentang
                  </span>
                </div>

                <form onSubmit={handleScannerSubmit} className="flex gap-2">
                  <input
                    ref={scannerInputRef}
                    type="text"
                    value={balInput}
                    onChange={(e) => setBalInput(e.target.value)}
                    placeholder="Scan barcode / ketik No Bal..."
                    className="flex-1 bg-white border border-[#ced4da] rounded-none px-3 py-1.5 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#b81d24]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#b81d24] hover:bg-[#b81d24] text-white rounded-none font-bold text-xs flex items-center space-x-1 transition cursor-pointer shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Pilih Bal</span>
                  </button>
                </form>

                {/* Scan Feedback Banner */}
                {scanFeedback && (
                  <div
                    className={`p-2 border flex items-center space-x-2 text-xs ${
                      scanFeedback.type === 'success'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : scanFeedback.type === 'info'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-red-50 border-red-300 text-red-800'
                    }`}
                  >
                    {scanFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span className="font-semibold text-[11px]">{scanFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* Warehouse Bal Selection Table */}
              <div className="bg-white border border-gray-200 space-y-2.5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-900 text-xs block">
                      Daftar Bal Tembakau di Gudang (Bisa Pilih Batch)
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Tersedia: {availableBal.length} Bal • Tercentang: <strong className="text-gray-900 font-mono">{selectedBarangIds.length} Bal</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[11px]">
                    {selectedBarangIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-none font-semibold cursor-pointer"
                      >
                        Reset Pilihan ({selectedBarangIds.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchBalQuery}
                    onChange={(e) => setSearchBalQuery(e.target.value)}
                    placeholder="Cari no. bal, grade, petani..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#ced4da] rounded-none focus:outline-none focus:border-gray-800"
                  />
                </div>

                {/* Checklist List */}
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-gray-100">
                  {filteredAvailableBal.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      Tidak ada bal yang cocok dengan pencarian
                    </div>
                  ) : (
                    filteredAvailableBal.map((b) => {
                      const isSelected = selectedBarangIds.includes(b.barang_id);
                      const usage = checkBalUsage(b);
                      return (
                        <label
                          key={b.barang_id}
                          className={`flex items-center justify-between p-2 cursor-pointer transition text-xs ${
                            isSelected
                              ? 'bg-gray-100 border border-gray-400 text-gray-900 font-bold'
                              : !usage.isAvailable
                              ? 'bg-red-50/40 border border-red-200 text-gray-700'
                              : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (!isSelected && !usage.isAvailable) {
                                  setScanFeedback({
                                    type: 'info',
                                    message: usage.message,
                                  });
                                  return;
                                }
                                toggleSelectBal(b.barang_id);
                              }}
                              className="w-3.5 h-3.5 text-gray-900 rounded-none focus:ring-0 cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-gray-900">
                                  Bal #{b.no_bal}
                                </span>
                                <span className={`px-1.5 py-0.2 text-[9px] font-bold border rounded-2xs ${usage.badgeClass}`}>
                                  {usage.badgeText}
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-500 font-normal">
                                Petani: {b.nama_petani} • Lokasi: {b.lokasi_gudang}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2.5">
                            <span className="px-2 py-0.5 bg-[#b81d24] text-white text-[10px] font-bold">
                              Grade {b.kode_grade}
                            </span>
                            <span className="font-mono font-bold text-gray-900 text-xs">
                              {b.berat_kg} kg
                            </span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: GRAMASI & TUJUAN PENGIRIMAN */}
          {step === 2 && (
            <div className="space-y-4">
              
              {/* Summary Bal Terpilih */}
              <div className="p-3 bg-[#f8f9fa] border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 block text-xs">
                    Batch Pengambilan Sampel ({selectedBalObjects.length} Bal)
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    Grade: {Array.from(new Set(selectedBalObjects.map((b) => b.kode_grade))).join(', ')}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[11px] text-gray-500 block">Total Pengurangan Berat:</span>
                  <span className="font-bold text-[#b81d24] text-sm">-{totalPenguranganKg} Kg</span>
                </div>
              </div>

              {/* Weight per Sample Form */}
              <div className="p-3.5 bg-white border border-gray-200 space-y-3">
                <label className="block font-bold text-gray-900 text-xs">
                  Gramasi / Berat Sampel per Bal:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 250, 500, 1000].map((gr) => (
                    <button
                      key={gr}
                      type="button"
                      onClick={() => setBeratGramPerBal(gr)}
                      className={`py-2 text-center rounded-none font-bold text-xs border transition cursor-pointer ${
                        beratGramPerBal === gr
                          ? 'bg-[#b81d24] text-white border-[#b81d24] shadow-xs'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {gr} Gram ({gr / 1000} Kg)
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Berat setiap bal tembakau di master barang akan otomatis dikurangi {beratGramPerBal} gram secara presisi saat konfirmasi disimpan.
                </p>
              </div>

              {/* Tujuan Pabrik / Buyer */}
              <div className="p-3.5 bg-white border border-gray-200 space-y-2">
                <label className="block font-bold text-gray-900 text-xs">
                  Tujuan Gudang / Pabrik Penguji: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tujuanBuyer}
                  onChange={(e) => setTujuanBuyer(e.target.value)}
                  placeholder="Ketik nama gudang / pabrik / lab tujuan..."
                  required
                  className="w-full px-3 py-2 bg-white border border-[#ced4da] rounded-none text-xs text-gray-900 focus:outline-none focus:border-gray-800"
                />
                {!tujuanBuyer.trim() && (
                  <p className="text-[10px] text-red-600 font-medium">
                    * Wajib diisi, ketik tujuan gudang secara manual (bukan dropdown).
                  </p>
                )}
              </div>

              {/* Detail Petugas & Catatan */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-gray-700 text-[11px]">Petugas Pengirim:</label>
                  <input
                    type="text"
                    value={dikirimOleh}
                    onChange={(e) => setDikirimOleh(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-gray-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-gray-700 text-[11px]">Gudang Asal:</label>
                  <input
                    type="text"
                    value={sumberGudang}
                    onChange={(e) => setSumberGudang(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-gray-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-gray-700 text-[11px]">Catatan Uji Mutu:</label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#ced4da] rounded-none text-xs focus:outline-none focus:border-gray-800"
                />
              </div>

            </div>
          )}

          {/* STEP 3: REVIEW & KONFIRMASI */}
          {step === 3 && (
            <div className="space-y-3.5">
              <div className="bg-white border border-gray-300 p-4 space-y-3">
                <div className="border-b border-gray-200 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      Ringkasan Pengiriman Batch Sampel Tembakau
                    </h3>
                    <span className="text-[11px] text-gray-500 font-mono">
                      Tanggal: {formatDateHariBulanTahun(new Date().toISOString())}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 text-xs">
                    Siap Dikirim Lab
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 block">Tujuan Buyer / Lab:</span>
                    <span className="font-bold text-gray-900">
                      {tujuanBuyer || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Gramasi per Bal:</span>
                    <span className="font-bold font-mono text-gray-900">
                      {beratGramPerBal} Gram / Bal ({totalPenguranganKg} Kg Total)
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Petugas QC:</span>
                    <span className="font-semibold text-gray-800">{dikirimOleh}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Gudang Asal:</span>
                    <span className="font-semibold text-gray-800">{sumberGudang}</span>
                  </div>
                </div>

                {/* List of Bal Included */}
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-600 font-bold block mb-1 text-[11px]">
                    Daftar Bal yang Diambil Sampel ({selectedBalObjects.length} Bal):
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                    {selectedBalObjects.map((bal, idx) => {
                      const newW = Math.max(0.1, Math.round((bal.berat_kg - (beratGramPerBal / 1000)) * 100) / 100);
                      return (
                        <div
                          key={bal.barang_id}
                          className="flex items-center justify-between p-1.5 bg-white border border-gray-200"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">{idx + 1}.</span>
                            <span className="font-bold text-gray-900">Bal #{bal.no_bal}</span>
                            <span className="px-1.5 py-0.2 bg-[#b81d24] text-white text-[10px]">Grade {bal.kode_grade}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-400">{bal.berat_kg} kg ➔ </span>
                            <span className="font-bold text-gray-900">{newW} kg</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-[#f8f9fa] border border-gray-300 p-2.5 text-gray-700 text-[11px] leading-relaxed">
                <strong>Catatan Sistem:</strong> Seluruh bal tembakau tetap tercatat aktif di gudang dengan berat netto yang disesuaikan secara otomatis. ID Sample resmi (SMP-DDMMYY-XXX) akan diterbitkan untuk masing-masing bal.
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-none transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>
          ) : (
            <div></div>
          )}

          {step < 3 ? (
            <button
              type="button"
              disabled={selectedBarangIds.length === 0 || (step === 2 && !tujuanBuyer.trim())}
              onClick={() => {
                if (step === 2 && !tujuanBuyer.trim()) {
                  setScanFeedback({
                    type: 'error',
                    message: 'Tujuan gudang / pabrik penguji sampel wajib diisi!',
                  });
                  return;
                }
                setScanFeedback(null);
                setStep((s) => (s + 1) as 1 | 2 | 3);
              }}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#b81d24] disabled:opacity-40 disabled:cursor-not-allowed rounded-none transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <span>Lanjut ({selectedBarangIds.length} Bal Terpilih)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!tujuanBuyer.trim()}
              onClick={() => {
                if (!tujuanBuyer.trim()) {
                  setScanFeedback({
                    type: 'error',
                    message: 'Tujuan gudang / pabrik penguji sampel wajib diisi!',
                  });
                  return;
                }
                setIsConfirmOpen(true);
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#b81d24] disabled:opacity-40 disabled:cursor-not-allowed rounded-none transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan & Terbitkan Sample Batch</span>
            </button>
          )}
        </div>

      </div>

      {/* Konfirmasi Simpan Sample Modal */}
      {isConfirmOpen && (
        <ConfirmModal
          isOpen={isConfirmOpen}
          title="Konfirmasi Pengiriman Sampel QC"
          message={`Apakah Anda yakin ingin memproses pengiriman sampel untuk ${selectedBalObjects.length} bal tembakau ke ${
            tujuanBuyer
          }?\n\nBerat stok gudang akan otomatis dipotong total sebesar ${totalPenguranganKg} Kg.`}
          confirmLabel="Proses & Potong Stok"
          onConfirm={handleConfirmSubmit}
          onClose={() => setIsConfirmOpen(false)}
          onCancel={() => setIsConfirmOpen(false)}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Truck, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Search, 
  Package, 
  User, 
  FileText,
  Building,
  Zap
} from 'lucide-react';
import { Barang, PengirimanBarang, PengirimanSample } from '../../types';
import { formatDateDDMMYY, generateNoSuratJalanSimple } from '../../utils/formatters';
import { loadPengirimanData } from '../../utils/storage';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

interface PengirimanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  barangList: Barang[];
  sampleList: PengirimanSample[];
  onSavePengiriman: (pengiriman: PengirimanBarang, selectedBarangIds: string[]) => void;
}

export const PengirimanFormModal: React.FC<PengirimanFormModalProps> = ({
  isOpen,
  onClose,
  barangList,
  sampleList,
  onSavePengiriman,
}) => {
  const [tujuanPabrik, setTujuanPabrik] = useState('');
  const [selectedBarangIds, setSelectedBarangIds] = useState<string[]>([]);
  const [sampleRefId, setSampleRefId] = useState<string>('');
  const [driverNama, setDriverNama] = useState('Sugiono (Trans Logistik Madura)');
  const [platNomor, setPlatNomor] = useState('M 8923 BZ');
  const [catatan, setCatatan] = useState('');
  const [searchBalQuery, setSearchBalQuery] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Manual input state
  const [noBalInput, setNoBalInput] = useState('');
  const [isNoBalDropdownOpen, setIsNoBalDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const modalDropdownRef = useRef<HTMLDivElement>(null);
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const scannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTujuanPabrik('');
      setSelectedBarangIds([]);
      setScanFeedback(null);
      setIsConfirmOpen(false);
    }
  }, [isOpen]);

  // Active items in warehouse available for dispatch
  const availableBal = barangList.filter(
    (b) => b.status_stok === 'di_gudang' || b.status_stok === 'terkirim_sample'
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalDropdownRef.current &&
        !modalDropdownRef.current.contains(e.target as Node) &&
        scannerInputRef.current &&
        !scannerInputRef.current.contains(e.target as Node)
      ) {
        setIsNoBalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Suggestions for noBalInput in Modal
  const modalBalSuggestions = useMemo(() => {
    const q = noBalInput.trim().toLowerCase();
    if (!q) return [];
    const qClean = q.replace(/[^a-zA-Z0-9]/g, '');

    const matches = availableBal.filter((b) => {
      const noBal = (b.no_bal || '').toLowerCase();
      const bId = (b.barang_id || '').toLowerCase();
      const gr = (b.kode_grade || '').toLowerCase();
      const pet = (b.nama_petani || '').toLowerCase();
      const noBalClean = noBal.replace(/[^a-zA-Z0-9]/g, '');

      return (
        noBal.includes(q) ||
        bId.includes(q) ||
        gr === q ||
        gr.startsWith(q) ||
        pet.includes(q) ||
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

    return matches.slice(0, 15);
  }, [availableBal, noBalInput]);

  const handleSelectSuggestedBalModal = (bal: Barang) => {
    if (selectedBarangIds.includes(bal.barang_id)) {
      setScanFeedback({
        type: 'info',
        message: `Bal ${bal.no_bal} sudah tercentang dalam daftar kirim.`,
      });
      setNoBalInput('');
      setIsNoBalDropdownOpen(false);
      return;
    }

    setSelectedBarangIds((prev) => [...prev, bal.barang_id]);
    setScanFeedback({
      type: 'success',
      message: `BERHASIL INPUT: Bal #${bal.no_bal} (${bal.kode_grade} - ${bal.berat_kg}kg) berhasil ditambahkan!`,
    });
    setNoBalInput('');
    setIsNoBalDropdownOpen(false);
    setHighlightedIndex(0);
    setTimeout(() => scannerInputRef.current?.focus(), 100);
  };

  const handleSelectByNoBal = (codeToScan: string) => {
    const trimmed = codeToScan.trim();
    if (!trimmed) return;

    const matched = availableBal.find(
      (b) =>
        (b.no_bal || '').toLowerCase() === trimmed.toLowerCase() ||
        (b.barang_id || '').toLowerCase() === trimmed.toLowerCase()
    );

    if (!matched) {
      setScanFeedback({
        type: 'error',
        message: `No Bal "${trimmed}" tidak ditemukan atau sudah keluar dari gudang!`,
      });
      setNoBalInput('');
      return;
    }

    if (selectedBarangIds.includes(matched.barang_id)) {
      setScanFeedback({
        type: 'info',
        message: `Bal ${matched.no_bal} sudah tercentang dalam daftar kirim.`,
      });
      setNoBalInput('');
      return;
    }

    setSelectedBarangIds((prev) => [...prev, matched.barang_id]);
    setScanFeedback({
      type: 'success',
      message: `BERHASIL INPUT: Bal #${matched.no_bal} (${matched.kode_grade} - ${matched.berat_kg}kg) berhasil ditambahkan!`,
    });
    setNoBalInput('');
    setTimeout(() => scannerInputRef.current?.focus(), 100);
  };

  // Hardware barcode scanner hook
  useBarcodeScanner((scannedBal) => {
    if (isOpen) {
      handleSelectByNoBal(scannedBal);
    }
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scannerInputRef.current?.focus(), 150);
      setIsConfirmOpen(false);
    } else {
      setSelectedBarangIds([]);
      setScanFeedback(null);
      setNoBalInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;
  
  // Approved samples available for reference
  const approvedSamples = sampleList.filter((s) => s.status === 'disetujui');

  const filteredAvailableBal = availableBal.filter((b) => {
    return (
      searchBalQuery === '' ||
      (b.barang_id && b.barang_id.toLowerCase().includes(searchBalQuery.toLowerCase())) ||
      (b.no_bal && b.no_bal.toLowerCase().includes(searchBalQuery.toLowerCase())) ||
      (b.kode_grade && b.kode_grade.toLowerCase().includes(searchBalQuery.toLowerCase())) ||
      (b.nama_petani && b.nama_petani.toLowerCase().includes(searchBalQuery.toLowerCase()))
    );
  });

  const selectedBalObjects = barangList.filter((b) => selectedBarangIds.includes(b.barang_id));
  const totalBalCount = selectedBalObjects.length;
  const totalBeratTonaseKg = selectedBalObjects.reduce((acc, b) => acc + (b.berat_kg || 0), 0);

  const toggleSelectBal = (id: string) => {
    setSelectedBarangIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredAvailableBal.map((b) => b.barang_id);
    setSelectedBarangIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
  };

  const handleDeselectAll = () => {
    setSelectedBarangIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tujuanPabrik.trim()) {
      setScanFeedback({
        type: 'error',
        message: 'Tujuan gudang / pabrik buyer tujuan wajib diisi!',
      });
      return;
    }
    if (selectedBarangIds.length === 0) {
      setScanFeedback({
        type: 'error',
        message: 'Pilih minimal 1 bal tembakau untuk dimuat!',
      });
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    const finalTujuan = tujuanPabrik.trim();
    if (!finalTujuan) return;
    const now = new Date();
    const existing = loadPengirimanData();
    const nextSeq = existing.length > 0
      ? Math.max(...existing.map(p => {
          const n = parseInt(p.pengiriman_id, 10);
          return isNaN(n) ? 0 : n;
        })) + 1
      : 1;
    const noSurat = generateNoSuratJalanSimple(nextSeq);

    const newPengiriman: PengirimanBarang = {
      pengiriman_id: String(nextSeq),
      no_surat_jalan: noSurat,
      tanggal_kirim: now.toISOString().split('T')[0],
      tujuan: finalTujuan,
      total_bal: totalBalCount,
      total_berat_kg: Math.round(totalBeratTonaseKg * 100) / 100,
      status: 'dikirim',
      driver_nama: driverNama.trim(),
      plat_nomor: platNomor.trim().toUpperCase(),
      catatan: catatan.trim(),
      sample_id_ref: sampleRefId || undefined,
      barang_ids: selectedBarangIds,
    };

    onSavePengiriman(newPengiriman, selectedBarangIds);
    setIsConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
        <div className="bg-white border border-gray-300 w-full max-w-4xl rounded-none shadow-2xl flex flex-col max-h-[92vh] text-xs text-gray-800">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-none bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 text-gray-700" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                  Buat Surat Jalan Pengiriman Pabrik
                </h2>
                <p className="text-[11px] text-gray-500 font-medium">
                  Pusat Pamekasan • Pilih atau scan no bal tembakau untuk muatan surat jalan
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-none transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={selectedBarangIds.length === 0 || !tujuanPabrik.trim()}
                title={!tujuanPabrik.trim() ? 'Tujuan gudang / pabrik buyer wajib diisi' : selectedBarangIds.length === 0 ? 'Pilih minimal 1 bal' : 'Terbitkan Surat Jalan'}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#b81d24] disabled:opacity-50 disabled:cursor-not-allowed rounded-none transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Terbitkan Surat Jalan ({totalBalCount} Bal)</span>
              </button>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Left: Dispatch Information (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <span className="font-bold text-gray-900 text-xs block uppercase tracking-wider">
                  Informasi Pengiriman
                </span>

                {/* Destination Factory / Warehouse */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Tujuan Gudang / Pabrik Buyer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tujuanPabrik}
                    onChange={(e) => setTujuanPabrik(e.target.value)}
                    placeholder="Ketik nama gudang / pabrik buyer tujuan..."
                    required
                    className="w-full bg-white border border-[#ced4da] rounded-none px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-800"
                  />
                  {!tujuanPabrik.trim() && (
                    <p className="text-[10px] text-red-600 font-medium mt-0.5">
                      * Wajib diisi, ketik tujuan gudang secara manual (bukan dropdown).
                    </p>
                  )}
                </div>

                {/* Reference Sample QC */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Referensi Sample Disetujui (Opsional)
                  </label>
                  <select
                    value={sampleRefId}
                    onChange={(e) => setSampleRefId(e.target.value)}
                    className="w-full bg-white border border-[#ced4da] rounded-none px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-800"
                  >
                    <option value="">-- Tanpa Sample Ref (Pengiriman Reguler) --</option>
                    {approvedSamples.map((s) => (
                      <option key={s.sample_id} value={s.sample_id}>
                        {s.sample_id} - Grade {s.kode_grade} ({s.tujuan})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Driver & Truck */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Nama Pengemudi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={driverNama}
                      onChange={(e) => setDriverNama(e.target.value)}
                      placeholder="Nama driver truk..."
                      className="w-full bg-white border border-[#ced4da] rounded-none px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Nomor Polisi Truk <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={platNomor}
                      onChange={(e) => setPlatNomor(e.target.value)}
                      placeholder="Misal: M 1234 XY"
                      className="w-full bg-white border border-[#ced4da] rounded-none px-2.5 py-1.5 text-xs font-mono uppercase text-gray-900 focus:outline-none focus:border-gray-800"
                      required
                    />
                  </div>
                </div>

                {/* Operational Notes */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Catatan Pengiriman & Instruksi Muatan
                  </label>
                  <textarea
                    rows={3}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Instruksi terpal, no segel kontainer, kontak ekspedisi..."
                    className="w-full bg-white border border-[#ced4da] rounded-none px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-gray-800"
                  />
                </div>
              </div>

              {/* Right: Bal Multi-Select (7 cols) */}
              <div className="lg:col-span-7 bg-[#f8f9fa] p-3.5 border border-gray-300 space-y-2.5">
                
                {/* Input No Bal / Scanner Gun Bar */}
                <div className="p-2.5 bg-white border border-gray-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                      <Zap className="w-4 h-4 text-gray-700" />
                      <span>INPUT SCAN NO. BAL (OTOMATIS TERCENTANG)</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      Standby Alat Scan
                    </span>
                  </div>

                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        ref={scannerInputRef}
                        type="text"
                        value={noBalInput}
                        onChange={(e) => {
                          setNoBalInput(e.target.value);
                          setIsNoBalDropdownOpen(true);
                          setHighlightedIndex(0);
                        }}
                        onFocus={() => {
                          if (noBalInput.trim().length > 0) {
                            setIsNoBalDropdownOpen(true);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (modalBalSuggestions.length > 0) {
                              setIsNoBalDropdownOpen(true);
                              setHighlightedIndex((prev) => (prev + 1) % modalBalSuggestions.length);
                            }
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (modalBalSuggestions.length > 0) {
                              setIsNoBalDropdownOpen(true);
                              setHighlightedIndex((prev) => (prev - 1 + modalBalSuggestions.length) % modalBalSuggestions.length);
                            }
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (isNoBalDropdownOpen && modalBalSuggestions.length > 0 && highlightedIndex >= 0 && highlightedIndex < modalBalSuggestions.length) {
                              handleSelectSuggestedBalModal(modalBalSuggestions[highlightedIndex]);
                            } else {
                              handleSelectByNoBal(noBalInput);
                            }
                          } else if (e.key === 'Escape') {
                            setIsNoBalDropdownOpen(false);
                          }
                        }}
                        placeholder="Scan alat barcode atau ketik no bal (misal: A00, A0001)..."
                        className="flex-1 bg-white border border-[#ced4da] rounded-none px-2.5 py-1.5 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-gray-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (isNoBalDropdownOpen && modalBalSuggestions.length > 0 && highlightedIndex >= 0 && highlightedIndex < modalBalSuggestions.length) {
                            handleSelectSuggestedBalModal(modalBalSuggestions[highlightedIndex]);
                          } else {
                            handleSelectByNoBal(noBalInput);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-[#b81d24] hover:bg-[#b81d24] text-white rounded-none font-bold text-xs flex items-center space-x-1 transition cursor-pointer shadow-xs"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Pilih</span>
                      </button>
                    </div>

                    {/* Dropdown Recommendations */}
                    {isNoBalDropdownOpen && noBalInput.trim().length > 0 && (
                      <div
                        ref={modalDropdownRef}
                        className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-300 shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100"
                      >
                        <div className="px-3 py-1 bg-gray-50 text-[10px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between border-b border-gray-200">
                          <span>Rekomendasi Bal ({modalBalSuggestions.length}):</span>
                          <span className="text-[9px] text-gray-400 font-normal">Gunakan ↑ ↓ & Enter</span>
                        </div>
                        {modalBalSuggestions.length > 0 ? (
                          modalBalSuggestions.map((bal, idx) => {
                            const isChecked = selectedBarangIds.includes(bal.barang_id);
                            const isHighlighted = idx === highlightedIndex;
                            return (
                              <button
                                key={bal.barang_id}
                                type="button"
                                onClick={() => handleSelectSuggestedBalModal(bal)}
                                onMouseEnter={() => setHighlightedIndex(idx)}
                                className={`w-full px-3 py-2 text-left flex items-center justify-between transition cursor-pointer text-xs ${
                                  isHighlighted ? 'bg-slate-100 font-bold' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono font-bold text-gray-900 bg-slate-100 px-1.5 py-0.2 border border-slate-300">
                                      #{bal.no_bal || bal.barang_id}
                                    </span>
                                    <span className="px-1 py-0.2 bg-gray-100 text-gray-700 text-[10px] font-semibold border border-gray-200">
                                      Grade {bal.kode_grade}
                                    </span>
                                    <span className="font-mono text-[11px] text-gray-600 font-semibold">
                                      {bal.berat_kg} kg
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-gray-500">
                                    Petani: {bal.nama_petani}
                                  </div>
                                </div>
                                <div>
                                  {isChecked ? (
                                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                                      ✓ Terpilih
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-700 font-semibold bg-gray-100 px-1.5 py-0.5 border border-gray-200">
                                      Pilih
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-2.5 text-xs text-gray-500 text-center">
                            Tidak ada bal yang cocok.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

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
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      )}
                      <span className="font-semibold text-[11px]">{scanFeedback.message}</span>
                    </div>
                  )}
                </div>

                {/* Bal Checklist Controls */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="font-bold text-gray-900 text-xs block">
                      Pilih Bal Tembakau dari Gudang
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Stok aktif tersedia: {availableBal.length} Bal
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[11px]">
                    {selectedBarangIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-none font-semibold cursor-pointer"
                      >
                        Reset ({selectedBarangIds.length})
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
                    placeholder="Filter no bal, grade, petani..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#ced4da] rounded-none focus:outline-none focus:border-gray-800"
                  />
                </div>

                {/* Bal Checklist Scrollable */}
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-gray-100">
                  {filteredAvailableBal.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      Tidak ada bal aktif yang cocok
                    </div>
                  ) : (
                    filteredAvailableBal.map((b) => {
                      const isSelected = selectedBarangIds.includes(b.barang_id);
                      return (
                        <label
                          key={b.barang_id}
                          className={`flex items-center justify-between p-2 cursor-pointer transition text-xs ${
                            isSelected
                              ? 'bg-gray-100 border border-gray-400 text-gray-900 font-bold'
                              : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectBal(b.barang_id)}
                              className="w-3.5 h-3.5 text-gray-900 rounded-none cursor-pointer"
                            />
                            <div>
                              <span className="font-mono font-bold">{b.no_bal}</span>
                              <span className="text-[10px] text-gray-500 font-mono ml-2">
                                {b.barang_id}
                              </span>
                              <div className="text-[10px] text-gray-500 font-normal">
                                Petani: {b.nama_petani}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="px-1.5 py-0.5 bg-[#b81d24] text-white rounded-none text-[10px] font-bold">
                              {b.kode_grade}
                            </span>
                            <span className="font-mono font-bold">{b.berat_kg} kg</span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Tonase Summary */}
                <div className="bg-[#f8f9fa] border border-gray-300 p-2.5 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[10px] text-gray-500 font-sans block">Bal Terpilih:</span>
                    <span className="text-sm font-bold text-gray-900">{totalBalCount} Bal</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 font-sans block">Total Tonase Muatan:</span>
                    <span className="text-sm font-bold text-gray-900">
                      {totalBeratTonaseKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} KG
                    </span>
                  </div>
                </div>

              </div>

            </div>

          </form>

        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 max-w-md w-full p-4 space-y-3 shadow-xl">
            <h3 className="font-bold text-sm text-gray-900">Konfirmasi Penerbitan Surat Jalan</h3>
            <p className="text-xs text-gray-600">
              Apakah Anda yakin ingin menerbitkan Surat Jalan ke <strong className="text-gray-900">{tujuanPabrik}</strong> untuk <strong className="text-gray-900">{totalBalCount} Bal ({totalBeratTonaseKg} KG)</strong>?
            </p>
            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-none cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#b81d24] rounded-none cursor-pointer"
              >
                Ya, Terbitkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

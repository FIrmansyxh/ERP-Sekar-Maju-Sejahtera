import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Scan, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Scale, 
  User, 
  CreditCard, 
  MapPin, 
  ArrowRight,
  Sparkles,
  Barcode
} from 'lucide-react';
import { Petani } from '../../types';
import { formatDateIndo } from '../../utils/formatters';

interface OperatorLoketViewProps {
  petaniList: Petani[];
  onOpenCardPrint: (petani: Petani) => void;
}

export const OperatorLoketView: React.FC<OperatorLoketViewProps> = ({
  petaniList = [],
  onOpenCardPrint,
}) => {
  const [scannedInput, setScannedInput] = useState('');
  const [selectedPetaniId, setSelectedPetaniId] = useState<string>('');
  const [isFarmerDropdownOpen, setIsFarmerDropdownOpen] = useState(false);
  const [highlightedFarmerIndex, setHighlightedFarmerIndex] = useState(0);
  const farmerDropdownRef = useRef<HTMLDivElement>(null);
  const [simulatedBal, setSimulatedBal] = useState({
    no_bal: 'E0034',
    grade: 'E',
    berat_gross_kg: 45.0,
    potongan_kg: 1.5,
  });
  const [transactionSuccess, setTransactionSuccess] = useState(false);

  // Active farmers only for transaction dropdown (Business Rule PRD 01)
  const activeFarmers = petaniList.filter((p) => p.status_aktif);
  const selectedFarmer = petaniList.find((p) => p.petani_id === selectedPetaniId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        farmerDropdownRef.current &&
        !farmerDropdownRef.current.contains(e.target as Node)
      ) {
        setIsFarmerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter farmer suggestions based on typed input
  const farmerSuggestions = useMemo(() => {
    const q = scannedInput.trim().toLowerCase();
    if (!q) return [];
    return petaniList.filter((p) => {
      const card = (p.petani_id || '').toLowerCase();
      const pId = (p.petani_id || '').toLowerCase();
      const name = (p.nama_petani || '').toLowerCase();
      const desa = (p.desa_kecamatan || '').toLowerCase();
      return card.includes(q) || pId.includes(q) || name.includes(q) || desa.includes(q);
    }).slice(0, 10);
  }, [scannedInput, petaniList]);

  const handleSelectSuggestedFarmer = (p: Petani) => {
    setSelectedPetaniId(p.petani_id);
    setScannedInput(p.petani_id);
    setIsFarmerDropdownOpen(false);
  };

  const handleScanOrType = (val: string) => {
    setScannedInput(val);
    setIsFarmerDropdownOpen(true);
    setHighlightedFarmerIndex(0);
    const clean = val.trim().toUpperCase();
    const found = petaniList.find(
      (p) => p.petani_id.toUpperCase() === clean || p.petani_id.toUpperCase() === clean
    );
    if (found) {
      setSelectedPetaniId(found.petani_id);
    }
  };

  const handleQuickSelectFirst = () => {
    if (activeFarmers.length > 0) {
      setSelectedPetaniId(activeFarmers[0].petani_id);
      setScannedInput(activeFarmers[0].petani_id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Role Banner */}
      <div className="bg-indigo-900 text-white p-5 rounded-2xl border border-indigo-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-700 text-indigo-200 text-xs font-bold px-2 py-0.5 rounded uppercase">
                Mode Operator Loket
              </span>
              <span className="text-xs text-indigo-300 font-medium">
                Validasi Master Data Petani untuk Transaksi Pembelian
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Loket Penerimaan & Antrean Petani
            </h2>
            <p className="text-xs text-indigo-200/90 max-w-2xl leading-relaxed">
              Operator memindai barcode kartu fisik petani atau memilih dari dropdown aktif. Sistem secara otomatis memblokir petani nonaktif dari transaksi baru.
            </p>
          </div>

          <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-700/60 text-xs shrink-0 space-y-1">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-indigo-300">Petani Aktif (Bisa Transaksi):</span>
              <strong className="text-emerald-400 text-sm">{activeFarmers.length}</strong>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-indigo-300">Petani Nonaktif (Diblokir Loket):</span>
              <strong className="text-slate-400 text-sm">
                {petaniList.filter((p) => !p.status_aktif).length}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Loket Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Farmer Selection & Verification */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Card Scan / Dropdown Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Scan className="w-4 h-4 text-indigo-600" />
                <span>Langkah 1: Identifikasi Petani (Scan Barcode / Pilih)</span>
              </h3>
              <button
                type="button"
                onClick={handleQuickSelectFirst}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Gunakan Petani Sampel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Scan input */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Scan Barcode / Ketik ID Petani:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Barcode className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={scannedInput}
                    onChange={(e) => handleScanOrType(e.target.value)}
                    onFocus={() => {
                      if (scannedInput.trim().length > 0) {
                        setIsFarmerDropdownOpen(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (farmerSuggestions.length > 0) {
                          setIsFarmerDropdownOpen(true);
                          setHighlightedFarmerIndex((prev) => (prev + 1) % farmerSuggestions.length);
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (farmerSuggestions.length > 0) {
                          setIsFarmerDropdownOpen(true);
                          setHighlightedFarmerIndex((prev) => (prev - 1 + farmerSuggestions.length) % farmerSuggestions.length);
                        }
                      } else if (e.key === 'Enter') {
                        if (isFarmerDropdownOpen && farmerSuggestions.length > 0 && highlightedFarmerIndex >= 0 && highlightedFarmerIndex < farmerSuggestions.length) {
                          e.preventDefault();
                          handleSelectSuggestedFarmer(farmerSuggestions[highlightedFarmerIndex]);
                        }
                      } else if (e.key === 'Escape') {
                        setIsFarmerDropdownOpen(false);
                      }
                    }}
                    placeholder="Contoh: KRT-TMG-1001 atau ketik nama petani..."
                    className="w-full pl-9 pr-7 font-mono font-bold text-xs uppercase rounded-xl p-2.5 bg-slate-50 border-2 border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none transition"
                  />
                  {scannedInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setScannedInput('');
                        setIsFarmerDropdownOpen(false);
                      }}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Farmer Autocomplete Dropdown */}
                {isFarmerDropdownOpen && scannedInput.trim().length > 0 && (
                  <div
                    ref={farmerDropdownRef}
                    className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-300 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100"
                  >
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between border-b border-slate-200">
                      <span>Rekomendasi Petani ({farmerSuggestions.length}):</span>
                      <span className="text-[9px] text-slate-400 font-normal">Gunakan ↑ ↓ & Enter</span>
                    </div>
                    {farmerSuggestions.length > 0 ? (
                      farmerSuggestions.map((p, idx) => {
                        const isHighlighted = idx === highlightedFarmerIndex;
                        return (
                          <button
                            key={p.petani_id}
                            type="button"
                            onClick={() => handleSelectSuggestedFarmer(p)}
                            onMouseEnter={() => setHighlightedFarmerIndex(idx)}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between transition cursor-pointer text-xs ${
                              isHighlighted ? 'bg-indigo-50 text-indigo-950 font-bold border-l-4 border-indigo-600' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900">{p.nama_petani}</span>
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                                  {p.petani_id}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">{p.desa_kecamatan}</div>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.status_aktif ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {p.status_aktif ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        Tidak ada petani yang cocok dengan "{scannedInput}".
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Read-only Dropdown Disambiguation (PRD requirement: nama sama tetap beda via ID Petani) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Atau Pilih Dari Dropdown Petani Aktif:
                </label>
                <select
                  aria-label="Pilih Petani Terdaftar"
                  value={selectedPetaniId}
                  onChange={(e) => {
                    setSelectedPetaniId(e.target.value);
                    const sel = petaniList.find((p) => p.petani_id === e.target.value);
                    if (sel) setScannedInput(sel.petani_id);
                  }}
                  className="w-full text-xs font-semibold rounded-xl p-2.5 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="">-- Pilih Petani Terdaftar --</option>
                  {activeFarmers.map((p) => (
                    <option key={p.petani_id} value={p.petani_id}>
                      {p.nama_petani} [{p.petani_id}] - {p.desa_kecamatan.split(',')[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Farmer Verification Result Card */}
            {selectedFarmer ? (
              <div
                className={`p-4 rounded-xl border transition ${
                  selectedFarmer.status_aktif
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                        selectedFarmer.status_aktif ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    >
                      {selectedFarmer.nama_petani.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm">{selectedFarmer.nama_petani}</h4>
                        <span className="font-mono text-xs bg-white/80 px-2 py-0.5 rounded border font-bold">
                          {selectedFarmer.petani_id}
                        </span>
                      </div>
                      <p className="text-xs opacity-80 mt-0.5">
                        {selectedFarmer.desa_kecamatan}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      selectedFarmer.status_aktif
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {selectedFarmer.status_aktif ? 'DIVERIFIKASI AKTIF' : 'PETANI NONAKTIF (DITOLAK)'}
                  </span>
                </div>

                {!selectedFarmer.status_aktif && (
                  <div className="mt-3 p-2 bg-white/70 rounded-lg text-xs text-rose-800 flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>
                      Transaksi loket tidak diizinkan untuk petani nonaktif. Hubungi Admin Gudang untuk verifikasi keanggotaan.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                Belum ada petani yang dipilih. Masukkan barcode kartu atau pilih petani aktif dari menu pilihan.
              </div>
            )}

          </div>

          {/* Step 2: Weight & Grade (Connecting to Master PRD Outline) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>Langkah 2: Timbang Bal & Input Mutu (Prasyarat Transaksi)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="font-bold text-slate-600 block mb-1">Nomor Bal</label>
                <input
                  type="text"
                  value={simulatedBal.no_bal}
                  onChange={(e) => setSimulatedBal({ ...simulatedBal, no_bal: e.target.value })}
                  className="w-full font-mono font-bold text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="font-bold text-slate-600 block mb-1">Mutu / Grade</label>
                <select
                  aria-label="Pilih Grade Mutu Tembakau"
                  value={simulatedBal.grade}
                  onChange={(e) => setSimulatedBal({ ...simulatedBal, grade: e.target.value })}
                  className="w-full font-bold text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 cursor-pointer"
                >
                  <option value="A">Grade A (Super)</option>
                  <option value="B">Grade B (Standar Baik)</option>
                  <option value="C">Grade C (Medium)</option>
                  <option value="D">Grade D (Cukup)</option>
                  <option value="E">Grade E (Bawah)</option>
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="font-bold text-slate-600 block mb-1">Berat Gross (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={simulatedBal.berat_gross_kg}
                  onChange={(e) => setSimulatedBal({ ...simulatedBal, berat_gross_kg: parseFloat(e.target.value) || 0 })}
                  className="w-full font-bold text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="font-bold text-slate-600 block mb-1">Potongan (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={simulatedBal.potongan_kg}
                  onChange={(e) => setSimulatedBal({ ...simulatedBal, potongan_kg: parseFloat(e.target.value) || 0 })}
                  className="w-full font-bold text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-600">
                Berat Netto: <strong className="text-slate-900 text-sm font-bold">{(simulatedBal.berat_gross_kg - simulatedBal.potongan_kg).toFixed(1)} Kg</strong>
              </div>

              <button
                disabled={!selectedFarmer || !selectedFarmer.status_aktif}
                onClick={() => {
                  setTransactionSuccess(true);
                  setTimeout(() => setTransactionSuccess(false), 4000);
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-2 ${
                  !selectedFarmer || !selectedFarmer.status_aktif
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                }`}
              >
                <span>Cetak Kupon & Simpan Bal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {transactionSuccess && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>
                  Transaksi Bal {simulatedBal.no_bal} untuk petani {selectedFarmer?.nama_petani} berhasil dicatat & kupon siap cetak!
                </span>
              </div>
            )}

          </div>

        </div>

        {/* Right 1 Col: Quick Card Info & Guidelines */}
        <div className="space-y-4">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Panduan Antrean Operator Loket
            </h4>
            <div className="space-y-2 text-xs text-slate-600">
              <p className="flex items-start space-x-2">
                <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center shrink-0 font-bold mt-0.5">1</span>
                <span>Minta petani menunjukkan <strong>Kartu Fisik Ber-barcode</strong> resmi gudang.</span>
              </p>
              <p className="flex items-start space-x-2">
                <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center shrink-0 font-bold mt-0.5">2</span>
                <span>Arahkan scanner ke barcode atau ketik ID Petani di kolom pencarian cepat.</span>
              </p>
              <p className="flex items-start space-x-2">
                <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center shrink-0 font-bold mt-0.5">3</span>
                <span>Pastikan nama dan desa sesuai dengan identitas fisik petani sebelum menimbang.</span>
              </p>
            </div>
          </div>

          {selectedFarmer && (
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                  Statistik Setoran Petani
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedFarmer.petani_id}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Total Bal Disetor:</span>
                  <strong className="text-white">{selectedFarmer.statistik?.total_setoran_bal || 0} Bal</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Total Berat:</span>
                  <strong className="text-emerald-400">{selectedFarmer.statistik?.total_berat_kg || 0} Kg</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Kunjungan Terakhir:</span>
                  <span className="text-slate-300">{formatDateIndo(selectedFarmer.statistik?.kunjungan_terakhir)}</span>
                </div>
              </div>

              <button
                onClick={() => onOpenCardPrint(selectedFarmer)}
                className="w-full mt-2 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition cursor-pointer"
              >
                Lihat / Cetak Ulang Kartu
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

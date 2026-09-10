import { SearchableSelect } from '../common/SearchableSelect';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Check, 
  Trash2, 
  ArrowRight, 
  AlertCircle, 
  Layers, 
  Calendar, 
  User, 
  Warehouse, 
  CheckCircle2, 
  Sparkles,
  Info,
  Clock,
  Printer,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { TransaksiPembelian, Petani, TabelHarga, Barang, Gudang, TransaksiItemBal, UserRole, User as UserType } from '../../types';
import { formatRupiah, formatNoKupon, formatDateHariBulanTahun, generateTransaksiId, hitungPotonganTaraKg } from '../../utils/formatters';

interface SortirPageViewProps {
  petaniList: Petani[];
  hargaList: TabelHarga[];
  transaksiList: TransaksiPembelian[];
  barangList?: Barang[];
  gudangList?: Gudang[];
  userRole: UserRole;
  currentUser?: UserType | null;
  onSaveTransaksi: (newTx: TransaksiPembelian, generatedBarang: Barang | Barang[]) => void;
  onNavigateToTimbangan: (kuponNo?: string, txId?: string, balNo?: string) => void;
}

export const SortirPageView: React.FC<SortirPageViewProps> = ({
  petaniList = [],
  hargaList = [],
  transaksiList = [],
  barangList = [],
  gudangList = [],
  userRole,
  currentUser,
  onSaveTransaksi,
  onNavigateToTimbangan,
}) => {
  // Form Header State
  const [noKupon, setNoKupon] = useState(() => {
    let maxNum = 0;
    transaksiList.forEach(tx => {
      const match = tx.no_kupon.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    return `KUP${String(nextNum).padStart(4, '0')}`;
  });
  const [selectedPetaniId, setSelectedPetaniId] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [lokasiGudang, setLokasiGudang] = useState(gudangList?.[0]?.nama_gudang || 'Gudang Utama Pamekasan');
  const [petugasSortirNama, setPetugasSortirNama] = useState(currentUser?.nama_lengkap || 'Sistem');

  // Active bal items state for current batch
  const [balItems, setBalItems] = useState<TransaksiItemBal[]>([]);

  // Bal Adder Input Fields
  const [inputNoBal, setInputNoBal] = useState('');
  const isKuponExists = transaksiList.some(tx => tx.no_kupon.toLowerCase() === noKupon.toLowerCase());
        const [selectedGrade, setSelectedGrade] = useState('');
  const [hargaSatuan, setHargaSatuan] = useState<number>(0);
  const [isGantiTikar, setIsGantiTikar] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const gradeSelectRef = useRef<HTMLSelectElement>(null);

  

  // Compute bal suggestions for Sortir
  const sortirBalSuggestions = useMemo(() => {
    const q = inputNoBal.trim().toLowerCase();
    if (!q) return [];
    const qClean = q.replace(/[^a-zA-Z0-9]/g, '');

    // Existing bales in database
    const existingMatches = (barangList || []).filter((b) => {
      const noBal = (b.no_bal || '').toLowerCase();
      const bId = (b.barang_id || '').toLowerCase();
      const noBalClean = noBal.replace(/[^a-zA-Z0-9]/g, '');
      return noBal.includes(q) || bId.includes(q) || (qClean && noBalClean.includes(qClean));
    });

    const suggestions: { no_bal: string; kode_grade?: string; label: string; isNew?: boolean }[] = [];

    // Synthesize pattern recommendations if matching format like A00, A0001, A0010, A0020
    const currentGrade = selectedGrade || 'A';
    const sampleNumbers = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 50, 100];
    sampleNumbers.forEach((num) => {
      const formatted = `${currentGrade}${String(num).padStart(4, '0')}`;
      if (formatted.toLowerCase().includes(q) || formatted.toLowerCase().startsWith(q)) {
        if (!suggestions.some((s) => s.no_bal === formatted)) {
          suggestions.push({
            no_bal: formatted,
            kode_grade: currentGrade,
            label: `Format Rekomendasi Grade ${currentGrade}`,
            isNew: true,
          });
        }
      }
    });

    // Add existing from database
    existingMatches.slice(0, 10).forEach((b) => {
      const balNo = b.no_bal || b.barang_id;
      if (!suggestions.some((s) => s.no_bal === balNo)) {
        suggestions.push({
          no_bal: balNo,
          kode_grade: b.kode_grade,
          label: `Master: ${b.nama_petani || 'Gudang'} (${b.kode_grade})`,
          isNew: false,
        });
      }
    });

    return suggestions.slice(0, 15);
  }, [inputNoBal, selectedGrade, barangList]);

  // Active farmers list
  const activeFarmers = useMemo(() => {
    return petaniList.filter((p) => p.status_aktif !== false);
  }, [petaniList]);

  // Set default farmer
  useEffect(() => {
    if (activeFarmers.length > 0 && !selectedPetaniId) {
      setSelectedPetaniId(activeFarmers[0].petani_id);
    }
  }, [activeFarmers, selectedPetaniId]);

  

  // Auto focus barcode input on mount & Global Scanner listener
  useEffect(() => {
    barcodeInputRef.current?.focus();

    let scanBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // If user is typing in a standard input or select other than barcode input
      if (target && target !== barcodeInputRef.current && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const currentTime = Date.now();
      // Hardware scanners typically type characters very quickly (< 40ms interval)
      if (currentTime - lastKeyTime > 150) {
        scanBuffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (scanBuffer.trim().length >= 2) {
          e.preventDefault();
          const scannedCode = scanBuffer.trim();
          setInputNoBal(scannedCode);
          scanBuffer = '';
          // Focus input so Enter adds it
          barcodeInputRef.current?.focus();
        }
      } else if (e.key.length === 1) {
        scanBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Update hargaSatuan when grade selection changes
    const handleGradeChange = (gradeCode: string) => {
    setSelectedGrade(gradeCode);
    const found = hargaList.find((h) => h.kode_grade === gradeCode);
    if (found) {
      setHargaSatuan(found.harga_per_kg);
      // Auto submit removed as per user request
    } else {
      setHargaSatuan(0);
    }
  };

  const currentPetani = useMemo(() => {
    return petaniList.find((p) => p.petani_id === selectedPetaniId);
  }, [petaniList, selectedPetaniId]);

  // Auto-generate next suggested No Bal based on count
  const getNextSuggestedNoBal = () => {
    const nextSeq = balItems.length + 1;
    return `A${String(nextSeq).padStart(4, '0')}`;
  };

  // Add bal item into list
  const handleAddBalItem = () => {
    if (!selectedGrade) {
      document.getElementById('grade-input')?.focus();
      setScanFeedback({ text: 'Silakan pilih Mutu Barang terlebih dahulu.', isError: false });
      return;
    }

    const isValidGrade = hargaList.some((h) => h.kode_grade === selectedGrade);
    if (!isValidGrade) {
      document.getElementById('grade-input')?.focus();
      setScanFeedback({ text: `Gagal: Mutu Barang (Grade) "${selectedGrade}" tidak terdaftar di Master Harga Beli!`, isError: true });
      return;
    }

    const balCode = inputNoBal.trim() || getNextSuggestedNoBal();
    const cleanedBalCode = balCode.replace(/-/g, '').toUpperCase();
    
    if (!cleanedBalCode) {
      setScanFeedback({ text: 'Nomor bal wajib diisi atau discan!', isError: true });
      return;
    }

    // Check duplicate in master data
    if (barangList.some((b) => (b.no_bal || b.barang_id || '').toUpperCase() === cleanedBalCode)) {
      setScanFeedback({ text: `Gagal: Nomor bal "${cleanedBalCode}" sudah ada di master data inventaris!`, isError: true });
      return;
    }

    // Check duplicate in current batch
    if (balItems.some((b) => b.no_bal.toUpperCase() === cleanedBalCode)) {
      setScanFeedback({ text: `Nomor bal "${cleanedBalCode}" sudah ada dalam daftar sortir kupon ini!`, isError: true });
      return;
    }

    const tara = hitungPotonganTaraKg(0, isGantiTikar, cleanedBalCode);
    const potTikar = isGantiTikar ? 75000 : 0;
    const potKuli = 7000;
    const potTali = 3000;
    const potTotal = potKuli + potTali + potTikar;

    const newItem: TransaksiItemBal = {
      item_id: `BAL-ITEM-${Date.now()}-${balItems.length + 1}`,
      no_bal: cleanedBalCode,
      barcode: cleanedBalCode,
      kode_grade: selectedGrade,
      harga_per_kg: hargaSatuan,
      ganti_tikar: isGantiTikar,
      berat_bruto_kg: 0,
      potongan_tara_kg: tara,
      berat_kg: 0, // Berat awal 0 kg (akan diisi di Proses 2 Meja Timbang)
      potongan_kuli: potKuli,
      potongan_tali: potTali,
      potongan_tikar: potTikar,
      potongan: potTotal,
      total_kotor: 0,
      subtotal_bersih: 0,
      status_timbang: 'menunggu_timbang',
      lokasi_simpan: 'Blok A',
    };

    setBalItems((prev) => [...prev, newItem]);
    setScanFeedback({ text: `✓ Bal \"${cleanedBalCode}\" Grade ${selectedGrade} berhasil ditambahkan!`, isError: false });
    
    // Clear and prepare for next scan
    setInputNoBal('');
    setSelectedGrade('');
    setHargaSatuan(0);
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
    setSelectedGrade('');
    setHargaSatuan(0);
    setIsGantiTikar(false);

    // Re-focus barcode input
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleKeyDownAdder = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBalItem();
    }
  };

  const handleRemoveItem = (index: number) => {
    setBalItems((prev) => prev.filter((_, i) => i !== index));
    setScanFeedback(null);
  };

  const handleToggleItemGantiTikar = (index: number) => {
    setBalItems((prev) =>
      prev.map((it, i) => {
        if (i === index) {
          const nextVal = !it.ganti_tikar;
          return {
            ...it,
            ganti_tikar: nextVal,
            potongan_tara_kg: hitungPotonganTaraKg(0, nextVal, it.no_bal),
            potongan_tikar: nextVal ? 75000 : 0,
            potongan: (it.potongan_kuli || 7000) + (it.potongan_tali || 3000) + (nextVal ? 75000 : 0),
          };
        }
        return it;
      })
    );
  };

  // Save Transaction (Intake Sortir Complete)
  const handleSaveSortirData = (shouldNavigateToTimbang = false) => {
    if (!selectedPetaniId || !currentPetani) {
      alert('Pilih petani penyetor terlebih dahulu.');
      return;
    }

    if (balItems.length === 0) {
      alert('Tambahkan minimal 1 bal tembakau yang telah disortir.');
      return;
    }

    const txId = generateTransaksiId(tanggal, transaksiList);
    const seqPart = txId.split('-')[2] || '001';
    const kuponFinal = noKupon.trim() || `KUP${seqPart.padStart(4, '0')}`;

    const uniqueGrades: string[] = Array.from(new Set(balItems.map((i) => i.kodeGrade || i.kode_grade)));
    const gradeSummary = uniqueGrades.length === 1 ? uniqueGrades[0] : `Multi (${uniqueGrades.join(', ')})`;
    const avgHarga = Math.round(
      balItems.reduce((acc, i) => acc + (i.harga_per_kg || 0), 0) / (balItems.length || 1)
    );

    const generatedBarangList: Barang[] = balItems.map((item, idx) => ({
      barang_id: `BAL-${txId.replace('TRX-', '')}-${String(idx + 1).padStart(2, '0')}`,
      barcode: item.barcode || item.no_bal,
      kode_grade: item.kode_grade,
      no_bal: item.no_bal,
      berat_kg: 0,
      status_stok: 'di_gudang',
      lokasi_gudang: item.lokasi_simpan || lokasiGudang || 'Gudang Utama Pamekasan',
      tanggal_masuk: tanggal,
      petani_id: currentPetani.petani_id,
      nama_petani: currentPetani.nama_petani,
      desa_kecamatan: currentPetani.alamat || currentPetani.desa_kecamatan || 'Ds. Wringin Anom',
      transaksi_pembelian_id: txId,
      catatan: `Sortir Intake Kupon: ${kuponFinal}`,
    }));

    const finalTx: TransaksiPembelian = {
      transaksi_id: txId,
      no_kupon: kuponFinal,
      petani_id: currentPetani.petani_id,
      nama_petani: currentPetani.nama_petani,
            no_hp: currentPetani.no_hp || '-',
      desa_kecamatan: currentPetani.alamat || currentPetani.desa_kecamatan || 'Pamekasan',
      no_bal: balItems.map((i) => i.no_bal).join(', '),
      kode_grade: gradeSummary,
      total_bal: balItems.length,
      bal_selesai_timbang: 0,
      items: balItems.map((it, idx) => ({
        ...it,
        barang_id: generatedBarangList[idx]?.barang_id,
      })),
      barang_ids: generatedBarangList.map((b) => b.barang_id),
      jenis_timbang: 'bruto',
      berat_terukur_kg: 0,
      potongan_tara_kg: balItems.reduce((acc, i) => acc + (i.potongan_tara_kg || 0), 0),
      berat_kg: 0,
      lokasi_gudang: lokasiGudang,
      harga_per_kg: avgHarga,
      total_kotor: 0,
      potongan_kuli: balItems.reduce((acc, i) => acc + (i.potongan_kuli || 7000), 0),
      potongan_tali: balItems.reduce((acc, i) => acc + (i.potongan_tali || 3000), 0),
      potongan_tikar: balItems.reduce((acc, i) => acc + (i.potongan_tikar || 0), 0),
      total_potongan: balItems.reduce((acc, i) => acc + (i.potongan || 10000), 0),
      total_harga_beli: 0,
      harga_final: 0,
      status_transaksi: 'menunggu',
      status_tahap: 'menunggu_timbang',
      status_nota: 'belum_cetak',
      unduh_nota_count: 0,
      tanggal_transaksi: tanggal,
      operator_nama: petugasSortirNama || 'Petugas Sortir QC',
      petugas_sortir: petugasSortirNama || 'Petugas Sortir QC',
      catatan_qc: `Sortir ${balItems.length} bal tembakau. Menunggu timbangan.`,
    };

    onSaveTransaksi(finalTx, generatedBarangList);
    setSaveSuccessMsg(`Data Sortir Kupon ${kuponFinal} (${balItems.length} Bal) berhasil disimpan!`);

    // Reset Form for next kupon
    setBalItems([]);
    
      let maxNum = 0;
      transaksiList.forEach(tx => {
        const match = tx.no_kupon.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      const currentMatch = noKupon.match(/\d+/);
      if (currentMatch) {
         const currentNum = parseInt(currentMatch[0], 10);
         if (currentNum > maxNum) maxNum = currentNum;
      }
      setNoKupon(`KUP${String(maxNum + 1).padStart(4, '0')}`);
    setInputNoBal('');
    setScanFeedback(null);

    if (shouldNavigateToTimbang) {
      onNavigateToTimbangan(kuponFinal, txId);
    }
  };

  // Recent sortir queue waiting for weight
  const waitingSortirList = useMemo(() => {
    return transaksiList.filter(
      (t) => t.status_transaksi === 'menunggu' || (t.items || []).some((it) => (it.berat_kg || 0) <= 0)
    );
  }, [transaksiList]);

  return (
    <div className="space-y-4 font-sans pb-10">

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-sm flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Sortir Input Card */}
      <div className="bg-white border border-gray-200 shadow-2xs">
        <div className="bg-gray-100/80 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#b81d24]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
              Formulir Input Data Sortir
            </h3>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">
            Tanggal: <strong className="text-gray-900 font-mono">{formatDateHariBulanTahun(tanggal)}</strong>
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          
          {/* Top Parameters Grid */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            
            {/* 1. Nomor Kupon */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                1. No. Kupon Antrian <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={noKupon}
                onChange={(e) => setNoKupon(formatNoKupon(e.target.value))}
                className={`w-full bg-white border rounded-sm px-3 py-1.5 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:ring-1 ${isKuponExists ? 'border-rose-400 focus:border-rose-600 focus:ring-rose-600' : 'border-slate-300 focus:border-slate-800 focus:ring-slate-800'}`}
                placeholder="Contoh: KUP0001"
                required
              />
              {isKuponExists ? (
                <p className="text-[10px] text-rose-600 font-semibold mt-1">⚠️ Kupon sudah digunakan</p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">Sesuai kupon antrian fisik</p>
              )}
            </div>

            {/* 2. Petani Penyetor */}
            <div className="sm:col-span-1 md:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                2. Petani Penyetor <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={selectedPetaniId}
                onChange={(val) => setSelectedPetaniId(val)}
                options={activeFarmers.map(p => ({ value: p.petani_id, label: `${p.nama_petani} (${p.petani_id})` }))}
                placeholder="Pilih Petani..."
              />
              {currentPetani && (
                <p className="text-[10px] text-slate-400 mt-1 truncate">
                  Desa: {currentPetani.alamat || currentPetani.desa_kecamatan || '-'}
                </p>
              )}
            </div>

            {/* 3. Tanggal Masuk */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                3. Tanggal Masuk <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                required
              />
            </div>

            {/* 4. Gudang Intake */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                4. Gudang Intake
              </label>
              <SearchableSelect
                value={lokasiGudang}
                onChange={(val) => setLokasiGudang(val)}
                options={gudangList && gudangList.length > 0 ? gudangList.map(g => ({ value: g.nama_gudang, label: g.nama_gudang })) : [
                  { value: 'Gudang Utama Pamekasan', label: 'Gudang Utama Pamekasan' },
                  { value: 'Gudang Produksi Rokok', label: 'Gudang Produksi Rokok' },
                  { value: 'Gudang Sumenep', label: 'Gudang Sumenep' }
                ]}
                placeholder="Pilih Gudang Intake..."
              />
            </div>

            {/* 5. Petugas Sortir */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                5. Petugas Sortir / Grader
              </label>
              <input
                type="text"
                value={petugasSortirNama}
                readOnly
                disabled
                className="w-full bg-slate-50 border border-slate-200 rounded-sm px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

          </div>

          {/* Bal Adder Toolbar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Input Bal & Penentuan Grade
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 border border-slate-200 rounded-xs">
                Standby: barcode yang discan otomatis terisi No Bal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
              
              {/* No Bal Input */}
              <div className="md:col-span-3 relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  No Bal <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={inputNoBal}
                    autoComplete="off"
                    onChange={(e) => {
                      setInputNoBal(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('grade-input')?.focus();
                      }
                    }}
                    placeholder={`Contoh: ${getNextSuggestedNoBal().replace(/-/g, '')}`}
                    className="w-full bg-white border border-slate-300 rounded-sm px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 uppercase"
                  />
                  {inputNoBal && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputNoBal('');
                        
                        barcodeInputRef.current?.focus();
                      }}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mutu Barang <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  inputId="grade-input"
                  value={selectedGrade}
                  onChange={(val) => handleGradeChange(val)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (selectedGrade) {
                        handleAddBalItem();
                      }
                    }
                  }}
                  allowCustom={true}
                  options={hargaList.map(h => ({ value: h.kode_grade, label: `Grade ${h.kode_grade} — ${formatRupiah(h.harga_per_kg)}/kg` }))}
                  placeholder="Ketik Grade (Contoh: A0001)..."
                  className="w-full"
                />
              </div>

              {/* Harga Satuan */}
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Harga Satuan (Rp/Kg)
                </label>
                <input
                  id="harga-input"
                  type="number"
                  value={hargaSatuan || ''}
                  disabled
                  onChange={(e) => setHargaSatuan(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-sm px-2.5 py-2 text-xs font-mono font-semibold text-slate-500 cursor-not-allowed focus:outline-none"
                  placeholder="Rp per kg"
                />
              </div>

              {/* Button Tambah Bal */}
              <div className="md:col-span-3">
                <button
                  type="button"
                  id="btn-tambah-bal"
                  onClick={handleAddBalItem}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-sm transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Bal</span>
                </button>
              </div>

            </div>

            {/* Adder Feedback */}
            {scanFeedback && (
              <div className={`text-xs px-3 py-1.5 rounded-sm font-medium flex items-center space-x-2 ${
                scanFeedback.isError ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}>
                <span>{scanFeedback.text}</span>
              </div>
            )}

          </div>

          {/* Bal Items Table for Current Batch */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                <span>Daftar Bal Ter-Sortir pada Kupon Ini</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-xs text-[10px] font-semibold">
                  {balItems.length} Bal
                </span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Berat netto akan diisi saat bal tiba di Meja Timbang
              </p>
            </div>

            <div className="border border-slate-200 rounded-sm overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">No Bal</th>
                    <th className="py-2.5 px-3">Mutu Grade</th>
                    <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                    
                    <th className="py-2.5 px-3 text-center">Status Berat</th>
                    <th className="py-2.5 px-3 w-20 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {balItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        <Layers className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p className="font-semibold text-gray-600 text-xs">Belum ada bal yang ditambahkan pada kupon ini</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Scan barcode stiker bal atau masukkan nomor bal di atas lalu simpan.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    balItems.map((item, index) => (
                      <tr key={item.item_id || index} className="hover:bg-amber-50/40 transition">
                        <td className="py-2 px-3 text-center font-mono font-bold text-gray-500">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono font-black text-gray-900 bg-gray-100 px-2 py-0.5 border border-gray-300 rounded text-xs">
                            {item.no_bal}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 bg-red-50 text-[#b81d24] border border-red-200 font-bold rounded-xs text-[11px]">
                            Grade {item.kode_grade}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-gray-800">
                          {formatRupiah(item.harga_per_kg)}/kg
                        </td>
                        
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xs text-[10px] font-medium">
                            Menunggu Timbang
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xs transition cursor-pointer"
                            title="Hapus baris ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Total Bal Disortir: <strong className="text-slate-900 text-sm font-semibold">{balItems.length} Bal</strong>
              {currentPetani && (
                <span className="ml-2 text-slate-500">
                  (Petani: <strong className="text-slate-700">{currentPetani.nama_petani}</strong> • Kupon: <strong className="text-slate-700 font-mono">{noKupon}</strong>)
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setBalItems([])}
                disabled={balItems.length === 0}
                className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs rounded-sm transition cursor-pointer disabled:opacity-50"
              >
                Reset Bal
              </button>

              <button
                type="button"
                onClick={() => handleSaveSortirData(false)}
                disabled={balItems.length === 0}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-sm transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Simpan Data Sortir</span>
              </button>

              
            </div>
          </div>

        </div>
      </div>

      </div>
  );
};

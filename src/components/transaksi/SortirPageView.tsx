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
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { TransaksiPembelian, Petani, TabelHarga, Barang, TransaksiItemBal, UserRole, User as UserType, SaveTransaksiMeta } from '../../types';
import { formatRupiah, formatNoKupon, formatDateHariBulanTahun, formatNumber, generateTransaksiId, hitungPotonganTaraKg } from '../../utils/formatters';
import { useSessionDraft } from '../../hooks/useSessionDraft';
import { buildBarangDariItem, hitungUlangKupon, isBalDitimbang, isKuponProsesSortir, nextBarangId } from '../../utils/kuponSortir';

interface SortirPageViewProps {
  petaniList: Petani[];
  hargaList: TabelHarga[];
  transaksiList: TransaksiPembelian[];
  barangList?: Barang[];
  userRole: UserRole;
  currentUser?: UserType | null;
  onSaveTransaksi: (newTx: TransaksiPembelian, generatedBarang: Barang | Barang[], meta?: SaveTransaksiMeta) => void;
  onDeleteTransaksi?: (transaksiId: string, alasan?: string) => void;
  onNavigateToTimbangan: (kuponNo?: string, txId?: string, balNo?: string) => void;
}

export const SortirPageView: React.FC<SortirPageViewProps> = ({
  petaniList = [],
  hargaList = [],
  transaksiList = [],
  barangList = [],
  userRole,
  currentUser,
  onSaveTransaksi,
  onDeleteTransaksi,
  onNavigateToTimbangan,
}) => {
  // Form Header State
  const draftUserId = currentUser?.user_id;
  const [noKupon, setNoKupon] = useSessionDraft<string>('sortir_no_kupon', draftUserId, () => {
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
  const [selectedPetaniId, setSelectedPetaniId, resetDraftPetani] = useSessionDraft<string>('sortir_petani', draftUserId, '');
  const [tanggal, setTanggal] = useSessionDraft<string>('sortir_tanggal', draftUserId, () => new Date().toISOString().split('T')[0]);
  const [petugasSortirNama, setPetugasSortirNama] = useState(currentUser?.nama_lengkap || 'Sistem');

  // Kupon terbuka: tersimpan sejak bal pertama discan sehingga Timbangan di komputer
  // lain bisa langsung menimbang, walaupun sortir kupon ini belum selesai.
  const [openTxId, setOpenTxId, resetOpenTxId] = useSessionDraft<string>('sortir_open_tx_id', draftUserId, '');
  const openTx = useMemo(
    () => (openTxId ? transaksiList.find((t) => t.transaksi_id === openTxId && isKuponProsesSortir(t)) : undefined),
    [openTxId, transaksiList]
  );
  const balItems: TransaksiItemBal[] = openTx?.items || [];

  // Kupon ditutup atau dihapus dari tempat lain (tunggu data transaksi selesai dimuat)
  useEffect(() => {
    if (openTxId && !openTx && transaksiList.length > 0) resetOpenTxId();
  }, [openTxId, openTx, transaksiList.length]);

  // Kupon proses sortir lain yang bisa dilanjutkan (mis. setelah browser ditutup)
  const kuponBelumSelesai = useMemo(
    () => transaksiList.filter((t) => isKuponProsesSortir(t) && t.transaksi_id !== openTxId),
    [transaksiList, openTxId]
  );

  // Bal Adder Input Fields
  const [inputNoBal, setInputNoBal] = useState('');

  // Real-time Check Duplikasi Kupon
  const duplicateKuponTx = useMemo(() => {
    const clean = (noKupon || '').trim().toLowerCase();
    if (!clean) return null;
    return transaksiList.find(
      (tx) => tx.transaksi_id !== openTxId && (tx.no_kupon || '').trim().toLowerCase() === clean
    );
  }, [noKupon, transaksiList, openTxId]);
  const isKuponExists = Boolean(duplicateKuponTx) && !openTx;

  const handleGenerateNextKupon = () => {
    let maxNum = 0;
    transaksiList.forEach(tx => {
      const match = (tx.no_kupon || '').match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    setNoKupon(`KUP${String(maxNum + 1).padStart(4, '0')}`);
  };

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

    // Kupon baru dibuka bersamaan dengan bal pertama
    if (!openTx) {
      if (!selectedPetaniId || !currentPetani) {
        setScanFeedback({ text: 'Pilih petani penyetor terlebih dahulu sebelum menambah bal.', isError: true });
        return;
      }
      if (isKuponExists) {
        setScanFeedback({ text: `Nomor kupon "${noKupon}" sudah digunakan transaksi lain. Gunakan nomor kupon yang berbeda.`, isError: true });
        return;
      }
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

    const petugas = petugasSortirNama || 'Petugas Sortir QC';
    let kuponDasar: TransaksiPembelian;
    if (openTx) {
      kuponDasar = openTx;
    } else {
      const txId = generateTransaksiId(tanggal, transaksiList);
      const seqPart = txId.split('-')[2] || '001';
      kuponDasar = {
        transaksi_id: txId,
        no_kupon: noKupon.trim() || `KUP${seqPart.padStart(4, '0')}`,
        petani_id: currentPetani!.petani_id,
        nama_petani: currentPetani!.nama_petani,
        no_hp: currentPetani!.no_hp || '-',
        desa_kecamatan: currentPetani!.alamat || currentPetani!.desa_kecamatan || '',
        no_bal: '',
        kode_grade: '-',
        items: [],
        jenis_timbang: 'bruto',
        berat_terukur_kg: 0,
        potongan_tara_kg: 0,
        berat_kg: 0,
        harga_per_kg: 0,
        potongan_kuli: 0,
        potongan_tikar: 0,
        total_potongan: 0,
        total_harga_beli: 0,
        harga_final: 0,
        status_transaksi: 'menunggu',
        status_tahap: 'proses_sortir',
        status_nota: 'belum_cetak',
        unduh_nota_count: 0,
        tanggal_transaksi: tanggal,
        operator_nama: petugas,
        petugas_sortir: petugas,
        catatan_qc: 'Sortir sedang berjalan.',
      };
    }

    const itemBaru = { ...newItem, barang_id: nextBarangId(kuponDasar.transaksi_id, kuponDasar.items || []) };
    const updatedTx = hitungUlangKupon(kuponDasar, [...(kuponDasar.items || []), itemBaru]);
    onSaveTransaksi(
      updatedTx,
      [buildBarangDariItem(updatedTx, itemBaru)],
      openTx
        ? { skipAudit: true }
        : {
            audit: {
              aksi: 'BUKA_KUPON_SORTIR',
              deskripsi: `Kupon ${updatedTx.no_kupon} dibuka untuk ${updatedTx.nama_petani}, bal pertama ${cleanedBalCode} (Grade ${selectedGrade})`,
            },
          }
    );
    if (!openTx) setOpenTxId(updatedTx.transaksi_id);
    setScanFeedback({
      text: `✓ Bal "${cleanedBalCode}" Grade ${selectedGrade} tersimpan di Kupon ${updatedTx.no_kupon} dan sudah bisa ditimbang.`,
      isError: false,
    });
    
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

  const handleRemoveItem = (itemId: string) => {
    if (!openTx) return;
    const item = balItems.find((it) => it.item_id === itemId);
    if (!item) return;
    // Hasil timbang tidak boleh hilang karena perubahan di Sortir
    if (isBalDitimbang(item)) {
      setScanFeedback({
        text: `Bal "${item.no_bal}" sudah ditimbang (${formatNumber(item.berat_kg)} kg) sehingga tidak bisa dihapus dari Sortir.`,
        isError: true,
      });
      return;
    }
    const updatedTx = hitungUlangKupon(openTx, balItems.filter((it) => it.item_id !== itemId));
    onSaveTransaksi(updatedTx, [], {
      audit: {
        aksi: 'SORTIR_HAPUS_BAL',
        deskripsi: `Bal ${item.no_bal} (Grade ${item.kode_grade}) dihapus dari Kupon ${openTx.no_kupon} saat sortir`,
      },
    });
    setScanFeedback({ text: `Bal "${item.no_bal}" dihapus dari Kupon ${openTx.no_kupon}.`, isError: false });
  };

  // Siapkan form untuk kupon berikutnya
  const resetFormKuponBaru = (kuponTerakhir: string) => {
    resetOpenTxId();
    resetDraftPetani();
    let maxNum = 0;
    [...transaksiList.map((tx) => tx.no_kupon || ''), kuponTerakhir].forEach((kupon) => {
      const match = kupon.match(/\d+/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[0], 10));
    });
    setNoKupon(`KUP${String(maxNum + 1).padStart(4, '0')}`);
    setInputNoBal('');
    setScanFeedback(null);
  };

  // Menutup kupon: tidak ada bal baru lagi dan kupon bisa dibayar setelah semua bal ditimbang
  const handleSelesaiSortir = () => {
    if (!openTx) return;
    if (balItems.length === 0) {
      alert('Tambahkan minimal 1 bal tembakau sebelum menyelesaikan sortir.');
      return;
    }

    const belumDitimbang = balItems.filter((it) => !isBalDitimbang(it)).length;
    const updatedTx = hitungUlangKupon(
      { ...openTx, status_tahap: 'menunggu_timbang', catatan_qc: `Sortir ${balItems.length} bal tembakau selesai.` },
      balItems
    );
    onSaveTransaksi(updatedTx, [], {
      audit: {
        aksi: 'SELESAI_SORTIR',
        deskripsi: `Sortir Kupon ${openTx.no_kupon} selesai: ${balItems.length} bal (${belumDitimbang} belum ditimbang)`,
      },
    });
    setSaveSuccessMsg(
      belumDitimbang > 0
        ? `Sortir Kupon ${openTx.no_kupon} selesai (${balItems.length} bal). ${belumDitimbang} bal masih menunggu timbang.`
        : `Sortir Kupon ${openTx.no_kupon} selesai dan seluruh ${balItems.length} bal sudah ditimbang. Kupon siap dibayar di Kasir.`
    );
    resetFormKuponBaru(openTx.no_kupon);
  };

  // Membatalkan kupon yang belum ada bal tertimbang
  const handleBatalkanKupon = () => {
    if (!openTx || !onDeleteTransaksi) return;
    if (balItems.some(isBalDitimbang)) {
      alert(`Kupon ${openTx.no_kupon} tidak bisa dibatalkan karena sebagian bal sudah ditimbang. Hapus bal yang belum ditimbang satu per satu, atau selesaikan sortir.`);
      return;
    }
    if (!window.confirm(`Batalkan Kupon ${openTx.no_kupon}? ${balItems.length} bal pada kupon ini akan dihapus.`)) return;
    onDeleteTransaksi(openTx.transaksi_id, 'Kupon dibatalkan dari Sortir sebelum selesai');
    resetOpenTxId();
    setScanFeedback({ text: `Kupon ${openTx.no_kupon} dibatalkan.`, isError: false });
  };

  // Melanjutkan kupon proses sortir yang belum ditutup
  const handleLanjutkanKupon = (tx: TransaksiPembelian) => {
    setOpenTxId(tx.transaksi_id);
    setNoKupon(tx.no_kupon);
    setSelectedPetaniId(tx.petani_id);
    setTanggal((tx.tanggal_transaksi || '').split(' ')[0] || tanggal);
    setSaveSuccessMsg(null);
    setScanFeedback({ text: `Melanjutkan sortir Kupon ${tx.no_kupon} (${(tx.items || []).length} bal).`, isError: false });
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

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

      {/* Kupon proses sortir yang belum ditutup */}
      {!openTx && kuponBelumSelesai.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-sm space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Kupon Sortir Belum Selesai ({kuponBelumSelesai.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {kuponBelumSelesai.map((tx) => {
              const items = tx.items || [];
              const ditimbang = items.filter(isBalDitimbang).length;
              return (
                <button
                  key={tx.transaksi_id}
                  type="button"
                  onClick={() => handleLanjutkanKupon(tx)}
                  className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 rounded-sm text-left transition cursor-pointer"
                >
                  <div className="text-xs font-mono font-bold text-slate-900">{tx.no_kupon}</div>
                  <div className="text-[10px] text-slate-600">
                    {tx.nama_petani} • {items.length} bal • {ditimbang} ditimbang • <span className="font-semibold text-[#b81d24]">Lanjutkan</span>
                  </div>
                </button>
              );
            })}
          </div>
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
          <div className="flex items-center gap-2">
            {openTx && (
              <span
                className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xs text-[10px] font-bold"
                title="Setiap bal langsung tersimpan dan bisa ditimbang di Timbangan"
              >
                Kupon {openTx.no_kupon} terbuka • tersimpan otomatis
              </span>
            )}
            <span className="text-[11px] text-gray-500 font-medium">
              Tanggal: <strong className="text-gray-900 font-mono">{formatDateHariBulanTahun(tanggal)}</strong>
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          
          {/* Top Parameters Grid */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-3.5">
            
            {/* 1. Nomor Kupon */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  1. No. Kupon Antrian <span className="text-rose-500">*</span>
                </label>
                {isKuponExists && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 border border-rose-200 rounded-2xs">
                    Duplikat!
                  </span>
                )}
              </div>
              <input
                type="text"
                value={openTx ? openTx.no_kupon : noKupon}
                onChange={(e) => setNoKupon(formatNoKupon(e.target.value))}
                disabled={Boolean(openTx)}
                title={openTx ? 'Nomor kupon terkunci selama kupon terbuka' : undefined}
                className={`w-full bg-white border rounded-sm px-3 py-1.5 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed ${isKuponExists ? 'border-rose-500 focus:border-rose-600 focus:ring-rose-600 ring-1 ring-rose-200 bg-rose-50/40' : 'border-slate-300 focus:border-slate-800 focus:ring-slate-800'}`}
                placeholder="Contoh: KUP0001"
                required
              />
              {isKuponExists && duplicateKuponTx ? (
                <div className="mt-1 p-2 bg-rose-50 border border-rose-300 rounded-xs text-[11px] text-rose-950 space-y-1.5 shadow-2xs">
                  <div className="flex items-center space-x-1.5 font-bold text-rose-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Kupon Sudah Terdaftar!</span>
                  </div>
                  <p className="leading-tight text-[10px] text-rose-900">
                    Kupon <strong className="font-mono">{noKupon}</strong> telah digunakan transaksi <strong>{duplicateKuponTx.transaksi_id}</strong> (Petani: <strong>{duplicateKuponTx.nama_petani}</strong>).
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateNextKupon}
                    className="inline-flex items-center space-x-1 text-[10px] font-bold text-white bg-[#b81d24] hover:bg-rose-800 px-2 py-0.5 rounded-xs transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Gunakan Kupon Bebas Berikutnya</span>
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">Sesuai nomor kupon antrian fisik petani</p>
              )}
            </div>

            {/* 2. Petani Penyetor */}
            <div className="sm:col-span-1 md:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                2. Petani Penyetor <span className="text-rose-500">*</span>
              </label>
              {openTx ? (
                <input
                  type="text"
                  value={`${openTx.nama_petani} (${openTx.petani_id})`}
                  disabled
                  title="Petani terkunci selama kupon terbuka"
                  className="w-full bg-slate-100 border border-slate-300 rounded-sm px-3 py-1.5 text-xs text-slate-600 cursor-not-allowed"
                />
              ) : (
                <SearchableSelect
                  value={selectedPetaniId}
                  onChange={(val) => setSelectedPetaniId(val)}
                  options={activeFarmers.map(p => ({ value: p.petani_id, label: `${p.nama_petani} (${p.petani_id})` }))}
                  placeholder="Pilih Petani..."
                />
              )}
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
                disabled={Boolean(openTx)}
                className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                required
              />
            </div>

            {/* 4. Petugas Sortir */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                4. Petugas Sortir / Grader
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 md:grid-cols-2 gap-3 items-end">
              
              {/* No Bal Input */}
              <div className="lg:col-span-3 relative">
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
              <div className="lg:col-span-3">
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
              <div className="lg:col-span-3">
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
              <div className="lg:col-span-3">
                <button
                  type="button"
                  id="btn-tambah-bal"
                  onClick={handleAddBalItem}
                  className="w-full py-2 bg-[#b81d24] hover:bg-[#b81d24] text-white font-medium text-xs rounded-sm transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
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
                Setiap bal langsung tersimpan dan bisa ditimbang di Meja Timbang tanpa menunggu sortir selesai
              </p>
            </div>

            <div className="border border-slate-200 rounded-md overflow-x-auto bg-white">
              <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5 w-12 text-center">#</th>
                    <th className="py-3 px-3.5">No Bal</th>
                    <th className="py-3 px-3.5">Mutu Grade</th>
                    <th className="py-3 px-3.5 text-right">Harga Satuan</th>
                    
                    <th className="py-3 px-3.5 text-center">Status Berat</th>
                    <th className="py-3 px-3.5 w-20 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {balItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700 text-xs">Belum ada bal yang ditambahkan pada kupon ini</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Scan barcode stiker bal atau masukkan nomor bal di atas. Kupon tersimpan otomatis sejak bal pertama.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    balItems.map((item, index) => {
                      const ditimbang = isBalDitimbang(item);
                      return (
                      <tr key={item.item_id || index} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3.5 text-center font-mono text-slate-500">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 border border-slate-200 rounded text-xs">
                            {item.no_bal}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 font-medium rounded text-[11px]">
                            Grade {item.kode_grade}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-medium text-slate-800">
                          {formatRupiah(item.harga_per_kg)}/kg
                        </td>
                        
                        <td className="py-2.5 px-3.5 text-center">
                          {ditimbang ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-semibold">
                              Ditimbang • {formatNumber(item.berat_kg)} kg
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-medium">
                              Menunggu Timbang
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.item_id)}
                            disabled={ditimbang}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            title={ditimbang ? 'Bal sudah ditimbang, tidak bisa dihapus dari Sortir' : 'Hapus bal ini dari kupon'}
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
          </div>

          {/* Action Toolbar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Total Bal Disortir: <strong className="text-slate-900 text-sm font-semibold">{balItems.length} Bal</strong>
              {openTx && (
                <span className="ml-2 text-slate-500">
                  ({balItems.filter(isBalDitimbang).length} sudah ditimbang • Petani: <strong className="text-slate-700">{openTx.nama_petani}</strong> • Kupon: <strong className="text-slate-700 font-mono">{openTx.no_kupon}</strong>)
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleBatalkanKupon}
                disabled={!openTx || balItems.some(isBalDitimbang)}
                title={balItems.some(isBalDitimbang) ? 'Kupon yang sudah ada bal tertimbang tidak bisa dibatalkan' : 'Hapus kupon ini beserta seluruh balnya'}
                className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs rounded-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batalkan Kupon
              </button>

              <button
                type="button"
                onClick={handleSelesaiSortir}
                disabled={!openTx || balItems.length === 0}
                title="Tutup kupon. Kupon bisa dibayar di Kasir setelah semua bal ditimbang."
                className="flex-1 sm:flex-none px-4 py-2 bg-[#b81d24] hover:bg-[#b81d24] text-white font-medium text-xs rounded-sm transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Selesai Sortir</span>
              </button>

              
            </div>
          </div>

        </div>
      </div>

      </div>
  );
};

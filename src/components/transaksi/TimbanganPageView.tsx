import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Scale, 
  Check, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, AlertTriangle, 
  Layers, 
  Warehouse, 
  User, 
  Tag, 
  Clock, 
  FileText,
  RotateCcw,
  Sparkles,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Unlock,
  Lock
} from 'lucide-react';
import { TransaksiPembelian, Petani, TabelHarga, Barang, Gudang, TransaksiItemBal, UserRole, User as UserType } from '../../types';
import { formatRupiah, formatNoKupon, formatDateHariBulanTahun, hitungPotonganTaraKg } from '../../utils/formatters';
import { recordLogAktivitas } from '../../utils/storage';

interface TimbanganPageViewProps {
  transaksiList: TransaksiPembelian[];
  petaniList: Petani[];
  hargaList: TabelHarga[];
  barangList: Barang[];
  gudangList?: Gudang[];
  userRole: UserRole;
  currentUser?: UserType | null;
  initialKuponNo?: string;
  initialTxId?: string;
  initialBalNo?: string;
  onSaveTransaksi: (newTx: TransaksiPembelian, generatedBarang: Barang | Barang[]) => void;
  onNavigateToKasir: (kuponNo?: string, txId?: string) => void;
  onNavigateToSortir: () => void;
}

export const TimbanganPageView: React.FC<TimbanganPageViewProps> = ({
  transaksiList = [],
  petaniList = [],
  hargaList = [],
  barangList = [],
  gudangList = [],
  userRole,
  currentUser,
  initialKuponNo,
  initialTxId,
  initialBalNo,
  onSaveTransaksi,
  onNavigateToKasir,
  onNavigateToSortir,
}) => {
  // Pending or all transactions
  const pendingOrRecentTxList = useMemo(() => {
    return transaksiList.filter((t) => (t.items || []).length > 0);
  }, [transaksiList]);

  // Initial lookup if initialBalNo is provided
  const initialBalMatch = useMemo(() => {
    if (!initialBalNo) return null;
    const cleanQ = initialBalNo.trim().toLowerCase();
    for (const tx of transaksiList) {
      const match = (tx.items || []).find((it) => {
        const bCode = (it.barcode || '').toLowerCase();
        const nBal = (it.no_bal || '').toLowerCase();
        return bCode === cleanQ || nBal === cleanQ;
      });
      if (match) return { tx, item: match };
    }
    return null;
  }, [initialBalNo, transaksiList]);

  // Selected Transaction ID
  const [selectedTxId, setSelectedTxId] = useState<string>(() => {
    if (initialBalMatch) return initialBalMatch.tx.transaksi_id;
    if (initialTxId) return initialTxId;
    if (initialKuponNo) {
      const found = transaksiList.find((t) => t.no_kupon === initialKuponNo);
      if (found) return found.transaksi_id;
    }
    // Default to first pending tx or first tx
    const firstPending = transaksiList.find((t) => (t.items || []).some((it) => (it.berat_kg || 0) <= 0));
    return firstPending?.transaksi_id || transaksiList[0]?.transaksi_id || '';
  });
  const [kuponInput, setKuponInput] = useState<string>('');
  
  // Sync kuponInput when selectedTxId changes from elsewhere
  useEffect(() => {
    const tx = transaksiList.find(t => t.transaksi_id === selectedTxId);
    if (tx) setKuponInput(tx.no_kupon);
  }, [selectedTxId, transaksiList]);


  // Current Transaction object
  const currentTx = useMemo(() => {
    return transaksiList.find((t) => t.transaksi_id === selectedTxId);
  }, [transaksiList, selectedTxId]);

  // Working copy of items for current selected transaction
  const [workingItems, setWorkingItems] = useState<TransaksiItemBal[]>([]);
  const [activeItemId, setActiveItemId] = useState<string>(() => {
    if (initialBalMatch) return initialBalMatch.item.item_id;
    return '';
  });

  // Weighing inputs
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [beratBrutoInput, setBeratBrutoInput] = useState<number | string>('');
  const [lokasiBlok, setLokasiBlok] = useState('Blok A (Utara)');

  const [scanFeedback, setScanFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [antiScanAlert, setAntiScanAlert] = useState<{ text: string; code?: string } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const barcodeScannerRef = useRef<HTMLInputElement>(null);
  const beratBrutoInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Anti-Scan Guard tracking for weight input
  const weightKeyBufferRef = useRef<{ chars: string; lastTime: number; isBurst: boolean }>({
    chars: '',
    lastTime: 0,
    isBurst: false,
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        barcodeScannerRef.current &&
        !barcodeScannerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync working items when selected transaction changes
  useEffect(() => {
    if (currentTx && currentTx.items && currentTx.items.length > 0) {
      setWorkingItems(currentTx.items);
      
      // 1. If activeItemId is already a valid item of this currentTx, keep it and update inputs
      const existingActive = currentTx.items.find((it) => it.item_id === activeItemId);
      if (existingActive) {
        setBeratBrutoInput(existingActive.berat_bruto_kg && existingActive.berat_bruto_kg > 0 ? existingActive.berat_bruto_kg : '');
        setLokasiBlok(existingActive.lokasi_simpan || 'Blok A (Utara)');
        return;
      }

      // 2. Otherwise pick first unweighed or first item
      const unweighed = currentTx.items.find((it) => (it.berat_kg || 0) <= 0);
      const targetItem = unweighed || currentTx.items[0];
      if (targetItem) {
        setActiveItemId(targetItem.item_id);
        setBeratBrutoInput(targetItem.berat_bruto_kg && targetItem.berat_bruto_kg > 0 ? targetItem.berat_bruto_kg : '');
        setLokasiBlok(targetItem.lokasi_simpan || 'Blok A (Utara)');
      }
    } else {
      setWorkingItems([]);
      setActiveItemId('');
    }
  }, [currentTx]);

  // Open a specific bal item and keep focus safely on scanner / No Bal field
  const selectBalAndOpen = useCallback((foundTx: TransaksiPembelian, foundItem: TransaksiItemBal, source: 'manual' | 'scanner' = 'manual') => {
    setSelectedTxId(foundTx.transaksi_id);
    setWorkingItems(foundTx.items || []);
    setActiveItemId(foundItem.item_id);
    setScannedBarcode(foundItem.no_bal);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    setBeratBrutoInput(foundItem.berat_bruto_kg && foundItem.berat_bruto_kg > 0 ? foundItem.berat_bruto_kg : '');
    setLokasiBlok(foundItem.lokasi_simpan || 'Blok A (Utara)');
    
    const isAlreadyWeighed = (foundItem.berat_kg || 0) > 0;
    const sourceLabel = source === 'scanner' ? '[SCAN BARCODE]' : '[PILIH BAL]';
    setScanFeedback({
      text: `✓ ${sourceLabel} Bal "${foundItem.no_bal}" (Grade ${foundItem.kode_grade}) terbuka! Kupon "${foundTx.no_kupon}" (${foundTx.nama_petani})${isAlreadyWeighed ? ` • [Netto: ${foundItem.berat_kg} Kg - TERKUNCI]` : ' • [Langkah 2: Masukkan Berat Manual]'}`,
      isError: false,
    });

    // PENGAMAN: Jaga fokus tetap pada kolom No Bal / Scanner agar tidak langsung mengisi berat tanpa sengaja
    setTimeout(() => {
      if (barcodeScannerRef.current) {
        barcodeScannerRef.current.focus();
        barcodeScannerRef.current.select();
      }
    }, 120);
  }, []);

  // Lookup Bal by code across ALL kupons and open that exact bal immediately
  const lookupBal = useCallback((query: string, isFromScanner: boolean = false) => {
    const q = query.trim();
    if (!q) return;

    // Fill the scanned barcode form field fully
    setScannedBarcode(q);

    const cleanQ = q.toLowerCase();
    const cleanQNormalized = q.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // 1. Search across all transactions for the best matching bal item
    let foundTx: TransaksiPembelian | undefined;
    let foundItem: TransaksiItemBal | undefined;

    // Check currently selected transaction first
    if (currentTx && currentTx.items) {
      const currentMatch = currentTx.items.find((it) => {
        const bCode = (it.barcode || '').toLowerCase();
        const nBal = (it.no_bal || '').toLowerCase();
        const nBalNorm = (it.no_bal || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return bCode === cleanQ || nBal === cleanQ || nBalNorm === cleanQNormalized;
      });
      if (currentMatch) {
        foundTx = currentTx;
        foundItem = currentMatch;
      }
    }

    // If not found in current transaction, search across ALL transactions (lintas kupon)
    if (!foundTx || !foundItem) {
      // Step A: Exact / normalized match across all kupons
      for (const tx of transaksiList) {
        const match = (tx.items || []).find((it) => {
          const bCode = (it.barcode || '').toLowerCase();
          const nBal = (it.no_bal || '').toLowerCase();
          const nBalNorm = (it.no_bal || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          return bCode === cleanQ || nBal === cleanQ || nBalNorm === cleanQNormalized;
        });
        if (match) {
          foundTx = tx;
          foundItem = match;
          break;
        }
      }

      // Step B: Partial match across all kupons
      if (!foundTx || !foundItem) {
        for (const tx of transaksiList) {
          const match = (tx.items || []).find((it) => {
            const bCode = (it.barcode || '').toLowerCase();
            const nBal = (it.no_bal || '').toLowerCase();
            return bCode.includes(cleanQ) || nBal.includes(cleanQ);
          });
          if (match) {
            foundTx = tx;
            foundItem = match;
            break;
          }
        }
      }
    }

    // Step C: If still not found, check if they typed a Kupon Number instead!
    if (!foundTx || !foundItem) {
      const matchedKupon = transaksiList.find(tx => tx.no_kupon.toLowerCase() === cleanQ || tx.no_kupon.toLowerCase().includes(cleanQ));
      if (matchedKupon) {
        // They typed a Kupon. Just change Kupon!
        handleManualChangeKupon(matchedKupon.transaksi_id);
        setScannedBarcode(''); // Clear it because it was a Kupon
        setScanFeedback({ text: `Memilih Kupon ${matchedKupon.no_kupon}...`, isError: false });
        return; // Done!
      }
    }

    if (foundTx && foundItem) {
      selectBalAndOpen(foundTx, foundItem, isFromScanner ? 'scanner' : 'manual');
    } else {
      // TIDAK ADA / TIDAK SESUAI: Form tetap terisi dengan nomor yang di-scan, dropdown ditutup, beri info jelas
      setIsDropdownOpen(false);
      setScanFeedback({
        text: `⚠️ No Bal "${q}" Tidak Ditemukan! Nomor bal ini belum diinput di Meja Sortir atau tidak terdaftar dalam antrian transaksi manapun.`,
        isError: true,
      });
      barcodeScannerRef.current?.focus();
    }
  }, [currentTx, transaksiList, selectBalAndOpen]);

  // Focus scanner on mount & Global Scanner listener for barcode guns
  useEffect(() => {
    barcodeScannerRef.current?.focus();

    let scanBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // If user is currently typing in beratBrutoInput
      if (target && target === beratBrutoInputRef.current) {
        return;
      }
      if (target && target !== barcodeScannerRef.current && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 150) {
        scanBuffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (scanBuffer.trim().length >= 2) {
          e.preventDefault();
          const code = scanBuffer.trim();
          scanBuffer = '';
          // Alat tembak barcode otomatis mengisi form secara penuh dan auto enter
          setScannedBarcode(code);
          lookupBal(code, true);
        }
      } else if (e.key.length === 1) {
        scanBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [lookupBal]);

  const activeBalItem = useMemo(() => {
    return workingItems.find((it) => it.item_id === activeItemId);
  }, [workingItems, activeItemId]);

  // Switch active bal item - focus strictly stays on scanner/No Bal
  const handleSelectBalItem = (item: TransaksiItemBal) => {
    setActiveItemId(item.item_id);
    setBeratBrutoInput(item.berat_bruto_kg && item.berat_bruto_kg > 0 ? item.berat_bruto_kg : '');
    setLokasiBlok(item.lokasi_simpan || 'Blok A (Utara)');
    const isWeighed = (item.berat_kg || 0) > 0;
    setScanFeedback({ 
      text: `Memilih Bal "${item.no_bal}" (Grade ${item.kode_grade})${isWeighed ? ` • [Netto: ${item.berat_kg} Kg - TERKUNCI]` : ' • [Langkah 2: Masukkan Berat Manual]'}`, 
      isError: false 
    });
    setTimeout(() => {
      if (barcodeScannerRef.current) {
        barcodeScannerRef.current.focus();
        barcodeScannerRef.current.select();
      }
    }, 100);
  };

  // Toggle Ganti Tikar for active bal
  const handleToggleGantiTikar = (itemId: string) => {
    setWorkingItems((prev) =>
      prev.map((it) => {
        if (it.item_id === itemId) {
          const nextGanti = !it.ganti_tikar;
          const tara = nextGanti ? 2 : 3;
          const potTikar = nextGanti ? 75000 : 0;
          const bBruto = typeof beratBrutoInput === 'number' ? beratBrutoInput : (parseFloat(String(beratBrutoInput)) || it.berat_bruto_kg || 0);
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

  // Matching bals across all transactions for dynamic autocomplete dropdown
  // As user types (e.g. "A00"), it shows "A001", "A002", "A003", etc.
  // When typing further details (e.g. "A002"), it filters down to become more specific
  const balSuggestions = useMemo(() => {
    const q = scannedBarcode.trim().toLowerCase();
    if (!q || q.length < 1) return [];

    const cleanQNormalized = q.replace(/[^a-zA-Z0-9]/g, '');
    const results: Array<{
      tx: TransaksiPembelian;
      item: TransaksiItemBal;
    }> = [];

    for (const tx of transaksiList) {
      for (const it of tx.items || []) {
        const bCode = (it.barcode || '').toLowerCase();
        const nBal = (it.no_bal || '').toLowerCase();
        const nBalNorm = (it.no_bal || '').replace(/[^a-zA-Z0-9]/g, '');
        if (
          nBal.includes(q) ||
          bCode.includes(q) ||
          (cleanQNormalized && nBalNorm.includes(cleanQNormalized))
        ) {
          results.push({ tx, item: it });
        }
      }
    }

    // Natural sort: items starting with query first, then natural numerical order (A001, A002, A003...)
    results.sort((a, b) => {
      const aStarts = a.item.no_bal.toLowerCase().startsWith(q);
      const bStarts = b.item.no_bal.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.item.no_bal.localeCompare(b.item.no_bal, undefined, { numeric: true, sensitivity: 'base' });
    });

    return results.slice(0, 15);
  }, [scannedBarcode, transaksiList]);

  // Form Submit Handler
  const handleScanBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDropdownOpen && highlightedIndex >= 0 && highlightedIndex < balSuggestions.length) {
      const chosen = balSuggestions[highlightedIndex];
      selectBalAndOpen(chosen.tx, chosen.item, 'manual');
    } else {
      lookupBal(scannedBarcode, false);
    }
  };

  // Calculate live numbers for active item
  const liveBruto = typeof beratBrutoInput === 'number' ? beratBrutoInput : (parseFloat(String(beratBrutoInput)) || 0);
  const isActiveBalWeighed = (activeBalItem?.berat_kg || 0) > 0;
  const isGantiTikarActive = Boolean(activeBalItem?.ganti_tikar);
  const liveTara = hitungPotonganTaraKg(liveBruto, isGantiTikarActive);
  const liveNetto = liveBruto > 0 ? Math.max(0, Number((liveBruto - liveTara).toFixed(1))) : 0;
  const livePotTikar = isGantiTikarActive ? 75000 : 0;
  const livePotKuli = 7000;
  const livePotTali = 3000;
  const livePotTotal = livePotKuli + livePotTali + livePotTikar;
  const liveTotalKotor = Math.round(liveNetto * (activeBalItem?.harga_per_kg || 0));
  const liveSubtotalBersih = Math.max(0, liveTotalKotor - livePotTotal);

  // Save weighing for active bal
  const handleApplyWeightForActiveBal = () => {
    if (!activeBalItem || !currentTx) return;
    
    if (isActiveBalWeighed) {
      setScanFeedback({ text: 'Bal ini sudah ditimbang. Data tidak bisa diubah.', isError: true });
      return;
    }

    if (liveBruto <= 0) {
      setScanFeedback({ text: 'Masukkan berat bruto (kotor) lebih dari 0 kg!', isError: true });
      beratBrutoInputRef.current?.focus();
      return;
    }

    const updatedItems = workingItems.map((it) => {
      if (it.item_id === activeBalItem.item_id) {
        return {
          ...it,
          berat_bruto_kg: liveBruto,
          potongan_tara_kg: liveTara,
          berat_kg: liveNetto,
          potongan_kuli: livePotKuli,
          potongan_tali: livePotTali,
          potongan_tikar: livePotTikar,
          potongan: livePotTotal,
          total_kotor: liveTotalKotor,
          subtotal_bersih: liveSubtotalBersih,
          status_timbang: 'selesai_timbang' as const,
          lokasi_simpan: lokasiBlok,
        };
      }
      return it;
    });

    setWorkingItems(updatedItems);

    // Save directly to global storage state
    const allItemsWeighed = updatedItems.every((it) => (it.berat_kg || 0) > 0);
    const totalNettoKg = Number(updatedItems.reduce((acc, it) => acc + (it.berat_kg || 0), 0).toFixed(1));
    const totalBrutoKg = Number(updatedItems.reduce((acc, it) => acc + (it.berat_bruto_kg || 0), 0).toFixed(1));
    const totalKotorAll = updatedItems.reduce((acc, it) => acc + (it.total_kotor || 0), 0);
    const totalPotonganAll = updatedItems.reduce((acc, it) => acc + (it.potongan || 0), 0);
    const finalHargaTotal = updatedItems.reduce((acc, it) => acc + (it.subtotal_bersih || 0), 0);
    const weighedCount = updatedItems.filter((it) => (it.berat_kg || 0) > 0).length;

    // Generated Barang inventory records
    const updatedBarangs: Barang[] = updatedItems.map((it, idx) => ({
      barang_id: it.barang_id || `BAL-${currentTx.transaksi_id}-${String(idx + 1).padStart(2, '0')}`,
      barcode: it.barcode || it.no_bal,
      kode_grade: it.kode_grade,
      no_bal: it.no_bal,
      berat_kg: it.berat_kg,
      status_stok: 'di_gudang',
      lokasi_gudang: `${currentTx.lokasi_gudang || 'Gudang Pusat'} - ${it.lokasi_simpan || lokasiBlok}`,
      tanggal_masuk: currentTx.tanggal_transaksi?.split(' ')[0] || new Date().toISOString().split('T')[0],
      petani_id: currentTx.petani_id,
      nama_petani: currentTx.nama_petani,
      transaksi_pembelian_id: currentTx.transaksi_id,
      catatan: `Timbang Kupon: ${currentTx.no_kupon}, Bruto: ${it.berat_bruto_kg}kg, Netto: ${it.berat_kg}kg`,
    }));

    const updatedTx: TransaksiPembelian = {
      ...currentTx,
      items: updatedItems,
      total_bal: updatedItems.length,
      bal_selesai_timbang: weighedCount,
      berat_terukur_kg: totalBrutoKg,
      berat_kg: totalNettoKg,
      total_kotor: totalKotorAll,
      potongan_tara_kg: updatedItems.reduce((acc, it) => acc + (it.potongan_tara_kg || 3), 0),
      potongan_kuli: updatedItems.reduce((acc, it) => acc + (it.potongan_kuli || 7000), 0),
      potongan_tali: updatedItems.reduce((acc, it) => acc + (it.potongan_tali || 3000), 0),
      potongan_tikar: updatedItems.reduce((acc, it) => acc + (it.potongan_tikar || 0), 0),
      total_potongan: totalPotonganAll,
      total_harga_beli: totalKotorAll,
      harga_final: finalHargaTotal,
      status_transaksi: allItemsWeighed ? 'lengkap' : 'menunggu',
      status_tahap: allItemsWeighed ? 'lengkap' : 'menunggu_timbang',
      petugas_timbang: currentUser?.nama_lengkap || 'Operator Timbang Digital',
    };

    onSaveTransaksi(updatedTx, updatedBarangs);

    // Record activity log for Super Admin accountability audit trail
    recordLogAktivitas({
      user_id: currentUser?.user_id || 'USR-AUTO',
      username: currentUser?.username || 'admintimbang',
      nama_lengkap: currentUser?.nama_lengkap || 'Operator Timbang Digital',
      role: currentUser?.role || userRole,
      modul: 'timbangan',
      aksi: 'Penimbangan Bal',
      no_kupon: currentTx.no_kupon,
      no_bal: activeBalItem.no_bal,
      kode_grade: activeBalItem.kode_grade,
      berat_kg: liveNetto,
      rincian: `Penimbangan Bal ${activeBalItem.no_bal} (Grade ${activeBalItem.kode_grade}): Bruto ${liveBruto} Kg, Tara ${liveTara} Kg (${isGantiTikarActive ? 'Ganti Tikar' : 'Tikar Bawaan'}), Netto ${liveNetto} Kg. Disimpan ke ${lokasiBlok}. Petani: ${currentTx.nama_petani} (Kupon ${currentTx.no_kupon}). Tercatat atas akun ${currentUser?.nama_lengkap || 'Operator Timbang'}.`,
      status: 'sukses',
    });

    setSaveSuccessMsg(`✓ Berat Bal "${activeBalItem.no_bal}" (${liveNetto} Kg) berhasil disimpan ke ${lokasiBlok}!`);
    setScanFeedback(null);

    // Tetap pada bal terakhir yang baru saja ditimbang dalam kondisi terkunci (tidak bisa diedit),
    // jangan berpindah ke bal selanjutnya, dan langsung kembalikan fokus ke kolom No Bal / Scanner.
    setScannedBarcode('');
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);

    if (allItemsWeighed) {
      setScanFeedback({
        text: `🎉 Semua ${updatedItems.length} bal pada Kupon "${currentTx.no_kupon}" tuntas ditimbang (${totalNettoKg} Kg Netto)! Bal "${activeBalItem.no_bal}" tersimpan & TERKUNCI. Siap scan kupon/bal berikutnya.`,
        isError: false,
      });
    } else {
      setScanFeedback({
        text: `✓ Bal "${activeBalItem.no_bal}" (${liveNetto} Kg Netto) tersimpan & TERKUNCI. Kursor otomatis kembali ke kolom No Bal / Scanner untuk bal berikutnya.`,
        isError: false,
      });
    }

    setTimeout(() => {
      if (barcodeScannerRef.current) {
        barcodeScannerRef.current.focus();
        barcodeScannerRef.current.select();
      }
    }, 100);
  };

  // SISTEM PENGAMAN ANTI-SCAN PADA INPUT BERAT
  // Mencegah tembakan barcode scanner masuk dan mengunci berat secara otomatis
  const handleKeyDownWeight = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    const interval = now - weightKeyBufferRef.current.lastTime;
    weightKeyBufferRef.current.lastTime = now;

    // 1. Intercept non-numeric characters (huruf, strip, simbol barcode)
    if (e.key.length === 1 && !/[\d.,]/.test(e.key)) {
      e.preventDefault();
      weightKeyBufferRef.current.chars += e.key;
      weightKeyBufferRef.current.isBurst = true;
      return;
    }

    // 2. Intercept burst input (kecepatan tembak scanner < 45ms per karakter)
    if (e.key.length === 1) {
      if (interval < 45) {
        weightKeyBufferRef.current.isBurst = true;
        weightKeyBufferRef.current.chars += e.key;
      } else {
        if (interval > 300) {
          weightKeyBufferRef.current.chars = e.key;
          weightKeyBufferRef.current.isBurst = false;
        } else {
          weightKeyBufferRef.current.chars += e.key;
        }
      }
    }

    // 3. Handle Enter Key
    if (e.key === 'Enter') {
      e.preventDefault();

      // Jika terdeteksi tembakan scanner (burst scan / ada karakter non-numeric)
      if (weightKeyBufferRef.current.isBurst && weightKeyBufferRef.current.chars.trim().length >= 2) {
        const scannedCode = weightKeyBufferRef.current.chars.trim();
        weightKeyBufferRef.current = { chars: '', lastTime: 0, isBurst: false };
        
        // Reset berat agar tidak terkunci dengan angka barcode
        setBeratBrutoInput('');
        setAntiScanAlert({
          text: `🛡️ PENGAMAN ANTI-SCAN AKTIF: Terdeteksi tembakan barcode saat kursor berada di kolom berat. Data scan "${scannedCode}" otomatis dialihkan ke pencarian No Bal agar berat tidak terkunci salah.`,
          code: scannedCode,
        });

        // Alihkan scan ke pencarian nomor bal
        lookupBal(scannedCode, true);
        return;
      }

      // Input manual manusia yang sah
      weightKeyBufferRef.current = { chars: '', lastTime: 0, isBurst: false };
      handleApplyWeightForActiveBal();
    }
  };

  // Intercept Paste pada input berat agar barcode tidak bisa di-paste secara liar
  const handleWeightPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').trim();
    // Jika teks yang di-paste mengandung huruf/strip atau angka terlalu panjang (> 3 digit wajar bal tembakau)
    if (!/^\d+([.,]\d+)?$/.test(text) || parseFloat(text.replace(',', '.')) > 300 || text.length > 5) {
      e.preventDefault();
      setAntiScanAlert({
        text: `🛡️ PENGAMAN ANTI-SCAN: Teks paste "${text}" terdeteksi sebagai barcode atau nilai di luar batas normal bal (maks 300 kg). Teks dialihkan ke pencarian No Bal.`,
        code: text,
      });
      lookupBal(text, true);
    }
  };

  // Buka kunci bal yang sudah ditimbang jika operator perlu timbang ulang / edit
  const handleUnlockActiveBal = (itemId: string) => {
    const item = workingItems.find((it) => it.item_id === itemId);
    if (!item) return;

    const confirmed = window.confirm(`Buka kunci penimbangan untuk Bal "${item.no_bal}"?\n\nData berat bal ini akan direset sehingga Anda dapat menimbang ulang dan memasukkan berat yang benar.`);
    if (!confirmed) return;

    const updatedItems = workingItems.map((it) => {
      if (it.item_id === itemId) {
        return {
          ...it,
          berat_kg: 0,
          berat_bruto_kg: 0,
          total_kotor: 0,
          potongan: 0,
          subtotal_bersih: 0,
          status_timbang: 'menunggu_timbang' as const,
        };
      }
      return it;
    });

    setWorkingItems(updatedItems);
    setBeratBrutoInput('');
    setScanFeedback({
      text: `🔓 Kunci berat Bal "${item.no_bal}" telah dibuka. Silakan timbang ulang dan masukkan berat bruto.`,
      isError: false,
    });
    setSaveSuccessMsg(null);

    // Record audit log for bal weight unlock / reset
    recordLogAktivitas({
      user_id: currentUser?.user_id || 'USR-TIMBANG',
      username: currentUser?.username || 'admintimbang',
      nama_lengkap: currentUser?.nama_lengkap || 'Operator Timbang Digital',
      role: currentUser?.role || 'operator_timbang',
      modul: 'timbangan',
      aksi: 'Buka Kunci Timbangan Bal',
      tipe_aksi: 'edit',
      no_kupon: currentTx?.no_kupon,
      no_bal: item.no_bal,
      kode_grade: item.kode_grade,
      berat_kg: item.berat_kg,
      transaksi_id: currentTx?.transaksi_id,
      nama_petani: currentTx?.nama_petani,
      status: 'peringatan',
      rincian: `KOREKSI TIMBANGAN: Buka kunci dan reset timbangan Bal "${item.no_bal}" (Sebelumnya: ${item.berat_kg} Kg Netto, Bruto: ${item.berat_bruto_kg || 0} Kg) oleh ${currentUser?.nama_lengkap || 'Operator'} (@${currentUser?.username || 'admintimbang'}). Petani: ${currentTx?.nama_petani} (Kupon ${currentTx?.no_kupon}). Bal disiapkan untuk penimbangan ulang.`,
      data_sebelum: JSON.stringify({ no_bal: item.no_bal, berat_kg: item.berat_kg, berat_bruto_kg: item.berat_bruto_kg, subtotal_bersih: item.subtotal_bersih }),
      data_sesudah: JSON.stringify({ no_bal: item.no_bal, berat_kg: 0, status_timbang: 'menunggu_timbang' }),
      alasan: 'Buka kunci untuk penimbangan ulang bal',
    });

    // Kursor diarahkan ke No Bal / Scanner
    setTimeout(() => {
      if (barcodeScannerRef.current) {
        barcodeScannerRef.current.focus();
        barcodeScannerRef.current.select();
      }
    }, 100);
  };

  const handleManualChangeKupon = (txId: string) => {
    setSelectedTxId(txId);
    const tx = transaksiList.find((t) => t.transaksi_id === txId);
    if (tx && tx.items) {
      setWorkingItems(tx.items);
      const unweighed = tx.items.find((it) => (it.berat_kg || 0) <= 0) || tx.items[0];
      if (unweighed) {
        setActiveItemId(unweighed.item_id);
        setBeratBrutoInput(unweighed.berat_bruto_kg && unweighed.berat_bruto_kg > 0 ? unweighed.berat_bruto_kg : '');
        setLokasiBlok(unweighed.lokasi_simpan || 'Blok A (Utara)');
      }
    }
  };

  const allCurrentWeighed = workingItems.length > 0 && workingItems.every((it) => (it.berat_kg || 0) > 0);
  const weighedCount = workingItems.filter((it) => (it.berat_kg || 0) > 0).length;

  return (
    <div className="space-y-3 font-sans pb-4">

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

      {/* Anti-Scan Protection Banner */}
      {antiScanAlert && (
        <div className="bg-amber-50 border border-amber-300 text-amber-950 p-3.5 rounded-sm flex items-start justify-between shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-start space-x-2.5 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">{antiScanAlert.text}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Sistem pengaman aktif: Kolom berat timbangan dilindungi dari input tembakan barcode scanner agar berat bal tidak terisi angka barcode yang salah.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAntiScanAlert(null)}
            className="text-xs text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer ml-3 shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Grid: Left is Standby & Scanner, Right is Active Weighing Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* Left Column: Scanner Standby & Kupon Selector (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          
          {/* Scanner Box */}
          <div className="bg-white border border-slate-200 p-4 shadow-2xs rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-800">
                <Layers className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Scan / Cari No Bal / No. Kupon
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Auto-Buka
              </span>
            </div>

            <form onSubmit={handleScanBarcode} className="space-y-2 relative">
              <div className="relative">
                <input
                  ref={barcodeScannerRef}
                  type="text"
                  value={scannedBarcode}
                  onChange={(e) => {
                    setScannedBarcode(e.target.value);
                    setIsDropdownOpen(true);
                    setHighlightedIndex(-1);
                  }}
                  onFocus={() => {
                    if (scannedBarcode.trim().length >= 1) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (balSuggestions.length > 0) {
                        setIsDropdownOpen(true);
                        setHighlightedIndex((prev) => (prev + 1) % balSuggestions.length);
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (balSuggestions.length > 0) {
                        setIsDropdownOpen(true);
                        setHighlightedIndex((prev) => (prev <= 0 ? balSuggestions.length - 1 : prev - 1));
                      }
                    } else if (e.key === 'Enter') {
                      if (isDropdownOpen && highlightedIndex >= 0 && highlightedIndex < balSuggestions.length) {
                        e.preventDefault();
                        const chosen = balSuggestions[highlightedIndex];
                        selectBalAndOpen(chosen.tx, chosen.item, 'manual');
                      }
                    } else if (e.key === 'Escape') {
                      setIsDropdownOpen(false);
                    }
                  }}
                  placeholder="Ketik No Bal / No. Kupon, atau Scan Barcode..."
                  className={`w-full bg-white border rounded-sm pl-3 pr-8 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 transition ${
                    scanFeedback?.isError
                      ? 'border-rose-300 focus:border-rose-600 focus:ring-rose-600 bg-rose-50/20'
                      : 'border-slate-300 focus:border-slate-800 focus:ring-slate-800'
                  } placeholder:font-sans placeholder:font-normal placeholder:text-slate-400`}
                />
                {scannedBarcode && (
                  <button
                    type="button"
                    onClick={() => {
                      setScannedBarcode('');
                      setIsDropdownOpen(false);
                      setScanFeedback(null);
                      barcodeScannerRef.current?.focus();
                    }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
                    title="Hapus input"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown List for Cross-Kupon Instant Match */}
              {isDropdownOpen && balSuggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-sm shadow-lg overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto"
                >
                  <div className="px-2.5 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100">
                    <span>Saran Nomor Bal Setara ({balSuggestions.length}):</span>
                    <span className="text-[9px] text-slate-400 font-normal lowercase">gunakan panah ↑↓ & enter</span>
                  </div>
                  {balSuggestions.map(({ tx, item }, idx) => {
                    const isWeighed = (item.berat_kg || 0) > 0;
                    const isHighlighted = idx === highlightedIndex;
                    return (
                      <button
                        key={`${tx.transaksi_id}-${item.item_id}`}
                        type="button"
                        onClick={() => selectBalAndOpen(tx, item, 'manual')}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between transition cursor-pointer ${
                          isHighlighted ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-xs text-slate-900 bg-amber-50 px-1 py-0.2 rounded-xs border border-amber-200">
                              {item.no_bal}
                            </span>
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium rounded-xs">
                              Grade {item.kode_grade}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Kupon <strong className="text-slate-700 font-mono">{tx.no_kupon}</strong> • {tx.nama_petani}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {isWeighed ? (
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs border border-emerald-200 font-mono">
                              ✓ {item.berat_kg} Kg
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-xs border border-slate-200">
                              Belum Timbang
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* If user typed but no matching bal found */}
              {isDropdownOpen && scannedBarcode.trim().length >= 2 && balSuggestions.length === 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-rose-200 p-2.5 text-xs text-rose-700 rounded-sm shadow-md"
                >
                  <p className="font-medium text-[11px]">
                    Tidak ada nomor bal yang cocok dengan <span className="font-mono font-bold">"{scannedBarcode}"</span>.
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-sm transition cursor-pointer shadow-2xs"
              >
                Cari / Buka Data
              </button>
            </form>

            {scanFeedback && (
              <div className={`p-2.5 rounded-sm text-xs font-medium ${
                scanFeedback.isError ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-50 text-slate-800 border border-slate-200'
              }`}>
                {scanFeedback.text}
              </div>
            )}
          </div>

          {/* Kupon Batch Selector */}
          <div className="bg-white border border-slate-200 p-4 shadow-2xs rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-800">
                <Layers className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Pilih Kupon Antrian
                </h3>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium border border-slate-200">
                {pendingOrRecentTxList.length} Batch
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                list="kupon-list"
                value={kuponInput}
                onChange={(e) => {
                  const val = formatNoKupon(e.target.value);
                  setKuponInput(val);
                  
                  // Auto-select if matches a no_kupon
                  const matchedTx = pendingOrRecentTxList.find(t => t.no_kupon.toLowerCase() === val.toLowerCase());
                  if (matchedTx) {
                    handleManualChangeKupon(matchedTx.transaksi_id);
                  }
                }}
                onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     e.preventDefault();
                     lookupBal(kuponInput, false); // If they type a bal instead of kupon here, try to look it up!
                   }
                }}
                placeholder="Ketik No. Kupon / Ketik No Bal / Pilih dari daftar..."
                className="w-full bg-white border border-slate-300 rounded-sm px-2.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 uppercase"
              />
              <datalist id="kupon-list">
                {pendingOrRecentTxList.map((tx) => {
                  const items = tx.items || [];
                  const weighed = items.filter((i) => (i.berat_kg || 0) > 0).length;
                  const isComplete = items.length > 0 && weighed === items.length;
                  return (
                    <option key={tx.transaksi_id} value={tx.no_kupon}>
                      {isComplete ? '✓ [LENGKAP]' : '⏳ [PROSES]'} {tx.nama_petani} ({weighed}/{items.length} Bal)
                    </option>
                  );
                })}
              </datalist>
            </div>

            {currentTx && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Petani Penyetor:</span>
                  <strong className="text-slate-900">{currentTx.nama_petani}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Kupon:</span>
                  <span className="font-mono font-semibold text-slate-900">{currentTx.no_kupon}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Sortir:</span>
                  <span className="text-slate-700 font-mono font-medium">{formatDateHariBulanTahun(currentTx.tanggal_transaksi)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gudang Intake:</span>
                  <span className="text-slate-700">{currentTx.lokasi_gudang}</span>
                </div>
              </div>
            )}
          </div>

          {/* List of Bals in Selected Kupon */}
          <div className="bg-white border border-slate-200 shadow-2xs rounded-sm overflow-hidden">
            <div className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Daftar Bal ({weighedCount}/{workingItems.length})
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">
                Pilih untuk timbang
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {workingItems.map((item, index) => {
                const isWeighed = (item.berat_kg || 0) > 0;
                const isActive = item.item_id === activeItemId;

                return (
                  <button
                    key={item.item_id || index}
                    type="button"
                    onClick={() => handleSelectBalItem(item)}
                    className={`w-full text-left p-2.5 flex items-center justify-between text-xs transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-100 border-l-4 border-slate-900 font-semibold'
                        : isWeighed
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-slate-400 text-[10px] w-4">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-semibold text-slate-900">
                            {item.no_bal}
                          </span>
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium rounded-xs">
                            Grade {item.kode_grade}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {formatRupiah(item.harga_per_kg)}/kg {item.ganti_tikar && '• Ganti Tikar'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {isWeighed ? (
                        <div>
                          <span className="font-mono font-semibold text-slate-900 text-xs">
                            {item.berat_kg} Kg Netto
                          </span>
                          <p className="text-[9px] text-emerald-600 font-medium">
                            ✓ Terekam
                          </p>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xs text-[10px] font-medium">
                          Belum Timbang
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Active Bal Weighing Workbench (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">          {activeBalItem ? (
            <div className="bg-white border border-slate-200 shadow-2xs rounded-sm overflow-hidden">
              
              {/* Enterprise Header */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <Scale className="w-4 h-4 text-slate-300" />
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-100">
                      Input Berat Bal: {activeBalItem.no_bal}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Petani: {currentTx?.nama_petani} • Kupon: <span className="font-mono text-slate-200">{currentTx?.no_kupon}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 bg-slate-800 text-slate-200 font-mono font-medium text-xs rounded-xs border border-slate-700">
                    Grade {activeBalItem.kode_grade} ({formatRupiah(activeBalItem.harga_per_kg)}/kg)
                  </span>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-4 space-y-3.5">
                
                {/* Info Bar for Already Weighed Items */}
                {isActiveBalWeighed && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start space-x-2.5">
                      <Lock className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-0.5">Bal Selesai Ditimbang & Terkunci ({activeBalItem.berat_kg} Kg Netto)</h4>
                        <p className="text-[11px] text-amber-800">Data berat bal ini terkunci demi keamanan audit. Kursor otomatis disiapkan pada kolom No Bal untuk bal berikutnya.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlockActiveBal(activeBalItem.item_id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xs border border-slate-300 transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs whitespace-nowrap self-start sm:self-center"
                    >
                      <Unlock className="w-3.5 h-3.5 text-slate-600" />
                      <span>Buka Kunci / Timbang Ulang</span>
                    </button>
                  </div>
                )}
                
                {/* Input Fields */}
                <div className="space-y-3.5">
                  
                  {/* Berat Bruto Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                          Berat Bruto Timbangan (Kg) <span className="text-rose-500">*</span>
                        </label>
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-xs text-[9px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Anti-Scan Guard Aktif</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Ketik manual angka timbangan (dilarang scan)
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        ref={beratBrutoInputRef}
                        type="number"
                        step="0.1"
                        min="0"
                        max="300"
                        value={beratBrutoInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Reject unreasonable scanner numbers
                          if (val && parseFloat(val) > 300) {
                            setAntiScanAlert({
                              text: `🛡️ PENGAMAN ANTI-SCAN: Nilai ${val} kg melebihi batas wajar bal tembakau (maks 300 kg). Barcode scanner dilarang masuk ke kolom berat!`,
                            });
                            return;
                          }
                          setBeratBrutoInput(val);
                        }}
                        onKeyDown={handleKeyDownWeight}
                        onPaste={handleWeightPaste}
                        placeholder="0.0"
                        disabled={isActiveBalWeighed}
                        className={`w-full border rounded-sm px-4 py-2 text-xl font-mono font-semibold tabular-nums focus:outline-none placeholder:text-slate-300 ${isActiveBalWeighed ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-900 border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800'}`}
                      />
                      <span className="absolute right-4 top-2 text-slate-400 font-mono font-semibold text-sm">
                        KG
                      </span>
                    </div>

                    {/* Quick weight buttons */}
                    <div className="flex items-center space-x-1.5 mt-2 overflow-x-auto pb-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Preset:</span>
                      {[50, 55, 60, 62.5, 65, 70, 75].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setBeratBrutoInput(val);
                            beratBrutoInputRef.current?.focus();
                          }}
                          disabled={isActiveBalWeighed}
                          className={`px-2.5 py-1 border rounded-xs text-[10px] font-mono font-medium transition ${isActiveBalWeighed ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 cursor-pointer'}`}
                        >
                          {val} kg
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ganti Tikar Toggle Row */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={activeBalItem.ganti_tikar}
                        onChange={() => handleToggleGantiTikar(activeBalItem.item_id)}
                        disabled={isActiveBalWeighed}
                        className={`w-4 h-4 rounded-xs border-slate-300 text-slate-900 focus:ring-slate-900 ${isActiveBalWeighed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-900">
                          Ganti Tikar (+Rp 75.000 / Bal)
                        </span>
                        <p className="text-[10px] text-slate-500">
                          {activeBalItem.ganti_tikar
                            ? 'Tikar diganti. Tara: 2kg (<50), 3kg (50-59), 4kg (≥60)'
                            : 'Tikar madura. Tara: 3kg (<50), 4kg (50-59), 5kg (≥60)'}
                        </p>
                      </div>
                    </label>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-xs bg-slate-200/80 text-slate-800 border border-slate-300/60 font-mono">
                      Tara: {liveTara} Kg
                    </span>
                  </div>

                  {/* Berat Netto Result Box */}
                  <div className="p-2.5 bg-slate-900 text-white rounded-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-center border border-slate-800">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Berat Bruto</span>
                      <p className="text-base font-mono font-semibold text-slate-100 tabular-nums">{liveBruto.toFixed(1)} Kg</p>
                    </div>
                    <div className="border-x border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Potongan Tara</span>
                      <p className="text-base font-mono font-semibold text-slate-300 tabular-nums">-{liveTara.toFixed(1)} Kg</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Netto Final</span>
                      <p className="text-xl font-mono font-bold text-slate-100 tabular-nums">{liveNetto.toFixed(1)} Kg</p>
                    </div>
                  </div>

                  {/* Realtime Potongan & Subtotal Calculation */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-[11px] space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Kotor ({liveNetto} kg × {formatRupiah(activeBalItem.harga_per_kg)}):</span>
                      <span className="font-mono font-semibold text-slate-900">{formatRupiah(liveTotalKotor)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>
                        Potongan (Kuli, Tali{activeBalItem.ganti_tikar ? ', Tikar' : ''}):
                      </span>
                      <span className="font-mono font-medium text-slate-700">-{formatRupiah(livePotTotal)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 flex justify-between text-xs font-semibold text-slate-900">
                      <span>Subtotal Bersih:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(liveSubtotalBersih)}</span>
                    </div>
                  </div>

                  {/* Lokasi Gudang Blok */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                        Alokasi Blok Gudang
                      </label>
                      <select
                        value={lokasiBlok}
                        onChange={(e) => setLokasiBlok(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-sm px-2 py-1 text-[11px] text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                      >
                        <option value="Blok A (Utara)">Blok A (Utara - Grade Super)</option>
                        <option value="Blok B (Timur)">Blok B (Timur - Grade Bagus)</option>
                        <option value="Blok C (Barat)">Blok C (Barat - Grade Sedang)</option>
                        <option value="Blok D (Selatan)">Blok D (Selatan - Grade Standar)</option>
                        <option value="Blok E (Penyangga)">Blok E (Penyangga)</option>
                        <option value="Blok F (Transit Sample)">Blok F (Transit Sample)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                        Petugas Timbang
                      </label>
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-sm px-2 py-1 text-[11px] text-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 truncate">
                          <User className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">
                            {currentUser?.nama_lengkap || 'Operator Timbang'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button Enterprise Style */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleApplyWeightForActiveBal}
                    disabled={isActiveBalWeighed}
                    className={`w-full py-2.5 font-medium text-xs uppercase tracking-wider rounded-sm transition flex items-center justify-center space-x-2 shadow-2xs ${isActiveBalWeighed ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed font-semibold' : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'}`}
                  >
                    <Check className={`w-4 h-4 ${isActiveBalWeighed ? 'text-emerald-600' : 'text-slate-200'}`} />
                    <span>{isActiveBalWeighed ? `✓ Terkunci - Selesai Ditimbang (${activeBalItem.berat_kg} Kg Netto)` : 'Simpan Data Timbangan Bal (Enter)'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 p-12 text-center text-slate-400 rounded-sm space-y-3">
              <Scale className="w-10 h-10 mx-auto text-slate-300" />
              <h3 className="text-sm font-semibold text-slate-700">Tidak ada bal yang aktif dipilih</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Silakan scan / ketik nomor bal atau pilih salah satu bal dari daftar di sebelah kiri untuk menginput berat.
              </p>
            </div>
          )}

          {/* Kupon Batch Completion Notification */}
          {allCurrentWeighed && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                    Kupon {currentTx?.no_kupon} Telah Selesai Ditimbang
                  </h4>
                  <p className="text-xs text-slate-600">
                    Total {workingItems.length} bal ({currentTx?.berat_kg} Kg Netto) siap dicairkan dan dicetak notanya di Kasir.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToKasir(currentTx?.no_kupon, currentTx?.transaksi_id)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
              >
                <span>Buka di Kasir & Cetak Nota</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

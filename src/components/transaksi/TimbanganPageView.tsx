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
  Lock,
  Package,
  ChevronDown,
  Save
} from 'lucide-react';
import { TransaksiPembelian, Petani, TabelHarga, Barang, Gudang, TransaksiItemBal, UserRole, User as UserType } from '../../types';
import { formatRupiah, formatNoKupon, formatDateHariBulanTahun, hitungPotonganTaraKg } from '../../utils/formatters';

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
    const filtered = transaksiList.filter((t) => (t.items || []).length > 0);
    return filtered.sort((a, b) => b.no_kupon.localeCompare(a.no_kupon));
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
    return '';
  });
  const [kuponInput, setKuponInput] = useState<string>('');
  const [showKuponDropdown, setShowKuponDropdown] = useState(false);
  
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
  const [beratNettoInput, setBeratNettoInput] = useState<number | string>('');
  const [isNettoManual, setIsNettoManual] = useState<boolean>(false);
  const [potTikarInput, setPotTikarInput] = useState<number | ''>('');
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
        setBeratNettoInput(existingActive.berat_kg && existingActive.berat_kg > 0 ? existingActive.berat_kg : '');
        setIsNettoManual(existingActive.is_netto_manual || false);
        setLokasiBlok(existingActive.lokasi_simpan || 'Blok A (Utara)');
        return;
      }

      // 2. Otherwise pick first unweighed or first item
      const unweighed = currentTx.items.find((it) => (it.berat_kg || 0) <= 0);
      const targetItem = unweighed || currentTx.items[0];
      if (targetItem) {
        setActiveItemId(targetItem.item_id);
        setBeratBrutoInput(targetItem.berat_bruto_kg && targetItem.berat_bruto_kg > 0 ? targetItem.berat_bruto_kg : '');
        setBeratNettoInput(targetItem.berat_kg && targetItem.berat_kg > 0 ? targetItem.berat_kg : '');
        setIsNettoManual(targetItem.is_netto_manual || false);
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
    setBeratNettoInput(foundItem.berat_kg && foundItem.berat_kg > 0 ? foundItem.berat_kg : '');
    setIsNettoManual(foundItem.is_netto_manual || false);
    setLokasiBlok(foundItem.lokasi_simpan || 'Blok A (Utara)');
    
    const isAlreadyWeighed = (foundItem.berat_kg || 0) > 0;
    const sourceLabel = source === 'scanner' ? '[SCAN BARCODE]' : '[PILIH BAL]';
    setScanFeedback({
      text: `✓ ${sourceLabel} Bal "${foundItem.no_bal}" (Grade ${foundItem.kode_grade}) terbuka! Kupon "${foundTx.no_kupon}" (${foundTx.nama_petani})${isAlreadyWeighed ? ` • [Netto: ${foundItem.berat_kg} Kg - TERKUNCI]` : ' • [Langkah 2: Masukkan Berat Manual]'}`,
      isError: false,
    });

    // Otomatis fokus ke input berat kotor ketika berhasil scan/pilih bal
    setTimeout(() => {
      if (beratBrutoInputRef.current) {
        beratBrutoInputRef.current.focus();
        beratBrutoInputRef.current.select();
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

      // Step B: Partial match across all kupons (prioritizing unweighed first)
      if (!foundTx || !foundItem) {
        for (const tx of transaksiList) {
          const match = (tx.items || []).find((it) => {
            const bCode = (it.barcode || '').toLowerCase();
            const nBal = (it.no_bal || '').toLowerCase();
            const isWeighed = (it.berat_kg || 0) > 0;
            return !isWeighed && (bCode.includes(cleanQ) || nBal.includes(cleanQ));
          });
          if (match) {
            foundTx = tx;
            foundItem = match;
            break;
          }
        }

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
    if (item.ganti_tikar && item.potongan_tikar) {
      setPotTikarInput(item.potongan_tikar);
    } else {
      setPotTikarInput(item.potongan_tikar || '');
    }
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
          return {
            ...it,
            ganti_tikar: !it.ganti_tikar,
          };
        }
        return it;
      })
    );
  };

  // Matching bals across all transactions for dynamic autocomplete dropdown
  // As user types (e.g. "GT00"), it shows matching items:
  // Rule:
  // 1. Yang BELUM DITIMBANG paling atas berdasarkan terdekat
  // 2. Baru urut yang SUDAH DITIMBANG berdasarkan terdekat
  const balSuggestions = useMemo(() => {
    const q = scannedBarcode.trim().toLowerCase();
    if (!q || q.length < 1) return [];

    const cleanQNormalized = q.replace(/[^a-zA-Z0-9]/g, '');
    const qDigitsMatch = q.match(/\d+/);
    const qNumber = qDigitsMatch ? parseInt(qDigitsMatch[0], 10) : null;

    const results: Array<{
      tx: TransaksiPembelian;
      item: TransaksiItemBal;
    }> = [];

    for (const tx of transaksiList) {
      for (const it of tx.items || []) {
        const bCode = (it.barcode || '').toLowerCase();
        const nBal = (it.no_bal || '').toLowerCase();
        const nBalNorm = (it.no_bal || '').replace(/[^a-zA-Z0-9]/g, '');
        const nKupon = (tx.no_kupon || '').toLowerCase();
        const nPetani = (tx.nama_petani || '').toLowerCase();
        if (
          nBal.includes(q) ||
          bCode.includes(q) ||
          (cleanQNormalized && nBalNorm.includes(cleanQNormalized)) ||
          nKupon.includes(q) ||
          nPetani.includes(q)
        ) {
          results.push({ tx, item: it });
        }
      }
    }

    // Helper: calculate closeness score to query
    const getItemCloseness = (item: TransaksiItemBal, tx: TransaksiPembelian) => {
      const nBal = (item.no_bal || '').toLowerCase();
      const bCode = (item.barcode || '').toLowerCase();
      const nBalNorm = nBal.replace(/[^a-zA-Z0-9]/g, '');
      const nKupon = (tx.no_kupon || '').toLowerCase();

      // Tier 1: Exact match with bal number, barcode, or clean normalized
      if (nBal === q || bCode === q || (cleanQNormalized && nBalNorm === cleanQNormalized)) {
        return 0;
      }
      // Tier 2: Starts with query
      if (nBal.startsWith(q) || bCode.startsWith(q) || (cleanQNormalized && nBalNorm.startsWith(cleanQNormalized))) {
        return 10;
      }
      // Tier 3: Kupon exact or prefix match
      if (nKupon === q) {
        return 20;
      }
      if (nKupon.startsWith(q)) {
        return 30;
      }
      // Tier 4: Substring inside bal number
      const idx = nBal.indexOf(q);
      if (idx >= 0) {
        return 40 + Math.min(idx, 20);
      }
      const idxNorm = cleanQNormalized ? nBalNorm.indexOf(cleanQNormalized) : -1;
      if (idxNorm >= 0) {
        return 40 + Math.min(idxNorm, 20);
      }
      // Tier 5: Other matches (farmer, etc.)
      return 80;
    };

    const getItemNumber = (item: TransaksiItemBal) => {
      const m = item.no_bal.match(/\d+/);
      return m ? parseInt(m[0], 10) : null;
    };

    // User directive:
    // "BUAT YANG BELUM DITIMBANG PALING ATAS BERDASARKAN TERDEKAT, BARU URUT YANG SUDAH DITIMBANG BERDASARKAN TERDEKAT"
    results.sort((a, b) => {
      const aWeighed = (a.item.berat_kg || 0) > 0;
      const bWeighed = (b.item.berat_kg || 0) > 0;

      // 1. Belum ditimbang ALWAYS comes first (PALING ATAS)
      if (!aWeighed && bWeighed) return -1;
      if (aWeighed && !bWeighed) return 1;

      // 2. Within same weighing group, sort "berdasarkan terdekat"
      const aCloseness = getItemCloseness(a.item, a.tx);
      const bCloseness = getItemCloseness(b.item, b.tx);
      if (aCloseness !== bCloseness) {
        return aCloseness - bCloseness;
      }

      // If closeness tier is identical, check numerical proximity to query
      if (qNumber !== null) {
        const aNum = getItemNumber(a.item);
        const bNum = getItemNumber(b.item);
        if (aNum !== null && bNum !== null) {
          const aDist = Math.abs(aNum - qNumber);
          const bDist = Math.abs(bNum - qNumber);
          if (aDist !== bDist) {
            return aDist - bDist;
          }
        }
      }

      // Prioritize active kupon if other factors are equal
      if (currentTx) {
        const aIsCurrent = a.tx.transaksi_id === currentTx.transaksi_id;
        const bIsCurrent = b.tx.transaksi_id === currentTx.transaksi_id;
        if (aIsCurrent && !bIsCurrent) return -1;
        if (!aIsCurrent && bIsCurrent) return 1;
      }

      // Length difference tie-breaker (closer length to query comes earlier)
      const aLenDiff = Math.abs(a.item.no_bal.length - q.length);
      const bLenDiff = Math.abs(b.item.no_bal.length - q.length);
      if (aLenDiff !== bLenDiff) {
        return aLenDiff - bLenDiff;
      }

      // Final natural alphanumeric sort
      return a.item.no_bal.localeCompare(b.item.no_bal, undefined, { numeric: true, sensitivity: 'base' });
    });

    return results.slice(0, 25);
  }, [scannedBarcode, transaksiList, currentTx]);

  // Form Submit Handler
  const handleScanBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDropdownOpen && highlightedIndex >= 0 && highlightedIndex < balSuggestions.length) {
      const chosen = balSuggestions[highlightedIndex];
      selectBalAndOpen(chosen.tx, chosen.item, 'manual');
    } else if (isDropdownOpen && balSuggestions.length > 0) {
      const chosen = balSuggestions[0];
      selectBalAndOpen(chosen.tx, chosen.item, 'manual');
    } else {
      lookupBal(scannedBarcode, false);
    }
  };

  // Calculate live numbers for active item
  const liveBruto = typeof beratBrutoInput === 'number' ? beratBrutoInput : (parseFloat(String(beratBrutoInput)) || 0);
  const parsedNettoInput = typeof beratNettoInput === 'number' ? beratNettoInput : (parseFloat(String(beratNettoInput)) || 0);
  const isActiveBalWeighed = (activeBalItem?.berat_kg || 0) > 0;
  const isGantiTikarActive = Boolean(activeBalItem?.ganti_tikar);
  
  let liveTara = hitungPotonganTaraKg(liveBruto, isGantiTikarActive, activeBalItem?.no_bal);
  let liveNetto = liveBruto > 0 ? Math.max(0, Number((liveBruto - liveTara).toFixed(1))) : 0;
  
  if (isNettoManual && parsedNettoInput > 0) {
    liveNetto = parsedNettoInput;
    liveTara = Math.max(0, Number((liveBruto - liveNetto).toFixed(1)));
  }

  const livePotTikar = isGantiTikarActive ? (typeof potTikarInput === 'number' ? potTikarInput : 0) : 0;
  const livePotKuli = 7000;
  const livePotTali = 3000;
  const livePotTotal = livePotKuli + livePotTali + livePotTikar;
  const liveTotalKotor = Math.round(liveNetto * (activeBalItem?.harga_per_kg || 0));
  const liveSubtotalBersih = Math.round(Math.max(0, liveTotalKotor - livePotTotal));

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
          is_netto_manual: isNettoManual,
          potongan_kuli: livePotKuli,
          potongan_tali: livePotTali,
          potongan_tikar: livePotTikar,
            potongan_tikar_rp: livePotTikar,
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

    const updatedItemsWithId = updatedItems.map((it, idx) => ({
      ...it,
      barang_id: it.barang_id || `BAL-${currentTx.transaksi_id}-${String(idx + 1).padStart(2, '0')}`
    }));

    // Generated Barang inventory records
    const updatedBarangs: Barang[] = updatedItemsWithId.map((it) => ({
      barang_id: it.barang_id!,
      barcode: it.barcode || it.no_bal,
      kode_grade: it.kode_grade,
      no_bal: it.no_bal,
      berat_kg: it.berat_kg,
      harga_per_kg: it.harga_per_kg,
      total_harga: (it.berat_kg || 0) * (it.harga_per_kg || 0),
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
      items: updatedItemsWithId,
      barang_ids: updatedBarangs.map(b => b.barang_id),
      total_bal: updatedItemsWithId.length,
      bal_selesai_timbang: weighedCount,
      berat_terukur_kg: totalBrutoKg,
      berat_kg: totalNettoKg,
      total_kotor: totalKotorAll,
      potongan_tara_kg: updatedItems.reduce((acc, it) => acc + (it.potongan_tara_kg || 0), 0),
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
    

    setSaveSuccessMsg(`✓ Berat Bal "${activeBalItem.no_bal}" (${liveNetto} Kg) berhasil disimpan ke ${lokasiBlok}!`);
    setScanFeedback(null);

    // Kosongkan input scan agar siap menerima tembakan barcode bal berikutnya
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
        text: `✓ Bal "${activeBalItem.no_bal}" (${liveNetto} Kg Netto) berhasil disimpan & TERKUNCI. Siap scan bal berikutnya.`,
        isError: false,
      });
    }

    // Mengosongkan isian di layar (Sesuai dengan Requirement form kembali kosong)
    setBeratBrutoInput('');
    setPotTikarInput('');
    setActiveItemId(null);

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

    // Simpan nilai berat kotor (bruto) sebelumnya agar tidak hilang dan operator bisa langsung mengedit
    const existingBruto = item.berat_bruto_kg || (item.berat_kg ? Number((item.berat_kg + (item.potongan_tara_kg || 0)).toFixed(1)) : 0);

    const updatedItems = workingItems.map((it) => {
      if (it.item_id === itemId) {
        return {
          ...it,
          berat_kg: 0,
          berat_bruto_kg: existingBruto,
          total_kotor: 0,
          potongan: 0,
          subtotal_bersih: 0,
          status_timbang: 'menunggu_timbang' as const,
        };
      }
      return it;
    });

    setWorkingItems(updatedItems);
    setBeratBrutoInput(existingBruto > 0 ? existingBruto : '');
    
    // Save to global state so it's persisted immediately
    if (currentTx) {
      const allItemsWeighed = updatedItems.every((it) => (it.berat_kg || 0) > 0);
      const weighedCount = updatedItems.filter((it) => (it.berat_kg || 0) > 0).length;
      const totalKotorAll = updatedItems.reduce((acc, it) => acc + (it.total_kotor || 0), 0);
      const totalPotonganAll = updatedItems.reduce((acc, it) => acc + (it.potongan || 0), 0);
      const finalHargaTotal = updatedItems.reduce((acc, it) => acc + (it.subtotal_bersih || 0), 0);

      const updatedTx: TransaksiPembelian = {
        ...currentTx,
        items: updatedItems,
        total_bal: updatedItems.length,
        bal_selesai_timbang: weighedCount,
        berat_kg: updatedItems.reduce((sum, item) => sum + (item.berat_kg || 0), 0),
        total_kotor: totalKotorAll,
        total_potongan: totalPotonganAll,
        total_harga_beli: totalKotorAll,
        harga_final: finalHargaTotal,
        total_bersih: finalHargaTotal,
        status_transaksi: allItemsWeighed ? 'lengkap' : 'menunggu',
        status_tahap: allItemsWeighed ? 'lengkap' : 'menunggu_timbang',
      };
      onSaveTransaksi(updatedTx, []);
    }
    setScanFeedback({
      text: `🔓 Kunci Bal "${item.no_bal}" dibuka. Berat bruto ${existingBruto > 0 ? `(${existingBruto} Kg) ` : ''}siap diedit atau ditimpa, lalu tekan Enter / Simpan.`,
      isError: false,
    });
    setSaveSuccessMsg(null);

    // Kursor otomatis fokus dan memblok teks berat bruto agar bisa langsung ditimpa atau diedit
    setTimeout(() => {
      if (beratBrutoInputRef.current) {
        beratBrutoInputRef.current.focus();
        beratBrutoInputRef.current.select();
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
          <div className="bg-white border border-gray-200 p-4 shadow-2xs rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-800">
                <Layers className="w-4 h-4 text-gray-700" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
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
                      } else if (isDropdownOpen && balSuggestions.length > 0) {
                        e.preventDefault();
                        const chosen = balSuggestions[0];
                        selectBalAndOpen(chosen.tx, chosen.item, 'manual');
                      }
                    } else if (e.key === 'Escape') {
                      setIsDropdownOpen(false);
                    }
                  }}
                  placeholder="Ketik No Bal / No. Kupon, atau Scan Barcode..."
                  className={`w-full bg-white border rounded-sm pl-3 pr-8 py-2 text-xs font-mono font-semibold text-gray-900 focus:outline-none focus:ring-1 transition ${
                    scanFeedback?.isError
                      ? 'border-rose-300 focus:border-rose-600 focus:ring-rose-600 bg-rose-50/20'
                      : 'border-gray-300 focus:border-slate-800 focus:ring-slate-800'
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
                    className="absolute right-2 top-2 text-slate-400 hover:text-gray-600 cursor-pointer text-xs"
                    title="Hapus input"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown List for Cross-Kupon Instant Match */}
              {isDropdownOpen && balSuggestions.length > 0 && (() => {
                const unweighedCount = balSuggestions.filter((s) => (s.item.berat_kg || 0) <= 0).length;
                const weighedCount = balSuggestions.length - unweighedCount;

                return (
                  <div
                    ref={dropdownRef}
                    className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-sm shadow-lg overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto"
                  >
                    <div className="px-2.5 py-1.5 bg-[#f8f9fa] text-[10px] font-semibold text-gray-600 tracking-wider flex items-center justify-between border-b border-gray-200 sticky top-0 z-10">
                      <div className="flex items-center space-x-1.5">
                        <span>Rekomendasi Bal ({balSuggestions.length}):</span>
                        {unweighedCount > 0 && (
                          <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded-xs border border-amber-300 text-[9px]">
                            {unweighedCount} Belum Timbang
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 font-normal lowercase">gunakan panah ↑↓ & enter</span>
                    </div>
                    {balSuggestions.map(({ tx, item }, idx) => {
                      const isWeighed = (item.berat_kg || 0) > 0;
                      const isHighlighted = idx === highlightedIndex;
                      const showWeighedSectionDivider = idx > 0 && isWeighed && (balSuggestions[idx - 1].item.berat_kg || 0) <= 0;

                      return (
                        <React.Fragment key={`${tx.transaksi_id}-${item.item_id}`}>
                          {showWeighedSectionDivider && (
                            <div className="px-2.5 py-1 bg-gray-100 text-[9px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between border-t border-b border-gray-200">
                              <span>Sudah Ditimbang ({weighedCount})</span>
                              <span className="text-[9px] text-slate-400 font-normal lowercase">Urut terdekat</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => selectBalAndOpen(tx, item, 'manual')}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between transition cursor-pointer ${
                              isHighlighted
                                ? 'bg-gray-100 text-gray-900'
                                : !isWeighed
                                ? 'hover:bg-amber-50/60 bg-white text-gray-900'
                                : 'hover:bg-[#f8f9fa] text-gray-700'
                            }`}
                          >
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className={`font-mono font-bold text-xs px-1.5 py-0.2 rounded-xs border ${
                                  !isWeighed
                                    ? 'text-amber-950 bg-amber-50 border-amber-300'
                                    : 'text-gray-700 bg-gray-100 border-gray-200'
                                }`}>
                                  {item.no_bal}
                                </span>
                                <span className="px-1.5 py-0.2 bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-medium rounded-xs">
                                  Grade {item.kode_grade}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                Kupon <strong className="text-gray-700 font-mono">{tx.no_kupon}</strong> • {tx.nama_petani}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {isWeighed ? (
                                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs border border-emerald-200 font-mono">
                                  ✓ {item.berat_kg} Kg
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-xs border border-amber-300">
                                  Belum Timbang
                                </span>
                              )}
                            </div>
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })()}

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
                className="w-full py-2 bg-[#b81d24] hover:bg-[#b81d24] text-white font-medium text-xs rounded-sm transition cursor-pointer shadow-2xs"
              >
                Cari / Buka Data
              </button>
            </form>

            {scanFeedback && (
              <div className={`p-2.5 rounded-sm text-xs font-medium ${
                scanFeedback.isError ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-[#f8f9fa] text-gray-800 border border-gray-200'
              }`}>
                {scanFeedback.text}
              </div>
            )}
          </div>

          {/* Kupon Batch Selector */}
          <div className="bg-white border border-gray-200 p-4 shadow-2xs rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-800">
                <Layers className="w-4 h-4 text-gray-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Pilih Kupon Antrian
                </h3>
              </div>
              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono font-medium border border-gray-200">
                {pendingOrRecentTxList.length} Batch
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Ketik min. 3 karakter No. Kupon..."
                value={kuponInput}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setKuponInput(val);
                  setShowKuponDropdown(val.length >= 3);
                }}
                onFocus={() => {
                  if (kuponInput.length >= 3) setShowKuponDropdown(true);
                }}
                onBlur={() => {
                  // Small delay to allow click on dropdown to register
                  setTimeout(() => setShowKuponDropdown(false), 200);
                }}
                className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
              />
              
              {showKuponDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-sm shadow-lg overflow-y-auto max-h-60 z-50">
                  {pendingOrRecentTxList
                    .filter((tx) => tx.no_kupon.includes(kuponInput))
                    .map((tx) => {
                      const items = tx.items || [];
                      const weighed = items.filter((i) => (i.berat_kg || 0) > 0).length;
                      const isComplete = items.length > 0 && weighed === items.length;
                      return (
                        <div
                          key={tx.transaksi_id}
                          onClick={() => {
                            handleManualChangeKupon(tx.transaksi_id);
                            setKuponInput(tx.no_kupon);
                            setShowKuponDropdown(false);
                          }}
                          className="px-3 py-2 cursor-pointer hover:bg-[#f8f9fa] border-b border-gray-100 last:border-0"
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <strong className="text-gray-800 font-mono text-xs">{tx.no_kupon}</strong>
                            <span className="text-[10px] text-gray-500 font-medium">{isComplete ? '✓ LENGKAP' : '⏳ PROSES'}</span>
                          </div>
                          <div className="text-[10px] text-gray-600">
                            {tx.nama_petani} • {weighed}/{items.length} Bal ditimbang
                          </div>
                        </div>
                      );
                    })}
                    {pendingOrRecentTxList.filter((tx) => tx.no_kupon.includes(kuponInput)).length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center">Tidak ada kupon ditemukan</div>
                    )}
                </div>
              )}
            </div>

          </div>

                    {/* List of Bals in Selected Kupon */}
          <div className="bg-white border border-gray-200 shadow-2xs rounded-sm overflow-hidden">
            <div className="bg-[#f8f9fa] border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Daftar Bal ({workingItems.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {workingItems.map((item, index) => {
                const isActive = activeItemId === item.item_id;
                const isWeighed = (item.berat_kg || 0) > 0;
                return (
                  <button
                    key={item.item_id}
                    type="button"
                    onClick={() => setActiveItemId(item.item_id)}
                    className={`w-full text-left px-4 py-3 transition cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-gray-100 border-l-4 border-[#b81d24] font-semibold'
                        : isWeighed
                        ? 'bg-white hover:bg-[#f8f9fa]'
                        : 'bg-white hover:bg-[#f8f9fa]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-slate-400 text-[10px] w-4">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-semibold text-gray-900">
                            {item.no_bal}
                          </span>
                          <span className="px-1.5 py-0.2 bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-medium rounded-xs">
                            Grade {item.kode_grade}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {formatRupiah(item.harga_per_kg)}/kg {item.ganti_tikar && '• Ganti Tikar'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {isWeighed ? (
                        <div>
                          <span className="font-mono font-semibold text-gray-900 text-xs">
                            {item.berat_kg} Kg Netto
                          </span>
                          <p className="text-[9px] text-emerald-600 font-medium">
                            ✓ Terekam
                          </p>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 rounded-xs text-[10px] font-medium">
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
        <div className="lg:col-span-8 flex flex-col space-y-3">
          {allCurrentWeighed && currentTx && (
            <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-150">
              <div className="flex items-center space-x-2 text-emerald-900 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Kupon {currentTx.no_kupon} Tuntas Ditimbang:</strong> Seluruh {workingItems.length} bal telah selesai ditimbang ({currentTx.berat_kg || 0} Kg Netto). Siap diproses pembayaran kasir & dicetak nota.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToKasir(currentTx.no_kupon, currentTx.transaksi_id)}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xs flex items-center space-x-1.5 transition cursor-pointer shadow-2xs shrink-0"
              >
                <span>Buka di Kasir</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeBalItem ? (
            <div className="bg-white rounded-sm border border-gray-200 overflow-hidden shadow-2xs flex flex-col">
              {/* Enterprise Header with System Brand Theme */}
              <div className="bg-gray-100/90 border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="bg-red-50 text-[#b81d24] p-2 rounded-xs border border-red-100">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                        Penimbangan Bal: <span className="font-mono text-[#b81d24] font-extrabold">{activeBalItem.no_bal}</span>
                      </h3>
                      {isActiveBalWeighed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Terkunci
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Siap Ditimbang
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700 bg-white px-2 py-0.5 border border-gray-200 rounded-xs">
                        Mutu Grade {activeBalItem.kode_grade}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-gray-500">
                        Barcode: {activeBalItem.barcode || activeBalItem.no_bal}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Workspace - Compact, Structured, Matching System Theme */}
              <div className="p-4 sm:p-5 space-y-4">
                <div className="p-4 bg-[#f8f9fa] border border-gray-200 rounded-sm space-y-4">
                  {/* Grid Inputs: Bruto & Netto side-by-side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Bruto Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700">
                        Berat Kotor (Bruto) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          ref={beratBrutoInputRef}
                          type="number"
                          step="0.1"
                          min="0"
                          value={beratBrutoInput}
                          disabled={isActiveBalWeighed}
                          onChange={(e) => setBeratBrutoInput(e.target.value)}
                          onKeyDown={handleKeyDownWeight}
                          className="w-full bg-white border border-gray-300 rounded-xs py-2 px-3 text-base font-bold text-gray-900 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] disabled:bg-gray-100 disabled:text-slate-400 transition"
                          placeholder="0.0"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-gray-500 font-semibold text-xs">KG</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {isActiveBalWeighed 
                          ? 'Bal telah tersimpan & terkunci. Klik "Buka Kunci" untuk menimbang ulang.' 
                          : 'Ketik berat kotor lalu tekan Enter untuk simpan.'}
                      </p>
                    </div>

                    {/* Netto Display & Edit */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-semibold text-gray-700">
                          Berat Bersih (Netto)
                        </label>
                        {isNettoManual && (
                          <button 
                            type="button"
                            onClick={() => {
                              setIsNettoManual(false);
                              setBeratNettoInput('');
                            }}
                            className="text-[10px] text-[#b81d24] hover:text-rose-800 font-medium"
                          >
                            Reset Auto
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={isNettoManual ? beratNettoInput : liveNetto}
                          disabled={isActiveBalWeighed}
                          onChange={(e) => {
                            setIsNettoManual(true);
                            setBeratNettoInput(e.target.value);
                          }}
                          onKeyDown={handleKeyDownWeight}
                          className="w-full bg-white border border-gray-300 rounded-xs py-2 px-3 text-base font-bold text-gray-900 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] disabled:bg-gray-100 disabled:text-slate-400 transition"
                          placeholder="0.0"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-gray-500 font-semibold text-xs">KG</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] pt-0.5">
                        <span className="text-gray-500">Potongan Tara:</span>
                        <span className="font-semibold text-gray-700">{liveBruto ? liveTara : 0} KG {isNettoManual ? '(Disesuaikan)' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ganti Tikar Checkbox */}
                  <div className="pt-3 border-t border-gray-200">
                    <label className="inline-flex items-center space-x-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={activeBalItem.ganti_tikar}
                        onChange={() => handleToggleGantiTikar(activeBalItem.item_id)}
                        disabled={isActiveBalWeighed}
                        className="w-4 h-4 rounded-xs border-gray-300 text-[#b81d24] focus:ring-[#b81d24] disabled:opacity-50 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 transition">
                        Ada Ganti Tikar?
                      </span>
                    </label>

                    {activeBalItem.ganti_tikar && (
                      <div className="mt-2.5 ml-6 max-w-xs">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Nominal Potongan Tikar (Rp)
                        </label>
                        <input
                          type="number"
                          value={potTikarInput}
                          onChange={(e) => setPotTikarInput(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                          onBlur={(e) => {
                            if (e.target.value !== '') {
                              const val = parseFloat(e.target.value) || 0;
                              if (val > 0 && val < 1000) {
                                setPotTikarInput(val * 1000);
                              }
                            }
                          }}
                          disabled={isActiveBalWeighed}
                          className="w-full bg-white border border-gray-300 rounded-xs py-1.5 px-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] disabled:bg-gray-100 disabled:text-slate-400"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-gray-100/90 border-t border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
                <div>
                  {isActiveBalWeighed ? (
                    <button
                      type="button"
                      onClick={() => handleUnlockActiveBal(activeBalItem.item_id)}
                      className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xs text-xs font-semibold flex items-center transition cursor-pointer shadow-2xs"
                    >
                      <Unlock className="w-3.5 h-3.5 mr-1.5 text-amber-700" />
                      Buka Kunci (Edit Ulang)
                    </button>
                  ) : (
                    <p className="text-xs text-gray-500">Pastikan timbangan fisik stabil sebelum menyimpan.</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    disabled={isActiveBalWeighed || !liveBruto || liveBruto <= 0}
                    onClick={handleApplyWeightForActiveBal}
                    className="bg-[#b81d24] hover:bg-[#9e161c] text-white px-5 py-2 rounded-xs text-xs font-semibold shadow-2xs flex items-center transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Simpan Timbangan
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-gray-200 p-12 text-center text-slate-400 rounded-sm flex flex-col items-center justify-center h-full">
              <Scale className="w-16 h-16 mb-4 text-slate-200" />
              <h3 className="text-base font-bold text-gray-700">Tidak ada bal dipilih</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

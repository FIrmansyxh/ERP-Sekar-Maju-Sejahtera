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
  Save,
  Search,
  Scan,
  X,
  Info
} from 'lucide-react';
import { TransaksiPembelian, Petani, TabelHarga, Barang, TransaksiItemBal, UserRole, User as UserType, SaveTransaksiMeta } from '../../types';
import { formatRupiah, formatNoKupon, formatDateHariBulanTahun, hitungPotonganTaraKg, normalizeKg, getInfoAturanTara } from '../../utils/formatters';
import { recordAuditLog } from '../../utils/storage';
import { buildBarangDariItem, hitungUlangKupon, isKuponProsesSortir, terapkanHasilTimbang } from '../../utils/kuponSortir';
import { POTONGAN_GANTI_TIKAR, POTONGAN_KULI_PER_BAL, POTONGAN_TALI_PER_BAL } from '../../config/aturanTimbang';

interface TimbanganPageViewProps {
  transaksiList: TransaksiPembelian[];
  petaniList: Petani[];
  hargaList: TabelHarga[];
  barangList: Barang[];
  userRole: UserRole;
  currentUser?: UserType | null;
  initialKuponNo?: string;
  initialTxId?: string;
  initialBalNo?: string;
  onSaveTransaksi: (newTx: TransaksiPembelian, generatedBarang: Barang | Barang[], meta?: SaveTransaksiMeta) => void;
  /** Tarik ulang kupon dari server (Sortir di PC lain) lalu kembalikan list terbaru */
  onRefreshTransaksiList?: () => Promise<TransaksiPembelian[]>;
  onNavigateToKasir: (kuponNo?: string, txId?: string) => void;
  onNavigateToSortir: () => void;
}

/** Berat bruto bal yang sudah ditimbang (angka yang terbaca di timbangan) */
const beratBrutoItem = (item: TransaksiItemBal): number =>
  item.berat_bruto_kg && item.berat_bruto_kg > 0
    ? item.berat_bruto_kg
    : normalizeKg((item.berat_kg || 0) + (item.potongan_tara_kg || 0));

export const TimbanganPageView: React.FC<TimbanganPageViewProps> = ({
  transaksiList = [],
  petaniList = [],
  hargaList = [],
  barangList = [],
  userRole,
  currentUser,
  initialKuponNo,
  initialTxId,
  initialBalNo,
  onSaveTransaksi,
  onRefreshTransaksiList,
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
  // Versi kupon sebelumnya, untuk membedakan perubahan dari Sortir dengan perubahan bal aktif
  const prevTxRef = useRef<TransaksiPembelian | undefined>(undefined);
  const [activeItemId, setActiveItemId] = useState<string>(() => {
    if (initialBalMatch) return initialBalMatch.item.item_id;
    return '';
  });
  // Nilai terbaru bal aktif untuk efek sinkron (tidak ikut basi di closure)
  const activeItemIdRef = useRef(activeItemId);
  activeItemIdRef.current = activeItemId;
  // Kolom terakhir yang difokus operator, untuk mengembalikan kursor setelah centang Ganti Tikar
  const fokusTerakhirRef = useRef<'scan' | 'berat'>('scan');

  // Weighing inputs
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [beratBrutoInput, setBeratBrutoInput] = useState<number | string>('');
  const [beratNettoInput, setBeratNettoInput] = useState<number | string>('');
  const [isNettoManual, setIsNettoManual] = useState<boolean>(false);
  const [potTikarInput, setPotTikarInput] = useState<number | ''>('');

  // Daftar ID bal yang baru saja ditimbang di sesi berjalan (urutan teratas)
  const [localWeighedIds, setLocalWeighedIds] = useState<string[]>([]);

  // Daftar seluruh bal yang sudah ditimbang lintas kupon (bal terakhir ditimbang berada paling atas)
  const balTerakhirDitimbangList = useMemo(() => {
    const list: {
      item: TransaksiItemBal;
      tx: TransaksiPembelian;
      waktuTimbang: number;
      sessionIndex: number;
    }[] = [];

    for (const tx of transaksiList) {
      for (const item of tx.items || []) {
        const isWeighed = (item.berat_kg || 0) > 0 || item.status_timbang === 'selesai_timbang';
        if (!isWeighed) continue;

        let waktu = item.diubah_lokal_pada || 0;
        if (!waktu) {
          const matchedB = barangList.find(
            (b) => b.transaksi_pembelian_id === tx.transaksi_id && (b.no_bal === item.no_bal || b.barang_id === item.barang_id)
          );
          if (matchedB?.created_at) {
            waktu = new Date(matchedB.created_at).getTime();
          } else if (tx.terakhir_diubah_pada) {
            waktu = new Date(tx.terakhir_diubah_pada).getTime();
          } else if (tx.tanggal_transaksi) {
            waktu = new Date(tx.tanggal_transaksi).getTime();
          }
        }

        const sIdx = localWeighedIds.indexOf(item.item_id);

        list.push({
          item,
          tx,
          waktuTimbang: waktu,
          sessionIndex: sIdx >= 0 ? sIdx : 999999,
        });
      }
    }

    return list.sort((a, b) => {
      // Prioritas 1: Bal yang baru saja ditimbang di sesi ini
      if (a.sessionIndex !== b.sessionIndex) {
        return a.sessionIndex - b.sessionIndex;
      }
      // Prioritas 2: Waktu timbang / diubah_lokal_pada terbaru
      if (b.waktuTimbang !== a.waktuTimbang) {
        return b.waktuTimbang - a.waktuTimbang;
      }
      // Prioritas 3: Fallback ke transaksi_id descending
      return b.tx.transaksi_id.localeCompare(a.tx.transaksi_id);
    });
  }, [transaksiList, barangList, localWeighedIds]);

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
    const prevTx = prevTxRef.current;
    prevTxRef.current = currentTx;
    if (currentTx && currentTx.items && currentTx.items.length > 0) {
      const aktifId = activeItemIdRef.current;
      const itemsTerbaru = currentTx.items;
      setWorkingItems((prevItems) =>
        itemsTerbaru.map((it) => {
          // Centang Ganti Tikar pada bal aktif yang belum ditimbang belum tersimpan, jangan ditimpa
          if (it.item_id !== aktifId || (it.berat_kg || 0) > 0) return it;
          const lokal = prevItems.find((p) => p.item_id === it.item_id);
          return lokal && Boolean(lokal.ganti_tikar) !== Boolean(it.ganti_tikar)
            ? { ...it, ganti_tikar: lokal.ganti_tikar }
            : it;
        })
      );

      // 1. If activeItemId is already a valid item of this currentTx, keep it.
      // Kupon bisa berubah dari Sortir saat operator sedang mengetik berat, jadi isian
      // bal yang belum ditimbang tidak ditimpa.
      const existingActive = currentTx.items.find((it) => it.item_id === aktifId);
      if (existingActive) {
        const prevActive = prevTx?.transaksi_id === currentTx.transaksi_id
          ? (prevTx.items || []).find((it) => it.item_id === existingActive.item_id)
          : undefined;
        const beratBalAktifTetap = Boolean(
          prevActive &&
          prevActive.berat_kg === existingActive.berat_kg &&
          prevActive.berat_bruto_kg === existingActive.berat_bruto_kg
        );
        if (!beratBalAktifTetap) {
          setBeratBrutoInput(existingActive.berat_bruto_kg && existingActive.berat_bruto_kg > 0 ? existingActive.berat_bruto_kg : '');
          setBeratNettoInput(existingActive.berat_kg && existingActive.berat_kg > 0 ? existingActive.berat_kg : '');
          setIsNettoManual(existingActive.is_netto_manual || false);
        }
        // Selalu sinkronkan tampilan ganti tikar dari data tersimpan
        const hasGanti =
          Boolean(existingActive.ganti_tikar) || (existingActive.potongan_tikar || 0) > 0;
        setPotTikarInput(hasGanti ? (existingActive.potongan_tikar || POTONGAN_GANTI_TIKAR) : '');
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
        const hasGanti =
          Boolean(targetItem.ganti_tikar) || (targetItem.potongan_tikar || 0) > 0;
        setPotTikarInput(hasGanti ? (targetItem.potongan_tikar || POTONGAN_GANTI_TIKAR) : '');
      }
    } else {
      setWorkingItems([]);
      setActiveItemId('');
    }
  }, [currentTx]);

  // Pilih bal: kursor tetap di kolom No Bal, Enter berikutnya pindah ke kolom berat
  const selectBalAndOpen = useCallback((foundTx: TransaksiPembelian, foundItem: TransaksiItemBal, _source: 'manual' | 'scanner' = 'manual') => {
    setSelectedTxId(foundTx.transaksi_id);
    setWorkingItems(foundTx.items || []);
    setActiveItemId(foundItem.item_id);
    setScannedBarcode(foundItem.no_bal);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    setBeratBrutoInput(foundItem.berat_bruto_kg && foundItem.berat_bruto_kg > 0 ? foundItem.berat_bruto_kg : '');
    setBeratNettoInput(foundItem.berat_kg && foundItem.berat_kg > 0 ? foundItem.berat_kg : '');
    setIsNettoManual(foundItem.is_netto_manual || false);
    const hasGantiTikar = Boolean(foundItem.ganti_tikar) || (foundItem.potongan_tikar || 0) > 0;
    setPotTikarInput(hasGantiTikar ? (foundItem.potongan_tikar || POTONGAN_GANTI_TIKAR) : '');
    
    const isAlreadyWeighed = (foundItem.berat_kg || 0) > 0;
    setScanFeedback({
      text: `Bal "${foundItem.no_bal}" (Grade ${foundItem.kode_grade}) dipilih pada Kupon ${foundTx.no_kupon} • ${foundTx.nama_petani}.${
        isAlreadyWeighed
          ? ` Bobot terkunci: ${beratBrutoItem(foundItem)} kg bruto.`
          : ' Centang Ganti Tikar bila perlu, lalu tekan Enter untuk isi berat.'
      }${hasGantiTikar ? ' • Ganti tikar aktif.' : ''}`,
      isError: false,
    });

    // Kursor tetap di kolom No Bal (teks terblok agar scan berikutnya langsung menimpa).
    // Operator menekan Enter sekali lagi untuk pindah ke kolom berat.
    setTimeout(() => {
      if (barcodeScannerRef.current) {
        barcodeScannerRef.current.focus();
        barcodeScannerRef.current.select();
      }
    }, 120);
  }, []);

  // Lookup Bal by code across ALL kupons; bila belum ketemu, tarik ulang dari server (Sortir PC lain)
  const findBalInList = useCallback((list: TransaksiPembelian[], query: string, preferCurrent?: TransaksiPembelian) => {
    const cleanQ = query.trim().toLowerCase();
    const cleanQNormalized = query.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (!cleanQ) return { foundTx: undefined as TransaksiPembelian | undefined, foundItem: undefined as TransaksiItemBal | undefined };

    const matchItem = (it: TransaksiItemBal) => {
      const bCode = (it.barcode || '').toLowerCase();
      const nBal = (it.no_bal || '').toLowerCase();
      const nBalNorm = (it.no_bal || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return bCode === cleanQ || nBal === cleanQ || nBalNorm === cleanQNormalized;
    };

    if (preferCurrent?.items) {
      const currentMatch = preferCurrent.items.find(matchItem);
      if (currentMatch) return { foundTx: preferCurrent, foundItem: currentMatch };
    }

    for (const tx of list) {
      const match = (tx.items || []).find(matchItem);
      if (match) return { foundTx: tx, foundItem: match };
    }

    for (const tx of list) {
      const match = (tx.items || []).find((it) => {
        const bCode = (it.barcode || '').toLowerCase();
        const nBal = (it.no_bal || '').toLowerCase();
        return (it.berat_kg || 0) <= 0 && (bCode.includes(cleanQ) || nBal.includes(cleanQ));
      });
      if (match) return { foundTx: tx, foundItem: match };
    }

    for (const tx of list) {
      const match = (tx.items || []).find((it) => {
        const bCode = (it.barcode || '').toLowerCase();
        const nBal = (it.no_bal || '').toLowerCase();
        return bCode.includes(cleanQ) || nBal.includes(cleanQ);
      });
      if (match) return { foundTx: tx, foundItem: match };
    }

    return { foundTx: undefined, foundItem: undefined };
  }, []);

  const lookupBal = useCallback(async (query: string, isFromScanner: boolean = false) => {
    const q = query.trim();
    if (!q) return;

    setScannedBarcode(q);
    const cleanQ = q.toLowerCase();

    let { foundTx, foundItem } = findBalInList(transaksiList, q, currentTx);

    // Belum ketemu: refresh dari API (kupon Sortir yang baru di PC lain / baru di-commit)
    if ((!foundTx || !foundItem) && onRefreshTransaksiList) {
      setScanFeedback({
        text: `Bal "${q}" belum di cache lokal. Mengambil antrian terbaru dari server...`,
        isError: false,
      });
      try {
        const fresh = await onRefreshTransaksiList();
        ({ foundTx, foundItem } = findBalInList(fresh, q));
      } catch (err) {
        console.warn('Gagal refresh transaksi untuk lookup bal:', err);
      }
    }

    if (!foundTx || !foundItem) {
      const matchedKupon = (transaksiList).find(
        (tx) => tx.no_kupon.toLowerCase() === cleanQ || tx.no_kupon.toLowerCase().includes(cleanQ)
      );
      if (matchedKupon) {
        handleManualChangeKupon(matchedKupon.transaksi_id);
        setScannedBarcode('');
        setScanFeedback({ text: `Kupon ${matchedKupon.no_kupon} aktif. Menampilkan daftar bal antrian.`, isError: false });
        return;
      }
    }

    if (foundTx && foundItem) {
      selectBalAndOpen(foundTx, foundItem, isFromScanner ? 'scanner' : 'manual');
    } else {
      setIsDropdownOpen(false);
      setScanFeedback({
        text: `Nomor bal "${q}" tidak ditemukan. Pastikan bal sudah ditambahkan di Sortir (langsung tersimpan, tidak perlu Selesai Sortir dulu).`,
        isError: true,
      });
    }
  }, [currentTx, transaksiList, selectBalAndOpen, findBalInList, onRefreshTransaksiList]);

  // Poll ringan: Sortir di PC lain menambah bal → Timbangan ikut melihat tanpa reload manual
  useEffect(() => {
    if (!onRefreshTransaksiList) return;
    const id = window.setInterval(() => {
      onRefreshTransaksiList().catch(() => undefined);
    }, 6000);
    return () => window.clearInterval(id);
  }, [onRefreshTransaksiList]);

  // Global scanner listener untuk barcode gun (tanpa auto-fokus saat mount)
  useEffect(() => {
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

  // Switch active bal item — tanpa auto-fokus; muat ulang status ganti tikar
  const handleSelectBalItem = (item: TransaksiItemBal) => {
    setActiveItemId(item.item_id);
    setBeratBrutoInput(item.berat_bruto_kg && item.berat_bruto_kg > 0 ? item.berat_bruto_kg : '');
    setBeratNettoInput(item.berat_kg && item.berat_kg > 0 ? item.berat_kg : '');
    setIsNettoManual(item.is_netto_manual || false);
    const hasGantiTikar = Boolean(item.ganti_tikar) || (item.potongan_tikar || 0) > 0;
    setPotTikarInput(hasGantiTikar ? (item.potongan_tikar || POTONGAN_GANTI_TIKAR) : '');
    const isWeighed = (item.berat_kg || 0) > 0;
    setScanFeedback({ 
      text: `Bal "${item.no_bal}" (Grade ${item.kode_grade}) dipilih.${isWeighed ? ` Bobot tersimpan: ${beratBrutoItem(item)} kg bruto.` : ' Tekan Enter di kolom No Bal atau klik kolom berat untuk mengisi bobot.'}${hasGantiTikar ? ' • Ganti tikar aktif.' : ''}`,
      isError: false 
    });
  };

  // Toggle Ganti Tikar — simpan segera ke state + BE (bukan hanya UI lokal)
  const handleToggleGantiTikar = (itemId: string) => {
    if (!currentTx) return;
    const target = workingItems.find((it) => it.item_id === itemId);
    if (!target || (target.berat_kg || 0) > 0) return;

    let nextGanti = false;
    const nextItems = workingItems.map((it) => {
      if (it.item_id !== itemId) return it;
      nextGanti = !it.ganti_tikar;
      const potTikar = nextGanti
        ? (typeof potTikarInput === 'number' && potTikarInput > 0 ? potTikarInput : POTONGAN_GANTI_TIKAR)
        : 0;
      return {
        ...it,
        ganti_tikar: nextGanti,
        potongan_tikar: potTikar,
        diubah_lokal_pada: Date.now(),
        potongan: (it.potongan_kuli ?? POTONGAN_KULI_PER_BAL) + (it.potongan_tali ?? POTONGAN_TALI_PER_BAL) + potTikar,
        subtotal_bersih: Math.max(
          0,
          (it.total_kotor || 0) -
            ((it.potongan_kuli ?? POTONGAN_KULI_PER_BAL) + (it.potongan_tali ?? POTONGAN_TALI_PER_BAL) + potTikar)
        ),
      };
    });

    setWorkingItems(nextItems);
    if (itemId === activeItemId) {
      setPotTikarInput(nextGanti ? POTONGAN_GANTI_TIKAR : '');
    }

    const updatedTx = hitungUlangKupon(currentTx, nextItems);
    onSaveTransaksi(updatedTx, [], { skipAudit: true });
    setScanFeedback({
      text: nextGanti
        ? `Ganti tikar aktif untuk bal ini (potongan ${POTONGAN_GANTI_TIKAR.toLocaleString('id-ID')}).`
        : 'Ganti tikar dimatikan untuk bal ini.',
      isError: false,
    });
    // Kembalikan kursor supaya Enter tetap bekerja (No Bal → berat → simpan)
    setTimeout(() => {
      const target = fokusTerakhirRef.current === 'berat' ? beratBrutoInputRef.current : barcodeScannerRef.current;
      target?.focus();
    }, 50);
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
    const noBalDiKolom = scannedBarcode.trim().toUpperCase();
    const balSudahDipilih = Boolean(
      activeBalItem &&
      noBalDiKolom &&
      [activeBalItem.no_bal, activeBalItem.barcode].some((v) => (v || '').toUpperCase() === noBalDiKolom)
    );
    if (!isDropdownOpen && balSudahDipilih && activeBalItem) {
      if ((activeBalItem.berat_kg || 0) > 0) {
        setScanFeedback({
          text: `Bal "${activeBalItem.no_bal}" sudah ditimbang (${beratBrutoItem(activeBalItem)} kg bruto). Klik "Buka Kunci" bila perlu timbang ulang.`,
          isError: true,
        });
        return;
      }
      beratBrutoInputRef.current?.focus();
      beratBrutoInputRef.current?.select();
      return;
    }
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
  const isGantiTikarActive =
    Boolean(activeBalItem?.ganti_tikar) || (activeBalItem?.potongan_tikar || 0) > 0 || (typeof potTikarInput === 'number' && potTikarInput > 0);
  
  let liveTara = hitungPotonganTaraKg(liveBruto, isGantiTikarActive, activeBalItem?.no_bal, activeBalItem?.kode_grade);
  let liveNetto = liveBruto > 0 ? Math.max(0, normalizeKg(liveBruto - liveTara)) : 0;
  
  if (isNettoManual && parsedNettoInput > 0) {
    liveNetto = parsedNettoInput;
    liveTara = Math.max(0, normalizeKg(liveBruto - liveNetto));
  }

  const infoAturanTara = getInfoAturanTara(activeBalItem?.no_bal, activeBalItem?.kode_grade, liveBruto);

  const livePotTikar = isGantiTikarActive ? (typeof potTikarInput === 'number' ? potTikarInput : POTONGAN_GANTI_TIKAR) : 0;
  const livePotKuli = POTONGAN_KULI_PER_BAL;
  const livePotTali = POTONGAN_TALI_PER_BAL;
  const livePotTotal = livePotKuli + livePotTali + livePotTikar;
  const liveTotalKotor = Math.round(liveNetto * (activeBalItem?.harga_per_kg || 0));
  const liveSubtotalBersih = Math.round(Math.max(0, liveTotalKotor - livePotTotal));

  // Validasi Kapasitas Standar Grade SB: Maksimal 50.0 Kg
  const isGradeSB = Boolean(
    (activeBalItem?.kode_grade && activeBalItem.kode_grade.toUpperCase().includes('SB')) ||
    (activeBalItem?.no_bal && activeBalItem.no_bal.toUpperCase().startsWith('SB'))
  );
  const isOverCapacitySB = isGradeSB && (liveBruto > 50 || liveNetto > 50);

  const handleCancelWeightDueToSB = () => {
    setBeratBrutoInput('');
    setBeratNettoInput('');
    setIsNettoManual(false);
    setScanFeedback({
      text: 'Nilai timbangan di-reset. Silakan sesuaikan kuantitas tembakau fisik bal (maksimal 50,0 kg) sebelum menimbang ulang.',
      isError: false,
    });
  };

  // Save weighing for active bal
  const handleApplyWeightForActiveBal = () => {
    if (!activeBalItem || !currentTx) return;
    
    if (isActiveBalWeighed) {
      setScanFeedback({ text: 'Bal ini sudah ditimbang. Data tidak bisa diubah.', isError: true });
      return;
    }

    if (liveBruto <= 0) {
      setScanFeedback({ text: 'Masukkan berat bruto (kotor) lebih dari 0 kg!', isError: true });
      return;
    }

    // Jika melebihi kapasitas standar Grade SB (> 50kg), batalkan penimbangan
    if (isOverCapacitySB) {
      const measuredWeight = Math.max(liveBruto, liveNetto);
      setScanFeedback({
        text: `Penimbangan ditolak: Bobot bal Grade SB (${measuredWeight} kg) melebihi batas kapasitas standar 50,0 kg. Kurangi isi tembakau fisik sebelum melanjutkan.`,
        isError: true,
      });
      return;
    }

    // Tulis hasil timbang satu bal ke versi kupon terbaru (ikutkan ganti_tikar dari workingItems)
    const baseItems = (workingItems.length > 0 ? workingItems : currentTx.items || []).map((it, idx) => ({
      ...it,
      barang_id: it.barang_id || `BAL-${currentTx.transaksi_id.replace('TRX-', '')}-${String(idx + 1).padStart(2, '0')}`,
    }));
    const kuponTerbaru = {
      ...currentTx,
      items: baseItems,
      petugas_timbang: currentUser?.nama_lengkap || 'Operator Timbang Digital',
    };
    const updatedTx = terapkanHasilTimbang(
      kuponTerbaru,
      activeBalItem.item_id,
      {
        berat_bruto_kg: liveBruto,
        potongan_tara_kg: liveTara,
        berat_kg: liveNetto,
        is_netto_manual: isNettoManual,
        ganti_tikar: Boolean(activeBalItem.ganti_tikar),
        potongan_kuli: livePotKuli,
        potongan_tali: livePotTali,
        potongan_tikar: livePotTikar,
        potongan: livePotTotal,
        total_kotor: liveTotalKotor,
        subtotal_bersih: liveSubtotalBersih,
        status_timbang: 'selesai_timbang',
        diubah_lokal_pada: Date.now(),
      },
      activeBalItem.no_bal
    );

    if (!updatedTx) {
      setScanFeedback({
        text: `Bal "${activeBalItem.no_bal}" sudah dihapus dari Kupon ${currentTx.no_kupon} oleh Sortir. Berat tidak disimpan.`,
        isError: true,
      });
      return;
    }

    const updatedItems = updatedTx.items || [];
    setWorkingItems(updatedItems);
    const allItemsWeighed = updatedItems.length > 0 && updatedItems.every((it) => (it.berat_kg || 0) > 0);
    const totalBrutoKg = updatedTx.berat_terukur_kg;
    const weighedItem = updatedItems.find((it) => it.item_id === activeBalItem.item_id)!;

    onSaveTransaksi(
      updatedTx,
      [buildBarangDariItem(updatedTx, weighedItem, barangList.find((b) => b.barang_id === weighedItem.barang_id))],
      { skipAudit: true }
    );

    // Catat ID bal ke urutan teratas bal yang terakhir ditimbang di sesi berjalan
    setLocalWeighedIds((prev) => [activeBalItem.item_id, ...prev.filter((id) => id !== activeBalItem.item_id)]);

    // Record activity log for Super Admin accountability audit trail
    recordAuditLog({
      user_nama: currentUser?.nama_lengkap || 'Operator Timbang Digital',
      user_role: userRole,
      modul: 'Timbangan Bal',
      aksi: 'TIMBANG_BAL',
      target_id: activeBalItem.no_bal,
      deskripsi: `Penimbangan bal ${activeBalItem.no_bal} (Kupon: ${currentTx.no_kupon}) - Bruto: ${liveBruto} Kg, Tara: ${liveTara} Kg, Netto: ${liveNetto} Kg`,
    });
    

    setSaveSuccessMsg(`✓ Berat Bal "${activeBalItem.no_bal}" (${liveBruto} Kg bruto) berhasil disimpan ke gudang!`);
    setScanFeedback(null);

    // Kosongkan input scan agar siap menerima tembakan barcode bal berikutnya
    setScannedBarcode('');
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);

    if (allItemsWeighed && isKuponProsesSortir(updatedTx)) {
      setScanFeedback({
        text: `Semua bal yang sudah masuk (${updatedItems.length} bal) pada Kupon ${currentTx.no_kupon} sudah ditimbang. Sortir kupon ini masih berjalan, bal berikutnya bisa langsung discan begitu ditambahkan.`,
        isError: false,
      });
    } else if (allItemsWeighed) {
      setScanFeedback({
        text: `Seluruh bal (${updatedItems.length} bal) pada Kupon ${currentTx.no_kupon} selesai ditimbang (${totalBrutoKg} kg bruto). Bal "${activeBalItem.no_bal}" tersimpan.`,
        isError: false,
      });
    } else {
      setScanFeedback({
        text: `Bal "${activeBalItem.no_bal}" berhasil disimpan (${liveBruto} kg bruto). Siap memindai bal berikutnya.`,
        isError: false,
      });
    }

    // Mengosongkan isian di layar (Sesuai dengan Requirement form kembali kosong)
    setBeratBrutoInput('');
    setPotTikarInput('');
    setActiveItemId('');
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
      if (isOverCapacitySB) {
        const measuredWeight = Math.max(liveBruto, liveNetto);
        setScanFeedback({
          text: `Penimbangan ditolak: Bobot bal Grade SB (${measuredWeight} kg) melebihi batas kapasitas standar 50,0 kg. Kurangi isi tembakau fisik sebelum melanjutkan.`,
          isError: true,
        });
        return;
      }

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
    const existingBruto = item.berat_bruto_kg || (item.berat_kg ? normalizeKg(item.berat_kg + (item.potongan_tara_kg || 0)) : 0);

    setBeratBrutoInput(existingBruto > 0 ? existingBruto : '');

    // Simpan ke versi kupon terbaru; bal kembali berstatus Proses Sortir sampai ditimbang ulang
    if (currentTx) {
      const updatedTx = terapkanHasilTimbang(currentTx, itemId, {
        berat_kg: 0,
        berat_bruto_kg: existingBruto,
        total_kotor: 0,
        potongan: 0,
        subtotal_bersih: 0,
        status_timbang: 'menunggu_timbang',
        diubah_lokal_pada: Date.now(),
      });
      if (!updatedTx) return;
      const unlockedItem = (updatedTx.items || []).find((it) => it.item_id === itemId)!;
      setWorkingItems(updatedTx.items || []);
      onSaveTransaksi(
        updatedTx,
        unlockedItem.barang_id
          ? [buildBarangDariItem(updatedTx, unlockedItem, barangList.find((b) => b.barang_id === unlockedItem.barang_id))]
          : [],
        { skipAudit: true }
      );
      recordAuditLog({
        user_nama: currentUser?.nama_lengkap || 'Operator Timbang Digital',
        user_role: userRole,
        modul: 'Timbangan Bal',
        aksi: 'BUKA_KUNCI_TIMBANG',
        target_id: item.no_bal,
        deskripsi: `Kunci timbang bal ${item.no_bal} (Kupon: ${currentTx.no_kupon}) dibuka untuk timbang ulang. Netto sebelumnya: ${item.berat_kg || 0} Kg`,
      });
    }
    setScanFeedback({
      text: `Kunci bal "${item.no_bal}" berhasil dibuka. Bobot bruto ${existingBruto > 0 ? `(${existingBruto} kg) ` : ''}siap diedit atau diperbarui pada form.`,
      isError: false,
    });
    setSaveSuccessMsg(null);
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
      }
    }
  };

  // Kupon yang sortirnya belum ditutup belum dianggap tuntas walaupun semua bal yang ada sudah ditimbang
  const allCurrentWeighed =
    workingItems.length > 0 && workingItems.every((it) => (it.berat_kg || 0) > 0) && !isKuponProsesSortir(currentTx);
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
              <div className="flex items-center space-x-2">
                <Scan className="w-4 h-4 text-gray-700" />
                <h3 className="text-xs font-bold text-gray-900 tracking-tight">
                  Pencarian Bal & Kupon
                </h3>
              </div>
            </div>

            <form onSubmit={handleScanBarcode} className="relative">
              <div className="flex rounded-sm shadow-2xs">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
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
                      fokusTerakhirRef.current = 'scan';
                      if (scannedBarcode.trim().length >= 1 && !activeBalItem) {
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
                        } else {
                          // Enter tanpa daftar saran: cari bal, atau lanjut ke kolom berat bila bal sudah dipilih
                          handleScanBarcode(e);
                        }
                      } else if (e.key === 'Escape') {
                        setIsDropdownOpen(false);
                      }
                    }}
                    placeholder="Ketik nomor bal, kupon, atau scan barcode..."
                    className={`w-full bg-white border border-r-0 rounded-l-sm pl-8 pr-7 py-2.5 text-xl font-mono font-extrabold tracking-wide text-gray-900 placeholder:text-xs focus:outline-none focus:ring-1 transition ${
                      scanFeedback?.isError
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50/20'
                        : 'border-gray-300 focus:border-gray-800 focus:ring-gray-800'
                    } placeholder:font-sans placeholder:font-normal placeholder:text-gray-400`}
                  />
                  {scannedBarcode && (
                    <button
                      type="button"
                      onClick={() => {
                        setScannedBarcode('');
                        setIsDropdownOpen(false);
                        setScanFeedback(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                      title="Hapus input"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-[#b81d24] hover:bg-[#9e161c] text-white text-xs font-semibold rounded-r-sm transition-colors cursor-pointer shrink-0 inline-flex items-center space-x-1.5 shadow-2xs"
                  title="Cari atau Buka Data"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Cari</span>
                </button>
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
                    <div className="px-2.5 py-1.5 bg-[#f8f9fa] text-[10px] font-semibold text-gray-600 tracking-wider flex items-center justify-between border-b border-gray-200 z-10">
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
                  className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-red-200 p-2.5 text-xs text-red-700 rounded-sm shadow-md"
                >
                  <p className="font-medium text-[11px]">
                    Tidak ada nomor bal yang cocok dengan <span className="font-mono font-bold">"{scannedBarcode}"</span>.
                  </p>
                </div>
              )}
            </form>

            {scanFeedback && (() => {
              const isError = scanFeedback.isError;
              const cleanText = scanFeedback.text.replace(/^[🔓🎉✓⚠️⛔]\s*/, '');
              const lower = cleanText.toLowerCase();
              const isUnlock = lower.includes('dibuka') || lower.includes('buka kunci');
              const isSuccess = lower.includes('selesai') || lower.includes('tersimpan') || lower.includes('berhasil');

              let containerClass = 'bg-slate-50 border-gray-200 text-gray-800';
              let Icon = Info;
              let iconClass = 'text-gray-500';

              if (isError) {
                containerClass = 'bg-red-50/70 border-red-200 text-red-900';
                Icon = AlertCircle;
                iconClass = 'text-red-600';
              } else if (isUnlock) {
                containerClass = 'bg-amber-50/70 border-amber-200 text-amber-950';
                Icon = Unlock;
                iconClass = 'text-amber-600';
              } else if (isSuccess) {
                containerClass = 'bg-emerald-50/70 border-emerald-200 text-emerald-950';
                Icon = CheckCircle2;
                iconClass = 'text-emerald-600';
              }

              return (
                <div className={`p-2.5 rounded-xs border text-xs flex items-start space-x-2 animate-in fade-in transition-all ${containerClass}`}>
                  <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${iconClass}`} />
                  <div className="flex-1 text-[11px] leading-relaxed font-normal">
                    {cleanText}
                  </div>
                </div>
              );
            })()}
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
                {pendingOrRecentTxList.length} Kupon
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
                            <span className="text-[10px] text-gray-500 font-medium">
                              {isKuponProsesSortir(tx) ? '✂ SORTIR BERJALAN' : isComplete ? '✓ LENGKAP' : '⏳ PROSES'}
                            </span>
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

          {/* List of Recently Weighed Bals across all kupons */}
          <div className="bg-white border border-gray-200 shadow-2xs rounded-sm overflow-hidden flex flex-col flex-1">
            <div className="bg-[#f8f9fa] border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-600" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Bal Terakhir Ditimbang
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xs text-[10px] font-bold">
                {balTerakhirDitimbangList.length} Bal
              </span>
            </div>
            <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
              {balTerakhirDitimbangList.length === 0 ? (
                <div className="p-8 text-center text-gray-400 space-y-1.5">
                  <Scale className="w-8 h-8 mx-auto text-gray-300 stroke-1" />
                  <p className="text-xs font-semibold text-gray-600">Belum ada bal yang ditimbang</p>
                  <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                    Ketik nomor bal atau scan barcode di kolom pencarian atas untuk memulai penimbangan.
                  </p>
                </div>
              ) : (
                balTerakhirDitimbangList.map(({ item, tx }, index) => {
                  const isActive = activeItemId === item.item_id;
                  const isWeighed = (item.berat_kg || 0) > 0;
                  return (
                    <button
                      key={`${tx.transaksi_id}-${item.item_id}`}
                      type="button"
                      onClick={() => selectBalAndOpen(tx, item, 'manual')}
                      className={`w-full text-left px-3.5 py-2.5 transition cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'bg-red-50/60 border-l-4 border-[#b81d24] font-semibold'
                          : 'bg-white hover:bg-[#f8f9fa]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <span className="font-mono text-slate-400 text-[10px] w-5 shrink-0 text-center font-bold">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-extrabold text-sm text-gray-900 truncate">
                              {item.no_bal}
                            </span>
                            <span className="px-1.5 py-0.2 bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-medium rounded-xs shrink-0">
                              Grade {item.kode_grade}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                            <span className="font-mono font-semibold text-gray-700">{tx.no_kupon}</span> • {tx.nama_petani}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-gray-900 text-xs">
                          {beratBrutoItem(item)} Kg Bruto
                        </div>
                        <p className="text-[10px] font-mono text-emerald-700 font-medium">
                          Netto: {item.berat_kg} Kg {item.potongan_tara_kg ? `(Tara ${item.potongan_tara_kg}kg)` : ''}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
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
                  <strong>Kupon {currentTx.no_kupon} Tuntas Ditimbang:</strong> Seluruh {workingItems.length} bal telah selesai ditimbang ({currentTx.berat_terukur_kg || 0} Kg Bruto). Siap diproses pembayaran kasir & dicetak nota.
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
                        Penimbangan Bal: <span className="font-mono text-[#b81d24] font-extrabold text-2xl align-middle">{activeBalItem.no_bal}</span>
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

                {/* Real-time Warning: Kapasitas Standar Grade SB */}
                {isOverCapacitySB && (
                  <div className="bg-white border-l-4 border-l-red-600 border-y border-r border-gray-200 rounded-r-xs p-4 shadow-2xs animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div className="p-1.5 bg-red-50 text-red-700 rounded-xs shrink-0 mt-0.5 border border-red-100">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xs font-bold text-gray-900 tracking-tight">
                              Batas Kapasitas Standar Terlampaui
                            </h4>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-xs">
                              Grade SB Maks. 50,0 kg
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            Bobot terukur sebesar{' '}
                            <span className="font-semibold text-gray-900 font-mono">{liveBruto} kg Bruto</span>{' '}
                            (<span className="font-mono text-gray-700">{liveNetto} kg Netto</span>) melebihi batas standar maksimal untuk Grade SB.
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Kurangi muatan fisik tembakau pada bal ini hingga bobot ≤ 50 kg sebelum menyimpan hasil timbangan.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelWeightDueToSB}
                        className="self-start sm:self-center px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 border border-red-200 hover:border-red-300 rounded-xs text-xs font-semibold transition-colors cursor-pointer shadow-2xs inline-flex items-center space-x-1.5 shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Timbangan</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Sesuai Standar Grade SB */}
                {isGradeSB && !isOverCapacitySB && liveBruto > 0 && (
                  <div className="bg-white border-l-4 border-l-emerald-600 border-y border-r border-gray-200 rounded-r-xs p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1 bg-emerald-50 text-emerald-700 rounded-xs shrink-0 border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs text-gray-700">
                        <span className="font-bold text-gray-900">Kapasitas Sesuai Standar:</span>{' '}
                        Bal Grade SB berbobot{' '}
                        <span className="font-mono font-semibold text-gray-900">{liveBruto} kg Bruto</span>{' '}
                        (<span className="font-mono text-gray-700">{liveNetto} kg Netto</span>) memenuhi toleransi operasional.
                      </p>
                    </div>
                    <span className="self-start sm:self-auto text-[10px] font-mono font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xs shrink-0">
                      Standar Terpenuhi (≤ 50 kg)
                    </span>
                  </div>
                )}

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
                          onFocus={() => { fokusTerakhirRef.current = 'berat'; }}
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
                      <div className="pt-1 space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-500 font-medium">Potongan Tara (Otomatis):</span>
                          <span className="font-bold text-gray-800">
                            {liveBruto ? liveTara : (infoAturanTara.kode === 'SB' ? 2 : 0)} KG{' '}
                            {isNettoManual ? <span className="text-amber-600 font-normal">(Manual)</span> : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded-xs border border-slate-200">
                          <span className="font-semibold text-slate-700">{infoAturanTara.label}</span>
                          <span className="text-slate-600">{infoAturanTara.keterangan}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ganti Tikar Checkbox */}
                  <div className="pt-3 border-t border-gray-200">
                    <label className="inline-flex items-center space-x-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={Boolean(activeBalItem.ganti_tikar) || (activeBalItem.potongan_tikar || 0) > 0}
                        onChange={() => handleToggleGantiTikar(activeBalItem.item_id)}
                        disabled={isActiveBalWeighed}
                        className="w-4 h-4 rounded-xs border-gray-300 text-[#b81d24] focus:ring-[#b81d24] disabled:opacity-50 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 transition">
                        Ada Ganti Tikar?
                      </span>
                    </label>

                    {(Boolean(activeBalItem.ganti_tikar) || (activeBalItem.potongan_tikar || 0) > 0) && (
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
                    disabled={isActiveBalWeighed || !liveBruto || liveBruto <= 0 || isOverCapacitySB}
                    onClick={handleApplyWeightForActiveBal}
                    className={`px-5 py-2 rounded-xs text-xs font-semibold shadow-2xs flex items-center transition ${
                      isOverCapacitySB 
                        ? 'bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed' 
                        : 'bg-[#b81d24] hover:bg-[#9e161c] text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
                    }`}
                  >
                    {isOverCapacitySB ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                        <span>Bobot Melebihi Toleransi (Maks. 50 kg)</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        <span>Simpan Timbangan</span>
                      </>
                    )}
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

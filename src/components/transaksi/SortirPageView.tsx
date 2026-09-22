import { SearchableSelect } from '../common/SearchableSelect';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Plus,
  Check,
  Trash2,
  Pencil,
  X,
  Layers,
  CheckCircle2,
  Info,
  Clock,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { TransaksiPembelian, Petani, TabelHarga, Barang, TransaksiItemBal, UserRole, User as UserType, SaveTransaksiMeta } from '../../types';
import { formatRupiah, formatNoKupon, formatDateHariBulanTahun, formatNumber, generateTransaksiId, hitungPotonganTaraKg, normalizeKg } from '../../utils/formatters';
import { useSessionDraft } from '../../hooks/useSessionDraft';
import { alasanKuponTerkunciBayar, isTransaksiLunas } from '../../utils/statusBayar';
import { alasanBalSusulanDitolak, buildBarangDariItem, hitungUlangKupon, isBalDitimbang, isKuponProsesSortir, nextBarangId, sortTransaksiItemsByInputOrder } from '../../utils/kuponSortir';
import { isBalTerkirim } from '../../utils/kunciHapus';
import { mintaKonfirmasi, tampilkanInfo } from '../../utils/dialog';
import { POTONGAN_GANTI_TIKAR, POTONGAN_KULI_PER_BAL, POTONGAN_TALI_PER_BAL } from '../../config/aturanTimbang';
import { rekapPerKode, BalRekapInput } from '../../utils/rekapKodeBal';

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
  onAddPetani?: () => void;
  /** Kupon yang langsung dibuka saat halaman ini dibuka dari tombol Edit di Kasir. */
  initialTxId?: string;
  /** Dipanggil setelah initialTxId diproses, agar tidak terpakai lagi saat halaman dibuka ulang. */
  onInitialTxHandled?: () => void;
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
  onAddPetani,
  initialTxId,
  onInitialTxHandled,
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
  const [petugasSortirNama] = useState(currentUser?.nama_lengkap || 'Sistem');

  // Kupon terbuka: tersimpan sejak bal pertama discan sehingga Timbangan di komputer
  // lain bisa langsung menimbang, walaupun sortir kupon ini belum selesai.
  const [openTxId, setOpenTxId, resetOpenTxId] = useSessionDraft<string>('sortir_open_tx_id', draftUserId, '');
  // Mode edit kupon: kupon yang sortirnya sudah ditutup dibuka lagi dari Kasir untuk tambah, ubah, atau hapus bal
  const [susulanMode, setSusulanMode, resetSusulanMode] = useSessionDraft<boolean>('sortir_susulan', draftUserId, false);
  const openTx = useMemo(() => {
    if (!openTxId) return undefined;
    const tx = transaksiList.find((t) => t.transaksi_id === openTxId);
    if (!tx) return undefined;
    // Kupon yang sudah dibayar di Kasir terkunci, apa pun tahap sortirnya
    if (alasanKuponTerkunciBayar(tx)) return undefined;
    if (isKuponProsesSortir(tx)) return tx;
    return susulanMode && !alasanBalSusulanDitolak(tx) ? tx : undefined;
  }, [openTxId, susulanMode, transaksiList]);
  const isSusulan = Boolean(openTx) && !isKuponProsesSortir(openTx);
  const balItems: TransaksiItemBal[] = openTx?.items || [];
  /** Tampil Sortir: bal terbaru di atas (kebalikan urutan input kronologis). */
  const balItemsTampil = useMemo(
    () => [...sortTransaksiItemsByInputOrder(balItems)].reverse(),
    [balItems]
  );

  // Kupon ditutup atau dibayar dari tempat lain: lepaskan kupon ini dari layar Sortir.
  // Jangan reset saat kupon belum muncul di list (sedang commit lokal / sync).
  useEffect(() => {
    if (!openTxId || openTx) return;
    const tx = transaksiList.find((t) => t.transaksi_id === openTxId);
    if (!tx) return;
    const alasan = alasanBalSusulanDitolak(tx);
    if (alasan && (susulanMode || isKuponProsesSortir(tx))) {
      // Kupon dibayar di Kasir saat sedang dibuka di sini
      resetFormKuponBaru(tx.no_kupon);
      setScanFeedback({ text: alasan, isError: true });
    } else if (!isKuponProsesSortir(tx)) {
      resetOpenTxId();
      resetSusulanMode();
    }
  }, [openTxId, openTx, susulanMode, transaksiList]);

  // Dibuka dari Kasir lewat tombol Edit: langsung buka kupon yang dipilih
  useEffect(() => {
    if (!initialTxId) return;
    const tx = transaksiList.find((t) => t.transaksi_id === initialTxId);
    onInitialTxHandled?.();
    if (!tx) return;
    const alasan = alasanBalSusulanDitolak(tx);
    if (alasan) {
      setScanFeedback({ text: alasan, isError: true });
      return;
    }
    handleLanjutkanKupon(tx);
  }, [initialTxId]);

  // Kupon proses sortir lain yang bisa dilanjutkan (mis. setelah browser ditutup)
  const kuponBelumSelesai = useMemo(
    () => transaksiList.filter((t) => isKuponProsesSortir(t) && !alasanKuponTerkunciBayar(t) && t.transaksi_id !== openTxId),
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

  // Inline edit bal di grid tabel
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editNoBal, setEditNoBal] = useState<string>('');
  const [editGrade, setEditGrade] = useState<string>('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  

  // Compute bal suggestions for Sortir
  
  // Active farmers list
  const activeFarmers = useMemo(() => {
    return petaniList.filter((p) => p.status_aktif !== false);
  }, [petaniList]);

  // Auto-select petani baru yang baru didaftarkan lewat "+ Petani Baru".
  // Tidak auto-pilih petani pertama secara default agar operator wajib memilih sendiri.
  const prevPetaniLenRef = useRef(petaniList.length);
  useEffect(() => {
    if (petaniList.length > prevPetaniLenRef.current && !openTx && activeFarmers.length > 0) {
      setSelectedPetaniId(activeFarmers[0].petani_id);
    }
    prevPetaniLenRef.current = petaniList.length;
  }, [activeFarmers, petaniList.length, openTx]);

  // Rekap jumlah bal yang sudah masuk sortir per kode bal (SB, HF, dst.), lintas semua kupon.
  const rekapKodeMasuk = useMemo(() => {
    const rows: BalRekapInput[] = [];
    transaksiList.forEach((tx) => {
      const status_bayar = isTransaksiLunas(tx) ? 'lunas' : 'belum_lunas';
      if (tx.items && tx.items.length > 0) {
        tx.items.forEach((it) => {
          if (!it.no_bal) return;
          rows.push({
            no_bal: it.no_bal,
            berat_kg: it.berat_kg,
            berat_bruto_kg: it.berat_bruto_kg,
            harga_per_kg: it.harga_per_kg,
            status_bayar,
            petani_id: tx.petani_id,
            nama_petani: tx.nama_petani,
          });
        });
      } else if (tx.no_bal) {
        rows.push({
          no_bal: tx.no_bal,
          berat_kg: tx.berat_kg,
          harga_per_kg: tx.harga_per_kg,
          status_bayar,
          petani_id: tx.petani_id,
          nama_petani: tx.nama_petani,
        });
      }
    });
    return rekapPerKode(rows);
  }, [transaksiList]);

  

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
    const code = (gradeCode || '').trim();
    setSelectedGrade(code);
    const found = hargaList.find((h) => h.kode_grade === code && h.status === 'aktif')
      || hargaList.find((h) => h.kode_grade === code);
    if (found) {
      setHargaSatuan(found.harga_per_kg);
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

    const isValidGrade = hargaList.some(
      (h) => h.kode_grade === selectedGrade && (!h.status || h.status === 'aktif')
    );
    if (!isValidGrade) {
      document.getElementById('grade-input')?.focus();
      setScanFeedback({
        text: hargaList.length === 0
          ? 'Master Harga Beli kosong. Tambah grade di menu Master Harga Beli terlebih dahulu.'
          : `Gagal: Mutu Barang (Grade) "${selectedGrade}" tidak aktif / tidak terdaftar di Master Harga Beli!`,
        isError: true,
      });
      return;
    }

    // Kupon yang sedang dibuka belum/tidak lagi tersedia: jangan diam-diam membuat kupon baru
    if (!openTx && openTxId) {
      setScanFeedback({ text: 'Kupon yang dibuka belum termuat atau sudah tidak tersedia. Tunggu sebentar lalu ulangi.', isError: true });
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

    const tara = hitungPotonganTaraKg(0, isGantiTikar, cleanedBalCode, selectedGrade);
    const potTikar = isGantiTikar ? POTONGAN_GANTI_TIKAR : 0;
    const potKuli = POTONGAN_KULI_PER_BAL;
    const potTali = POTONGAN_TALI_PER_BAL;
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
        // Kupon baru selalu kredit sampai dibayar di Kasir
        status_pembayaran: 'belum_lunas',
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
      isSusulan
        ? {
            audit: {
              aksi: 'TAMBAH_BAL_SUSULAN',
              deskripsi: `Bal ${cleanedBalCode} (Grade ${selectedGrade}) ditambahkan ke Kupon ${updatedTx.no_kupon} (${updatedTx.nama_petani}) saat edit kupon, sebelum dibayar`,
            },
          }
        : openTx
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
      text: `Bal "${cleanedBalCode}" (Grade ${selectedGrade}) tersimpan di Kupon ${updatedTx.no_kupon}.`,
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

    const handleStartEdit = (item: TransaksiItemBal) => {
    setEditingItemId(item.item_id);
    setEditNoBal(item.no_bal);
    setEditGrade(item.kode_grade);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditNoBal('');
    setEditGrade('');
  };

  const handleSaveEdit = (item: TransaksiItemBal) => {
    if (!openTx) return;

    const cleanedNoBal = editNoBal.trim().replace(/-/g, '').toUpperCase();
    if (!cleanedNoBal) {
      setScanFeedback({ text: 'Nomor bal tidak boleh kosong!', isError: true });
      return;
    }

    // Jika nomor bal berubah, cek duplikasi di kupon ini maupun di inventaris gudang
    if (cleanedNoBal !== item.no_bal.toUpperCase()) {
      if (balItems.some((b) => b.item_id !== item.item_id && b.no_bal.toUpperCase() === cleanedNoBal)) {
        setScanFeedback({ text: `Gagal: Nomor bal "${cleanedNoBal}" sudah digunakan pada kupon ini!`, isError: true });
        return;
      }
      if (barangList.some((b) => b.barang_id !== item.barang_id && (b.no_bal || b.barang_id || '').toUpperCase() === cleanedNoBal)) {
        setScanFeedback({ text: `Gagal: Nomor bal "${cleanedNoBal}" sudah ada di master data inventaris!`, isError: true });
        return;
      }
    }

    const trimmedGrade = editGrade.trim();
    if (!trimmedGrade) {
      setScanFeedback({ text: 'Mutu grade tidak boleh kosong!', isError: true });
      return;
    }

    const foundGrade = hargaList.find((h) => h.kode_grade === trimmedGrade && (!h.status || h.status === 'aktif'))
      || hargaList.find((h) => h.kode_grade === trimmedGrade);

    if (!foundGrade) {
      setScanFeedback({ text: `Grade "${trimmedGrade}" tidak valid atau tidak terdaftar di Master Harga Beli!`, isError: true });
      return;
    }

    const newHarga = foundGrade.harga_per_kg;
    const newTara = hitungPotonganTaraKg(item.berat_bruto_kg || 0, item.ganti_tikar, cleanedNoBal, trimmedGrade);
    const newNetto = (item.berat_kg || 0) > 0
      ? (item.is_netto_manual ? item.berat_kg : Math.max(0, normalizeKg((item.berat_bruto_kg || 0) - newTara)))
      : 0;
    const totalKotor = Math.round(newNetto * newHarga);
    const subtotalBersih = Math.round(Math.max(0, totalKotor - (item.potongan || 0)));

    const updatedItem: TransaksiItemBal = {
      ...item,
      no_bal: cleanedNoBal,
      barcode: (!item.barcode || item.barcode === item.no_bal) ? cleanedNoBal : item.barcode,
      kode_grade: trimmedGrade,
      harga_per_kg: newHarga,
      potongan_tara_kg: newTara,
      berat_kg: newNetto,
      total_kotor: totalKotor,
      subtotal_bersih: subtotalBersih,
      diubah_lokal_pada: Date.now(),
    };

    const nextItems = balItems.map((b) => (b.item_id === item.item_id ? updatedItem : b));
    const updatedTx = hitungUlangKupon(openTx, nextItems);

    onSaveTransaksi(
      updatedTx,
      [buildBarangDariItem(updatedTx, updatedItem, barangList.find((b) => b.barang_id === updatedItem.barang_id))],
      {
        timpaPenuh: true,
        audit: {
          aksi: 'SORTIR_EDIT_BAL',
          deskripsi: `Koreksi bal Kupon ${openTx.no_kupon}: Bal "${item.no_bal}" (Grade ${item.kode_grade}) diubah menjadi "${cleanedNoBal}" (Grade ${trimmedGrade})`,
        },
      }
    );

    setEditingItemId(null);
    setEditNoBal('');
    setEditGrade('');
    setScanFeedback({
      text: `Bal "${cleanedNoBal}" diperbarui (Grade ${trimmedGrade} • ${formatRupiah(newHarga)}/kg).`,
      isError: false,
    });
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!openTx) return;
    const item = balItems.find((it) => it.item_id === itemId);
    if (!item) return;
    // Bal yang sudah dikirim lewat Surat Jalan tidak boleh hilang dari kupon
    const balGudang = barangList.find((b) => (item.barang_id && b.barang_id === item.barang_id) || b.no_bal === item.no_bal);
    if (balGudang && isBalTerkirim(balGudang)) {
      setScanFeedback({ text: `Bal "${item.no_bal}" sudah dikirim lewat Surat Jalan sehingga tidak bisa dihapus dari kupon.`, isError: true });
      return;
    }
    if (isBalDitimbang(item)) {
      if (!isSusulan) {
        // Saat sortir masih berjalan, hasil timbang tidak boleh hilang karena perubahan di Sortir
        setScanFeedback({
          text: `Bal "${item.no_bal}" sudah ditimbang (${formatNumber(item.berat_kg)} kg) sehingga tidak bisa dihapus dari Sortir.`,
          isError: true,
        });
        return;
      }
      const setuju = await mintaKonfirmasi(
        `Bal ${item.no_bal} sudah ditimbang (${formatNumber(item.berat_kg)} kg). Hapus dari Kupon ${openTx.no_kupon}? Hasil timbangnya ikut terhapus.`,
        { judul: 'Hapus Bal yang Sudah Ditimbang', teksOk: 'Ya, Hapus Bal', varian: 'danger' }
      );
      if (!setuju) return;
    }
    if (isSusulan && balItems.length <= 1) {
      setScanFeedback({
        text: `Kupon ${openTx.no_kupon} harus memiliki minimal 1 bal. Untuk membatalkan seluruh kupon, gunakan tombol hapus di menu Kasir.`,
        isError: true,
      });
      return;
    }
    const updatedTx = hitungUlangKupon(openTx, balItems.filter((it) => it.item_id !== itemId));
    onSaveTransaksi(updatedTx, [], {
      timpaPenuh: true,
      audit: {
        aksi: 'SORTIR_HAPUS_BAL',
        deskripsi: `Bal ${item.no_bal} (Grade ${item.kode_grade}${isBalDitimbang(item) ? `, ${item.berat_kg} kg` : ''}) dihapus dari Kupon ${openTx.no_kupon} ${isSusulan ? 'saat edit kupon' : 'saat sortir'}`,
      },
    });
    setScanFeedback({ text: `Bal "${item.no_bal}" dihapus dari Kupon ${openTx.no_kupon}.`, isError: false });
  };

  // Siapkan form untuk kupon berikutnya
  const resetFormKuponBaru = (kuponTerakhir: string) => {
    resetOpenTxId();
    resetSusulanMode();
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
      tampilkanInfo('Tambahkan minimal 1 bal tembakau sebelum menyelesaikan sortir.');
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
  const handleBatalkanKupon = async () => {
    if (!openTx || !onDeleteTransaksi) return;
    if (balItems.some(isBalDitimbang)) {
      tampilkanInfo(`Kupon ${openTx.no_kupon} tidak bisa dibatalkan karena sebagian bal sudah ditimbang. Hapus bal yang belum ditimbang satu per satu, atau selesaikan sortir.`);
      return;
    }
    const setuju = await mintaKonfirmasi(`Batalkan Kupon ${openTx.no_kupon}? ${balItems.length} bal pada kupon ini akan dihapus.`, {
      judul: 'Batalkan Kupon',
      teksOk: 'Ya, Batalkan Kupon',
      varian: 'danger',
    });
    if (!setuju) return;
    onDeleteTransaksi(openTx.transaksi_id, 'Kupon dibatalkan dari Sortir sebelum selesai');
    resetOpenTxId();
    setScanFeedback({ text: `Kupon ${openTx.no_kupon} dibatalkan.`, isError: false });
  };

  // Melanjutkan kupon proses sortir yang belum ditutup
  // Kupon yang sortirnya sudah ditutup dibuka dalam mode bal susulan
  const handleLanjutkanKupon = (tx: TransaksiPembelian) => {
    const alasanTerkunci = alasanKuponTerkunciBayar(tx);
    if (alasanTerkunci) {
      setScanFeedback({ text: alasanTerkunci, isError: true });
      return;
    }
    const susulan = !isKuponProsesSortir(tx);
    setOpenTxId(tx.transaksi_id);
    setSusulanMode(susulan);
    setNoKupon(tx.no_kupon);
    setSelectedPetaniId(tx.petani_id);
    setTanggal((tx.tanggal_transaksi || '').split(' ')[0] || tanggal);
    setInputNoBal('');
    setSelectedGrade('');
    setHargaSatuan(0);
    setIsGantiTikar(false);
    setSaveSuccessMsg(null);
    setScanFeedback({
      text: susulan
        ? `Kupon ${tx.no_kupon} dibuka untuk diedit (${(tx.items || []).length} bal). Bal baru langsung bisa ditimbang.`
        : `Melanjutkan sortir Kupon ${tx.no_kupon} (${(tx.items || []).length} bal).`,
      isError: false,
    });
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  // Menutup mode edit kupon. Setiap perubahan sudah tersimpan otomatis, jadi tidak ada yang perlu disimpan lagi.
  const handleSelesaiSusulan = () => {
    if (!openTx) return;
    const menungguTimbang = balItems.filter((it) => !isBalDitimbang(it)).length;
    setSaveSuccessMsg(
      menungguTimbang > 0
        ? `Edit Kupon ${openTx.no_kupon} selesai. ${menungguTimbang} bal menunggu ditimbang di modul Timbangan, setelah itu kupon bisa dibayar di Kasir.`
        : `Edit Kupon ${openTx.no_kupon} selesai. Seluruh bal sudah ditimbang, kupon siap dibayar di Kasir.`
    );
    resetFormKuponBaru(openTx.no_kupon);
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

      {/* Mode edit kupon: kupon yang sortirnya sudah selesai dibuka lagi (dari Kasir) untuk tambah, ubah, atau hapus bal */}
      {isSusulan && openTx && (
        <div className="bg-amber-50 border border-amber-300 px-3.5 py-2.5 rounded-sm flex items-center space-x-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-900 font-bold">
            Mode Edit Kupon • <span className="font-mono">{openTx.no_kupon}</span> • {openTx.nama_petani}
          </p>
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">Input Sortir</h3>
          </div>
          <div className="flex items-center gap-2">
            {openTx && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xs text-[10px] font-bold">
                {isSusulan ? 'Edit Kupon' : 'Kupon'} {openTx.no_kupon} terbuka
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
                  1. No. Kupon Antrian <span className="text-red-500">*</span>
                </label>
                {isKuponExists && (
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 border border-red-200 rounded-2xs">
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
                className={`w-full bg-white border rounded-sm px-3 py-1.5 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed ${isKuponExists ? 'border-red-500 focus:border-red-600 focus:ring-red-600 ring-1 ring-red-200 bg-red-50/40' : 'border-slate-300 focus:border-slate-800 focus:ring-slate-800'}`}
                placeholder="No. kupon"
                required
              />
              {isKuponExists && duplicateKuponTx ? (
                <div className="mt-1 p-2 bg-red-50 border border-red-300 rounded-xs text-[11px] text-red-950 space-y-1.5 shadow-2xs">
                  <div className="flex items-center space-x-1.5 font-bold text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>Kupon Sudah Terdaftar!</span>
                  </div>
                  <p className="leading-tight text-[10px] text-red-900">
                    Kupon <strong className="font-mono">{noKupon}</strong> sudah dipakai (Petani: <strong>{duplicateKuponTx.nama_petani}</strong>).
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateNextKupon}
                    className="inline-flex items-center space-x-1 text-[10px] font-bold text-white bg-[#b81d24] hover:bg-red-800 px-2 py-0.5 rounded-xs transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Pakai Nomor Berikutnya</span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* 2. Petani Penyetor */}
            <div className="sm:col-span-1 md:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  2. Petani Penyetor <span className="text-red-500">*</span>
                </label>
                {onAddPetani && !openTx && (
                  <button
                    type="button"
                    onClick={onAddPetani}
                    className="text-[10px] text-[#b81d24] hover:text-[#90161b] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                    title="Tambah pendaftaran petani baru"
                  >
                    + Petani Baru
                  </button>
                )}
              </div>
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
                3. Tanggal Masuk <span className="text-red-500">*</span>
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
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Input Bal</h4>
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 md:grid-cols-2 gap-3 items-end">
              
              {/* No Bal Input */}
              <div className="lg:col-span-3 relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  No Bal <span className="text-red-500">*</span>
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
                    placeholder={getNextSuggestedNoBal().replace(/-/g, '')}
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
                  Mutu Barang <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  inputId="grade-input"
                  value={selectedGrade}
                  onChange={(val) => handleGradeChange(val)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (selectedGrade && hargaList.some((h) => h.kode_grade === selectedGrade && (!h.status || h.status === 'aktif'))) {
                        handleAddBalItem();
                      }
                    }
                  }}
                  options={hargaList
                    .filter((h) => !h.status || h.status === 'aktif')
                    .map((h) => ({
                      value: h.kode_grade,
                      label: `Grade ${h.kode_grade} — ${formatRupiah(h.harga_per_kg)}/kg`,
                    }))}
                  placeholder="Pilih / ketik kode mutu"
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
                scanFeedback.isError ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}>
                <span>{scanFeedback.text}</span>
              </div>
            )}

          </div>

          {/* Bal Items Table for Current Batch */}
          <div className="space-y-2">
            {rekapKodeMasuk.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-500 font-medium">Sudah Masuk Sortir:</span>
                {rekapKodeMasuk.map((r) => (
                  <span
                    key={r.kode}
                    className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xs font-semibold"
                  >
                    {r.kode}: {r.total} Bal
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                <span>Daftar Bal</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-xs text-[10px] font-semibold">
                  {balItems.length} Bal
                </span>
              </h4>
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
                  {balItemsTampil.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700 text-xs">Belum ada bal</p>
                      </td>
                    </tr>
                  ) : (
                    balItemsTampil.map((item, index) => {
                      const ditimbang = isBalDitimbang(item);
                      const isEditing = editingItemId === item.item_id;
                      return (
                      <tr 
                        key={item.item_id || index} 
                        className={`transition-colors ${isEditing ? 'bg-amber-50/50' : 'hover:bg-slate-50/80'}`}
                      >
                        <td className="py-2.5 px-3.5 text-center font-mono text-slate-500">
                          {balItemsTampil.length - index}
                        </td>
                        <td className="py-2 px-3.5">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editNoBal}
                              onChange={(e) => setEditNoBal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSaveEdit(item);
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCancelEdit();
                                }
                              }}
                              autoFocus
                              className="w-full max-w-[140px] bg-white border border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none shadow-2xs"
                              placeholder="No Bal..."
                            />
                          ) : (
                            <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 border border-slate-200 rounded text-xs">
                              {item.no_bal}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3.5">
                          {isEditing ? (
                            <select
                              value={editGrade}
                              onChange={(e) => setEditGrade(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSaveEdit(item);
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCancelEdit();
                                }
                              }}
                              className="w-full max-w-[180px] bg-white border border-slate-300 focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] rounded px-2 py-1 text-xs font-medium text-slate-900 focus:outline-none shadow-2xs"
                            >
                              {hargaList
                                .filter((h) => !h.status || h.status === 'aktif' || h.kode_grade === editGrade)
                                .map((h) => (
                                  <option key={h.kode_grade} value={h.kode_grade}>
                                    Grade {h.kode_grade} ({formatRupiah(h.harga_per_kg)}/kg)
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 font-medium rounded text-[11px]">
                              Grade {item.kode_grade}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-medium text-slate-800">
                          {isEditing ? (
                            (() => {
                              const previewH = hargaList.find((h) => h.kode_grade === editGrade)?.harga_per_kg || item.harga_per_kg;
                              return (
                                <span className="text-emerald-700 font-semibold">
                                  {formatRupiah(previewH)}/kg
                                </span>
                              );
                            })()
                          ) : (
                            `${formatRupiah(item.harga_per_kg)}/kg`
                          )}
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
                          {isEditing ? (
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(item)}
                                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                title="Simpan Perubahan (Enter)"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Batal Edit (Esc)"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Edit Nomor Bal & Mutu Grade"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.item_id)}
                                disabled={ditimbang && !isSusulan}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                title={ditimbang && !isSusulan ? 'Bal sudah ditimbang, tidak bisa dihapus dari Sortir' : 'Hapus bal ini dari kupon'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
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
              {!isSusulan && (
                <button
                  type="button"
                  onClick={handleBatalkanKupon}
                  disabled={!openTx || balItems.some(isBalDitimbang)}
                  title={balItems.some(isBalDitimbang) ? 'Kupon yang sudah ada bal tertimbang tidak bisa dibatalkan' : 'Hapus kupon ini beserta seluruh balnya'}
                  className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs rounded-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batalkan Kupon
                </button>
              )}

              <button
                type="button"
                onClick={isSusulan ? handleSelesaiSusulan : handleSelesaiSortir}
                disabled={!openTx || balItems.length === 0}
                title={isSusulan
                  ? 'Tutup mode edit kupon. Bal baru ditimbang di Timbangan, lalu kupon dibayar di Kasir.'
                  : 'Tutup kupon. Kupon bisa dibayar di Kasir setelah semua bal ditimbang.'}
                className="flex-1 sm:flex-none px-4 py-2 bg-[#b81d24] hover:bg-[#b81d24] text-white font-medium text-xs rounded-sm transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{isSusulan ? 'Selesai Edit' : 'Selesai Sortir'}</span>
              </button>

              
            </div>
          </div>

        </div>
      </div>

      </div>
  );
};

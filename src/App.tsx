import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Petani, 
  Barang, 
  TabelHarga, 
  TransaksiPembelian,
  PengirimanBarang,
  User,
  UserRole,
  MasterHargaJual,
  BatchPengirimanSample,
  SaveTransaksiMeta
} from './types';
import { 
  loadPetaniData, 
  savePetaniData, 
  loadBarangData, 
  saveBarangData,
  loadHargaData, 
  saveHargaData,
  loadHargaJualData,
  saveHargaJualData,
  loadTransaksiData, 
  saveTransaksiData,
  loadBatchSampleData,
  saveBatchSampleData,
  loadPengirimanData, 
  savePengirimanData,
  loadUserData, 
  saveUserData,
  loadCurrentUser, 
  saveCurrentUser,
  recordAuditLog,
  STORAGE_KEY_BARANG,
  STORAGE_KEY_TRANSAKSI,
  STORAGE_KEY_PETANI
} from './utils/storage';
import { mergeKuponParalel, normalizeStatusBal, resolveStatusStok } from './utils/kuponSortir';
import { filterBarangLunas } from './utils/statusBayar';
import { barisSampleDariBatch } from './utils/statusBatchSample';
import { balTerkirimDariTransaksi, isSuratJalanTerkunci, pesanSuratJalanTerkunci, pesanTransaksiTerkunci } from './utils/kunciHapus';
import {
  cariSuratJalanBentrok,
  keluarkanBal,
  kembalikanBalKeGudang,
  masukkanBalKeMuatan,
  LABEL_STATUS_PENGIRIMAN,
  sesuaikanBatchSetelahPerubahanDO,
} from './utils/alurPengiriman';
import { clearAllDrafts, getDraftRecovery, markDraftCleanExit, touchDraftAlive } from './utils/draftStorage';
import { hasModuleAccess } from './utils/rbac';
import { antrianSinkron } from './services/antrianSinkron';
import { normalizeKg, generatePetaniId } from './utils/formatters';
import { hashPassword } from './utils/crypto';
import { POTONGAN_GANTI_TIKAR } from './config/aturanTimbang';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';

// Auth Login View
import { LoginView } from './components/auth/LoginView';
import { ErpApiService } from './services/erpApi';
import { antrianMutasi } from './services/antrianMutasi';
import { catatMutasi, catatStatusBal, handlerMutasi, kirimPetani, serverAktif } from './services/kirimMutasi';
import {
  overlayBarang,
  overlayBatchSample,
  overlayHargaBeli,
  overlayHargaJual,
  overlayPengiriman,
  overlayPetani,
  overlayTransaksi,
  overlayUser,
} from './services/overlayDaftar';
import type { HasilBatchSample } from './services/kirimMutasi';

import { HomeDashboardView } from './components/home/HomeDashboardView';
import { PetaniFormModal } from './components/petani/PetaniFormModal';
import { PetaniCardPrintModal } from './components/petani/PetaniCardPrintModal';
import { PetaniDetailDrawer } from './components/petani/PetaniDetailDrawer';
import { PetaniDeactivateModal } from './components/petani/PetaniDeactivateModal';
import { PetaniResetCardModal } from './components/petani/PetaniResetCardModal';
import { PetaniImportExportModal } from './components/petani/PetaniImportExportModal';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { lazyNamed } from './utils/lazyHalaman';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { MemuatHalaman } from './components/common/MemuatHalaman';

// Setiap menu diunduh saat pertama dibuka, sehingga halaman login dan Beranda tidak memuat kode laporan, PDF, dan grafik.
const UserManagement = lazyNamed(() => import('./components/user/UserManagement'), 'UserManagement');
const DashboardAnalyticView = lazyNamed(() => import('./components/laporan/DashboardAnalyticView'), 'DashboardAnalyticView');
const LaporanBalView = lazyNamed(() => import('./components/laporan/LaporanBalView'), 'LaporanBalView');
const LaporanGradeView = lazyNamed(() => import('./components/laporan/LaporanGradeView'), 'LaporanGradeView');
const LaporanPembelianBarangView = lazyNamed(() => import('./components/laporan/LaporanPembelianBarangView'), 'LaporanPembelianBarangView');
const LaporanPetaniView = lazyNamed(() => import('./components/laporan/LaporanPetaniView'), 'LaporanPetaniView');
const LaporanPengirimanView = lazyNamed(() => import('./components/laporan/LaporanPengirimanView'), 'LaporanPengirimanView');
const PetaniTable = lazyNamed(() => import('./components/petani/PetaniTable'), 'PetaniTable');
const HargaManagement = lazyNamed(() => import('./components/harga/HargaManagement'), 'HargaManagement');
const SortirPageView = lazyNamed(() => import('./components/transaksi/SortirPageView'), 'SortirPageView');
const TimbanganPageView = lazyNamed(() => import('./components/transaksi/TimbanganPageView'), 'TimbanganPageView');
const KasirPageView = lazyNamed(() => import('./components/transaksi/KasirPageView'), 'KasirPageView');
const PengirimanManagement = lazyNamed(() => import('./components/pengiriman/PengirimanManagement'), 'PengirimanManagement');
const SampleManagement = lazyNamed(() => import('./components/sample/SampleManagement'), 'SampleManagement');
const StatusBatchPengirimanManagement = lazyNamed(() => import('./components/pengiriman/StatusBatchPengirimanManagement'), 'StatusBatchPengirimanManagement');
const HargaJualManagement = lazyNamed(() => import('./components/harga_jual/HargaJualManagement'), 'HargaJualManagement');
const DedicatedPrintView = lazyNamed(() => import('./components/print/DedicatedPrintView'), 'DedicatedPrintView');

export default function App() {
  // Check URL params for standalone print route (e.g. ?cetak=nota&id=... or ?cetak=surat_jalan&id=...)
  const [printParam, setPrintParam] = useState<{
    type: 'nota' | 'surat_jalan' | 'sample' | 'bon_produksi';
    id: string;
  } | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const cetakType = urlParams.get('cetak');
      const id = urlParams.get('id') || urlParams.get('no_transaksi');
      if (
        (cetakType === 'nota' ||
          cetakType === 'surat_jalan' ||
          cetakType === 'sample' ||
          cetakType === 'bon_produksi') &&
        id
      ) {
        return { type: cetakType, id };
      }
    } catch {}
    return null;
  });

  // State for in-app fallback print view (when window.open is blocked by browser iframe)
  const [embeddedPrintDoc, setEmbeddedPrintDoc] = useState<{
    type: 'nota' | 'surat_jalan' | 'sample' | 'bon_produksi';
    id: string;
  } | null>(null);

  // Global event listener for print requests across modules
  useEffect(() => {
    const handlePrintEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{
        type: 'nota' | 'surat_jalan' | 'sample' | 'bon_produksi';
        id: string;
      }>;
      if (customEvt.detail) {
        setEmbeddedPrintDoc(customEvt.detail);
      }
    };
    window.addEventListener('erp-open-print-doc', handlePrintEvent);
    return () => window.removeEventListener('erp-open-print-doc', handlePrintEvent);
  }, []);

  // User Authentication & RBAC States
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadCurrentUser());
  const [userList, setUserList] = useState<User[]>(() => loadUserData());

  // Navigation Menu Focus Mode (Hide / Show Sidebar)
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sms_sidebar_hidden');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Reaktif simpan status isSidebarHidden ke localStorage setiap kali state berubah
  useEffect(() => {
    try {
      localStorage.setItem('sms_sidebar_hidden', isSidebarHidden ? 'true' : 'false');
    } catch (err) {
      console.warn('Gagal menyimpan status sidebar ke localStorage:', err);
    }
  }, [isSidebarHidden]);

  // Listener untuk sinkronisasi antar tab/window secara otomatis
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sms_sidebar_hidden' && e.newValue !== null) {
        setIsSidebarHidden(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [isHoverPeek, setIsHoverPeek] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleMouseEnterToggle = () => {
    if (isSidebarHidden) {
      clearHoverTimeout();
      setIsHoverPeek(true);
    }
  };

  const handleMouseLeaveToggle = () => {
    if (isSidebarHidden) {
      clearHoverTimeout();
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHoverPeek(false);
      }, 300);
    }
  };

  const handleMouseEnterSidebar = () => {
    if (isSidebarHidden) {
      clearHoverTimeout();
      setIsHoverPeek(true);
    }
  };

  const handleMouseLeaveSidebar = () => {
    if (isSidebarHidden) {
      clearHoverTimeout();
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHoverPeek(false);
      }, 250);
    }
  };

  const handleToggleSidebar = () => {
    clearHoverTimeout();
    setIsHoverPeek(false);
    setIsSidebarHidden((prev) => !prev);
  };

  // ERP State collections
  const [petaniList, setPetaniList] = useState<Petani[]>(() => loadPetaniData());
  const [barangList, setBarangList] = useState<Barang[]>(() => normalizeStatusBal(loadBarangData()));
  const [hargaList, setHargaList] = useState<TabelHarga[]>(() => loadHargaData());
  const [transaksiList, setTransaksiList] = useState<TransaksiPembelian[]>(() => loadTransaksiData());
  const [pengirimanList, setPengirimanList] = useState<PengirimanBarang[]>(() => loadPengirimanData());
  const [hargaJualList, setHargaJualList] = useState<MasterHargaJual[]>(() => loadHargaJualData());
  const [batchSampleList, setBatchSampleList] = useState<BatchPengirimanSample[]>(() => loadBatchSampleData());
  // Baris sample per bal untuk laporan, diturunkan dari batch sample (tersimpan di server)
  const sampleRows = useMemo(() => barisSampleDariBatch(batchSampleList), [batchSampleList]);
  const [selectedBatchIdForShipment, setSelectedBatchIdForShipment] = useState<string>('');
  // Surat Jalan yang sedang diedit di halaman Pengiriman Reguler (dipilih dari Status Pengiriman)
  const [editPengirimanId, setEditPengirimanId] = useState<string | null>(null);
  // Batch sample yang sedang diedit di halaman Pengiriman Sample (dipilih dari Status & Detail Batch)
  const [editBatchId, setEditBatchId] = useState<string | null>(null);
  

  const [activeModuleId, setActiveModuleId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('erp_tembakau_active_module');
      return saved || 'modul-home';
    } catch {
      return 'modul-home';
    }
  });

  useEffect(() => {
    try {
      if (activeModuleId) {
        localStorage.setItem('erp_tembakau_active_module', activeModuleId);
      }
    } catch {
      // ignore
    }
  }, [activeModuleId]);

  // Sinkronisasi data riil dari backend PostgreSQL (login + saat buka modul laporan)
  const refreshOperationalLists = useCallback(async () => {
    if (!currentUser) return { fromBackend: false };

    const [
      petaniRes,
      barangRes,
      transaksiRes,
      hargaRes,
      userRes,
      hargaJualRes,
      batchRes,
      pengirimanRes,
    ] = await Promise.all([
      ErpApiService.getPetaniList(),
      ErpApiService.getBarangList(),
      ErpApiService.getTransaksiList(),
      ErpApiService.getHargaList(),
      ErpApiService.getUserList(),
      ErpApiService.getHargaJualList(),
      ErpApiService.getBatchSampleList(),
      ErpApiService.getPengirimanList(),
    ]);

    // Memuat semua daftar bisa makan beberapa detik. Perubahan yang dibuat operator selama menunggu (centang ganti
    // tikar, hapus batch, edit petani) sudah ada di antrean tetapi belum tentu ada di daftar yang baru tiba, jadi
    // antrean diterapkan LAGI tepat sebelum daftar dipasang ke layar.
    let fromBackend = false;
    if (petaniRes.fromBackend) {
      const daftar = overlayPetani(petaniRes.data);
      setPetaniList(daftar);
      savePetaniData(daftar);
      fromBackend = true;
    }
    if (barangRes.fromBackend) {
      const daftar = normalizeStatusBal(overlayBarang(barangRes.data));
      setBarangList(daftar);
      saveBarangData(daftar);
      fromBackend = true;
    }
    if (transaksiRes.fromBackend) {
      const daftar = overlayTransaksi(transaksiRes.data);
      setTransaksiList(daftar);
      saveTransaksiData(daftar);
      fromBackend = true;
    }
    if (hargaRes.fromBackend) {
      const daftar = overlayHargaBeli(hargaRes.data);
      setHargaList(daftar);
      saveHargaData(daftar);
      fromBackend = true;
    }
    if (userRes.fromBackend) {
      const daftar = overlayUser(userRes.data);
      setUserList(daftar);
      saveUserData(daftar);
      fromBackend = true;
    }
    if (hargaJualRes.fromBackend) {
      const daftar = overlayHargaJual(hargaJualRes.data);
      setHargaJualList(daftar);
      saveHargaJualData(daftar);
      fromBackend = true;
    }
    if (batchRes.fromBackend) {
      const daftar = overlayBatchSample(batchRes.data);
      setBatchSampleList(daftar);
      saveBatchSampleData(daftar);
      fromBackend = true;
    }
    if (pengirimanRes.fromBackend) {
      const daftar = overlayPengiriman(pengirimanRes.data);
      setPengirimanList(daftar);
      savePengirimanData(daftar);
      fromBackend = true;
    }
    return { fromBackend };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      void refreshOperationalLists();
    }
  }, [currentUser, refreshOperationalLists]);

  // Antrean sinkron kupon: mengirim ulang simpanan yang tertinggal (juga dari sesi sebelumnya) sampai berhasil
  useEffect(() => {
    if (!currentUser) return;
    antrianSinkron.pasang((tx, dasar) => ErpApiService.syncTransaksi(tx, dasar, { tanpaCekKesehatan: true }));
  }, [currentUser]);

  // Antrean perubahan lain (petani, harga, batch sample, Surat Jalan, status bal, kupon dihapus): dikirim ulang sampai
  // berhasil, dan hasil server digabung ke layar begitu tugasnya selesai.
  useEffect(() => {
    if (!currentUser) return;
    antrianMutasi.pasang(handlerMutasi);
    const muatUlangBal = async () => {
      try {
        const res = await ErpApiService.getBarangList();
        if (res.fromBackend) setBarangList(normalizeStatusBal(res.data));
      } catch (err) {
        console.warn('Gagal memuat ulang bal setelah perubahan tersimpan:', err);
      }
    };
    return antrianMutasi.saatSelesai((tugas, hasil) => {
      const kunci = `${tugas.entitas}:${tugas.aksi}`;
      if (kunci === 'batch_sample:simpan') {
        const gabungan = (hasil as HasilBatchSample | undefined)?.gabungan;
        const kirim = tugas.data as BatchPengirimanSample;
        if (gabungan) {
          setBatchSampleList((prev) => {
            const next = prev.map((b) => (b.batch_id === kirim.batch_id || b.kode_batch === kirim.kode_batch ? gabungan : b));
            saveBatchSampleData(next);
            return next;
          });
        }
        void muatUlangBal();
      } else if (kunci === 'pengiriman:simpan') {
        const lama = tugas.data as PengirimanBarang;
        const disimpan = hasil as PengirimanBarang | undefined;
        const idBaru = disimpan?.pengiriman_id || lama.pengiriman_id;
        if (disimpan && tugas.tambahan?.baru === true) {
          setPengirimanList((prev) => {
            const next = prev.map((p) => (p.pengiriman_id === lama.pengiriman_id ? { ...disimpan, pengiriman_id: idBaru } : p));
            savePengirimanData(next);
            return next;
          });
          if (idBaru !== lama.pengiriman_id) {
            setBarangList((prev) => {
              const next = prev.map((b) => (b.pengiriman_id === lama.pengiriman_id ? { ...b, pengiriman_id: idBaru } : b));
              saveBarangData(next);
              return next;
            });
          }
        }
        void muatUlangBal();
      } else if (kunci === 'pengiriman:hapus' || kunci === 'batch_sample:hapus' || kunci === 'transaksi:hapus') {
        void muatUlangBal();
      } else if (kunci === 'petani:simpan') {
        const lama = tugas.data as Petani;
        const disimpan = hasil as Petani | undefined;
        if (disimpan) {
          setPetaniList((prev) => {
            const next = prev.map((p) => (p.petani_id === lama.petani_id ? { ...p, ...disimpan, statistik: p.statistik ?? disimpan.statistik } : p));
            savePetaniData(next);
            return next;
          });
        }
      } else if (kunci === 'harga_beli:simpan') {
        const disimpan = hasil as TabelHarga | undefined;
        if (disimpan?.harga_id) {
          setHargaList((prev) => {
            const next = prev.map((h) => (h.harga_id === (tugas.data as TabelHarga).harga_id ? disimpan : h));
            saveHargaData(next);
            return next;
          });
        }
      } else if (kunci === 'harga_jual:simpan') {
        const disimpan = hasil as MasterHargaJual | undefined;
        if (disimpan?.harga_jual_id) {
          setHargaJualList((prev) => {
            const next = prev.map((h) => (h.harga_jual_id === (tugas.data as MasterHargaJual).harga_jual_id ? disimpan : h));
            saveHargaJualData(next);
            return next;
          });
        }
      }
    });
  }, [currentUser]);

  // Peringatan bila halaman ditutup padahal masih ada simpanan yang belum sampai ke server
  useEffect(() => {
    const peringatan = (e: BeforeUnloadEvent) => {
      if (antrianSinkron.ringkasan().menunggu > 0 || antrianMutasi.ringkasan().menunggu > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', peringatan);
    return () => window.removeEventListener('beforeunload', peringatan);
  }, []);

  const [laporanRefreshing, setLaporanRefreshing] = useState(false);

  // Saat buka modul laporan: refresh list sumber dari BE agar angka tidak usang
  useEffect(() => {
    if (!currentUser || !activeModuleId.startsWith('modul-6-')) return;
    let cancelled = false;
    setLaporanRefreshing(true);
    (async () => {
      try {
        await refreshOperationalLists();
      } finally {
        if (!cancelled) setLaporanRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeModuleId, currentUser, refreshOperationalLists]);

  // Modul terakhir yang dibuka disimpan di peramban. Saat halaman dimuat ulang
  // hak aksesnya diperiksa ulang agar pengguna tidak masuk ke modul terlarang.
  useEffect(() => {
    if (!currentUser) return;
    const isBlocked =
      currentUser.status_aktif === false || !hasModuleAccess(currentUser.role, activeModuleId);
    if (isBlocked && activeModuleId !== 'modul-home') {
      setActiveModuleId('modul-home');
    }
  }, [currentUser, activeModuleId]);
  const [targetKuponNo, setTargetKuponNo] = useState<string | undefined>(undefined);
  const [targetTxId, setTargetTxId] = useState<string | undefined>(undefined);
  const [targetBalNo, setTargetBalNo] = useState<string | undefined>(undefined);
  // Kupon yang dibuka di Sortir lewat tombol Tambah Bal di Kasir; dipakai sekali lalu dikosongkan
  const [targetSortirTxId, setTargetSortirTxId] = useState<string | undefined>(undefined);
  const currentRole: UserRole = currentUser?.role || 'superadmin';

  // Petani Modals & Drawers
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPetani, setEditingPetani] = useState<Petani | null>(null);
  const [viewingPetani, setViewingPetani] = useState<Petani | null>(null);
  const [printingPetani, setPrintingPetani] = useState<Petani | null>(null);
  const [deactivatingPetani, setDeactivatingPetani] = useState<Petani | null>(null);
  const [resettingCardPetani, setResettingCardPetani] = useState<Petani | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [highlightPetaniId, setHighlightPetaniId] = useState<string | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 'info' dipakai untuk pemberitahuan, penolakan, dan kegagalan; tampil dengan ikon peringatan, bukan centang
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), type === 'info' ? 6000 : 3500);
  };

  // Kupon yang dikerjakan paralel (mis. Sortir dan Timbangan di tab/jendela lain)
  // langsung ikut diperbarui begitu tab lain menyimpan perubahan.
  useEffect(() => {
    const handleDataChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_TRANSAKSI) {
        setTransaksiList(loadTransaksiData());
      } else if (e.key === STORAGE_KEY_BARANG) {
        setBarangList(normalizeStatusBal(loadBarangData()));
      } else if (e.key === STORAGE_KEY_PETANI) {
        setPetaniList(loadPetaniData());
      }
    };
    window.addEventListener('storage', handleDataChange);
    return () => window.removeEventListener('storage', handleDataChange);
  }, []);

  // Check RBAC module access whenever activeModuleId or currentUser changes
  const handleSelectModule = (moduleId: string) => {
    if (!currentUser) return;

    if (currentUser.status_aktif === false && moduleId !== 'modul-home') {
      showToast('Akun Anda dinonaktifkan. Silakan hubungi Administrator.', 'info');
      setActiveModuleId('modul-home');
      return;
    }

    if (hasModuleAccess(currentUser.role, moduleId)) {
      setActiveModuleId(moduleId);
    } else {
      showToast(`Akses Ditolak: Role "${currentUser.role}" tidak memiliki wewenang untuk membuka modul ini.`, 'info');
      setActiveModuleId('modul-home');
    }
  };

  const handleSidebarClick = (moduleId: string) => {
    setSelectedBatchIdForShipment('');
    setEditPengirimanId(null);
    setEditBatchId(null);
    setTargetKuponNo(undefined);
    setTargetTxId(undefined);
    setTargetBalNo(undefined);
    if (isSidebarHidden) {
      clearHoverTimeout();
      setIsHoverPeek(false);
    }
    handleSelectModule(moduleId);
  };

  // --- Auth Handlers ---
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    saveCurrentUser(user);
    setUserList(loadUserData());
    setActiveModuleId('modul-home');
    showToast(`Selamat Datang, ${user.nama_lengkap}! Login berhasil.`);
  };

  const handleLogout = (autoLogout: boolean = false) => {
    setCurrentUser(null);
    saveCurrentUser(null);
    clearAllDrafts();
    if (autoLogout === true) {
      showToast('Sesi berakhir otomatis karena tidak ada aktivitas selama 30 menit demi keamanan.', 'info');
    } else {
      showToast('Anda telah berhasil keluar dari sistem.', 'info');
    }
  };

  // --- Penjaga Draf: Denyut Hidup & Penanda Penutupan ---
  // Selama aplikasi terbuka, denyut ini memperbarui waktu 'masih hidup' dan
  // membatalkan penanda penutupan yang mungkin ditinggalkan tab lain. Saat
  // halaman ditinggalkan secara wajar, penandanya ditulis sehingga draf
  // cadangan tidak ikut dipulihkan pada pembukaan berikutnya.
  useEffect(() => {
    if (!currentUser) return;

    touchDraftAlive();
    const heartbeat = setInterval(touchDraftAlive, 15 * 1000);
    const handlePageHide = () => markDraftCleanExit();
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [currentUser]);

  // Beri tahu operator bila isian yang belum sempat disimpan berhasil kembali.
  const recoveryNotified = useRef(false);
  useEffect(() => {
    if (!currentUser || recoveryNotified.current) return;
    const { restored } = getDraftRecovery();
    if (restored > 0) {
      recoveryNotified.current = true;
      showToast('Isian yang belum sempat disimpan berhasil dipulihkan setelah sesi sebelumnya terputus.', 'info');
    }
  }, [currentUser]);

  // --- Auto Logout (Idle Timer) ---
  useEffect(() => {
    if (!currentUser) return; // Only track idle if logged in

    let idleTimer: ReturnType<typeof setTimeout>;
    let isThrottled = false;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      // Set to 30 minutes (30 * 60 * 1000 ms)
      idleTimer = setTimeout(() => {
        handleLogout(true);
      }, 30 * 60 * 1000);
    };

    const handleUserActivity = () => {
      // Throttle timer reset to at most once per second for performance (e.g. mousemove)
      if (!isThrottled) {
        resetIdleTimer();
        isThrottled = true;
        setTimeout(() => { isThrottled = false; }, 1000);
      }
    };

    // Initial setup
    resetIdleTimer();

    // Listen to standard activity events
    // Fase capture: gulir di dalam area menu (bukan jendela) juga dihitung aktivitas; scroll tidak menggelembung
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart'];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { capture: true, passive: true });
    });

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity, { capture: true });
      });
    };
  }, [currentUser]);

  // --- User Management Handlers ---
  const handleSaveUser = async (savedUser: User) => {
    const existingUser = userList.find((u) => u.user_id === savedUser.user_id);
    const exists = Boolean(existingUser);
    
    try {
      const saved = await ErpApiService.saveUser(savedUser, exists);
      let updated: User[];
      if (exists) {
        updated = userList.map((u) => u.user_id === saved.user_id ? saved : u);
        showToast(`Data akun pengguna "${saved.nama_lengkap}" berhasil diperbarui.`);
        if (currentUser?.user_id === saved.user_id) {
          setCurrentUser(saved);
          saveCurrentUser(saved);
        }
      } else {
        updated = [saved, ...userList.filter(u => u.user_id !== saved.user_id)];
        showToast(`Akun "${saved.username}" berhasil didaftarkan.`);
      }
      setUserList(updated);
      saveUserData(updated);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan data pengguna ke sistem.', 'info');
    }
  };

  
  const handleToggleUserStatus = async (userId: string) => {
    const target = userList.find((u) => u.user_id === userId);
    if (!target) return;
    const nextStatus = !target.status_aktif;

    // Kata sandi tidak ikut disimpan di antrean
    const { password: _sandi, ...penggunaTanpaSandi } = target;
    void catatMutasi({
      entitas: 'user',
      id: userId,
      aksi: 'status',
      data: { ...penggunaTanpaSandi, status_aktif: nextStatus },
      label: `Status akun ${target.username}`,
    });

    const updated = userList.map((u) => {
      if (u.user_id === userId) {
        return { ...u, status_aktif: nextStatus };
      }
      return u;
    });
    setUserList(updated);
    saveUserData(updated);
    showToast(`Akun "${target.nama_lengkap}" sekarang ${nextStatus ? 'AKTIF' : 'NONAKTIF'}.`);
  };

  const handleResetUserPassword = async (userId: string, newPass: string) => {
    // Kata sandi baru tidak boleh tersimpan di komputer ini saja: harus sampai ke server, atau dibatalkan
    if (serverAktif()) {
      try {
        const sampai = await ErpApiService.resetUserPassword(userId, newPass);
        if (!sampai) {
          showToast('Kata sandi belum diubah: server tidak dapat dihubungi. Coba lagi saat tersambung.', 'info');
          return;
        }
      } catch (err: any) {
        showToast(`Kata sandi belum diubah: ${err?.message || 'server menolak'}.`, 'info');
        return;
      }
    }
    const hashedPass = await hashPassword(newPass);
    const updated = userList.map((u) => u.user_id === userId ? { ...u, password: hashedPass } : u);
    setUserList(updated);
    saveUserData(updated);
    const target = userList.find((u) => u.user_id === userId);
    showToast(`Kata sandi untuk pengguna "${target?.nama_lengkap}" berhasil direset.`);
  };

  // --- PRD 4.1: Petani Handlers ---
  const handleSavePetani = async (petaniData: Petani) => {
    const tutupFormulir = () => {
      setIsFormModalOpen(false);
      setEditingPetani(null);
    };

    // Ubah data: layar langsung diperbarui, pengiriman ke server lewat antrean (dicoba ulang sampai berhasil)
    if (editingPetani) {
      const diubah = petaniList.map((p) => (p.petani_id === petaniData.petani_id ? { ...p, ...petaniData } : p));
      const baris = diubah.find((p) => p.petani_id === petaniData.petani_id);
      setPetaniList(diubah);
      savePetaniData(diubah);
      if (baris) {
        void catatMutasi({ entitas: 'petani', id: baris.petani_id, aksi: 'simpan', data: baris, label: `Petani ${baris.nama_petani}` });
      }
      showToast(`Data petani "${petaniData.nama_petani}" diperbarui.`);
      tutupFormulir();
      return;
    }

    // Petani baru: server yang menentukan ID. Bila server menolak, petani tidak dibuat hanya di komputer ini.
    try {
      const saved = serverAktif() ? await kirimPetani(petaniData as Petani, true) : await ErpApiService.savePetani(petaniData, false);
      const updated = [saved, ...petaniList.filter((p) => p.petani_id !== saved.petani_id)];
      setPetaniList(updated);
      savePetaniData(updated);
      showToast(`Petani baru "${saved.nama_petani}" (${saved.petani_id}) berhasil disimpan!`);
      tutupFormulir();
      setHighlightPetaniId(saved.petani_id);
    } catch (err: any) {
      // Server menjawab dengan penolakan: tampilkan alasannya dan biarkan formulir terbuka
      if (typeof err?.status === 'number') {
        showToast(`Petani belum tersimpan: ${err?.message || 'server menolak data'}.`, 'info');
        return;
      }
      // Server tidak terjangkau: simpan di komputer ini dan kirim otomatis saat tersambung
      const lokal: Petani = {
        ...petaniData,
        petani_id: petaniData.petani_id || generatePetaniId(petaniList),
        status_aktif: true,
        tanggal_daftar: petaniData.tanggal_daftar || new Date().toISOString().split('T')[0],
      };
      const updated = [lokal, ...petaniList.filter((p) => p.petani_id !== lokal.petani_id)];
      setPetaniList(updated);
      savePetaniData(updated);
      void catatMutasi({ entitas: 'petani', id: lokal.petani_id, aksi: 'simpan', data: lokal, tambahan: { baru: true }, label: `Petani ${lokal.nama_petani}` });
      showToast(`Petani baru "${lokal.nama_petani}" (${lokal.petani_id}) disimpan di komputer ini dan akan dikirim ke server otomatis.`, 'info');
      tutupFormulir();
      setHighlightPetaniId(lokal.petani_id);
    }
  };

  const handleConfirmStatusToggle = async (petaniId: string, reason: string) => {
    const target = petaniList.find((p) => p.petani_id === petaniId);
    if (!target) {
      setDeactivatingPetani(null);
      showToast('Data petani tidak ditemukan. Muat ulang halaman lalu coba lagi.', 'info');
      return;
    }

    const isNowActive = !target.status_aktif;

    const updated = petaniList.map((p) =>
      p.petani_id === petaniId
        ? { ...p, status_aktif: isNowActive, alasan_nonaktif: isNowActive ? undefined : reason }
        : p,
    );
    const barisBaru = updated.find((p) => p.petani_id === petaniId);
    if (barisBaru) void catatMutasi({ entitas: 'petani', id: petaniId, aksi: 'status', data: barisBaru, label: `Status petani ${barisBaru.nama_petani}` });

    setPetaniList(updated);
    savePetaniData(updated);
    setDeactivatingPetani(null);

    recordAuditLog({
      user_nama: currentUser?.nama_lengkap || 'Sistem',
      user_role: currentRole,
      modul: 'Master Petani',
      aksi: isNowActive ? 'AKTIFKAN_PETANI' : 'NONAKTIFKAN_PETANI',
      target_id: petaniId,
      deskripsi: isNowActive
        ? `Mengaktifkan kembali petani ${target.nama_petani} (${petaniId})`
        : `Menonaktifkan petani ${target.nama_petani} (${petaniId})`,
      rincian_perubahan: reason ? [`Alasan: ${reason}`] : undefined,
    });

    showToast(
      isNowActive
        ? `Petani "${target.nama_petani}" kembali aktif dan dapat dipilih di loket sortir.`
        : `Petani "${target.nama_petani}" dinonaktifkan dan tidak lagi muncul di pilihan sortir.`,
    );
  };

  const handleConfirmResetCardNumber = (petaniId: string, newCardNumber: string) => {
    const updated = petaniList.map((p) => {
      if (p.petani_id === petaniId) {
        return {
          ...p,
          petani_id: newCardNumber,
        };
      }
      return p;
    });

    setPetaniList(updated);
    savePetaniData(updated);
    const petaniBaru = updated.find((p) => p.petani_id === newCardNumber);
    if (petaniBaru) {
      void catatMutasi({ entitas: 'petani', id: newCardNumber, idAlt: petaniId, aksi: 'ganti_id', data: petaniBaru, label: `ID kartu petani ${petaniId} menjadi ${newCardNumber}` });
    }

    // Sinkronisasi id petani pada data transaksi jika ada
    const updatedTx = transaksiList.map((t) => {
      if (t.petani_id === petaniId) {
        return { ...t, petani_id: newCardNumber };
      }
      return t;
    });
    setTransaksiList(updatedTx);
    saveTransaksiData(updatedTx);

    // Sinkronisasi id petani pada data barang jika ada
    const updatedBarang = barangList.map((b) => {
      if (b.petani_id === petaniId) {
        return { ...b, petani_id: newCardNumber };
      }
      return b;
    });
    setBarangList(updatedBarang);
    saveBarangData(updatedBarang);

    setResettingCardPetani(null);
    showToast(`ID Petani berhasil diubah menjadi ${newCardNumber}`);
  };

  // Impor petani disimpan satu per satu ke server sesuai urutan daftar,
  // sehingga ID Petani terbit berurutan (baris pertama = ID terkecil)
  const handleImportSuccess = async (imported: Petani[]) => {
    const daftar = (Array.isArray(imported) ? imported : [])
      .filter((p) => p && typeof p.nama_petani === 'string' && p.nama_petani.trim());
    if (daftar.length === 0) {
      showToast('Gagal impor: tidak ada nama petani yang valid.', 'info');
      return;
    }

    setIsImportExportOpen(false);
    showToast(`Menyimpan ${daftar.length} petani...`);

    const tersimpan: Petani[] = [];
    let pesanGagal = '';
    for (let i = 0; i < daftar.length; i++) {
      const p = daftar[i];
      try {
        const isian = {
          nama_petani: p.nama_petani.trim(),
          no_hp: p.no_hp || '',
          alamat: p.alamat || '',
          desa_kecamatan: p.desa_kecamatan || undefined,
          status_aktif: true,
          tanggal_daftar: new Date().toISOString().split('T')[0],
        };
        const hasil = serverAktif() ? await kirimPetani(isian as Petani, true) : await ErpApiService.savePetani(isian, false);
        tersimpan.push(hasil);
      } catch (err: any) {
        // Berhenti agar urutan ID tidak loncat; sisa daftar bisa diimpor ulang
        pesanGagal = `Berhenti di baris ${i + 1} (${p.nama_petani}): ${err?.message || 'gagal disimpan'}`;
        break;
      }
    }

    if (tersimpan.length > 0) {
      const idBaru = new Set(tersimpan.map((p) => p.petani_id));
      const combined = [...tersimpan.slice().reverse(), ...petaniList.filter((p) => !idBaru.has(p.petani_id))];
      setPetaniList(combined);
      savePetaniData(combined);
    }

    if (pesanGagal) {
      showToast(`${tersimpan.length} dari ${daftar.length} petani tersimpan. ${pesanGagal}`, 'info');
    } else {
      showToast(`${tersimpan.length} petani berhasil diimpor.`);
    }
  };

  
  // --- PRD 4.2: Harga Handlers ---
  const handleSaveNewPrice = async (newPrice: TabelHarga, oldPriceIdToArchive?: string) => {
    // Layar diperbarui langsung; sinkron ke server berjalan di belakang
    const terapkanHarga = (price: TabelHarga) => {
      setHargaList((prev) => {
        let updatedList = [...prev];
        const existingIndex = updatedList.findIndex(
          (h) =>
            h.harga_id === price.harga_id ||
            h.harga_id === newPrice.harga_id ||
            (h.kode_grade === price.kode_grade && price.status === 'aktif')
        );

        if (existingIndex !== -1) {
          updatedList[existingIndex] = price;
        } else {
          if (oldPriceIdToArchive && oldPriceIdToArchive !== price.harga_id) {
            updatedList = updatedList.map((h) =>
              h.harga_id === oldPriceIdToArchive ? { ...h, status: 'nonaktif' as const } : h
            );
          }
          updatedList = [price, ...updatedList.filter((h) => h.harga_id !== price.harga_id)];
        }

        saveHargaData(updatedList);
        return updatedList;
      });
    };

    terapkanHarga(newPrice);
    showToast(`Tarif Grade ${newPrice.kode_grade} (Rp ${newPrice.harga_per_kg.toLocaleString('id-ID')}) berhasil disimpan.`);

    // Tarif lama yang diarsipkan ikut dikirim agar statusnya sama di server
    const tarifLama = oldPriceIdToArchive && oldPriceIdToArchive !== newPrice.harga_id ? hargaList.find((h) => h.harga_id === oldPriceIdToArchive) : undefined;
    if (tarifLama) {
      void catatMutasi({ entitas: 'harga_beli', id: tarifLama.harga_id, aksi: 'simpan', data: { ...tarifLama, status: 'nonaktif' as const }, label: `Tarif Grade ${tarifLama.kode_grade} (arsip)` });
    }
    void catatMutasi({ entitas: 'harga_beli', id: newPrice.harga_id, aksi: 'simpan', data: newPrice, label: `Tarif Grade ${newPrice.kode_grade}` });
  };

  
  // --- PRD 5.6: Barang / Inventaris Handlers ---
  
  // ---  Transaksi Pembelian Handlers ---
  const handleSaveTransaksi = async (
    newTx: TransaksiPembelian,
    generatedBarang: Barang | Barang[],
    meta: SaveTransaksiMeta = {}
  ) => {
    if (currentUser?.status_aktif === false) {
      showToast('Akun Anda dinonaktifkan. Aksi tidak dapat dilakukan.', 'info');
      return;
    }

    const oldTxRaw = transaksiList.find((t) => t.transaksi_id === newTx.transaksi_id);
    const oldTx = oldTxRaw ? JSON.parse(JSON.stringify(oldTxRaw)) as TransaksiPembelian : undefined;
    const exists = Boolean(oldTx);
    const barangsToAdd = Array.isArray(generatedBarang) ? generatedBarang : (generatedBarang ? [generatedBarang] : []);

    /** Commit lokal dulu agar Sortir↔Timbangan paralel langsung melihat bal (tanpa tunggu API). */
    const commitLocalTx = (incoming: TransaksiPembelian, applyBarang: boolean, timpaPenuh = false) => {
      setTransaksiList((prev) => {
        const prevTx = prev.find((t) => t.transaksi_id === incoming.transaksi_id);
        // Form Edit menyimpan versi utuh kupon, jadi tidak digabung dengan versi sebelumnya
        const merged = timpaPenuh ? incoming : mergeKuponParalel(prevTx, incoming);
        const next = prevTx
          ? prev.map((t) => (t.transaksi_id === merged.transaksi_id ? merged : t))
          : [merged, ...prev];
        saveTransaksiData(next);
        return next;
      });

      if (!applyBarang) return;

      setBarangList((prev) => {
        const validRefsForTx = new Set<string>();
        barangsToAdd.forEach((b) => validRefsForTx.add(b.barang_id));
        (incoming.items || []).forEach((i) => {
          if (i.barang_id) validRefsForTx.add(i.barang_id);
          if (i.no_bal) validRefsForTx.add(i.no_bal);
          if (i.barcode) validRefsForTx.add(i.barcode);
        });
        (incoming.barang_ids || []).forEach((id) => validRefsForTx.add(id));

        let updated = prev;
        if (exists || prev.some((b) => b.transaksi_pembelian_id === incoming.transaksi_id)) {
          updated = prev.filter((b) => {
            if (b.transaksi_pembelian_id === incoming.transaksi_id) {
              return validRefsForTx.has(b.barang_id) || validRefsForTx.has(b.no_bal);
            }
            return true;
          });
        }

        if (barangsToAdd.length > 0) {
          const prevById = new Map<string, Barang>(updated.map((b) => [b.barang_id, b]));
          const mergedById = new Map<string, Barang>(
            barangsToAdd.map((b): [string, Barang] => {
              const p = prevById.get(b.barang_id);
              return [b.barang_id, { ...p, ...b, status_stok: resolveStatusStok(p?.status_stok, b.berat_kg) }];
            })
          );
          const baru = barangsToAdd.filter((b) => !prevById.has(b.barang_id)).map((b) => mergedById.get(b.barang_id)!);
          updated = [...baru, ...updated.map((b) => mergedById.get(b.barang_id) || b)];
        }

        saveBarangData(updated);
        return updated;
      });
    };

    // 1) Optimistic: segera masuk localStorage + state (bisa dipanggil Timbangan)
    commitLocalTx(newTx, true, Boolean(meta.timpaPenuh));

    const balCount = newTx.total_bal || (newTx.items ? newTx.items.length : 1);

    const updatedPetaniList = petaniList.map((p) => {
      // Pindah statistik bila petani diganti saat koreksi
      if (exists && oldTx && oldTx.petani_id !== newTx.petani_id) {
        if (p.petani_id === oldTx.petani_id) {
          const oldBalCount = oldTx.total_bal || (oldTx.items ? oldTx.items.length : 1);
          return {
            ...p,
            statistik: {
              ...p.statistik,
              total_setoran_bal: Math.max(0, (p.statistik?.total_setoran_bal || 0) - oldBalCount),
              total_berat_kg: Math.max(0, (p.statistik?.total_berat_kg || 0) - (oldTx.berat_kg || 0)),
            },
          };
        }
        if (p.petani_id === newTx.petani_id) {
          return {
            ...p,
            statistik: {
              ...p.statistik,
              total_setoran_bal: Math.max(0, (p.statistik?.total_setoran_bal || 0) + balCount),
              total_berat_kg: Math.max(0, (p.statistik?.total_berat_kg || 0) + (newTx.berat_kg || 0)),
              kunjungan_terakhir: (newTx.tanggal_transaksi ? newTx.tanggal_transaksi.split(' ')[0] : '') || new Date().toISOString().split('T')[0],
              grade_dominan: `Grade ${newTx.kode_grade}`,
            },
          };
        }
        return p;
      }

      if (p.petani_id === newTx.petani_id) {
        let totalBalDelta = balCount;
        let totalKgDelta = newTx.berat_kg || 0;

        if (exists && oldTx) {
          const oldBalCount = oldTx.total_bal || (oldTx.items ? oldTx.items.length : 1);
          totalBalDelta -= oldBalCount;
          totalKgDelta -= (oldTx.berat_kg || 0);
        }

        const totalBal = Math.max(0, (p.statistik?.total_setoran_bal || 0) + totalBalDelta);
        const totalKg = Math.max(0, (p.statistik?.total_berat_kg || 0) + totalKgDelta);

        return {
          ...p,
          statistik: {
            ...p.statistik,
            total_setoran_bal: totalBal,
            total_berat_kg: totalKg,
            kunjungan_terakhir: (newTx.tanggal_transaksi ? newTx.tanggal_transaksi.split(' ')[0] : '') || new Date().toISOString().split('T')[0],
            grade_dominan: `Grade ${newTx.kode_grade}`,
          },
        };
      }
      return p;
    });
    setPetaniList(updatedPetaniList);
    savePetaniData(updatedPetaniList);

    if (meta.audit) {
      recordAuditLog({
        user_nama: currentUser?.nama_lengkap || 'Sistem',
        user_role: currentRole,
        modul: 'Transaksi Pembelian',
        aksi: meta.audit.aksi,
        target_id: newTx.no_kupon,
        deskripsi: meta.audit.deskripsi,
        rincian_perubahan: meta.audit.rincian_perubahan,
      });
    } else if (meta.skipAudit) {
      // Pemanggil sudah mencatat audit sendiri
    } else if (exists && oldTx) {
      const isRecentlyLoggedByModal = Boolean(
        newTx.terakhir_diubah_pada &&
        Math.abs(new Date().getTime() - new Date(newTx.terakhir_diubah_pada).getTime()) < 5000
      );

      if (!isRecentlyLoggedByModal) {
        const diffSummary: string[] = [];
        if (oldTx.nama_petani !== newTx.nama_petani) {
          diffSummary.push(`Petani: "${oldTx.nama_petani}" -> "${newTx.nama_petani}"`);
        }
        if (oldTx.kode_grade !== newTx.kode_grade) {
          diffSummary.push(`Grade: ${oldTx.kode_grade} -> ${newTx.kode_grade}`);
        }
        if (oldTx.berat_kg !== newTx.berat_kg) {
          diffSummary.push(`Netto: ${oldTx.berat_kg} Kg -> ${newTx.berat_kg} Kg (Δ ${normalizeKg(newTx.berat_kg - oldTx.berat_kg)} Kg)`);
        }
        if ((oldTx.harga_final || oldTx.total_harga_beli) !== (newTx.harga_final || newTx.total_harga_beli)) {
          diffSummary.push(`Nilai: Rp ${(oldTx.harga_final || oldTx.total_harga_beli).toLocaleString('id-ID')} -> Rp ${(newTx.harga_final || newTx.total_harga_beli).toLocaleString('id-ID')}`);
        }
        if (oldTx.status_pembayaran !== newTx.status_pembayaran) {
          diffSummary.push(`Status bayar: ${oldTx.status_pembayaran} -> ${newTx.status_pembayaran}`);
        }

        recordAuditLog({
          user_nama: currentUser?.nama_lengkap || 'Sistem',
          user_role: currentRole,
          modul: 'Transaksi Pembelian',
          aksi: 'UBAH_TRANSAKSI',
          target_id: newTx.no_kupon,
          deskripsi: `Koreksi data kupon ${newTx.no_kupon} (${newTx.nama_petani})`,
          rincian_perubahan: diffSummary.length > 0 ? diffSummary : ['Pembaruan rincian timbang/status'],
        });
      }
    } else {
      recordAuditLog({
        user_nama: currentUser?.nama_lengkap || 'Sistem',
        user_role: currentRole,
        modul: 'Transaksi Pembelian',
        aksi: 'TAMBAH_TRANSAKSI',
        target_id: newTx.no_kupon,
        deskripsi: `Pencatatan kupon baru ${newTx.no_kupon} (Petani: ${newTx.nama_petani}, ${balCount} Bal)`,
      });
    }

    if (!meta.silent) {
      showToast(`Kupon ${newTx.no_kupon} (${balCount} Bal, ${newTx.berat_kg} Kg) berhasil disimpan!`);
    }

    // 2) Sync ke BE lewat antrean: satu permintaan per kupon, dicoba ulang otomatis bila gagal, dan hasilnya
    //    diverifikasi. Merge hasil tanpa menghapus bal paralel. Simpanan yang tergantikan simpanan lebih baru
    //    tidak perlu digabung ke layar karena hasil simpanan terbarulah yang membawa keadaan akhir.
    try {
      const hasilAntrian = await antrianSinkron.masukkan(newTx, oldTx);
      const syncResult =
        hasilAntrian.terbaru && hasilAntrian.hasil ? hasilAntrian.hasil : { syncedTx: newTx, fromBackend: false };
      if (syncResult.fromBackend && syncResult.syncedTx) {
        const feItems = newTx.items || [];
        const beItems = syncResult.syncedTx.items || [];
        const mergedItems = feItems.length
          ? feItems.map((fe) => {
              const be = beItems.find((b) => String(b.no_bal) === String(fe.no_bal));
              if (!be) return fe;
              const feW = fe.berat_kg || 0;
              // Berat dari perangkat ini menang, termasuk perubahan disengaja (buka kunci = 0)
              const feMenang = feW > 0 || Boolean(fe.diubah_lokal_pada);
              const base = feMenang
                ? { ...be, ...fe, item_id: be.item_id || fe.item_id }
                : { ...fe, ...be, item_id: be.item_id || fe.item_id };
              // Perubahan disengaja memakai status tikar dari perangkat ini apa adanya (bisa dimatikan)
              if (fe.diubah_lokal_pada) return base;
              const potTikar = Math.max(Number(fe.potongan_tikar) || 0, Number(be.potongan_tikar) || 0);
              const gantiTikar =
                Boolean(fe.ganti_tikar) ||
                Boolean(be.ganti_tikar) ||
                potTikar > 0;
              return {
                ...base,
                ganti_tikar: gantiTikar,
                potongan_tikar: gantiTikar ? potTikar || POTONGAN_GANTI_TIKAR : 0,
              };
            })
          : [...beItems];

        // Bal yang hanya ada di server ikut dimasukkan, kecuali simpanan versi utuh (form Edit)
        const feNos = new Set(mergedItems.map((i) => String(i.no_bal).toUpperCase()));
        for (const be of beItems) {
          if (!meta.timpaPenuh && !feNos.has(String(be.no_bal).toUpperCase())) mergedItems.push(be);
        }

        const syncedTx: TransaksiPembelian = {
          ...newTx,
          ...syncResult.syncedTx,
          status_tahap: newTx.status_tahap || syncResult.syncedTx.status_tahap,
          petani_id: newTx.petani_id || syncResult.syncedTx.petani_id,
          nama_petani: newTx.nama_petani || syncResult.syncedTx.nama_petani,
          alasan_perubahan_terakhir: newTx.alasan_perubahan_terakhir,
          items: mergedItems,
        };

        commitLocalTx(syncedTx, false, Boolean(meta.timpaPenuh));

        // Setelah dibayar server menerbitkan stok bal; daftar bal diambil ulang dari server
        if (syncedTx.status_pembayaran === 'lunas') {
          try {
            const barangRes = await ErpApiService.getBarangList();
            if (barangRes.fromBackend) setBarangList(normalizeStatusBal(barangRes.data));
          } catch (err) {
            console.warn('Gagal memuat ulang bal setelah pembayaran:', err);
          }
        }
      }
    } catch (err) {
      // Simpanan tetap di antrean dan dicoba ulang otomatis; statusnya tampil di Header
      console.warn('Kupon belum terkirim ke server, dicoba ulang otomatis:', err);
    }
  };

  const handleDeleteTransaksi = (transaksiId: string, alasanHapus?: string) => {
    if (currentUser?.status_aktif === false) {
      showToast('Akun Anda dinonaktifkan. Aksi tidak dapat dilakukan.', 'info');
      return;
    }

    const txToDelete = transaksiList.find((t) => t.transaksi_id === transaksiId);
    if (!txToDelete) return;

    // Kupon yang balnya sudah dikirim lewat Surat Jalan tidak boleh dihapus
    const noBalTerkirim = balTerkirimDariTransaksi(txToDelete, barangList, pengirimanList);
    if (noBalTerkirim.length > 0) {
      showToast(pesanTransaksiTerkunci(txToDelete, noBalTerkirim), 'info');
      return;
    }

    recordAuditLog({
      user_nama: currentUser?.nama_lengkap || 'Sistem',
      user_role: currentRole,
      modul: 'Transaksi Pembelian',
      aksi: 'HAPUS_TRANSAKSI',
      target_id: txToDelete.no_kupon,
      deskripsi: `Penghapusan kupon ${txToDelete.no_kupon} (Petani: ${txToDelete.nama_petani}). Alasan: ${alasanHapus || 'Tanpa keterangan'}`,
      rincian_perubahan: [`Alasan: ${alasanHapus || '-'}`],
    });

    // Kupon yang dihapus tidak perlu lagi dikirim ke server lewat antrean; penghapusannya sendiri harus sampai ke server
    antrianSinkron.batalkan(transaksiId);
    void catatMutasi({
      entitas: 'transaksi',
      id: transaksiId,
      idAlt: txToDelete.no_kupon,
      aksi: 'hapus',
      tambahan: { alasan: alasanHapus },
      label: `Hapus kupon ${txToDelete.no_kupon}`,
    });

    // 1. Remove from transaksiList
    const updatedTxList = transaksiList.filter((t) => t.transaksi_id !== transaksiId);
    setTransaksiList(updatedTxList);
    saveTransaksiData(updatedTxList);

    // 2. Remove generated bal from barangList
    const txItemBalIds = new Set(
      (txToDelete.items || []).map((i) => i.barang_id || i.no_bal)
    );
    const updatedBarangList = barangList.filter((b) => {
      if (b.transaksi_pembelian_id === transaksiId || (b as any).transaksi_id === transaksiId) return false;
      if (b.barang_id && txItemBalIds.has(b.barang_id)) return false;
      if (b.no_bal && (b.no_bal === txToDelete.no_bal || txItemBalIds.has(b.no_bal))) return false;
      return true;
    });
    setBarangList(updatedBarangList);
    saveBarangData(updatedBarangList);

    // 3. Recalculate Petani statistics
    const balCount = txToDelete.total_bal || (txToDelete.items ? txToDelete.items.length : 1);
    const updatedPetaniList = petaniList.map((p) => {
      if (p.petani_id === txToDelete.petani_id) {
        const totalBal = Math.max(0, (p.statistik?.total_setoran_bal || 0) - balCount);
        const totalKg = Math.max(0, (p.statistik?.total_berat_kg || 0) - txToDelete.berat_kg);
        return {
          ...p,
          statistik: {
            ...p.statistik,
            total_setoran_bal: totalBal,
            total_berat_kg: totalKg,
          },
        };
      }
      return p;
    });
    setPetaniList(updatedPetaniList);
    savePetaniData(updatedPetaniList);

    // 4. Record Detailed Audit Log for Deletion

    

    
    showToast(`Transaksi ${transaksiId} dan data bal terkait berhasil dihapus.`);
  };

  // --- PRD 6.1: Pengiriman Barang (DO) Handlers ---
  const handleSaveNewPengiriman = async (newPengiriman: PengirimanBarang, updatedBarangIds: string[]) => {
    if (currentUser?.status_aktif === false) return showToast('Akun Anda dinonaktifkan.', 'info');

    const updatedSet = new Set(updatedBarangIds);

    // 1) Langsung tampil: surat jalan baru dan tanda DO pada batch sample. Bal TIDAK langsung berstatus
    // keluar di sini: bal baru benar-benar keluar gudang saat Surat Jalan ini berstatus Selesai
    // (lihat handleUpdatePengirimanStatus). Selama belum Selesai, bal tetap tampil "Di Gudang".
    setPengirimanList((prev) => {
      const next = [newPengiriman, ...prev.filter((p) => p.pengiriman_id !== newPengiriman.pengiriman_id)];
      savePengirimanData(next);
      return next;
    });
    setBarangList((prev) => {
      const next = prev.map((b) =>
        updatedSet.has(b.barang_id) ? { ...b, pengiriman_id: newPengiriman.pengiriman_id } : b
      );
      saveBarangData(next);
      return next;
    });

    let batchTerkait: BatchPengirimanSample | undefined;
    if (newPengiriman.batch_sample_id_ref) {
      const targetBatchId = newPengiriman.batch_sample_id_ref;
      const updatedBatches = batchSampleList.map((batch) => {
        if (batch.batch_id === targetBatchId || batch.kode_batch === targetBatchId) {
          const updatedItems = (batch.items || []).map((it) =>
            updatedSet.has(it.barang_id) ? { ...it, sudah_dikirim_do: true } : it
          );
          const allSent = updatedItems.length > 0 && updatedItems.every((it) => it.sudah_dikirim_do || it.status_item === 'ditolak') && updatedItems.some(it => it.sudah_dikirim_do);
          return {
            ...batch,
            items: updatedItems,
            status: allSent ? ('selesai' as const) : batch.status,
          };
        }
        return batch;
      });
      setBatchSampleList(updatedBatches);
      saveBatchSampleData(updatedBatches);
      batchTerkait = updatedBatches.find((b) => b.batch_id === targetBatchId || b.kode_batch === targetBatchId);
    }

    showToast(`Surat Jalan ${newPengiriman.no_surat_jalan} diterbitkan (${newPengiriman.total_bal || updatedBarangIds.length} bal dimuat)!`);

    // 2) Sinkron ke server lewat antrean (dicoba ulang sampai berhasil); ID dari server digabung saat selesai
    void catatMutasi({
      entitas: 'pengiriman',
      id: newPengiriman.pengiriman_id,
      idAlt: newPengiriman.no_surat_jalan,
      aksi: 'simpan',
      data: newPengiriman,
      tambahan: { baru: true },
      label: `Surat Jalan ${newPengiriman.no_surat_jalan}`,
    });

    // Tanda DO pada batch sample asal juga harus sampai ke server
    if (batchTerkait) {
      void catatMutasi({ entitas: 'batch_sample', id: batchTerkait.batch_id, idAlt: batchTerkait.kode_batch, aksi: 'simpan', data: batchTerkait, label: `Batch sample ${batchTerkait.kode_batch}` });
    }
  };

  const handleSaveHargaJual = async (item: MasterHargaJual) => {
    // Layar diperbarui langsung; sinkron ke server berjalan di belakang
    const terapkan = (h: MasterHargaJual) => {
      setHargaJualList((prev) => {
        const idx = prev.findIndex((x) => x.harga_jual_id === h.harga_jual_id || x.harga_jual_id === item.harga_jual_id);
        const next = idx >= 0 ? prev.map((x, i) => (i === idx ? h : x)) : [h, ...prev];
        saveHargaJualData(next);
        return next;
      });
    };

    terapkan(item);
    showToast(`Harga jual "${item.kode}" berhasil disimpan.`);

    void catatMutasi({ entitas: 'harga_jual', id: item.harga_jual_id, aksi: 'simpan', data: item, label: `Harga jual ${item.kode}` });
  };

  

  const handleSaveBatchSample = async (newBatch: BatchPengirimanSample, updatedBarangs: Barang[]) => {
    if (currentUser?.status_aktif === false) return showToast('Akun Anda dinonaktifkan.', 'info');

    // 1) Langsung tampil
    setBatchSampleList((prev) => {
      const next = [newBatch, ...prev.filter((b) => b.batch_id !== newBatch.batch_id)];
      saveBatchSampleData(next);
      return next;
    });
    if (updatedBarangs && updatedBarangs.length > 0) {
      const updatedBarangMap = new Map(updatedBarangs.map((b) => [b.barang_id, b]));
      setBarangList((prev) => {
        const next = prev.map((b) => updatedBarangMap.get(b.barang_id) || b);
        saveBarangData(next);
        return next;
      });
    }
    showToast(
      newBatch.status === 'draft'
        ? `Batch Sample ${newBatch.kode_batch} disimpan sebagai Draft. Finalkan di Status & Detail Batch bila sudah siap dipakai.`
        : `Batch Sample ${newBatch.kode_batch} berhasil dikirim ke ${newBatch.tujuan_buyer}!`
    );

    // 2) Sinkron ke server lewat antrean (No. Surat Sample manual tetap dipakai); dicoba ulang sampai berhasil
    void catatMutasi({
      entitas: 'batch_sample',
      id: newBatch.batch_id,
      idAlt: newBatch.kode_batch,
      aksi: 'simpan',
      data: newBatch,
      tambahan: { baru: true },
      label: `Batch sample ${newBatch.kode_batch}`,
    });
  };


  const handleDeleteBatchSample = (batchId: string, revertedBarangs?: Barang[]) => {
    if (currentUser?.status_aktif === false) return showToast('Akun Anda dinonaktifkan.', 'info');
    const batchTarget = batchSampleList.find((b) => b.batch_id === batchId);
    const kodeBatch = batchTarget?.kode_batch || '';
    const list = batchSampleList.filter(b => b.batch_id !== batchId);
    setBatchSampleList(list);
    saveBatchSampleData(list);
    
    if (revertedBarangs && revertedBarangs.length > 0) {
      const updatedBarangMap = new Map(revertedBarangs.map((b) => [b.barang_id, b]));
      const newBarangList = barangList.map((b) => updatedBarangMap.get(b.barang_id) || b);
      setBarangList(newBarangList);
      saveBarangData(newBarangList);
      // Bal kembali ke stok gudang juga di server
      catatStatusBal(revertedBarangs, barangList);
    }

    // Penghapusan harus sampai ke server; kalau tidak, batch muncul lagi saat data dimuat ulang
    void catatMutasi({
      entitas: 'batch_sample',
      id: batchId,
      idAlt: kodeBatch || undefined,
      aksi: 'hapus',
      tambahan: { batch: batchTarget },
      label: `Hapus batch sample ${kodeBatch}`,
    });
    
    showToast(`Batch ${kodeBatch} berhasil dihapus.`);
  };

  const handleUpdateBatchSample = async (updatedBatch: BatchPengirimanSample, updatedBarangs?: Barang[]) => {
    // 1) Langsung tampil
    setBatchSampleList((prev) => {
      const next = prev.map((b) => (b.batch_id === updatedBatch.batch_id ? updatedBatch : b));
      saveBatchSampleData(next);
      return next;
    });
    if (updatedBarangs && updatedBarangs.length > 0) {
      const updatedBarangMap = new Map(updatedBarangs.map((b) => [b.barang_id, b]));
      setBarangList((prev) => {
        const next = prev.map((b) => updatedBarangMap.get(b.barang_id) || b);
        saveBarangData(next);
        return next;
      });
    }
    showToast(`Batch ${updatedBatch.kode_batch} berhasil diperbarui.`);

    // 2) Sinkron ke server lewat antrean: daftar bal lengkap dan harga ikut terkirim, dicoba ulang sampai berhasil
    void catatMutasi({
      entitas: 'batch_sample',
      id: updatedBatch.batch_id,
      idAlt: updatedBatch.kode_batch,
      aksi: 'simpan',
      data: updatedBatch,
      label: `Batch sample ${updatedBatch.kode_batch}`,
    });
    // Bal yang masuk atau keluar batch berubah statusnya juga di server
    catatStatusBal(updatedBarangs, barangList);
  };

  /**
   * Menyimpan hasil edit Surat Jalan yang belum Selesai (tambah/keluarkan bal, berat, harga, potongan, tujuan, dll.).
   * Bal baru menjadi keluar, bal yang dikeluarkan kembali ke gudang, dan tanda "sudah dikirim DO" pada batch sample
   * disesuaikan. Mengembalikan false bila ditolak.
   */
  const handleUpdatePengiriman = (updatedPengiriman: PengirimanBarang, balDitambah: string[] = [], balDikeluarkan: string[] = []): boolean => {
    const lama = pengirimanList.find((p) => p.pengiriman_id === updatedPengiriman.pengiriman_id);
    if (!lama) {
      showToast('Surat Jalan yang diedit tidak ditemukan.', 'info');
      return false;
    }
    if (isSuratJalanTerkunci(lama)) {
      showToast(`Surat Jalan ${lama.no_surat_jalan} sudah Selesai dan tidak dapat diedit lagi.`, 'info');
      return false;
    }
    if (currentUser?.status_aktif === false) {
      showToast('Akun Anda dinonaktifkan.', 'info');
      return false;
    }
    const tambah = new Set(balDitambah);
    const keluar = new Set(balDikeluarkan);
    // Bal baru tidak boleh sudah dipakai Surat Jalan lain
    const bentrok = cariSuratJalanBentrok(pengirimanList, lama.pengiriman_id, tambah);
    if (bentrok) {
      showToast(`Ada bal yang sudah tercatat di Surat Jalan ${bentrok.no_surat_jalan}. Keluarkan dari muatan lalu simpan lagi.`, 'info');
      return false;
    }

    // Status tidak berubah lewat edit; status diatur lewat halaman Status Pengiriman
    const baru: PengirimanBarang = { ...updatedPengiriman, status: lama.status };
    setPengirimanList((prev) => {
      const next = prev.map((p) => (p.pengiriman_id === baru.pengiriman_id ? baru : p));
      savePengirimanData(next);
      return next;
    });
    // Bal baru masuk muatan TIDAK langsung berstatus keluar (baru keluar sungguhan saat Selesai);
    // bal yang dikeluarkan dari muatan hanya dibalik ke gudang bila kebetulan sudah keluar (data lama).
    const barangSetelahEdit = masukkanBalKeMuatan(kembalikanBalKeGudang(barangList, keluar), tambah, baru.pengiriman_id);
    setBarangList(barangSetelahEdit);
    saveBarangData(barangSetelahEdit);
    // Bal yang statusnya benar-benar berubah (jarang di sini, hanya kasus data lama) disinkronkan ke server
    const idBalBerubah = new Set<string>([...tambah, ...keluar]);
    catatStatusBal(barangSetelahEdit.filter((b) => idBalBerubah.has(b.barang_id)), barangList);

    const sesuaiBatch = sesuaikanBatchSetelahPerubahanDO(batchSampleList, lama.batch_sample_id_ref, tambah, keluar);
    const batchTerkait = sesuaiBatch.batchTerkait;
    if (batchTerkait) {
      setBatchSampleList(sesuaiBatch.batchList);
      saveBatchSampleData(sesuaiBatch.batchList);
    }

    const perubahanBal = [
      tambah.size > 0 ? `${tambah.size} bal ditambah` : '',
      keluar.size > 0 ? `${keluar.size} bal dikeluarkan` : '',
    ].filter(Boolean).join(', ');
    showToast(`Surat Jalan ${baru.no_surat_jalan} diperbarui${perubahanBal ? ` (${perubahanBal})` : ''}.`);

    // Sinkron ke server lewat antrean (dicoba ulang sampai berhasil); bal dimuat ulang dari server saat selesai
    void catatMutasi({
      entitas: 'pengiriman',
      id: baru.pengiriman_id,
      idAlt: baru.no_surat_jalan,
      aksi: 'simpan',
      data: baru,
      label: `Surat Jalan ${baru.no_surat_jalan}`,
    });
    if (batchTerkait) {
      void catatMutasi({ entitas: 'batch_sample', id: batchTerkait.batch_id, idAlt: batchTerkait.kode_batch, aksi: 'simpan', data: batchTerkait, label: `Batch sample ${batchTerkait.kode_batch}` });
    }
    return true;
  };

  /**
   * Membatalkan Surat Jalan yang belum Selesai: bal kembali ke gudang dan, bila berasal dari
   * batch sample, tanda "sudah dikirim DO" pada bal-bal itu dicabut agar bisa dibuatkan Surat Jalan lagi.
   */
  const handleDeletePengiriman = (pengirimanId: string) => {
    const target = pengirimanList.find((p) => p.pengiriman_id === pengirimanId);
    if (!target) return;
    if (isSuratJalanTerkunci(target)) {
      showToast(pesanSuratJalanTerkunci(target), 'info');
      return;
    }
    if (currentUser?.status_aktif === false) return showToast('Akun Anda dinonaktifkan.', 'info');

    setPengirimanList((prev) => {
      const next = prev.filter((p) => p.pengiriman_id !== pengirimanId);
      savePengirimanData(next);
      return next;
    });

    const idBal = new Set(target.barang_ids || []);
    const barangSetelahBatal = kembalikanBalKeGudang(barangList, idBal);
    setBarangList(barangSetelahBatal);
    saveBarangData(barangSetelahBatal);
    // Bal kembali ke stok gudang juga di server (kalau tidak, statusnya balik "keluar" lagi saat data dimuat ulang)
    catatStatusBal(barangSetelahBatal.filter((b) => idBal.has(b.barang_id)), barangList);

    // Batch sample asal ditutup otomatis saat semua bal punya DO; dengan DO dibatalkan ia terbuka lagi
    const sesuaiBatch = sesuaikanBatchSetelahPerubahanDO(batchSampleList, target.batch_sample_id_ref, new Set(), idBal);
    const batchTerkait = sesuaiBatch.batchTerkait;
    if (batchTerkait) {
      setBatchSampleList(sesuaiBatch.batchList);
      saveBatchSampleData(sesuaiBatch.batchList);
    }

    showToast(`Surat Jalan ${target.no_surat_jalan} dibatalkan; ${idBal.size} bal kembali ke gudang.`);

    // Pembatalan harus sampai ke server; kalau tidak, Surat Jalan muncul lagi saat data dimuat ulang
    void catatMutasi({
      entitas: 'pengiriman',
      id: pengirimanId,
      idAlt: target.no_surat_jalan,
      aksi: 'hapus',
      label: `Batalkan Surat Jalan ${target.no_surat_jalan}`,
    });
    if (batchTerkait) {
      void catatMutasi({ entitas: 'batch_sample', id: batchTerkait.batch_id, idAlt: batchTerkait.kode_batch, aksi: 'simpan', data: batchTerkait, label: `Batch sample ${batchTerkait.kode_batch}` });
    }
  };

  const handleUpdatePengirimanStatus = (pengirimanId: string, newStatus: string) => {
    const target = pengirimanList.find((p) => p.pengiriman_id === pengirimanId);
    if (!target || target.status === newStatus) return;
    // Selesai bersifat final: nilai penjualan sudah masuk laporan
    if (isSuratJalanTerkunci(target)) {
      showToast(`Surat Jalan ${target.no_surat_jalan} sudah Selesai dan statusnya tidak dapat diubah lagi.`, 'info');
      return;
    }

    const updated = pengirimanList.map((p) => (p.pengiriman_id === pengirimanId ? { ...p, status: newStatus as PengirimanBarang['status'] } : p));
    setPengirimanList(updated);
    savePengirimanData(updated);

    // Bal baru benar-benar "keluar" gudang tepat saat Surat Jalan ini Selesai; sebelum itu masih "Di Gudang"
    if (newStatus === 'selesai') {
      const idBal = new Set(target.barang_ids || []);
      const barangSetelahSelesai = keluarkanBal(barangList, idBal, pengirimanId);
      setBarangList(barangSetelahSelesai);
      saveBarangData(barangSetelahSelesai);
      catatStatusBal(barangSetelahSelesai.filter((b) => idBal.has(b.barang_id)), barangList);
    }

    showToast(
      newStatus === 'selesai'
        ? `Surat Jalan ${target.no_surat_jalan} Selesai; ${target.barang_ids?.length || 0} bal keluar gudang dan nilai penjualannya kini masuk laporan.`
        : `Status Surat Jalan ${target.no_surat_jalan} menjadi ${LABEL_STATUS_PENGIRIMAN[newStatus] || newStatus}.`
    );

    const barisBaru = updated.find((p) => p.pengiriman_id === pengirimanId);
    if (barisBaru) {
      void catatMutasi({
        entitas: 'pengiriman',
        id: pengirimanId,
        idAlt: barisBaru.no_surat_jalan,
        aksi: 'status',
        data: barisBaru,
        label: `Status Surat Jalan ${barisBaru.no_surat_jalan}`,
      });
    }
  };

  // Laporan nilai/aset hanya memakai bal dari kupon yang sudah dibayar
  const barangLunasList = useMemo(() => filterBarangLunas(barangList, transaksiList), [barangList, transaksiList]);

  const totalPetani = petaniList.length;

  // Judul di Header sama dengan nama menu di Sidebar
  const JUDUL_MODUL: Record<string, string> = {
    'modul-home': 'Home',
    'modul-6-dashboard-analytic': 'Dashboard Analytic',
    'modul-6-laporan-bal': 'Laporan Bal',
    'modul-6-laporan-grade': 'Laporan Harga',
    'modul-6-laporan-pembelian': 'Laporan Pembelian',
    'modul-6-laporan-petani': 'Laporan Petani',
    'modul-6-laporan-pengiriman': 'Laporan Pengiriman',
    'modul-1-petani': 'Master Petani',
    'modul-3-harga': 'Master Harga Beli',
    'modul-3-harga-jual': 'Master Harga Jual',
    'modul-0-sortir': 'Sortir',
    'modul-0-timbangan': 'Timbangan',
    'modul-0-kasir': 'Kasir',
    'modul-0-transaksi': 'Kasir',
    'modul-4-sample': 'Pengiriman Sample',
    'modul-status-batch': 'Status & Detail Batch',
    'modul-5-pengiriman': 'Pengiriman Reguler (DO)',
    'modul-users': 'Manajemen Pengguna',
  };
  const pageTitle = JUDUL_MODUL[activeModuleId] || 'Home';

  // Seluruh halaman berada di balik autentikasi, termasuk rute cetak mandiri.
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Halaman cetak mandiri (?cetak=nota&id=...)
  if (printParam) {
    return (
      <Suspense fallback={<MemuatHalaman />}>
      <DedicatedPrintView
        type={printParam.type}
        id={printParam.id}
        onClose={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setPrintParam(null);
        }}
        isEmbedded={false}
        transaksiList={transaksiList}
        pengirimanList={pengirimanList}
        barangList={barangList}
        petaniList={petaniList}
        tabelHarga={hargaList}
      />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#212529] font-sans flex flex-col antialiased">
      
      {/* Top Professional ERP Header */}
      <Header
        pageTitle={pageTitle}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenUsers={() => handleSelectModule('modul-users')}
        onToggleSidebar={handleToggleSidebar}
        onMouseEnterToggle={handleMouseEnterToggle}
        onMouseLeaveToggle={handleMouseLeaveToggle}
        isSidebarHidden={isSidebarHidden}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left ERP Sidebar - Normal Pinned View */}
        {!isSidebarHidden && (
          <Sidebar
            activeModuleId={activeModuleId}
            onSelectModule={(modId) => {
              handleSidebarClick(modId);
            }}
            petaniCount={totalPetani}
            transaksiCount={transaksiList.length}
            sampleCount={batchSampleList.length}
            pengirimanCount={pengirimanList.length}
            hargaJualCount={hargaJualList.length}
            hargaCount={hargaList.length}
            userCount={userList.length}
            userRole={currentRole}
          />
        )}

        {/* Left ERP Sidebar - Hover Peek Overlay View (when hidden) */}
        {isSidebarHidden && isHoverPeek && (
          <div
            className="fixed top-14 left-0 bottom-0 z-40 shadow-2xl bg-white flex transition-all duration-150 animate-in fade-in slide-in-from-left-2 border-r border-gray-300"
            onMouseEnter={handleMouseEnterSidebar}
            onMouseLeave={handleMouseLeaveSidebar}
          >
            <Sidebar
              activeModuleId={activeModuleId}
              onSelectModule={(modId) => {
                handleSidebarClick(modId);
              }}
              petaniCount={totalPetani}
              transaksiCount={transaksiList.length}
              sampleCount={batchSampleList.length}
              pengirimanCount={pengirimanList.length}
              hargaJualCount={hargaJualList.length}
              hargaCount={hargaList.length}
              userCount={userList.length}
              userRole={currentRole}
            />
          </div>
        )}

        {/* Center Main Stage */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50/40">
          <ErrorBoundary key={activeModuleId} area={pageTitle}>
          <Suspense fallback={<MemuatHalaman />}>
          <div className="w-full space-y-2.5">

            {/* Dashboard Menu */}
            {activeModuleId === 'modul-home' && (
              <HomeDashboardView
                onNavigate={(modId) => handleSelectModule(modId)}
                currentUser={currentUser}
                userCount={userList.length}
              />
            )}

            {/*  Dashboard Laporan & Analytic ERP */}
            {activeModuleId === 'modul-6-dashboard-analytic' && (
              <DashboardAnalyticView
                transaksiList={transaksiList}
                barangList={barangList}
                sampleList={sampleRows}
                batchSampleList={batchSampleList}
                pengirimanList={pengirimanList}
                hargaList={hargaList}
                hargaJualList={hargaJualList}
                isRefreshing={laporanRefreshing}
                userRole={currentRole}
                onNavigateToModule={(modId) => handleSelectModule(modId)}
                onRefreshSources={async () => {
                  setLaporanRefreshing(true);
                  try {
                    await refreshOperationalLists();
                  } finally {
                    setLaporanRefreshing(false);
                  }
                }}
              />
            )}

            {/* Laporan Bal Tembakau */}
            {activeModuleId === 'modul-6-laporan-bal' && (
              <LaporanBalView
                barangList={barangList}
                petaniList={petaniList}
                transaksiList={transaksiList}
                hargaList={hargaList}
                userRole={currentRole}
                onNavigateToTransaksi={() => handleSelectModule('modul-0-transaksi')}
              />
            )}

            {/* Laporan Harga */}
            {activeModuleId === 'modul-6-laporan-grade' && (
              <LaporanGradeView
                initialTab="beli"
                hargaJualList={hargaJualList}
                hargaList={hargaList}
                barangList={barangLunasList}
                transaksiList={transaksiList}
                pengirimanList={pengirimanList}
                userRole={currentRole}
                onNavigateToHarga={() => handleSelectModule('modul-3-harga')}
                onNavigateToHargaJual={() => handleSelectModule('modul-3-harga-jual')}
              />
            )}

            {/* Laporan Pembelian Barang */}
            {activeModuleId === 'modul-6-laporan-pembelian' && (
              <LaporanPembelianBarangView
                transaksiList={transaksiList}
                petaniList={petaniList}
                userRole={currentRole}
                onNavigateToTransaksi={() => handleSelectModule('modul-0-transaksi')}
              />
            )}

            {/* Laporan Petani & Rekapitulasi Setoran */}
            {activeModuleId === 'modul-6-laporan-petani' && (
              <LaporanPetaniView
                petaniList={petaniList}
                transaksiList={transaksiList}
                barangList={barangLunasList}
                userRole={currentRole}
                onNavigateToTransaksi={() => handleSelectModule('modul-0-transaksi')}
              />
            )}

            {/* Laporan Pengiriman & Distribusi Tembakau */}
            {activeModuleId === 'modul-6-laporan-pengiriman' && (
              <LaporanPengirimanView
                pengirimanList={pengirimanList}
                sampleList={sampleRows}
                barangList={barangList}
                userRole={currentRole}
                onNavigateToSample={() => handleSelectModule('modul-4-sample')}
              />
            )}

            {/* PRD 4.1: Master Petani */}
            {activeModuleId === 'modul-1-petani' && (
              <PetaniTable
                data={petaniList}
                userRole={currentRole}
                transaksiList={transaksiList}
                highlightPetaniId={highlightPetaniId}
                onAddPetani={() => {
                  setEditingPetani(null);
                  setIsFormModalOpen(true);
                }}
                onEditPetani={(p) => {
                  setEditingPetani(p);
                  setIsFormModalOpen(true);
                }}
                onViewDetail={(p) => setViewingPetani(p)}
                onPrintCard={(p) => setPrintingPetani(p)}
                onToggleStatus={(p) => setDeactivatingPetani(p)}
                onResetCardNumber={(p) => setResettingCardPetani(p)}
                onOpenImportExport={() => setIsImportExportOpen(true)}
              />
            )}

            {/* PRD 4.2: Master Harga Beli */}
            {activeModuleId === 'modul-3-harga' && (
              <HargaManagement
                hargaList={hargaList}
                userRole={currentRole}
                onSaveNewPrice={handleSaveNewPrice}
              />
            )}


            {/*  Proses 1 - Sortir Page */}
            {activeModuleId === 'modul-0-sortir' && (
              <SortirPageView
                petaniList={petaniList}
                hargaList={hargaList}
                transaksiList={transaksiList}
                barangList={barangList}
                
                userRole={currentRole}
                currentUser={currentUser}
                onSaveTransaksi={(newTx, newBarangs, meta) => handleSaveTransaksi(newTx, newBarangs, { silent: true, ...meta })}
                onDeleteTransaksi={handleDeleteTransaksi}
                onNavigateToTimbangan={(kuponNo, txId, balNo) => {
                  setTargetKuponNo(kuponNo);
                  setTargetTxId(txId);
                  setTargetBalNo(balNo);
                  handleSelectModule('modul-0-timbangan');
                }}
                onAddPetani={() => {
                  setEditingPetani(null);
                  setIsFormModalOpen(true);
                }}
                initialTxId={targetSortirTxId}
                onInitialTxHandled={() => setTargetSortirTxId(undefined)}
              />
            )}

            {/*  Proses 2 - Timbangan Page */}
            {activeModuleId === 'modul-0-timbangan' && (
              <TimbanganPageView
                transaksiList={transaksiList}
                petaniList={petaniList}
                hargaList={hargaList}
                barangList={barangList}

                userRole={currentRole}
                currentUser={currentUser}
                initialKuponNo={targetKuponNo}
                initialTxId={targetTxId}
                initialBalNo={targetBalNo}
                onSaveTransaksi={(newTx, newBarangs, meta) => {
                  handleSaveTransaksi(newTx, newBarangs, { ...meta, silent: true });
                  showToast(`Data timbangan kupon ${newTx.no_kupon} diperbarui!`);
                }}
                onRefreshTransaksiList={async () => {
                  const res = await ErpApiService.getTransaksiList();
                  if (!res.fromBackend) return loadTransaksiData();
                  const prev = loadTransaksiData();
                  const byId = new Map(prev.map((t) => [t.transaksi_id, t]));
                  const fromServer = res.data.map((incoming) =>
                    mergeKuponParalel(byId.get(incoming.transaksi_id), incoming)
                  );
                  const serverIds = new Set(fromServer.map((t) => t.transaksi_id));
                  const localOnly = prev.filter((t) => !serverIds.has(t.transaksi_id));
                  const next = [...fromServer, ...localOnly];
                  // Layar hanya diperbarui bila data memang berubah, agar isian operator tidak terganggu
                  if (JSON.stringify(next) === JSON.stringify(prev)) return prev;
                  setTransaksiList(next);
                  saveTransaksiData(next);
                  return next;
                }}
                onNavigateToKasir={(kuponNo, txId) => {
                  setTargetKuponNo(kuponNo);
                  setTargetTxId(txId);
                  setTargetBalNo(undefined);
                  handleSelectModule('modul-0-kasir');
                }}
                onNavigateToSortir={() => {
                  handleSelectModule('modul-0-sortir');
                }}
              />
            )}

            {/*  Proses 3 - Kasir & Rekap Data Pembelian Page */}
            {(activeModuleId === 'modul-0-kasir' || activeModuleId === 'modul-0-transaksi') && (
              <KasirPageView
                transaksiList={transaksiList}
                petaniList={petaniList}
                hargaList={hargaList}
                barangList={barangList}
                
                userRole={currentRole}
                currentUser={currentUser}
                initialKuponNo={targetKuponNo}
                initialTxId={targetTxId}
                onSaveTransaksi={handleSaveTransaksi}
                onDeleteTransaksi={handleDeleteTransaksi}
                onNavigateToSortir={() => {
                  handleSelectModule('modul-0-sortir');
                }}
                onNavigateToTimbangan={(kuponNo, txId) => {
                  setTargetKuponNo(kuponNo);
                  setTargetTxId(txId);
                  handleSelectModule('modul-0-timbangan');
                }}
                onEditKupon={(tx) => {
                  setTargetSortirTxId(tx.transaksi_id);
                  handleSelectModule('modul-0-sortir');
                }}
              />
            )}

            {/* PRD 6.2: Pengiriman Sample */}
            {activeModuleId === 'modul-4-sample' && (
              <SampleManagement
                batchSampleList={batchSampleList}
                barangList={barangList}
                
                petaniList={petaniList}
                hargaJualList={hargaJualList}
                hargaList={hargaList}
                transaksiList={transaksiList}
                userRole={currentRole}
                onSaveBatchSample={handleSaveBatchSample}
                onUpdateBatchSample={handleUpdateBatchSample}
                onNavigateToPengiriman={(batchId) => {
                  if (batchId) {
                    setSelectedBatchIdForShipment(batchId);
                    handleSelectModule('modul-5-pengiriman');
                  } else {
                    handleSelectModule('modul-status-batch');
                  }
                }}
                onNavigateToStatusBatch={() => handleSelectModule('modul-status-batch')}
                editBatchId={editBatchId}
                onSelesaiEdit={() => setEditBatchId(null)}
              />
            )}

            {/* PRD 6.1: Pengiriman Reguler (DO Luar) */}
            {activeModuleId === 'modul-5-pengiriman' && (
              <PengirimanManagement
                pengirimanList={pengirimanList}
                barangList={barangList}
                batchSampleList={batchSampleList}
                selectedBatchId={selectedBatchIdForShipment}
                
                petaniList={petaniList}
                hargaJualList={hargaJualList}
                tabelHarga={hargaList}
                transaksiList={transaksiList}
                userRole={currentRole}
                onSaveNewPengiriman={handleSaveNewPengiriman}
                onUpdatePengiriman={handleUpdatePengiriman}
                onDeletePengiriman={handleDeletePengiriman}
                onNavigateToStatusBatch={() => handleSelectModule('modul-status-batch')}
                editPengirimanId={editPengirimanId}
                onSelesaiEdit={() => setEditPengirimanId(null)}
              />
            )}

            {/*  Manajemen Pengguna (RBAC 5 Role) */}
            {activeModuleId === 'modul-users' && (
              <UserManagement
                userList={userList}
                currentUser={currentUser}
                
                onSaveUser={handleSaveUser}
                onToggleStatus={handleToggleUserStatus}
                onResetPassword={handleResetUserPassword}
              />
            )}

            {/* Master Harga Jual */}
            {activeModuleId === 'modul-3-harga-jual' && (
              <HargaJualManagement
                hargaJualList={hargaJualList}
                onSaveHargaJual={handleSaveHargaJual}
              />
            )}

            {/* Status & Detail Batch */}
            {activeModuleId === 'modul-status-batch' && (
              <StatusBatchPengirimanManagement
                batchSampleList={batchSampleList}
                pengirimanList={pengirimanList}
                barangList={barangList}
                hargaJualList={hargaJualList}
                onUpdateBatchSample={handleUpdateBatchSample}
                onDeleteBatchSample={handleDeleteBatchSample}
                onUpdatePengirimanStatus={handleUpdatePengirimanStatus}
                onDeletePengiriman={handleDeletePengiriman}
                onEditPengiriman={(pengirimanId) => {
                  setEditPengirimanId(pengirimanId);
                  handleSelectModule('modul-5-pengiriman');
                }}
                onEditBatchSample={(batchId) => {
                  setEditBatchId(batchId);
                  handleSelectModule('modul-4-sample');
                }}
                onNavigateToPengirimanWithBatch={(batchId) => {
                  setSelectedBatchIdForShipment(batchId);
                  handleSelectModule('modul-5-pengiriman');
                }}
              />
            )}

          </div>
          </Suspense>
          </ErrorBoundary>
        </main>

      </div>

      {/* Petani Modals */}
      <PetaniFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingPetani(null);
        }}
        onSave={handleSavePetani}
        existingPetaniList={petaniList}
        editingPetani={editingPetani}
      />

      <PetaniCardPrintModal
        isOpen={Boolean(printingPetani)}
        onClose={() => setPrintingPetani(null)}
        petani={printingPetani}
      />

      <PetaniDetailDrawer
        isOpen={Boolean(viewingPetani)}
        onClose={() => setViewingPetani(null)}
        petani={viewingPetani}
        userRole={currentRole}
        transaksiList={transaksiList}
        onEdit={(p) => {
          setViewingPetani(null);
          setEditingPetani(p);
          setIsFormModalOpen(true);
        }}
        onPrintCard={(p) => setPrintingPetani(p)}
        onToggleStatus={(p) => setDeactivatingPetani(p)}
        onResetCard={(p) => setResettingCardPetani(p)}
      />

      <PetaniDeactivateModal
        isOpen={Boolean(deactivatingPetani)}
        onClose={() => setDeactivatingPetani(null)}
        onConfirm={handleConfirmStatusToggle}
        petani={deactivatingPetani}
      />

      <PetaniResetCardModal
        isOpen={Boolean(resettingCardPetani)}
        onClose={() => setResettingCardPetani(null)}
        petani={resettingCardPetani}
        onConfirmReset={handleConfirmResetCardNumber}
        existingPetaniList={petaniList}
      />

      <PetaniImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        petaniList={petaniList}
        onImportSuccess={handleImportSuccess}
      />

      {/* Universal In-App Print & PDF Preview Modal */}
      {embeddedPrintDoc && (
        <Suspense fallback={null}>
        <DedicatedPrintView
          type={embeddedPrintDoc.type}
          id={embeddedPrintDoc.id}
          onClose={() => setEmbeddedPrintDoc(null)}
          isEmbedded={true}
          transaksiList={transaksiList}
          pengirimanList={pengirimanList}
          batchSampleList={batchSampleList}
          barangList={barangList}
          petaniList={petaniList}
          tabelHarga={hargaList}
        />
        </Suspense>
      )}

      {/* Toast Notification Popup */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 z-50 max-w-md flex items-start space-x-2 bg-slate-900 text-white px-4 py-3 rounded-sm shadow-xl border border-slate-800"
          role={toast.type === 'info' ? 'alert' : 'status'}
        >
          {toast.type === 'info' ? (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-px" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-px" />
          )}
          <span className="text-xs font-semibold leading-relaxed">{toast.message}</span>
        </div>
      )}

    </div>
  );
}

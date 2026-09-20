import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Petani, 
  Barang, 
  TabelHarga, 
  TransaksiPembelian, 
  PengirimanSample, 
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
  loadSampleData, 
  saveSampleData,
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
import { balTerkirimDariTransaksi, isSuratJalanTerkunci, pesanSuratJalanTerkunci, pesanTransaksiTerkunci } from './utils/kunciHapus';
import { clearAllDrafts, getDraftRecovery, markDraftCleanExit, touchDraftAlive } from './utils/draftStorage';
import { hasModuleAccess } from './utils/rbac';
import { antrianSinkron } from './services/antrianSinkron';
import { normalizeKg, generatePetaniId } from './utils/formatters';
import { hashPassword } from './utils/crypto';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';

// Auth Login View
import { LoginView } from './components/auth/LoginView';
import { ErpApiService } from './services/erpApi';

// User Management 
import { UserManagement } from './components/user/UserManagement';

// Home Dashboard 
import { HomeDashboardView } from './components/home/HomeDashboardView';

//  Dashboard Laporan & Analytic ERP
import { DashboardAnalyticView } from './components/laporan/DashboardAnalyticView';

// Laporan Bal Tembakau
import { LaporanBalView } from './components/laporan/LaporanBalView';

// Laporan Detail Bal Tembakau
import { LaporanKodeBalView } from './components/laporan/LaporanKodeBalView';

// Laporan Mutu Grade & Analisis Stok Inventaris
import { LaporanGradeView } from './components/laporan/LaporanGradeView';

//  Laporan Pembelian Barang
import { LaporanPembelianBarangView } from './components/laporan/LaporanPembelianBarangView';

// Laporan Petani & Rekapitulasi Setoran
import { LaporanPetaniView } from './components/laporan/LaporanPetaniView';

// Laporan Pengiriman & Distribusi Tembakau
import { LaporanPengirimanView } from './components/laporan/LaporanPengirimanView';

// PRD 4.1: Master Petani
import { PetaniTable } from './components/petani/PetaniTable';
import { PetaniFormModal } from './components/petani/PetaniFormModal';
import { PetaniCardPrintModal } from './components/petani/PetaniCardPrintModal';
import { PetaniDetailDrawer } from './components/petani/PetaniDetailDrawer';
import { PetaniDeactivateModal } from './components/petani/PetaniDeactivateModal';
import { PetaniResetCardModal } from './components/petani/PetaniResetCardModal';
import { PetaniImportExportModal } from './components/petani/PetaniImportExportModal';

// PRD 4.2: Master Harga Beli
import { HargaManagement } from './components/harga/HargaManagement';

//  Transaksi Pembelian Timbang & Kupon (3 Sub-menus: Sortir, Timbangan, Kasir)
import { SortirPageView } from './components/transaksi/SortirPageView';
import { TimbanganPageView } from './components/transaksi/TimbanganPageView';
import { KasirPageView } from './components/transaksi/KasirPageView';

// PRD 6.1: Pengiriman Reguler (DO Luar)
import { PengirimanManagement } from './components/pengiriman/PengirimanManagement';

// PRD 6.2: Pengiriman Sample
import { SampleManagement } from './components/sample/SampleManagement';

import { StatusBatchPengirimanManagement } from './components/pengiriman/StatusBatchPengirimanManagement';
import { HargaJualManagement } from './components/harga_jual/HargaJualManagement';
import { DedicatedPrintView } from './components/print/DedicatedPrintView';

import { CheckCircle2 } from 'lucide-react';

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
  const [barangList, setBarangList] = useState<Barang[]>(() => loadBarangData());
  const [hargaList, setHargaList] = useState<TabelHarga[]>(() => loadHargaData());
  const [transaksiList, setTransaksiList] = useState<TransaksiPembelian[]>(() => loadTransaksiData());
  const [sampleList, setSampleList] = useState<PengirimanSample[]>(() => loadSampleData());
  const [pengirimanList, setPengirimanList] = useState<PengirimanBarang[]>(() => loadPengirimanData());

  
  const [hargaJualList, setHargaJualList] = useState<MasterHargaJual[]>(() => loadHargaJualData());
  const [batchSampleList, setBatchSampleList] = useState<BatchPengirimanSample[]>(() => loadBatchSampleData());
  const [selectedBatchIdForShipment, setSelectedBatchIdForShipment] = useState<string>('');
  

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

    let fromBackend = false;
    if (petaniRes.fromBackend) {
      setPetaniList(petaniRes.data);
      fromBackend = true;
    }
    if (barangRes.fromBackend) {
      setBarangList(normalizeStatusBal(barangRes.data));
      fromBackend = true;
    }
    if (transaksiRes.fromBackend) {
      setTransaksiList(transaksiRes.data);
      fromBackend = true;
    }
    if (hargaRes.fromBackend) {
      setHargaList(hargaRes.data);
      fromBackend = true;
    }
    if (userRes.fromBackend) {
      setUserList(userRes.data);
      fromBackend = true;
    }
    if (hargaJualRes.fromBackend) {
      setHargaJualList(hargaJualRes.data);
      fromBackend = true;
    }
    if (batchRes.fromBackend) {
      setBatchSampleList(batchRes.data);
      fromBackend = true;
    }
    if (pengirimanRes.fromBackend) {
      setPengirimanList(pengirimanRes.data);
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
    antrianSinkron.pasang((tx, dasar, opsi) => ErpApiService.syncTransaksi(tx, dasar, { ...opsi, tanpaCekKesehatan: true }));
  }, [currentUser]);

  // Peringatan bila halaman ditutup padahal masih ada simpanan yang belum sampai ke server
  useEffect(() => {
    const peringatan = (e: BeforeUnloadEvent) => {
      if (antrianSinkron.ringkasan().menunggu > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', peringatan);
    return () => window.removeEventListener('beforeunload', peringatan);
  }, []);

  const [dashboardServerStats, setDashboardServerStats] = useState<{
    transaksi: {
      total_transaksi: number;
      total_bal: number;
      total_berat_kg: number;
      total_pembelian: number;
    } | null;
    stok_valuasi: Array<{
      gudang_id?: string;
      kode_grade?: string;
      bal_di_gudang?: number;
      kg_di_gudang?: number;
      valuasi_beli?: number;
    }>;
    pengiriman: {
      total_pengiriman: number;
      total_bal_terkirim: number;
      total_berat_terkirim: number;
      total_nilai_deal: number;
    } | null;
    pengiriman_terkirim?: {
      total_pengiriman: number;
      total_bal_terkirim: number;
      total_berat_terkirim: number;
      total_nilai_deal: number;
    } | null;
  } | null>(null);
  const [laporanRefreshing, setLaporanRefreshing] = useState(false);

  // Saat buka modul laporan: refresh list sumber dari BE agar angka tidak usang
  useEffect(() => {
    if (!currentUser || !activeModuleId.startsWith('modul-6-')) return;
    let cancelled = false;
    setLaporanRefreshing(true);
    (async () => {
      try {
        await refreshOperationalLists();
        if (activeModuleId === 'modul-6-dashboard-analytic') {
          const statsRes = await ErpApiService.getDashboardStats();
          if (!cancelled) {
            setDashboardServerStats(statsRes.fromBackend ? statsRes.data : null);
          }
        }
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

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Initial Load from localStorage
  useEffect(() => {
    setUserList(loadUserData());
    setPetaniList(loadPetaniData());
    setBarangList(normalizeStatusBal(loadBarangData()));
    setHargaList(loadHargaData());
    setTransaksiList(loadTransaksiData());
    setSampleList(loadSampleData());
    setPengirimanList(loadPengirimanData());
    setHargaJualList(loadHargaJualData());
    setBatchSampleList(loadBatchSampleData());

  }, []);

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
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity);
    });

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
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

  const handleDeleteUser = (userId: string) => {
    const target = userList.find((u) => u.user_id === userId);
    const updated = userList.filter((u) => u.user_id !== userId);
    setUserList(updated);
    saveUserData(updated);
    showToast(`Akun pengguna "${target?.nama_lengkap || userId}" berhasil dihapus dari sistem.`);
  };

  const handleToggleUserStatus = async (userId: string) => {
    const target = userList.find((u) => u.user_id === userId);
    if (!target) return;
    const nextStatus = !target.status_aktif;

    try {
      await ErpApiService.toggleUserStatus(userId, nextStatus);
    } catch (err: any) {
      console.warn('Gagal mengubah status pengguna di backend:', err);
    }

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
    try {
      await ErpApiService.resetUserPassword(userId, newPass);
    } catch (err: any) {
      console.warn('Gagal mereset kata sandi di backend:', err);
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
    const exists = Boolean(editingPetani);

    try {
      const saved = await ErpApiService.savePetani(petaniData, exists);

      let updated: Petani[];
      if (exists) {
        updated = petaniList.map((p) =>
          p.petani_id === saved.petani_id ? saved : p
        );
        showToast(`Data petani "${saved.nama_petani}" berhasil diperbarui.`);
      } else {
        updated = [saved, ...petaniList.filter((p) => p.petani_id !== saved.petani_id)];
        showToast(`Petani baru "${saved.nama_petani}" (${saved.petani_id}) berhasil disimpan!`);
      }

      setPetaniList(updated);
      savePetaniData(updated);
      setIsFormModalOpen(false);
      setEditingPetani(null);
      if (!exists) {
        setHighlightPetaniId(saved.petani_id);
      }
    } catch (err: any) {
      console.warn('Fallback penyimpanan lokal petani:', err);
      let updated: Petani[];
      let savedId = petaniData.petani_id;
      if (exists) {
        updated = petaniList.map((p) =>
          p.petani_id === petaniData.petani_id ? { ...p, ...petaniData } : p
        );
        showToast(`Data petani "${petaniData.nama_petani}" berhasil diperbarui.`);
      } else {
        const fallbackSaved: Petani = {
          ...petaniData,
          petani_id: petaniData.petani_id || generatePetaniId(petaniList),
          status_aktif: true,
          tanggal_daftar: petaniData.tanggal_daftar || new Date().toISOString().split('T')[0],
        };
        savedId = fallbackSaved.petani_id;
        updated = [fallbackSaved, ...petaniList.filter((p) => p.petani_id !== fallbackSaved.petani_id)];
        showToast(`Petani baru "${fallbackSaved.nama_petani}" (${fallbackSaved.petani_id}) berhasil disimpan!`);
      }
      setPetaniList(updated);
      savePetaniData(updated);
      setIsFormModalOpen(false);
      setEditingPetani(null);
      if (!exists) {
        setHighlightPetaniId(savedId);
      }
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

    try {
      await ErpApiService.savePetani({
        petani_id: petaniId,
        status_aktif: isNowActive,
        alasan_nonaktif: isNowActive ? undefined : reason,
      }, true);
    } catch (err) {
      console.warn('Gagal sync status petani ke PostgreSQL:', err);
    }

    const updated = petaniList.map((p) =>
      p.petani_id === petaniId
        ? { ...p, status_aktif: isNowActive, alasan_nonaktif: isNowActive ? undefined : reason }
        : p,
    );

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
        const hasil = await ErpApiService.savePetani({
          nama_petani: p.nama_petani.trim(),
          no_hp: p.no_hp || '',
          alamat: p.alamat || '',
          desa_kecamatan: p.desa_kecamatan || undefined,
          status_aktif: true,
          tanggal_daftar: new Date().toISOString().split('T')[0],
        }, false);
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

  const handleDeletePetani = async (petaniId: string) => {
    const target = petaniList.find((p) => p.petani_id === petaniId);
    try {
      await ErpApiService.deletePetani(petaniId);
    } catch (err: any) {
      console.warn('Gagal menonaktifkan petani di backend API:', err);
    }

    const updated = petaniList.map((p) =>
      p.petani_id === petaniId
        ? { ...p, status_aktif: false, alasan_nonaktif: 'Dinonaktifkan oleh pengguna' }
        : p
    );
    setPetaniList(updated);
    savePetaniData(updated);
    setViewingPetani(null);
    showToast(`Data petani "${target?.nama_petani || petaniId}" (${target?.petani_id || ''}) berhasil dinonaktifkan.`);
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

    try {
      const saved = await ErpApiService.saveHargaBeli(newPrice);
      if (saved && saved !== newPrice) terapkanHarga(saved);
    } catch (err: any) {
      console.warn('Gagal sinkron harga ke server backend, tersimpan lokal:', err);
      showToast(`Tarif Grade ${newPrice.kode_grade} tersimpan lokal, belum masuk server (${err?.message || 'koneksi error'}).`, 'info');
    }
  };

  const handleDeleteHarga = (hargaId: string) => {
    const target = hargaList.find((h) => h.harga_id === hargaId);
    const updated = hargaList.filter((h) => h.harga_id !== hargaId);
    setHargaList(updated);
    saveHargaData(updated);
    showToast(`Tarif Grade "${target?.kode_grade || hargaId}" (Rp ${(target?.harga_per_kg || 0).toLocaleString('id-ID')}) berhasil dihapus dari Master Harga.`);
  };

  // --- PRD 5.6: Barang / Inventaris Handlers ---
  const handleUpdateBarang = async (updated: Barang) => {
    if (currentUser?.status_aktif === false) return showToast('Akun Anda dinonaktifkan.', 'info');
    const list = barangList.map((b) => (b.barang_id === updated.barang_id ? updated : b));
    setBarangList(list);
    saveBarangData(list);

    try {
      await ErpApiService.updateBarang(updated);
    } catch (err: any) {
      console.warn('Gagal memperbarui data barang di backend API:', err);
    }

    showToast(`Data bal ${updated.no_bal} berhasil diperbarui di PostgreSQL.`);
  };

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
        modul: meta.koreksi ? 'Koreksi Transaksi' : 'Transaksi Pembelian',
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
      const hasilAntrian = await antrianSinkron.masukkan(newTx, oldTx, { koreksi: Boolean(meta.koreksi) });
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
                potongan_tikar: gantiTikar ? potTikar || 75000 : 0,
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

        if (syncedTx.status_pembayaran === 'lunas' || meta.koreksi) {
          try {
            const barangRes = await ErpApiService.getBarangList();
            if (barangRes.fromBackend) setBarangList(normalizeStatusBal(barangRes.data));
          } catch (err) {
            console.warn('Gagal refresh barang setelah simpan/koreksi:', err);
          }
        }
      } else if (meta.koreksi) {
        showToast('Koreksi tersimpan lokal. Server offline — sync ulang saat online.', 'info');
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi transaksi ke backend API, data lokal tetap dipakai:', err);
      if (meta.koreksi) {
        showToast(`Koreksi lokal OK, gagal sync server: ${err instanceof Error ? err.message : 'error'}`, 'info');
      }
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

    // Kupon yang dihapus tidak perlu lagi dikirim ke server lewat antrean
    antrianSinkron.batalkan(transaksiId);

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
    const itemBalList = (txToDelete.items && txToDelete.items.length > 0)
      ? txToDelete.items.map((i) => i.no_bal || i.barcode).join(', ')
      : txToDelete.no_bal || '-';
    const totalNilai = txToDelete.harga_final || txToDelete.total_harga_beli || 0;

    

    
    showToast(`Transaksi ${transaksiId} dan data bal terkait berhasil dihapus.`);
  };

  // --- PRD 6.2: Pengiriman Sample Handlers ---
  const handleSaveNewSample = (sample: PengirimanSample) => {
    if (currentUser?.status_aktif === false) return showToast('Akun Anda dinonaktifkan.', 'info');
    const updated = [sample, ...sampleList];
    setSampleList(updated);
    saveSampleData(updated);
    showToast(`Sample bal ${sample.no_bal || "-"} berhasil dikirim.`);
  };

  const handleSaveBatchSamples = (newSamples: PengirimanSample[], updatedBarangs: Barang[]) => {
    if (currentUser?.status_aktif === false) return showToast('Akun Anda dinonaktifkan.', 'info');
    const updatedSampleList = [...newSamples, ...sampleList];
    setSampleList(updatedSampleList);
    saveSampleData(updatedSampleList);

    const updatedBarangMap = new Map(updatedBarangs.map((b) => [b.barang_id, b]));
    const updatedBarangList = barangList.map((b) => updatedBarangMap.get(b.barang_id) || b);
    setBarangList(updatedBarangList);
    saveBarangData(updatedBarangList);

    showToast(`${newSamples.length} sampel tembakau berhasil diproses kirim ke Lab QC!`);
  };

  const handleUpdateSample = (sample: PengirimanSample) => {
    const updated = sampleList.map((s) => (s.sample_id === sample.sample_id ? sample : s));
    setSampleList(updated);
    saveSampleData(updated);
    showToast(`Status sampel bal ${sample.no_bal || "-"} diupdate menjadi "${sample.status.toUpperCase()}".`);
  };

  // --- PRD 6.1: Pengiriman Barang (DO) Handlers ---
  const handleSaveNewPengiriman = async (newPengiriman: PengirimanBarang, updatedBarangIds: string[]) => {
    if (currentUser?.status_aktif === false) return showToast('Akun Anda dinonaktifkan.', 'info');

    const updatedSet = new Set(updatedBarangIds);

    // 1) Langsung tampil: surat jalan baru, bal berstatus keluar, dan tanda DO pada batch sample
    setPengirimanList((prev) => {
      const next = [newPengiriman, ...prev.filter((p) => p.pengiriman_id !== newPengiriman.pengiriman_id)];
      savePengirimanData(next);
      return next;
    });
    setBarangList((prev) => {
      const next = prev.map((b) =>
        updatedSet.has(b.barang_id)
          ? { ...b, status_stok: 'keluar' as const, pengiriman_id: newPengiriman.pengiriman_id }
          : b
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

    showToast(`Surat Jalan ${newPengiriman.no_surat_jalan} diterbitkan (${newPengiriman.total_bal || updatedBarangIds.length} bal keluar)!`);

    // 2) Sinkron ke server di belakang; server hanya menentukan ID, rincian lokal tetap dipakai
    try {
      const saved = await ErpApiService.savePengiriman(newPengiriman, updatedBarangIds);
      const idBaru = saved.pengiriman_id || newPengiriman.pengiriman_id;
      setPengirimanList((prev) => {
        const next = prev.map((p) => (p.pengiriman_id === newPengiriman.pengiriman_id ? { ...saved, pengiriman_id: idBaru } : p));
        savePengirimanData(next);
        return next;
      });
      if (idBaru !== newPengiriman.pengiriman_id) {
        setBarangList((prev) => {
          const next = prev.map((b) => (b.pengiriman_id === newPengiriman.pengiriman_id ? { ...b, pengiriman_id: idBaru } : b));
          saveBarangData(next);
          return next;
        });
      }
      const barangRes = await ErpApiService.getBarangList();
      if (barangRes.fromBackend) setBarangList(barangRes.data);
    } catch (err: any) {
      console.warn('Gagal menyimpan pengiriman ke API backend, tersimpan lokal:', err);
    }

    // Persist flag DO ke BE bila batch sudah ada di server
    if (batchTerkait) {
      try {
        await ErpApiService.updateBatchSample(batchTerkait);
      } catch {
        /* offline / batch lokal */
      }
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

    try {
      const saved = await ErpApiService.saveHargaJual(item);
      if (saved && saved.harga_jual_id) terapkan(saved);
    } catch (err: any) {
      showToast(err?.message || 'Harga jual tersimpan lokal, belum masuk server.', 'info');
    }
  };

  const handleDeleteHargaJual = (id: string) => {
    const updated = hargaJualList.filter((h) => h.harga_jual_id !== id);
    setHargaJualList(updated);
    saveHargaJualData(updated);
    showToast('Harga jual berhasil dihapus.');
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
    showToast(`Batch Sample ${newBatch.kode_batch} berhasil dikirim ke ${newBatch.tujuan_buyer}!`);

    // 2) Sinkron ke server di belakang (No. Surat Sample manual tetap dipakai)
    try {
      const saved = await ErpApiService.saveBatchSample(newBatch);
      setBatchSampleList((prev) => {
        const next = prev.map((b) => (b.batch_id === newBatch.batch_id ? saved : b));
        saveBatchSampleData(next);
        return next;
      });
      const barangRes = await ErpApiService.getBarangList();
      if (barangRes.fromBackend) setBarangList(barangRes.data);
    } catch (err: any) {
      console.warn('Gagal menyimpan batch sample ke API backend, tersimpan lokal:', err);
    }
  };


  const handleDeleteBatchSample = (batchId: string, revertedBarangs?: Barang[]) => {
    if (currentUser?.status_aktif === false) return showToast('Akun Anda dinonaktifkan.', 'info');
    const kodeBatch = batchSampleList.find((b) => b.batch_id === batchId)?.kode_batch || '';
    const list = batchSampleList.filter(b => b.batch_id !== batchId);
    setBatchSampleList(list);
    saveBatchSampleData(list);
    
    if (revertedBarangs && revertedBarangs.length > 0) {
      const updatedBarangMap = new Map(revertedBarangs.map((b) => [b.barang_id, b]));
      const newBarangList = barangList.map((b) => updatedBarangMap.get(b.barang_id) || b);
      setBarangList(newBarangList);
      saveBarangData(newBarangList);
    }
    
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

    // 2) Sinkron ke server di belakang
    try {
      const saved = await ErpApiService.updateBatchSample(updatedBatch);
      setBatchSampleList((prev) => {
        const next = prev.map((b) => (b.batch_id === updatedBatch.batch_id ? saved : b));
        saveBatchSampleData(next);
        return next;
      });
    } catch (err: any) {
      console.warn('Gagal update batch sample ke API, tersimpan lokal:', err);
    }
  };

  const handleUpdatePengiriman = (updatedPengiriman: PengirimanBarang) => {
    const list = pengirimanList.map(p => p.pengiriman_id === updatedPengiriman.pengiriman_id ? updatedPengiriman : p);
    setPengirimanList(list);
    savePengirimanData(list);
    showToast(`Data pengiriman DO berhasil diperbarui.`);
  };

  const handleDeletePengiriman = (pengirimanId: string, revertedBarangs?: Barang[]) => {
    const target = pengirimanList.find((p) => p.pengiriman_id === pengirimanId);
    if (target && isSuratJalanTerkunci(target)) {
      showToast(pesanSuratJalanTerkunci(target), 'info');
      return;
    }

    const list = pengirimanList.filter((p) => p.pengiriman_id !== pengirimanId);
    setPengirimanList(list);
    savePengirimanData(list);

    if (revertedBarangs && revertedBarangs.length > 0) {
      const updatedBarangMap = new Map(revertedBarangs.map((b) => [b.barang_id, b]));
      const newBarangList = barangList.map((b) => updatedBarangMap.get(b.barang_id) || b);
      setBarangList(newBarangList);
      saveBarangData(newBarangList);
    }
    
    showToast(`Pengiriman (DO) berhasil dihapus.`);
  };

  const handleUpdatePengirimanStatus = (pengirimanId: string, newStatus: string) => {
    const updated = pengirimanList.map(p => p.pengiriman_id === pengirimanId ? { ...p, status: newStatus as any } : p);
    setPengirimanList(updated);
    savePengirimanData(updated);
    showToast(`Status surat jalan ${pengirimanList.find((p) => p.pengiriman_id === pengirimanId)?.no_surat_jalan || ''} menjadi ${newStatus}.`);
  };

  // Laporan nilai/aset hanya memakai bal dari kupon yang sudah dibayar
  const barangLunasList = useMemo(() => filterBarangLunas(barangList, transaksiList), [barangList, transaksiList]);

  const totalPetani = petaniList.length;
  const totalAktif = petaniList.filter((p) => p.status_aktif).length;
  const totalNonaktif = totalPetani - totalAktif;

  // Breadcrumb title map
  const getPageTitleAndBreadcrumb = () => {
    switch (activeModuleId) {
      case 'modul-home':
        return { title: 'Dasbor Menu Utama', breadcrumb: 'PT. SEKAR MAJU SEJAHTERA / Beranda' };
      case 'modul-6-dashboard-analytic':
        return { title: 'Dashboard Laporan & Analytic ERP', breadcrumb: 'Beranda / Dashboard Analytic' };
      case 'modul-6-laporan-bal':
        return { title: 'Laporan Bal Tembakau', breadcrumb: 'Beranda / Laporan Bal' };
      case 'modul-6-laporan-kode-bal':
        return { title: 'Laporan Kode Bal', breadcrumb: 'Beranda / Laporan Kode Bal' };
      case 'modul-6-laporan-grade':
        return { title: 'Laporan Harga', breadcrumb: 'Beranda / Laporan Harga' };
      case 'modul-6-laporan-pembelian':
        return { title: 'Laporan Pembelian Barang', breadcrumb: 'Beranda / Laporan Pembelian' };
      case 'modul-6-laporan-petani':
        return { title: 'Laporan Petani & Rekapitulasi Setoran', breadcrumb: 'Beranda / Laporan Petani' };
      case 'modul-6-laporan-pengiriman':
        return { title: 'Laporan Pengiriman & Distribusi Tembakau', breadcrumb: 'Beranda / Laporan Pengiriman' };
      case 'modul-1-petani':
        return { title: 'Master Data Petani', breadcrumb: 'Beranda / Master Petani' };
      case 'modul-3-harga':
        return { title: 'Master Harga Beli', breadcrumb: 'Beranda / Master Harga' };
      case 'modul-3-harga-jual':
        return { title: 'Master Harga Jual Pabrik', breadcrumb: 'Beranda / Master Harga Jual' };
      case 'modul-0-sortir':
        return { title: 'Sortir Mutu Grade & Sample Bal', breadcrumb: 'Beranda / Pembelian / Sortir' };
      case 'modul-0-timbangan':
        return { title: 'Meja Timbangan Bal', breadcrumb: 'Beranda / Pembelian / Timbangan' };
      case 'modul-0-kasir':
      case 'modul-0-transaksi':
        return { title: 'Data Pembelian Barang (Kasir & Cetak Nota)', breadcrumb: 'Beranda / Pembelian / Kasir' };
      case 'modul-5-pengiriman':
        return { title: 'Pengiriman Reguler (DO Luar)', breadcrumb: 'Beranda / Pengiriman DO' };
      case 'modul-4-sample':
        return { title: 'Pengiriman Sample', breadcrumb: 'Beranda / Pengiriman Sample' };
      case 'modul-status-batch':
        return { title: 'Status & Detail Batch Sample', breadcrumb: 'Beranda / Status Batch' };
      case 'modul-users':
        return { title: 'Manajemen Pengguna (RBAC)', breadcrumb: 'Beranda / Manajemen Pengguna' };
      default:
        return { title: 'Sistem Data Gudang Tembakau', breadcrumb: 'PT. SEKAR MAJU SEJAHTERA / Sistem Data Gudang' };
    }
  };

  const pageInfo = getPageTitleAndBreadcrumb();

  // Seluruh halaman berada di balik autentikasi, termasuk rute cetak mandiri.
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Halaman cetak mandiri (?cetak=nota&id=...)
  if (printParam) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#212529] font-sans flex flex-col antialiased">
      
      {/* Top Professional ERP Header */}
      <Header
        totalPetani={totalPetani}
        totalAktif={totalAktif}
        totalNonaktif={totalNonaktif}
        pageTitle={pageInfo.title}
        pageBreadcrumb={pageInfo.breadcrumb}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenUsers={() => handleSelectModule('modul-users')}
        allUsers={userList}
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
            sampleCount={sampleList.length}
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
              sampleCount={sampleList.length}
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
          <div className="w-full space-y-2.5">
            
            {/* Dashboard Menu */}
            {activeModuleId === 'modul-home' && (
              <HomeDashboardView
                onNavigate={(modId) => handleSelectModule(modId)}
                petaniList={petaniList}
                barangList={barangList}
                transaksiList={transaksiList}
                sampleList={sampleList}
                pengirimanList={pengirimanList}
                currentUser={currentUser}
                userCount={userList.length}
              />
            )}

            {/*  Dashboard Laporan & Analytic ERP */}
            {activeModuleId === 'modul-6-dashboard-analytic' && (
              <DashboardAnalyticView
                transaksiList={transaksiList}
                barangList={barangList}
                sampleList={sampleList}
                pengirimanList={pengirimanList}
                hargaList={hargaList}
                hargaJualList={hargaJualList}
                serverStats={dashboardServerStats}
                isRefreshing={laporanRefreshing}
                userRole={currentRole}
                onNavigateToModule={(modId) => handleSelectModule(modId)}
                onRefreshSources={async () => {
                  setLaporanRefreshing(true);
                  try {
                    await refreshOperationalLists();
                    const statsRes = await ErpApiService.getDashboardStats();
                    setDashboardServerStats(statsRes.fromBackend ? statsRes.data : null);
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

            {/* Laporan Kode Bal */}
            {activeModuleId === 'modul-6-laporan-kode-bal' && (
              <LaporanKodeBalView barangList={barangLunasList} />
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
                sampleList={sampleList}
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
                sampleList={sampleList}
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
                sampleList={sampleList}
                batchSampleList={batchSampleList}
                barangList={barangList}
                
                petaniList={petaniList}
                hargaJualList={hargaJualList}
                hargaList={hargaList}
                transaksiList={transaksiList}
                userRole={currentRole}
                onSaveNewSample={handleSaveNewSample}
                onSaveBatchSamples={handleSaveBatchSamples}

                onSaveBatchSample={handleSaveBatchSample}
                onUpdateBatchSample={handleUpdateBatchSample}
                onDeleteBatchSample={handleDeleteBatchSample}
                onUpdateSample={handleUpdateSample}
                onNavigateToPengiriman={(batchId) => {
                  if (batchId) {
                    setSelectedBatchIdForShipment(batchId);
                    handleSelectModule('modul-5-pengiriman');
                  } else {
                    handleSelectModule('modul-status-batch');
                  }
                }}
              />
            )}

            {/* PRD 6.1: Pengiriman Reguler (DO Luar) */}
            {activeModuleId === 'modul-5-pengiriman' && (
              <PengirimanManagement
                pengirimanList={pengirimanList}
                barangList={barangList}
                sampleList={sampleList}
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
                onNavigateToPengirimanWithBatch={(batchId) => {
                  setSelectedBatchIdForShipment(batchId);
                  handleSelectModule('modul-5-pengiriman');
                }}
              />
            )}

            {/* Log Aktivitas */}
            

          </div>
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
        <DedicatedPrintView
          type={embeddedPrintDoc.type}
          id={embeddedPrintDoc.id}
          onClose={() => setEmbeddedPrintDoc(null)}
          isEmbedded={true}
          transaksiList={transaksiList}
          pengirimanList={pengirimanList}
          barangList={barangList}
          petaniList={petaniList}
          tabelHarga={hargaList}
        />
      )}

      {/* Toast Notification Popup */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 bg-slate-900 text-white px-4 py-3 rounded-sm shadow-xl border border-slate-800 animate-in slide-in-from-bottom-5 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

    </div>
  );
}

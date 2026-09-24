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
  SaveTransaksiMeta,
  StatusPengiriman,
} from './types';
import {
  loadCurrentUser,
  saveCurrentUser,
  recordAuditLog,
} from './utils/storage';
import { filterBarangLunas } from './utils/statusBayar';
import { barisSampleDariBatch } from './utils/statusBatchSample';
import { balTerkirimDariTransaksi, isSuratJalanTerkunci, pesanSuratJalanTerkunci, pesanTransaksiTerkunci } from './utils/kunciHapus';
import {
  cariSuratJalanBentrok,
  keluarkanBal,
  kembalikanBalKeGudang,
  LABEL_STATUS_PENGIRIMAN,
  sesuaikanBatchSetelahPerubahanDO,
} from './utils/alurPengiriman';
import { clearAllDrafts, getDraftRecovery, markDraftCleanExit, touchDraftAlive } from './utils/draftStorage';
import { hasModuleAccess } from './utils/rbac';
import { normalizeKg } from './utils/formatters';
import { hashPassword } from './utils/crypto';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';

// Auth Login View
import { LoginView } from './components/auth/LoginView';
import { ErpApiService } from './services/erpApi';
import { api, EVENT_SESI_HABIS, getAuthToken, pesanGalatApi, setAuthToken } from './services/apiClient';
import { antrianKupon } from './services/antrianKupon';
import { terapkanOperasi, turunkanOperasi } from './services/operasiKupon';
import {
  gantiIdPetaniServer,
  hapusBatchSampleServer,
  hapusPengirimanServer,
  hapusTransaksiServer,
  serverAktif,
  simpanBatchSampleServer,
  simpanHargaBeliServer,
  simpanHargaJualServer,
  simpanPengirimanServer,
  simpanPetaniServer,
  simpanUserServer,
  ubahStatusPengirimanServer,
  ubahStatusUserServer,
} from './services/mutasiServer';
import { useDataServer } from './hooks/useDataServer';
import { hitungStatistikPetani, turunkanDaftarBal } from './utils/turunanData';
import { bersihkanAntreanLama } from './utils/antreanLama';
import { tampilkanInfo } from './utils/dialog';

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
import { hariIniLokal } from './utils/rentangTanggal';

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

  // ---------------------------------------------------------------------------------------------------------------
  // DATA: server adalah satu-satunya sumber. Semua daftar di bawah ini berasal dari server (dimuat penuh saat login,
  // lalu hanya perubahannya tiap beberapa detik) dan dipakai apa adanya oleh semua menu serta laporan.
  // Kupon: data server + operasi Sortir/Timbangan/Kasir yang belum terkirim (antrianKupon).
  // ---------------------------------------------------------------------------------------------------------------
  const { data, sinkronkan, pasangBaris, hapusBaris, ubahDaftar } = useDataServer(Boolean(currentUser));
  const [versiAntrianKupon, setVersiAntrianKupon] = useState(() => antrianKupon.versi());
  useEffect(() => antrianKupon.berlangganan(() => setVersiAntrianKupon(antrianKupon.versi())), []);

  const transaksiList = useMemo(
    () => antrianKupon.terapkanKeDaftar(data.transaksi),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.transaksi, versiAntrianKupon]
  );
  const pengirimanList = data.pengiriman;
  const batchSampleList = data.batch_sample;
  const hargaList = data.harga_beli;
  const hargaJualList = data.harga_jual;
  const userList = data.users;
  const petaniList = useMemo(() => hitungStatistikPetani(data.petani, transaksiList), [data.petani, transaksiList]);
  const barangList = useMemo(() => turunkanDaftarBal(data.barang, transaksiList, pengirimanList), [data.barang, transaksiList, pengirimanList]);
  // Referensi terbaru untuk fungsi yang dipanggil setelah menunggu server
  const dataRef = useRef(data);
  dataRef.current = data;

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

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 'info' dipakai untuk pemberitahuan, penolakan, dan kegagalan; tampil dengan ikon peringatan, bukan centang
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), type === 'info' ? 7000 : 3500);
  };
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // Antrean simpanan versi aplikasi sebelumnya: berisi perubahan yang tidak pernah diterima server. Dibuang (tidak
  // aman dikirim ulang karena bisa basi) dan operator diberi tahu apa yang perlu dicek ulang.
  useEffect(() => {
    const dibuang = bersihkanAntreanLama();
    if (dibuang.length > 0) {
      void tampilkanInfo(
        `Ditemukan ${dibuang.length} perubahan dari versi aplikasi sebelumnya yang tidak pernah tersimpan di server ` +
          `(hanya ada di komputer ini). Perubahan tersebut dibuang agar semua komputer kembali sama. ` +
          `Periksa dan ulangi bila masih diperlukan: ${dibuang.slice(0, 12).join('; ')}${dibuang.length > 12 ? '; ...' : ''}.`,
        { judul: 'Data disamakan dengan server' }
      );
    }
  }, []);

  // --- Sesi login di server ---------------------------------------------------------------------------------------
  const handleLogout = (alasan: 'manual' | 'idle' | 'sesi' = 'manual') => {
    const token = getAuthToken();
    if (alasan !== 'sesi' && token && serverAktif()) {
      // Token dicabut di server; kegagalan (mis. offline) tidak menahan logout
      void api.post('/auth/logout').catch(() => undefined);
    }
    setAuthToken(null);
    antrianKupon.lepas();
    setCurrentUser(null);
    saveCurrentUser(null);
    clearAllDrafts();
    if (alasan === 'idle') {
      showToast('Sesi berakhir otomatis karena tidak ada aktivitas selama 30 menit demi keamanan.', 'info');
    } else if (alasan === 'sesi') {
      showToast('Sesi login di server sudah berakhir. Silakan login kembali; simpanan kupon yang tertunda akan dikirim setelah login.', 'info');
    } else {
      showToast('Anda telah berhasil keluar dari sistem.', 'info');
    }
  };
  const handleLogoutRef = useRef(handleLogout);
  handleLogoutRef.current = handleLogout;

  // Server menjawab 401 (token dicabut / akun dinonaktifkan / login cadangan tanpa server): minta login ulang, jangan
  // bekerja diam-diam dengan data yang tidak bisa tersimpan.
  useEffect(() => {
    if (!currentUser) return;
    const saatSesiHabis = (e: Event) => {
      const tokenDitolak = (e as CustomEvent<{ token?: string | null }>).detail?.token ?? null;
      if (tokenDitolak !== getAuthToken()) return;
      handleLogoutRef.current('sesi');
    };
    window.addEventListener(EVENT_SESI_HABIS, saatSesiHabis);
    return () => window.removeEventListener(EVENT_SESI_HABIS, saatSesiHabis);
  }, [currentUser]);

  // --- Antrean operasi kupon (Sortir, Timbangan, Kasir) ----------------------------------------------------------
  useEffect(() => {
    if (!currentUser || !serverAktif()) return;
    antrianKupon.pasang((transaksiId, op) => ErpApiService.kirimOperasiKupon(transaksiId, op));
    const lepas = [
      antrianKupon.saatBerhasil((_idLama, tx) => {
        pasangBaris('transaksi', tx);
        // Pelunasan menerbitkan stok bal di server; ambil segera
        if (tx.status_pembayaran === 'lunas') void sinkronkan();
      }),
      antrianKupon.saatDitolak((tugas, pesan) => {
        showToastRef.current(`${tugas.label} dibatalkan: ${pesan}`, 'info');
        void sinkronkan();
      }),
      antrianKupon.saatKuponDihapus((transaksiId, noKupon, pesan) => {
        hapusBaris('transaksi', transaksiId);
        showToastRef.current(pesan || `Kupon ${noKupon} sudah dihapus di komputer lain.`, 'info');
        void sinkronkan();
      }),
      antrianKupon.saatButuhLogin(() => handleLogoutRef.current('sesi')),
    ];
    return () => lepas.forEach((fn) => fn());
  }, [currentUser, pasangBaris, hapusBaris, sinkronkan]);

  // Peringatan bila halaman ditutup padahal masih ada simpanan kupon yang belum sampai ke server
  useEffect(() => {
    const peringatan = (e: BeforeUnloadEvent) => {
      if (antrianKupon.ringkasan().menunggu > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', peringatan);
    return () => window.removeEventListener('beforeunload', peringatan);
  }, []);

  const [laporanRefreshing, setLaporanRefreshing] = useState(false);
  const muatUlangPenuh = useCallback(async () => {
    setLaporanRefreshing(true);
    try {
      await sinkronkan({ penuh: true });
    } finally {
      setLaporanRefreshing(false);
    }
  }, [sinkronkan]);

  // Laporan dibuka: muat ulang penuh dari server supaya angka laporan pasti sama dengan server
  useEffect(() => {
    if (!currentUser || !activeModuleId.startsWith('modul-6-')) return;
    void muatUlangPenuh();
  }, [activeModuleId, currentUser, muatUlangPenuh]);

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
    setActiveModuleId('modul-home');
    showToast(`Selamat Datang, ${user.nama_lengkap}! Login berhasil.`);
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
        handleLogoutRef.current('idle');
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

  // ---------------------------------------------------------------------------------------------------------------
  // PERUBAHAN DATA SELAIN KUPON: langsung ke server, layar mengikuti jawaban server.
  // ---------------------------------------------------------------------------------------------------------------
  const sedangSimpan = useRef(new Set<string>());

  /**
   * Menjalankan satu perubahan ke server. Layar baru berubah lewat `berhasil` (dengan data jawaban server). Bila server
   * menolak atau tidak terjangkau, alasannya ditampilkan dan data di layar tetap: tidak ada lagi perubahan yang hanya
   * tersimpan di satu komputer. Setelahnya data disinkronkan agar efek sampingnya (stok bal, batch, dll.) ikut terlihat.
   */
  const kirimKeServer = async <T,>(kunci: string, label: string, kerja: () => Promise<T>, berhasil: (hasil: T) => void): Promise<boolean> => {
    if (sedangSimpan.current.has(kunci)) {
      showToast(`${label} masih disimpan. Tunggu sebentar.`, 'info');
      return false;
    }
    sedangSimpan.current.add(kunci);
    try {
      const hasil = await kerja();
      berhasil(hasil);
      void sinkronkan();
      return true;
    } catch (err) {
      showToast(`${label} tidak tersimpan: ${pesanGalatApi(err)}. Data di server tidak berubah.`, 'info');
      void sinkronkan();
      return false;
    } finally {
      sedangSimpan.current.delete(kunci);
    }
  };

  // --- User Management Handlers ---
  const handleSaveUser = async (savedUser: User): Promise<boolean> => {
    const existingUser = userList.find((u) => u.user_id === savedUser.user_id);
    const exists = Boolean(existingUser);
    const setelahSimpan = (saved: User) => {
      showToast(exists ? `Data akun pengguna "${saved.nama_lengkap}" berhasil diperbarui.` : `Akun "${saved.username}" berhasil didaftarkan.`);
      if (currentUser?.user_id === saved.user_id) {
        const diri = { ...currentUser, ...saved, password: undefined };
        setCurrentUser(diri);
        saveCurrentUser(diri);
      }
    };

    if (!serverAktif()) {
      try {
        const saved = await ErpApiService.saveUser(savedUser, exists);
        ubahDaftar('users', (lama) => (exists ? lama.map((u) => (u.user_id === saved.user_id ? saved : u)) : [saved, ...lama.filter((u) => u.user_id !== saved.user_id)]));
        setelahSimpan(saved);
        return true;
      } catch (err: any) {
        showToast(err?.message || 'Gagal menyimpan data pengguna ke sistem.', 'info');
        return false;
      }
    }
    return kirimKeServer(`user:${savedUser.user_id}`, `Akun ${savedUser.username}`, () => simpanUserServer(savedUser, !exists), (saved) => {
      pasangBaris('users', saved);
      setelahSimpan(saved);
    });
  };

  const handleToggleUserStatus = async (userId: string): Promise<boolean> => {
    const target = userList.find((u) => u.user_id === userId);
    if (!target) return false;
    const nextStatus = !target.status_aktif;
    const setelah = () => showToast(`Akun "${target.nama_lengkap}" sekarang ${nextStatus ? 'AKTIF' : 'NONAKTIF'}.`);

    if (!serverAktif()) {
      ubahDaftar('users', (lama) => lama.map((u) => (u.user_id === userId ? { ...u, status_aktif: nextStatus } : u)));
      setelah();
      return true;
    }
    return kirimKeServer(`user-status:${userId}`, `Status akun ${target.username}`, () => ubahStatusUserServer(userId, nextStatus), (saved) => {
      pasangBaris('users', saved);
      setelah();
    });
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
        showToast(`Kata sandi belum diubah: ${pesanGalatApi(err)}.`, 'info');
        return;
      }
    }
    // Hash disimpan di peramban hanya untuk login cadangan saat server tidak terjangkau
    const hashedPass = await hashPassword(newPass);
    ubahDaftar('users', (lama) => lama.map((u) => (u.user_id === userId ? { ...u, password: hashedPass } : u)));
    const target = userList.find((u) => u.user_id === userId);
    showToast(`Kata sandi untuk pengguna "${target?.nama_lengkap}" berhasil direset.`);
  };

  // --- PRD 4.1: Petani Handlers ---
  const handleSavePetani = async (petaniData: Petani) => {
    const tutupFormulir = () => {
      setIsFormModalOpen(false);
      setEditingPetani(null);
    };
    const baru = !editingPetani;
    const lama = baru ? undefined : petaniList.find((p) => p.petani_id === petaniData.petani_id);
    const baris: Petani = { ...(lama || {}), ...petaniData } as Petani;

    if (!serverAktif()) {
      const saved = await ErpApiService.savePetani(baris, !baru);
      ubahDaftar('petani', (daftar) => [saved, ...daftar.filter((p) => p.petani_id !== saved.petani_id)]);
      showToast(baru ? `Petani baru "${saved.nama_petani}" (${saved.petani_id}) berhasil disimpan!` : `Data petani "${saved.nama_petani}" diperbarui.`);
      tutupFormulir();
      if (baru) setHighlightPetaniId(saved.petani_id);
      return;
    }

    await kirimKeServer(`petani:${baris.petani_id || baris.nama_petani}`, `Petani ${baris.nama_petani}`, () => simpanPetaniServer(baris, baru), (saved) => {
      pasangBaris('petani', saved);
      showToast(baru ? `Petani baru "${saved.nama_petani}" (${saved.petani_id}) berhasil disimpan!` : `Data petani "${saved.nama_petani}" diperbarui.`);
      tutupFormulir();
      if (baru) setHighlightPetaniId(saved.petani_id);
    });
  };

  const handleConfirmStatusToggle = async (petaniId: string, reason: string) => {
    const target = petaniList.find((p) => p.petani_id === petaniId);
    if (!target) {
      setDeactivatingPetani(null);
      showToast('Data petani tidak ditemukan. Muat ulang halaman lalu coba lagi.', 'info');
      return;
    }

    const isNowActive = !target.status_aktif;
    const barisBaru: Petani = { ...target, status_aktif: isNowActive, alasan_nonaktif: isNowActive ? undefined : reason };

    const setelah = () => {
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

    if (!serverAktif()) {
      ubahDaftar('petani', (daftar) => daftar.map((p) => (p.petani_id === petaniId ? barisBaru : p)));
      setelah();
      return;
    }
    await kirimKeServer(`petani:${petaniId}`, `Status petani ${target.nama_petani}`, () => simpanPetaniServer(barisBaru, false), (saved) => {
      pasangBaris('petani', saved);
      setelah();
    });
  };

  const handleConfirmResetCardNumber = async (petaniId: string, newCardNumber: string) => {
    const setelah = () => {
      setResettingCardPetani(null);
      showToast(`ID Petani berhasil diubah menjadi ${newCardNumber}`);
    };

    if (!serverAktif()) {
      ubahDaftar('petani', (daftar) => daftar.map((p) => (p.petani_id === petaniId ? { ...p, petani_id: newCardNumber } : p)));
      ubahDaftar('transaksi', (daftar) => daftar.map((t) => (t.petani_id === petaniId ? { ...t, petani_id: newCardNumber } : t)));
      ubahDaftar('barang', (daftar) => daftar.map((b) => (b.petani_id === petaniId ? { ...b, petani_id: newCardNumber } : b)));
      setelah();
      return;
    }
    // Server memindahkan semua kupon dan bal petani ini ke ID baru; sinkron membawa perubahannya ke layar
    await kirimKeServer(`petani:${petaniId}`, `Ganti ID kartu petani ${petaniId}`, () => gantiIdPetaniServer(petaniId, newCardNumber), (saved) => {
      hapusBaris('petani', petaniId);
      pasangBaris('petani', saved);
      setelah();
    });
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
          tanggal_daftar: hariIniLokal(),
        } as Petani;
        const hasil = serverAktif() ? await simpanPetaniServer(isian, true) : await ErpApiService.savePetani(isian, false);
        tersimpan.push(hasil);
      } catch (err: any) {
        // Berhenti agar urutan ID tidak loncat; sisa daftar bisa diimpor ulang
        pesanGagal = `Berhenti di baris ${i + 1} (${p.nama_petani}): ${pesanGalatApi(err)}`;
        break;
      }
    }

    if (tersimpan.length > 0) {
      if (serverAktif()) {
        pasangBaris('petani', tersimpan);
        void sinkronkan();
      } else {
        const idBaru = new Set(tersimpan.map((p) => p.petani_id));
        ubahDaftar('petani', (lama) => [...tersimpan.slice().reverse(), ...lama.filter((p) => !idBaru.has(p.petani_id))]);
      }
    }

    if (pesanGagal) {
      showToast(`${tersimpan.length} dari ${daftar.length} petani tersimpan. ${pesanGagal}`, 'info');
    } else {
      showToast(`${tersimpan.length} petani berhasil diimpor.`);
    }
  };

  // --- PRD 4.2: Harga Handlers ---
  const handleSaveNewPrice = async (newPrice: TabelHarga, oldPriceIdToArchive?: string): Promise<boolean> => {
    const tarifLama =
      oldPriceIdToArchive && oldPriceIdToArchive !== newPrice.harga_id ? hargaList.find((h) => h.harga_id === oldPriceIdToArchive) : undefined;
    const pesanSukses = () => showToast(`Tarif Grade ${newPrice.kode_grade} (Rp ${newPrice.harga_per_kg.toLocaleString('id-ID')}) berhasil disimpan.`);

    if (!serverAktif()) {
      ubahDaftar('harga_beli', (lama) => {
        let daftar = lama.map((h) => (tarifLama && h.harga_id === tarifLama.harga_id ? { ...h, status: 'nonaktif' as const } : h));
        const ada = daftar.some((h) => h.harga_id === newPrice.harga_id);
        daftar = ada ? daftar.map((h) => (h.harga_id === newPrice.harga_id ? newPrice : h)) : [newPrice, ...daftar];
        return daftar;
      });
      pesanSukses();
      return true;
    }

    return kirimKeServer(
      `harga:${newPrice.kode_grade}`,
      `Tarif Grade ${newPrice.kode_grade}`,
      async () => {
        const saved = await simpanHargaBeliServer(newPrice);
        // Server menonaktifkan tarif aktif lain untuk grade yang sama; tarif lama grade lain diarsipkan di sini
        if (tarifLama && tarifLama.status === 'aktif' && tarifLama.kode_grade !== saved.kode_grade) {
          pasangBaris('harga_beli', await simpanHargaBeliServer({ ...tarifLama, status: 'nonaktif' }));
        }
        return saved;
      },
      (saved) => {
        pasangBaris('harga_beli', saved);
        pesanSukses();
      }
    );
  };

  // ---------------------------------------------------------------------------------------------------------------
  // KUPON: setiap simpanan di Sortir / Timbangan / Kasir menjadi operasi per bal (antrianKupon). Layar langsung
  // berubah, server menerapkan operasi ke data terbarunya, lalu layar mengikuti jawaban server.
  // ---------------------------------------------------------------------------------------------------------------
  const handleSaveTransaksi = (newTx: TransaksiPembelian, _generatedBarang: Barang | Barang[], meta: SaveTransaksiMeta = {}) => {
    if (currentUser?.status_aktif === false) {
      showToast('Akun Anda dinonaktifkan. Aksi tidak dapat dilakukan.', 'info');
      return;
    }

    const oldTx = transaksiList.find((t) => t.transaksi_id === newTx.transaksi_id);
    const exists = Boolean(oldTx);
    const operasi = meta.operasi && meta.operasi.length > 0 ? meta.operasi : turunkanOperasi(oldTx, newTx, { timpaPenuh: meta.timpaPenuh });
    if (operasi.length === 0) return;
    const balCount = newTx.total_bal || (newTx.items ? newTx.items.length : 1);

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
      const diffSummary: string[] = [];
      if (oldTx.berat_kg !== newTx.berat_kg) {
        diffSummary.push(`Netto: ${oldTx.berat_kg} Kg -> ${newTx.berat_kg} Kg (Δ ${normalizeKg(newTx.berat_kg - oldTx.berat_kg)} Kg)`);
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
        deskripsi: `Perubahan kupon ${newTx.no_kupon} (${newTx.nama_petani})`,
        rincian_perubahan: diffSummary.length > 0 ? diffSummary : ['Pembaruan rincian timbang/status'],
      });
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

    if (!serverAktif()) {
      // Mode demo tanpa server: operasi diterapkan langsung ke data di peramban
      ubahDaftar('transaksi', (lama) => {
        const sebelum = lama.find((t) => t.transaksi_id === newTx.transaksi_id);
        const hasil = operasi.reduce<TransaksiPembelian | undefined>((acc, op) => terapkanOperasi(acc, op), sebelum);
        if (!hasil) return lama;
        return sebelum ? lama.map((t) => (t.transaksi_id === hasil.transaksi_id ? hasil : t)) : [hasil, ...lama];
      });
      return;
    }

    operasi.forEach((op) => antrianKupon.masukkan(newTx.transaksi_id, newTx.no_kupon, op));
  };

  /**
   * Sortir & Timbangan meminta data kupon terbaru (mis. sebelum membuka kupon baru, supaya nomor kupon yang baru
   * dipakai komputer lain langsung ketahuan). Mengembalikan daftar kupon setelah sinkron.
   */
  const handleRefreshTransaksiList = async (): Promise<TransaksiPembelian[]> => {
    await sinkronkan();
    return antrianKupon.terapkanKeDaftar(dataRef.current.transaksi);
  };

  /** Menu Pengiriman meminta data terbaru (batch sample, Surat Jalan, bal) dari server. */
  const handleRefreshPengirimanData = async (): Promise<void> => {
    await sinkronkan();
  };

  const handleDeleteTransaksi = async (transaksiId: string, alasanHapus?: string): Promise<boolean> => {
    if (currentUser?.status_aktif === false) {
      showToast('Akun Anda dinonaktifkan. Aksi tidak dapat dilakukan.', 'info');
      return false;
    }

    const txToDelete = transaksiList.find((t) => t.transaksi_id === transaksiId);
    if (!txToDelete) return false;

    // Kupon yang balnya sudah dikirim lewat Surat Jalan tidak boleh dihapus
    const noBalTerkirim = balTerkirimDariTransaksi(txToDelete, barangList, pengirimanList);
    if (noBalTerkirim.length > 0) {
      showToast(pesanTransaksiTerkunci(txToDelete, noBalTerkirim), 'info');
      return false;
    }

    const setelahHapus = () => {
      antrianKupon.batalkanKupon(transaksiId);
      hapusBaris('transaksi', transaksiId);
      hapusBaris(
        'barang',
        dataRef.current.barang.filter((b) => b.transaksi_pembelian_id === transaksiId).map((b) => b.barang_id)
      );
      recordAuditLog({
        user_nama: currentUser?.nama_lengkap || 'Sistem',
        user_role: currentRole,
        modul: 'Transaksi Pembelian',
        aksi: 'HAPUS_TRANSAKSI',
        target_id: txToDelete.no_kupon,
        deskripsi: `Penghapusan kupon ${txToDelete.no_kupon} (Petani: ${txToDelete.nama_petani}). Alasan: ${alasanHapus || 'Tanpa keterangan'}`,
        rincian_perubahan: [`Alasan: ${alasanHapus || '-'}`],
      });
      showToast(`Kupon ${txToDelete.no_kupon} dan data bal terkait berhasil dihapus.`);
    };

    if (!serverAktif()) {
      ubahDaftar('transaksi', (lama) => lama.filter((t) => t.transaksi_id !== transaksiId));
      ubahDaftar('barang', (lama) => lama.filter((b) => b.transaksi_pembelian_id !== transaksiId));
      setelahHapus();
      return true;
    }

    // Kupon yang belum pernah sampai ke server (dibuat saat offline, belum terkirim) cukup dibatalkan di antrean
    const diServer = dataRef.current.transaksi.some((t) => t.transaksi_id === transaksiId);
    if (!diServer && antrianKupon.belumDiServer(transaksiId) && !antrianKupon.sedangDikirim(transaksiId)) {
      setelahHapus();
      return true;
    }

    return kirimKeServer(`hapus-kupon:${transaksiId}`, `Hapus kupon ${txToDelete.no_kupon}`, () => hapusTransaksiServer(transaksiId, alasanHapus), setelahHapus);
  };

  // --- PRD 6.1: Pengiriman Barang (DO) Handlers ---
  const handleSaveNewPengiriman = async (newPengiriman: PengirimanBarang, updatedBarangIds: string[]): Promise<boolean> => {
    if (currentUser?.status_aktif === false) {
      showToast('Akun Anda dinonaktifkan.', 'info');
      return false;
    }
    const pesanSukses = () =>
      showToast(`Surat Jalan ${newPengiriman.no_surat_jalan} diterbitkan (${newPengiriman.total_bal || updatedBarangIds.length} bal dimuat)!`);

    if (!serverAktif()) {
      ubahDaftar('pengiriman', (lama) => [newPengiriman, ...lama.filter((p) => p.pengiriman_id !== newPengiriman.pengiriman_id)]);
      const sesuai = sesuaikanBatchSetelahPerubahanDO(batchSampleList, newPengiriman.batch_sample_id_ref, new Set(updatedBarangIds), new Set());
      if (sesuai.batchTerkait) ubahDaftar('batch_sample', () => sesuai.batchList);
      pesanSukses();
      return true;
    }
    // Tanda "sudah dikirim DO" di batch sample asal dihitung server dalam transaksi yang sama (tidak dikirim terpisah)
    return kirimKeServer(`sj:${newPengiriman.no_surat_jalan}`, `Surat Jalan ${newPengiriman.no_surat_jalan}`, () => simpanPengirimanServer(newPengiriman, true), (saved) => {
      pasangBaris('pengiriman', saved);
      pesanSukses();
    });
  };

  const handleSaveHargaJual = async (item: MasterHargaJual): Promise<boolean> => {
    const pesanSukses = () => showToast(`Harga jual "${item.kode}" berhasil disimpan.`);
    if (!serverAktif()) {
      ubahDaftar('harga_jual', (lama) => {
        const ada = lama.some((x) => x.harga_jual_id === item.harga_jual_id);
        return ada ? lama.map((x) => (x.harga_jual_id === item.harga_jual_id ? item : x)) : [item, ...lama];
      });
      pesanSukses();
      return true;
    }
    return kirimKeServer(`harga-jual:${item.kode}`, `Harga jual ${item.kode}`, () => simpanHargaJualServer(item), (saved) => {
      pasangBaris('harga_jual', saved);
      pesanSukses();
    });
  };

  const handleSaveBatchSample = async (newBatch: BatchPengirimanSample, _updatedBarangs: Barang[]): Promise<boolean> => {
    if (currentUser?.status_aktif === false) {
      showToast('Akun Anda dinonaktifkan.', 'info');
      return false;
    }
    const pesanSukses = () =>
      showToast(
        newBatch.status === 'draft'
          ? `Batch Sample ${newBatch.kode_batch} disimpan sebagai Draft. Finalkan di Status & Detail Batch bila sudah siap dipakai.`
          : `Batch Sample ${newBatch.kode_batch} berhasil dikirim ke ${newBatch.tujuan_buyer}!`
      );
    if (!serverAktif()) {
      ubahDaftar('batch_sample', (lama) => [newBatch, ...lama.filter((b) => b.batch_id !== newBatch.batch_id)]);
      pesanSukses();
      return true;
    }
    return kirimKeServer(`batch:${newBatch.kode_batch}`, `Batch sample ${newBatch.kode_batch}`, () => simpanBatchSampleServer(newBatch, true), (saved) => {
      pasangBaris('batch_sample', saved);
      pesanSukses();
    });
  };

  const handleDeleteBatchSample = async (batchId: string, _revertedBarangs?: Barang[]): Promise<boolean> => {
    if (currentUser?.status_aktif === false) {
      showToast('Akun Anda dinonaktifkan.', 'info');
      return false;
    }
    const batchTarget = batchSampleList.find((b) => b.batch_id === batchId);
    const kodeBatch = batchTarget?.kode_batch || batchId;
    if (!serverAktif()) {
      ubahDaftar('batch_sample', (lama) => lama.filter((b) => b.batch_id !== batchId));
      showToast(`Batch ${kodeBatch} berhasil dihapus.`);
      return true;
    }
    // Reclass tidak mengubah bal, jadi penghapusan batch tidak perlu mengubah stok bal
    return kirimKeServer(`batch:${batchId}`, `Hapus batch sample ${kodeBatch}`, () => hapusBatchSampleServer(batchId), () => {
      hapusBaris('batch_sample', batchId);
      showToast(`Batch ${kodeBatch} berhasil dihapus.`);
    });
  };

  const handleUpdateBatchSample = async (updatedBatch: BatchPengirimanSample, _updatedBarangs?: Barang[]): Promise<boolean> => {
    const pesanSukses = () => showToast(`Batch ${updatedBatch.kode_batch} berhasil diperbarui.`);
    if (!serverAktif()) {
      ubahDaftar('batch_sample', (lama) => lama.map((b) => (b.batch_id === updatedBatch.batch_id ? updatedBatch : b)));
      pesanSukses();
      return true;
    }
    return kirimKeServer(`batch:${updatedBatch.batch_id}`, `Batch sample ${updatedBatch.kode_batch}`, () => simpanBatchSampleServer(updatedBatch, false), (saved) => {
      pasangBaris('batch_sample', saved);
      pesanSukses();
    });
  };

  /**
   * Menyimpan hasil edit Surat Jalan yang belum Selesai (tambah/keluarkan bal, berat, harga, potongan, tujuan, dll.).
   * Server mengembalikan bal yang dikeluarkan ke gudang dan menyesuaikan batch sample asal. Mengembalikan false bila
   * ditolak (form tetap terbuka).
   */
  const handleUpdatePengiriman = async (updatedPengiriman: PengirimanBarang, balDitambah: string[] = [], balDikeluarkan: string[] = []): Promise<boolean> => {
    const lama = pengirimanList.find((p) => p.pengiriman_id === updatedPengiriman.pengiriman_id);
    if (!lama) {
      showToast('Surat Jalan yang diedit tidak ditemukan (mungkin sudah dibatalkan di komputer lain).', 'info');
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
    const perubahanBal = [
      tambah.size > 0 ? `${tambah.size} bal ditambah` : '',
      keluar.size > 0 ? `${keluar.size} bal dikeluarkan` : '',
    ].filter(Boolean).join(', ');
    const pesanSukses = () => showToast(`Surat Jalan ${baru.no_surat_jalan} diperbarui${perubahanBal ? ` (${perubahanBal})` : ''}.`);

    if (!serverAktif()) {
      ubahDaftar('pengiriman', (daftar) => daftar.map((p) => (p.pengiriman_id === baru.pengiriman_id ? baru : p)));
      ubahDaftar('barang', (daftar) => kembalikanBalKeGudang(daftar, keluar));
      const sesuai = sesuaikanBatchSetelahPerubahanDO(batchSampleList, lama.batch_sample_id_ref, tambah, keluar);
      if (sesuai.batchTerkait) ubahDaftar('batch_sample', () => sesuai.batchList);
      pesanSukses();
      return true;
    }
    return kirimKeServer(`sj:${baru.pengiriman_id}`, `Surat Jalan ${baru.no_surat_jalan}`, () => simpanPengirimanServer(baru, false), (saved) => {
      pasangBaris('pengiriman', saved);
      pesanSukses();
    });
  };

  /**
   * Membatalkan Surat Jalan yang belum Selesai: server mengembalikan bal ke gudang dan mencabut tanda "sudah dikirim
   * DO" di batch sample asal, dalam satu transaksi.
   */
  const handleDeletePengiriman = async (pengirimanId: string): Promise<boolean> => {
    const target = pengirimanList.find((p) => p.pengiriman_id === pengirimanId);
    if (!target) return false;
    if (isSuratJalanTerkunci(target)) {
      showToast(pesanSuratJalanTerkunci(target), 'info');
      return false;
    }
    if (currentUser?.status_aktif === false) {
      showToast('Akun Anda dinonaktifkan.', 'info');
      return false;
    }
    const idBal = new Set(target.barang_ids || []);
    const pesanSukses = () => showToast(`Surat Jalan ${target.no_surat_jalan} dibatalkan; ${idBal.size} bal kembali ke gudang.`);

    if (!serverAktif()) {
      ubahDaftar('pengiriman', (daftar) => daftar.filter((p) => p.pengiriman_id !== pengirimanId));
      ubahDaftar('barang', (daftar) => kembalikanBalKeGudang(daftar, idBal));
      const sesuai = sesuaikanBatchSetelahPerubahanDO(batchSampleList, target.batch_sample_id_ref, new Set(), idBal);
      if (sesuai.batchTerkait) ubahDaftar('batch_sample', () => sesuai.batchList);
      pesanSukses();
      return true;
    }
    return kirimKeServer(`sj:${pengirimanId}`, `Batalkan Surat Jalan ${target.no_surat_jalan}`, () => hapusPengirimanServer(pengirimanId), () => {
      hapusBaris('pengiriman', pengirimanId);
      pesanSukses();
    });
  };

  const handleUpdatePengirimanStatus = async (pengirimanId: string, newStatus: string): Promise<boolean> => {
    const target = pengirimanList.find((p) => p.pengiriman_id === pengirimanId);
    if (!target || target.status === newStatus) return false;
    // Selesai bersifat final: nilai penjualan sudah masuk laporan
    if (isSuratJalanTerkunci(target)) {
      showToast(`Surat Jalan ${target.no_surat_jalan} sudah Selesai dan statusnya tidak dapat diubah lagi.`, 'info');
      return false;
    }
    const status = newStatus as StatusPengiriman;
    const pesanSukses = () =>
      showToast(
        status === 'selesai'
          ? `Surat Jalan ${target.no_surat_jalan} Selesai; ${target.barang_ids?.length || 0} bal keluar gudang dan nilai penjualannya kini masuk laporan.`
          : `Status Surat Jalan ${target.no_surat_jalan} menjadi ${LABEL_STATUS_PENGIRIMAN[status] || status}.`
      );

    if (!serverAktif()) {
      ubahDaftar('pengiriman', (daftar) => daftar.map((p) => (p.pengiriman_id === pengirimanId ? { ...p, status } : p)));
      // Bal baru benar-benar "keluar" gudang tepat saat Surat Jalan ini Selesai
      if (status === 'selesai') ubahDaftar('barang', (daftar) => keluarkanBal(daftar, new Set(target.barang_ids || []), pengirimanId));
      pesanSukses();
      return true;
    }
    // Server menandai bal keluar gudang saat Selesai; sinkron membawa status bal terbaru
    return kirimKeServer(`sj:${pengirimanId}`, `Status Surat Jalan ${target.no_surat_jalan}`, () => ubahStatusPengirimanServer(target, status), (saved) => {
      pasangBaris('pengiriman', saved);
      pesanSukses();
    });
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
  const toastEl = toast && (
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
  );

  // Pemberitahuan tetap tampil di halaman login (mis. alasan keluar: sesi habis di server, tidak aktif 30 menit)
  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        {toastEl}
      </>
    );
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
                onRefreshSources={muatUlangPenuh}
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
                onRefreshTransaksiList={handleRefreshTransaksiList}
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
                onRefreshTransaksiList={handleRefreshTransaksiList}
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
                onRefreshPengirimanData={handleRefreshPengirimanData}
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
                onRefreshPengirimanData={handleRefreshPengirimanData}
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
                onRefreshPengirimanData={handleRefreshPengirimanData}
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
      {toastEl}

    </div>
  );
}

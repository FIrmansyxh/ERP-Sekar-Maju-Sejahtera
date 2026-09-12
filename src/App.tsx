import React, { useState, useEffect, useRef } from 'react';
import { 
  Petani, 
  Barang, 
  TabelHarga, 
  TransaksiPembelian, 
  PengirimanSample, 
  PengirimanBarang,
  Gudang,
  User,
  UserRole,
  MasterHargaJual,
  BatchPengirimanSample
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
  loadGudangData, 
  saveGudangData,
  loadUserData, 
  saveUserData,
  loadCurrentUser, 
  saveCurrentUser,
  resetToDemoData
} from './utils/storage';
import { hasModuleAccess } from './utils/rbac';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';

// Auth Login View
import { LoginView } from './components/auth/LoginView';

// User Management 
import { UserManagement } from './components/user/UserManagement';

// Home Dashboard 
import { HomeDashboardView } from './components/home/HomeDashboardView';

//  Dashboard Laporan & Analytic ERP
import { DashboardAnalyticView } from './components/laporan/DashboardAnalyticView';

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

// PRD 4.3: Master Data Gudang
import { GudangManagement } from './components/gudang/GudangManagement';

// PRD 5.6: Inventaris Bal Gudang
import { BarangManagement } from './components/barang/BarangManagement';

//  Transaksi Pembelian Timbang & Kupon (3 Sub-menus: Sortir, Timbangan, Kasir)
import { SortirPageView } from './components/transaksi/SortirPageView';
import { TimbanganPageView } from './components/transaksi/TimbanganPageView';
import { KasirPageView } from './components/transaksi/KasirPageView';
import { TransaksiManagement } from './components/transaksi/TransaksiManagement';

// PRD 6.1: Pengiriman Reguler (DO Luar)
import { PengirimanManagement } from './components/pengiriman/PengirimanManagement';

// PRD 6.2: Pengiriman Sample
import { SampleManagement } from './components/sample/SampleManagement';

import { StatusBatchPengirimanManagement } from './components/pengiriman/StatusBatchPengirimanManagement';
import { HargaJualManagement } from './components/harga_jual/HargaJualManagement';
import { DedicatedPrintView } from './components/print/DedicatedPrintView';

import { CheckCircle2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

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

  const [gudangList, setGudangList] = useState<Gudang[]>(() => loadGudangData());
  
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
  const [targetKuponNo, setTargetKuponNo] = useState<string | undefined>(undefined);
  const [targetTxId, setTargetTxId] = useState<string | undefined>(undefined);
  const [targetBalNo, setTargetBalNo] = useState<string | undefined>(undefined);
  const currentRole: UserRole = currentUser?.role || 'superadmin';

  // Petani Modals & Drawers
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPetani, setEditingPetani] = useState<Petani | null>(null);
  const [viewingPetani, setViewingPetani] = useState<Petani | null>(null);
  const [printingPetani, setPrintingPetani] = useState<Petani | null>(null);
  const [deactivatingPetani, setDeactivatingPetani] = useState<Petani | null>(null);
  const [resettingCardPetani, setResettingCardPetani] = useState<Petani | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

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
    setBarangList(loadBarangData());
    setHargaList(loadHargaData());
    setTransaksiList(loadTransaksiData());
    setSampleList(loadSampleData());
    setPengirimanList(loadPengirimanData());
    setGudangList(loadGudangData());
    setHargaJualList(loadHargaJualData());
    setBatchSampleList(loadBatchSampleData());
    
  }, []);

  // Check RBAC module access whenever activeModuleId or currentUser changes
  const handleSelectModule = (moduleId: string) => {
    if (!currentUser) return;

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
    if (autoLogout === true) {
      showToast('Sesi berakhir otomatis karena tidak ada aktivitas selama 30 menit demi keamanan.', 'info');
    } else {
      showToast('Anda telah berhasil keluar dari sistem.', 'info');
    }
  };

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

  const handleSwitchUser = (targetUser: User) => {
    setCurrentUser(targetUser);
    saveCurrentUser(targetUser);
    setActiveModuleId('modul-home');
    showToast(`Beralih akun ke: ${targetUser.nama_lengkap} (${targetUser.role})`);
  };

  // --- User Management Handlers ---
  const handleSaveUser = (savedUser: User) => {
    const exists = userList.some((u) => u.user_id === savedUser.user_id);
    let updated: User[];
    if (exists) {
      updated = userList.map((u) => u.user_id === savedUser.user_id ? savedUser : u);
      showToast(`Data akun pengguna "${savedUser.nama_lengkap}" berhasil diperbarui.`);
      if (currentUser?.user_id === savedUser.user_id) {
        setCurrentUser(savedUser);
        saveCurrentUser(savedUser);
      }
    } else {
      updated = [savedUser, ...userList];
      showToast(`Pengguna baru "${savedUser.nama_lengkap}" (${savedUser.username}) berhasil didaftarkan!`);
    }
    setUserList(updated);
    saveUserData(updated);
  };

  const handleDeleteUser = (userId: string) => {
    const target = userList.find((u) => u.user_id === userId);
    const updated = userList.filter((u) => u.user_id !== userId);
    setUserList(updated);
    saveUserData(updated);
    showToast(`Akun pengguna "${target?.nama_lengkap || userId}" berhasil dihapus dari sistem.`);
  };

  const handleToggleUserStatus = (userId: string) => {
    const updated = userList.map((u) => {
      if (u.user_id === userId) {
        const nextStatus = !u.status_aktif;
        showToast(`Akun "${u.nama_lengkap}" sekarang ${nextStatus ? 'AKTIF' : 'NONAKTIF'}.`);
        return { ...u, status_aktif: nextStatus };
      }
      return u;
    });
    setUserList(updated);
    saveUserData(updated);
  };

  const handleResetUserPassword = (userId: string, newPass: string) => {
    const updated = userList.map((u) => u.user_id === userId ? { ...u, password: newPass } : u);
    setUserList(updated);
    saveUserData(updated);
    const target = userList.find((u) => u.user_id === userId);
    showToast(`Kata sandi untuk pengguna "${target?.nama_lengkap}" berhasil direset.`);
  };

  // --- Gudang Handlers ---
  const handleSaveGudang = (newGudang: Gudang) => {
    const exists = gudangList.some((g) => g.gudang_id === newGudang.gudang_id);
    let updated: Gudang[];
    const displayName = newGudang.nama_gudang || newGudang.nama_lokasi;
    if (exists) {
      updated = gudangList.map((g) => g.gudang_id === newGudang.gudang_id ? newGudang : g);
      showToast(`Data fasilitas gudang "${displayName}" berhasil diperbarui.`);
    } else {
      updated = [newGudang, ...gudangList];
      showToast(`Gudang baru "${displayName}" (${newGudang.kode_gudang}) berhasil didaftarkan!`);
    }
    setGudangList(updated);
    saveGudangData(updated);
  };

  const handleUpdateGudang = (updatedGudang: Gudang) => {
    const updated = gudangList.map((g) => g.gudang_id === updatedGudang.gudang_id ? updatedGudang : g);
    setGudangList(updated);
    saveGudangData(updated);
    showToast(`Gudang "${updatedGudang.nama_gudang || updatedGudang.nama_lokasi}" berhasil diperbarui.`);
  };

  const handleDeleteGudang = (gudangId: string) => {
    const target = gudangList.find((g) => g.gudang_id === gudangId);
    const updated = gudangList.filter((g) => g.gudang_id !== gudangId);
    setGudangList(updated);
    saveGudangData(updated);
    showToast(`Fasilitas gudang "${target?.nama_gudang || target?.nama_lokasi || gudangId}" berhasil dihapus.`);
  };

  // --- PRD 4.1: Petani Handlers ---
  const handleSavePetani = (petaniData: Petani) => {
    let updated: Petani[];
    const exists = petaniList.some((p) => p.petani_id === petaniData.petani_id);

    if (exists) {
      updated = petaniList.map((p) =>
        p.petani_id === petaniData.petani_id ? { ...p, ...petaniData } : p
      );
      showToast(`Data petani "${petaniData.nama_petani}" berhasil diperbarui.`);
    } else {
      updated = [petaniData, ...petaniList];
      showToast(`Petani baru "${petaniData.nama_petani}" (${petaniData.petani_id}) berhasil didaftarkan!`);
    }

    setPetaniList(updated);
    savePetaniData(updated);
    setIsFormModalOpen(false);
    setEditingPetani(null);
  };

  const handleConfirmStatusToggle = (petaniId: string, reason: string) => {
    const updated = petaniList.map((p) => {
      if (p.petani_id === petaniId) {
        return {
          ...p,
          status_aktif: !p.status_aktif,
          alasan_nonaktif: !p.status_aktif ? undefined : reason,
        };
      }
      return p;
    });

    setPetaniList(updated);
    savePetaniData(updated);
    setDeactivatingPetani(null);
    showToast('Status keaktifan petani berhasil diperbarui.');
  };

  const handleConfirmResetCardNumber = (petaniId: string, newCardNumber: string) => {
    const updated = petaniList.map((p) => {
      if (p.petani_id === petaniId) {
        return {
          ...p,
                  };
      }
      return p;
    });

    setPetaniList(updated);
    savePetaniData(updated);
    setResettingCardPetani(null);
    showToast(`ID Petani petani berhasil diubah menjadi ${newCardNumber}`);
  };

  const handleImportSuccess = (imported: Petani[]) => {
    try {
      if (!Array.isArray(imported) || imported.length === 0) {
        showToast('Gagal impor: File kosong atau tidak memuat data petani yang valid.', 'info');
        return;
      }

      const validItems: Petani[] = [];
      const errorDetails: string[] = [];
      const existingCards = new Set(petaniList.map((p) => (p.petani_id || '').trim().toUpperCase()));

      imported.forEach((p, idx) => {
        if (!p || typeof p !== 'object') {
          errorDetails.push(`Baris #${idx + 1}: Struktur data rusak`);
          return;
        }
        if (!p.nama_petani || typeof p.nama_petani !== 'string' || !p.nama_petani.trim()) {
          errorDetails.push(`Baris #${idx + 1}: Nama petani wajib diisi`);
          return;
        }
        if (!p.petani_id || typeof p.petani_id !== 'string' || !p.petani_id.trim()) {
          errorDetails.push(`Baris #${idx + 1} (${p.nama_petani}): ID Petani wajib diisi`);
          return;
        }

        const cardUpper = p.petani_id.trim().toUpperCase();
        if (existingCards.has(cardUpper)) {
          errorDetails.push(`Baris #${idx + 1} (${p.nama_petani}): ID Petani "${cardUpper}" sudah dipakai petani lain.`);
          return;
        }

        existingCards.add(cardUpper);
        validItems.push({
          ...p,
          petani_id: p.petani_id || `PTN-${Date.now()}-${idx}`,
                    nama_petani: p.nama_petani.trim(),
          desa_kecamatan: p.desa_kecamatan || 'Ds. Wringin Anom',
          status_aktif: p.status_aktif !== false,
          tanggal_daftar: p.tanggal_daftar || new Date().toISOString().split('T')[0],
        });
      });

      if (validItems.length === 0) {
        showToast(`Impor ditolak: ${errorDetails[0] || 'Tidak ada data valid yang dapat disimpan.'}`, 'info');
        return;
      }

      const combined = [...validItems, ...petaniList];
      setPetaniList(combined);
      savePetaniData(combined);
      setIsImportExportOpen(false);

      if (errorDetails.length > 0) {
        showToast(`${validItems.length} data petani berhasil diimpor (${errorDetails.length} baris tidak valid dilewati).`);
      } else {
        showToast(`${validItems.length} data petani berhasil divalidasi dan diimpor!`);
      }
    } catch (err: any) {
      showToast(`Terjadi kesalahan saat impor data: ${err?.message || 'Format tidak valid'}`, 'info');
    }
  };

  const handleDeletePetani = (petaniId: string) => {
    const target = petaniList.find((p) => p.petani_id === petaniId);
    const updated = petaniList.filter((p) => p.petani_id !== petaniId);
    setPetaniList(updated);
    savePetaniData(updated);
    setViewingPetani(null);
    showToast(`Data petani "${target?.nama_petani || petaniId}" (${target?.petani_id || ''}) berhasil dihapus.`);
  };

  // --- PRD 4.2: Harga Handlers ---
  const handleSaveNewPrice = (newPrice: TabelHarga, oldPriceIdToArchive?: string) => {
    let updatedList = [...hargaList];
    if (oldPriceIdToArchive) {
      updatedList = updatedList.map((h) =>
        h.harga_id === oldPriceIdToArchive ? { ...h, status: 'nonaktif' as const } : h
      );
    }
    updatedList = [newPrice, ...updatedList];
    setHargaList(updatedList);
    saveHargaData(updatedList);
    showToast(`Tarif baru Grade ${newPrice.kode_grade} (Rp ${newPrice.harga_per_kg.toLocaleString('id-ID')}) aktif!`);
  };

  const handleDeleteHarga = (hargaId: string) => {
    const target = hargaList.find((h) => h.harga_id === hargaId);
    const updated = hargaList.filter((h) => h.harga_id !== hargaId);
    setHargaList(updated);
    saveHargaData(updated);
    showToast(`Tarif Grade "${target?.kode_grade || hargaId}" (Rp ${(target?.harga_per_kg || 0).toLocaleString('id-ID')}) berhasil dihapus dari Master Harga.`);
  };

  // --- PRD 5.6: Barang / Inventaris Handlers ---
  const handleUpdateBarang = (updated: Barang) => {
    const list = barangList.map((b) => (b.barang_id === updated.barang_id ? updated : b));
    setBarangList(list);
    saveBarangData(list);
    showToast(`Lokasi rak bal ${updated.no_bal} diperbarui ke "${updated.lokasi_gudang}".`);
  };

  // ---  Transaksi Pembelian Handlers ---
  const handleSaveTransaksi = (newTx: TransaksiPembelian, generatedBarang: Barang | Barang[]) => {
    const oldTx = transaksiList.find((t) => t.transaksi_id === newTx.transaksi_id);
    const exists = Boolean(oldTx);
    const updatedTxList = exists
      ? transaksiList.map((t) => (t.transaksi_id === newTx.transaksi_id ? newTx : t))
      : [newTx, ...transaksiList];
    setTransaksiList(updatedTxList);
    saveTransaksiData(updatedTxList);

    const barangsToAdd = Array.isArray(generatedBarang) ? generatedBarang : (generatedBarang ? [generatedBarang] : []);
    
    // Always clean up orphaned barangs for this transaction
    const validRefsForTx = new Set<string>();
    barangsToAdd.forEach(b => validRefsForTx.add(b.barang_id));
    newTx.items?.forEach(i => {
      if (i.barang_id) validRefsForTx.add(i.barang_id);
      if (i.no_bal) validRefsForTx.add(i.no_bal);
      if (i.barcode) validRefsForTx.add(i.barcode);
    });
    newTx.barang_ids?.forEach(id => validRefsForTx.add(id));
    
    let updatedBarangList = barangList;
    if (exists) {
      updatedBarangList = barangList.filter((b) => {
        if (b.transaksi_pembelian_id === newTx.transaksi_id) {
          // Keep only if it's in the new updated list or still referenced in the transaction items
          return validRefsForTx.has(b.barang_id) || validRefsForTx.has(b.no_bal);
        }
        return true;
      });
    }

    if (barangsToAdd.length > 0) {
      const addedIds = new Set(barangsToAdd.map(b => b.barang_id));
      const filteredOldBarangs = updatedBarangList.filter((b) => !addedIds.has(b.barang_id));
      updatedBarangList = [...barangsToAdd, ...filteredOldBarangs];
    }
    
    setBarangList(updatedBarangList);
    saveBarangData(updatedBarangList);

    const balCount = newTx.total_bal || (newTx.items ? newTx.items.length : 1);
    const itemBalList = (newTx.items && newTx.items.length > 0)
      ? newTx.items.map((i) => i.no_bal || i.barcode).join(', ')
      : newTx.no_bal || '-';

    const updatedPetaniList = petaniList.map((p) => {
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

    // Integrasi Audit Trail Activity Log
    if (exists && oldTx) {
      // Cek apakah baru saja dicatat dengan detail kaya oleh TransaksiEditModal
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
          diffSummary.push(`Netto: ${oldTx.berat_kg} Kg -> ${newTx.berat_kg} Kg (Δ ${(newTx.berat_kg - oldTx.berat_kg).toFixed(1)} Kg)`);
        }
        if ((oldTx.harga_final || oldTx.total_harga_beli) !== (newTx.harga_final || newTx.total_harga_beli)) {
          diffSummary.push(`Nilai: Rp ${(oldTx.harga_final || oldTx.total_harga_beli).toLocaleString('id-ID')} -> Rp ${(newTx.harga_final || newTx.total_harga_beli).toLocaleString('id-ID')}`);
        }
        if (oldTx.status_pembayaran !== newTx.status_pembayaran) {
          diffSummary.push(`Status bayar: ${oldTx.status_pembayaran} -> ${newTx.status_pembayaran}`);
        }

        
      }
    } else {
      
    }

    
    showToast(`Transaksi ${newTx.transaksi_id} (${balCount} Bal, ${newTx.berat_kg} Kg) berhasil disimpan!`);
  };

  const handleDeleteTransaksi = (transaksiId: string, alasanHapus?: string) => {
    const txToDelete = transaksiList.find((t) => t.transaksi_id === transaksiId);
    if (!txToDelete) return;

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
    const updated = [sample, ...sampleList];
    setSampleList(updated);
    saveSampleData(updated);
    showToast(`Sample ${sample.sample_id} berhasil dikirim.`);
  };

  const handleSaveBatchSamples = (newSamples: PengirimanSample[], updatedBarangs: Barang[]) => {
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
    showToast(`Status sampel ${sample.sample_id} diupdate menjadi "${sample.status.toUpperCase()}".`);
  };

  // --- PRD 6.1: Pengiriman Barang (DO) Handlers ---
  const handleSaveNewPengiriman = (newPengiriman: PengirimanBarang, updatedBarangIds: string[]) => {
    const updatedPengirimanList = [newPengiriman, ...pengirimanList];
    setPengirimanList(updatedPengirimanList);
    savePengirimanData(updatedPengirimanList);

    const updatedSet = new Set(updatedBarangIds);
    const updatedBarangList = barangList.map((b) => {
      if (updatedSet.has(b.barang_id)) {
        return {
          ...b,
          status_stok: 'keluar' as const,
          pengiriman_id: newPengiriman.pengiriman_id,
        };
      }
      return b;
    });
    setBarangList(updatedBarangList);
    saveBarangData(updatedBarangList);

    // If shipment was linked to a Batch Sample, mark those batch items as sent via DO
    if (newPengiriman.batch_sample_id_ref) {
      const targetBatchId = newPengiriman.batch_sample_id_ref;
      const updatedBatches = batchSampleList.map((batch) => {
        if (batch.batch_id === targetBatchId || batch.kode_batch === targetBatchId) {
          const updatedItems = (batch.items || []).map((it) => {
            if (updatedSet.has(it.barang_id)) {
              return { ...it, sudah_dikirim_do: true };
            }
            return it;
          });
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
    }

    showToast(`Surat Jalan ${newPengiriman.no_surat_jalan} diterbitkan (${newPengiriman.total_bal} bal keluar)!`);
  };

  const handleSaveHargaJual = (item: MasterHargaJual) => {
    const exists = hargaJualList.some((h) => h.harga_jual_id === item.harga_jual_id);
    const updated = exists 
      ? hargaJualList.map((h) => h.harga_jual_id === item.harga_jual_id ? item : h)
      : [item, ...hargaJualList];
    setHargaJualList(updated);
    saveHargaJualData(updated);
    showToast(`Harga jual "${item.kode}" berhasil disimpan.`);
  };

  const handleDeleteHargaJual = (id: string) => {
    const updated = hargaJualList.filter((h) => h.harga_jual_id !== id);
    setHargaJualList(updated);
    saveHargaJualData(updated);
    showToast('Harga jual berhasil dihapus.');
  };


  const handleSaveBatchSample = (newBatch: BatchPengirimanSample, updatedBarangs: Barang[]) => {
    const updated = [newBatch, ...batchSampleList];
    setBatchSampleList(updated);
    saveBatchSampleData(updated);

    if (updatedBarangs && updatedBarangs.length > 0) {
      const updatedBarangMap = new Map(updatedBarangs.map((b) => [b.barang_id, b]));
      const newBarangList = barangList.map((b) => updatedBarangMap.get(b.barang_id) || b);
      setBarangList(newBarangList);
      saveBarangData(newBarangList);
    }
    showToast(`Batch Sample ${newBatch.kode_batch} berhasil dikirim ke ${newBatch.tujuan_buyer}!`);
  };


  const handleDeleteBatchSample = (batchId: string, revertedBarangs?: Barang[]) => {
    const list = batchSampleList.filter(b => b.batch_id !== batchId);
    setBatchSampleList(list);
    saveBatchSampleData(list);
    
    if (revertedBarangs && revertedBarangs.length > 0) {
      const updatedBarangMap = new Map(revertedBarangs.map((b) => [b.barang_id, b]));
      const newBarangList = barangList.map((b) => updatedBarangMap.get(b.barang_id) || b);
      setBarangList(newBarangList);
      saveBarangData(newBarangList);
    }
    
    showToast(`Batch ${batchId} berhasil dihapus.`);
  };

  const handleUpdateBatchSample = (updatedBatch: BatchPengirimanSample, updatedBarangs?: Barang[]) => {
    const list = batchSampleList.map(b => b.batch_id === updatedBatch.batch_id ? updatedBatch : b);
    setBatchSampleList(list);
    saveBatchSampleData(list);
    
    if (updatedBarangs && updatedBarangs.length > 0) {
      const updatedBarangMap = new Map(updatedBarangs.map((b) => [b.barang_id, b]));
      const newBarangList = barangList.map((b) => updatedBarangMap.get(b.barang_id) || b);
      setBarangList(newBarangList);
      saveBarangData(newBarangList);
    }
    
    showToast(`Batch ${updatedBatch.batch_id} berhasil diperbarui.`);
  };

  const handleUpdatePengiriman = (updatedPengiriman: PengirimanBarang) => {
    const list = pengirimanList.map(p => p.pengiriman_id === updatedPengiriman.pengiriman_id ? updatedPengiriman : p);
    setPengirimanList(list);
    savePengirimanData(list);
    showToast(`Data pengiriman DO berhasil diperbarui.`);
  };

  const handleDeletePengiriman = (pengirimanId: string, revertedBarangs?: Barang[]) => {
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
    showToast(`Status pengiriman ${pengirimanId} menjadi ${newStatus}.`);
  };

  const handleResetToDemo = () => {
    resetToDemoData();
    setPetaniList(loadPetaniData());
    setBarangList(loadBarangData());
    setHargaList(loadHargaData());
    setTransaksiList(loadTransaksiData());
    setSampleList(loadSampleData());
    setPengirimanList(loadPengirimanData());
    setGudangList(loadGudangData());
    setUserList(loadUserData());
    setHargaJualList(loadHargaJualData());
    setBatchSampleList(loadBatchSampleData());
    
    showToast('Data sistem ERP berhasil direset ke dataset demo default.');
  };

  const totalPetani = petaniList.length;
  const totalAktif = petaniList.filter((p) => p.status_aktif).length;
  const totalNonaktif = totalPetani - totalAktif;

  // Breadcrumb title map
  const getPageTitleAndBreadcrumb = () => {
    switch (activeModuleId) {
      case 'modul-home':
        return { title: 'Dasbor Menu Utama', breadcrumb: 'PR. SEKAR MAJU SEJAHTERA / Beranda' };
      case 'modul-6-dashboard-analytic':
        return { title: 'Dashboard Laporan & Analytic ERP', breadcrumb: 'Beranda / Dashboard Analytic' };
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
      case 'modul-7-gudang':
        return { title: 'Data Master Gudang', breadcrumb: 'Beranda / Master Gudang' };
      case 'modul-2-barang':
        return { title: 'Inventaris Bal Gudang', breadcrumb: 'Beranda / Inventaris Bal' };
      case 'modul-0-sortir':
        return { title: 'Sortir Mutu Grade & Sample Bal', breadcrumb: 'Beranda / Pembelian / Sortir' };
      case 'modul-0-timbangan':
        return { title: 'Meja Timbangan Bal & Alokasi Gudang', breadcrumb: 'Beranda / Pembelian / Timbangan' };
      case 'modul-0-kasir':
      case 'modul-0-transaksi':
        return { title: 'Data Pembelian Barang (Kasir & Cetak Nota)', breadcrumb: 'Beranda / Pembelian / Kasir' };
      case 'modul-5-pengiriman':
        return { title: 'Pengiriman Reguler (DO Luar)', breadcrumb: 'Beranda / Pengiriman DO' };
      case 'modul-4-sample':
        return { title: 'Pengiriman Sample', breadcrumb: 'Beranda / Pengiriman Sample' };
      case 'modul-users':
        return { title: 'Manajemen Pengguna (RBAC)', breadcrumb: 'Beranda / Manajemen Pengguna' };
      default:
        return { title: 'Sistem Data Gudang Tembakau', breadcrumb: 'PR. SEKAR MAJU SEJAHTERA / Sistem Data Gudang' };
    }
  };

  const pageInfo = getPageTitleAndBreadcrumb();

  // Dedicated Standalone Print View (matches user's reference sekaranomgroup.com/cetak_... tab)
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

  // If user is not authenticated, show Login View
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        availableUsers={userList}
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
        onResetData={handleResetToDemo}
        onOpenRoadmap={() => {}}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenUsers={() => handleSelectModule('modul-users')}
        onSwitchUser={handleSwitchUser}
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
            barangCount={barangList.length}
            transaksiCount={transaksiList.length}
            sampleCount={sampleList.length}
            pengirimanCount={pengirimanList.length}
            gudangCount={gudangList.length}
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
              barangCount={barangList.length}
              transaksiCount={transaksiList.length}
              sampleCount={sampleList.length}
              pengirimanCount={pengirimanList.length}
              gudangCount={gudangList.length}
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
                userRole={currentRole}
                onNavigateToModule={(modId) => handleSelectModule(modId)}
              />
            )}

            {/* Laporan Kode Bal */}
            {activeModuleId === 'modul-6-laporan-kode-bal' && (
              <LaporanKodeBalView barangList={barangList} />
            )}

            {/* Laporan Harga */}
            {activeModuleId === 'modul-6-laporan-grade' && (
              <LaporanGradeView
                initialTab="beli"
                hargaJualList={hargaJualList}
                hargaList={hargaList}
                barangList={barangList}
                transaksiList={transaksiList}
                pengirimanList={pengirimanList}
                sampleList={sampleList}
                gudangList={gudangList}
                userRole={currentRole}
                onNavigateToHarga={() => handleSelectModule('modul-3-harga')}
                onNavigateToHargaJual={() => handleSelectModule('modul-3-harga-jual')}
                onNavigateToBarang={() => handleSelectModule('modul-2-barang')}
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
                barangList={barangList}
                userRole={currentRole}
                onNavigateToPetani={() => handleSelectModule('modul-1-petani')}
                onNavigateToTransaksi={() => handleSelectModule('modul-0-transaksi')}
              />
            )}

            {/* Laporan Pengiriman & Distribusi Tembakau */}
            {activeModuleId === 'modul-6-laporan-pengiriman' && (
              <LaporanPengirimanView
                pengirimanList={pengirimanList}
                sampleList={sampleList}
                barangList={barangList}
                gudangList={gudangList}
                userRole={currentRole}
                onNavigateToPengiriman={() => handleSelectModule('modul-5-pengiriman')}
                onNavigateToSample={() => handleSelectModule('modul-4-sample')}
                onNavigateToBarang={() => handleSelectModule('modul-2-barang')}
              />
            )}

            {/* PRD 4.1: Master Petani */}
            {activeModuleId === 'modul-1-petani' && (
              <PetaniTable
                data={petaniList}
                userRole={currentRole}
                transaksiList={transaksiList}
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
                onDeletePetani={(p) => handleDeletePetani(p.petani_id)}
                onOpenImportExport={() => setIsImportExportOpen(true)}
              />
            )}

            {/* PRD 4.2: Master Harga Beli */}
            {activeModuleId === 'modul-3-harga' && (
              <HargaManagement
                hargaList={hargaList}
                userRole={currentRole}
                onSaveNewPrice={handleSaveNewPrice}
                onDeleteHarga={handleDeleteHarga}
              />
            )}

            {/* PRD 4.3: Data Master Gudang */}
            {activeModuleId === 'modul-7-gudang' && (
              <GudangManagement
                gudangList={gudangList}
                barangList={barangList}
                userRole={currentRole}
                onSaveGudang={handleSaveGudang}
                onUpdateGudang={handleUpdateGudang}
                onDeleteGudang={handleDeleteGudang}
              />
            )}

            {/* PRD 5.6: Inventaris Bal Gudang */}
            {activeModuleId === 'modul-2-barang' && (
              <BarangManagement
                barangList={barangList}
                userRole={currentRole}
                onUpdateBarang={handleUpdateBarang}
                onNavigateToTransaksi={() => handleSelectModule('modul-0-transaksi')}
                onNavigateToSample={() => handleSelectModule('modul-4-sample')}
                onNavigateToPengiriman={() => handleSelectModule('modul-5-pengiriman')}
              />
            )}

            {/*  Proses 1 - Sortir Page */}
            {activeModuleId === 'modul-0-sortir' && (
              <SortirPageView
                petaniList={petaniList}
                hargaList={hargaList}
                transaksiList={transaksiList}
                barangList={barangList}
                gudangList={gudangList}
                userRole={currentRole}
                currentUser={currentUser}
                onSaveTransaksi={(newTx, newBarangs) => {
                  handleSaveTransaksi(newTx, newBarangs);
                  showToast(`Kupon ${newTx.no_kupon} berhasil disimpan!`);
                }}
                onNavigateToTimbangan={(kuponNo, txId, balNo) => {
                  setTargetKuponNo(kuponNo);
                  setTargetTxId(txId);
                  setTargetBalNo(balNo);
                  handleSelectModule('modul-0-timbangan');
                }}
              />
            )}

            {/*  Proses 2 - Timbangan Page */}
            {activeModuleId === 'modul-0-timbangan' && (
              <TimbanganPageView
                transaksiList={transaksiList}
                petaniList={petaniList}
                hargaList={hargaList}
                barangList={barangList}
                gudangList={gudangList}
                userRole={currentRole}
                currentUser={currentUser}
                initialKuponNo={targetKuponNo}
                initialTxId={targetTxId}
                initialBalNo={targetBalNo}
                onSaveTransaksi={(newTx, newBarangs) => {
                  handleSaveTransaksi(newTx, newBarangs);
                  showToast(`Data timbangan kupon ${newTx.no_kupon} diperbarui!`);
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
                gudangList={gudangList}
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
              />
            )}

            {/* PRD 6.2: Pengiriman Sample */}
            {activeModuleId === 'modul-4-sample' && (
              <SampleManagement
                sampleList={sampleList}
                batchSampleList={batchSampleList}
                barangList={barangList}
                gudangList={gudangList}
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
                gudangList={gudangList}
                petaniList={petaniList}
                hargaJualList={hargaJualList}
                tabelHarga={hargaList}
                transaksiList={transaksiList}
                userRole={currentRole}
                onSaveNewPengiriman={handleSaveNewPengiriman}
                onUpdatePengiriman={handleUpdatePengiriman}
                onDeletePengiriman={handleDeletePengiriman}
              />
            )}

            {/*  Manajemen Pengguna (RBAC 5 Role) */}
            {activeModuleId === 'modul-users' && (
              <UserManagement
                userList={userList}
                currentUser={currentUser}
                gudangList={gudangList}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
                onToggleStatus={handleToggleUserStatus}
                onResetPassword={handleResetUserPassword}
              />
            )}

            {/* Master Harga Jual */}
            {activeModuleId === 'modul-3-harga-jual' && (
              <HargaJualManagement
                hargaJualList={hargaJualList}
                onSaveHargaJual={handleSaveHargaJual}
                onDeleteHargaJual={handleDeleteHargaJual}
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
        onDeletePetani={(p) => handleDeletePetani(p.petani_id)}
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

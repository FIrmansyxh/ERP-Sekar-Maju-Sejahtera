import { UserRole, RolePermissionInfo } from '../types';

export const ROLE_DEFINITIONS: Record<UserRole, RolePermissionInfo> = {
  superadmin: {
    role: 'superadmin',
    label: 'Super Admin',
    deskripsi: 'Akses penuh ke seluruh sistem: User management, semua master data, semua alur transaksi, pengiriman, dan seluruh laporan.',
    badgeBg: 'bg-red-50',
    badgeText: 'text-[#b81d24]',
    badgeBorder: 'border-red-300',
    allowedModules: [
      'modul-home',
      'modul-6-dashboard-analytic',
      'modul-6-laporan-bal',
      'modul-6-laporan-grade',
      'modul-6-laporan-pembelian',
      'modul-6-laporan-petani',
      'modul-6-laporan-pengiriman',
      'modul-6-laporan-sample',
      'modul-1-petani',
      'modul-3-harga',
      'modul-3-harga-jual',
      'modul-master-potongan',
      'modul-0-sortir',
      'modul-0-timbangan',
      'modul-0-kasir',
      'modul-0-transaksi',
      'modul-koreksi-no-bal',
      'modul-5-pengiriman',
      'modul-4-sample',
      'modul-status-batch',
      'modul-status-pengiriman',
      'modul-users',
      'modul-audit-trail',
      ],
    capabilities: {
      canManageUsers: true,
      canViewAuditLog: true,
      canManageMasterData: true,
      canCreatePetani: true,
      canInputTransaksi: true,
      canManageStok: true,
      canManageQC: true,
      canManagePengiriman: true,
      canViewAnalytics: true,
    },
  },
  admin_sortir: {
    role: 'admin_sortir',
    label: 'Admin Sortir',
    deskripsi: 'Akses proses sortir kupon & grade mutu, master data (Petani, Harga Beli, Harga Jual), serta modul laporan.',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-300',
    allowedModules: [
      'modul-home',
      'modul-0-sortir',
      'modul-koreksi-no-bal',
      'modul-1-petani',
      'modul-3-harga',
      'modul-3-harga-jual',
      'modul-master-potongan',
      'modul-6-dashboard-analytic',
      'modul-6-laporan-bal',
      'modul-6-laporan-grade',
      'modul-6-laporan-pembelian',
      'modul-6-laporan-petani',
      'modul-6-laporan-pengiriman',
      'modul-6-laporan-sample',
    ],
    capabilities: {
      canManageUsers: false,
      canViewAuditLog: false,
      canManageMasterData: true,
      canCreatePetani: true,
      canInputTransaksi: true,
      canManageStok: true,
      canManageQC: true,
      canManagePengiriman: false,
      canViewAnalytics: true,
    },
  },
  admin_timbang: {
    role: 'admin_timbang',
    label: 'Admin Timbang',
    deskripsi: 'Akses khusus modul timbangan (input berat bruto/netto).',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    allowedModules: [
      'modul-home',
      'modul-0-timbangan',
    ],
    capabilities: {
      canManageUsers: false,
      canViewAuditLog: false,
      canManageMasterData: false,
      canCreatePetani: false,
      canInputTransaksi: true,
      canManageStok: false,
      canManageQC: false,
      canManagePengiriman: false,
      canViewAnalytics: false,
    },
  },
  admin_kasir: {
    role: 'admin_kasir',
    label: 'Admin Kasir',
    deskripsi: 'Akses khusus proses Pembelian (Kasir/Nota, Timbangan, Sortir) dan seluruh Laporan & Analitik.',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-800',
    badgeBorder: 'border-teal-300',
    allowedModules: [
      'modul-home',
      'modul-0-kasir',
      'modul-0-transaksi',
      'modul-0-timbangan',
      'modul-0-sortir',
      'modul-6-dashboard-analytic',
      'modul-6-laporan-bal',
      'modul-6-laporan-grade',
      'modul-6-laporan-pembelian',
      'modul-6-laporan-petani',
      'modul-6-laporan-pengiriman',
      'modul-6-laporan-sample',
    ],
    capabilities: {
      canManageUsers: false,
      canViewAuditLog: false,
      canManageMasterData: false,
      canCreatePetani: false,
      canInputTransaksi: true,
      canManageStok: false,
      canManageQC: false,
      canManagePengiriman: false,
      canViewAnalytics: true,
    },
  },
  admin_pengiriman: {
    role: 'admin_pengiriman',
    label: 'Admin Pengiriman',
    deskripsi: 'Akses seluruh modul operasional terkait pengiriman: Pengiriman Reguler (DO), Pengiriman Sample, serta Laporan Pengiriman & DO Pabrik.',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300',
    allowedModules: [
      'modul-home',
      'modul-5-pengiriman',
      'modul-4-sample',
      'modul-status-batch',
      'modul-status-pengiriman',
      'modul-3-harga-jual',
      'modul-6-laporan-pengiriman',
      'modul-6-laporan-sample',
    ],
    capabilities: {
      canManageUsers: false,
      canViewAuditLog: false,
      canManageMasterData: false,
      canCreatePetani: false,
      canInputTransaksi: false,
      canManageStok: false,
      canManageQC: false,
      canManagePengiriman: true,
      canViewAnalytics: false,
    },
  },
  kepala_gudang: {
    role: 'kepala_gudang',
    label: 'Kepala Gudang',
    deskripsi: 'Akses pimpinan operasional: Membuka semua modul laporan dan dashboard analitik eksekutif.',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-300',
    allowedModules: [
      'modul-home',
      'modul-status-batch',
      'modul-status-pengiriman',
      'modul-6-dashboard-analytic',
      'modul-6-laporan-bal',
      'modul-6-laporan-grade',
      'modul-6-laporan-pembelian',
      'modul-6-laporan-petani',
      'modul-6-laporan-pengiriman',
      'modul-6-laporan-sample',
    ],
    capabilities: {
      canManageUsers: false,
      canViewAuditLog: false,
      canManageMasterData: false,
      canCreatePetani: false,
      canInputTransaksi: false,
      canManageStok: false,
      canManageQC: false,
      canManagePengiriman: false,
      canViewAnalytics: true,
    },
  },
};

export function getRoleInfo(role?: UserRole | string): RolePermissionInfo {
  if (!role) return ROLE_DEFINITIONS.superadmin;
  return ROLE_DEFINITIONS[role as UserRole] || ROLE_DEFINITIONS.superadmin;
}

/** Dashboard Analytic dan enam Laporan; urutan dan nama sama dengan menu samping. */
export const MODUL_LAPORAN: { id: string; nama: string }[] = [
  { id: 'modul-6-dashboard-analytic', nama: 'Dashboard Analytic' },
  { id: 'modul-6-laporan-bal', nama: 'Laporan Bal' },
  { id: 'modul-6-laporan-grade', nama: 'Laporan Harga' },
  { id: 'modul-6-laporan-pembelian', nama: 'Laporan Pembelian' },
  { id: 'modul-6-laporan-petani', nama: 'Laporan Petani' },
  { id: 'modul-6-laporan-pengiriman', nama: 'Laporan Pengiriman Reguler (DO)' },
  { id: 'modul-6-laporan-sample', nama: 'Laporan Pengiriman Sample' },
];
const ID_MODUL_LAPORAN = MODUL_LAPORAN.map((m) => m.id);

/**
 * Peran yang laporannya dipilih Super Admin (keputusan pemilik 2026-10-02: per peran, pilih per laporan, bawaan semua
 * terbuka). Sama dengan App\Support\AksesLaporan::PERAN di backend.
 */
export const PERAN_AKSES_LAPORAN_DIATUR: UserRole[] = ['admin_sortir'];

type AksesLaporan = Partial<Record<UserRole, string[]>>;
const KUNCI_AKSES_LAPORAN = 'sms_akses_laporan_v1';
const bacaAksesLaporan = (): AksesLaporan => {
  try {
    const teks = localStorage.getItem(KUNCI_AKSES_LAPORAN);
    return teks ? (JSON.parse(teks) as AksesLaporan) : {};
  } catch {
    return {};
  }
};
let aksesLaporan: AksesLaporan = bacaAksesLaporan();
const pemantauAkses = new Set<() => void>();

/** Laporan yang terbuka untuk peran itu; tanpa pengaturan dari server = semua (bawaan). */
export function laporanTerbuka(role: UserRole | string): string[] {
  return aksesLaporan[role as UserRole] ?? ID_MODUL_LAPORAN;
}

/**
 * Dipasang dari ringkasan server (berlaku di semua komputer tanpa login ulang) atau setelah Super Admin menyimpan.
 * Disimpan di peramban supaya tetap berlaku saat server tidak terjangkau.
 */
export function aturAksesLaporan(baru: AksesLaporan): void {
  const gabungan = { ...aksesLaporan, ...baru };
  if (JSON.stringify(gabungan) === JSON.stringify(aksesLaporan)) return;
  aksesLaporan = gabungan;
  try {
    localStorage.setItem(KUNCI_AKSES_LAPORAN, JSON.stringify(aksesLaporan));
  } catch {
    // Penyimpanan peramban penuh atau diblokir: pengaturan tetap berlaku sampai halaman dimuat ulang
  }
  pemantauAkses.forEach((f) => f());
}

/** Untuk useSyncExternalStore: menu samping, Home, dan penjaga menu ikut berubah begitu akses laporan berubah. */
export function pantauAksesLaporan(f: () => void): () => void {
  pemantauAkses.add(f);
  return () => pemantauAkses.delete(f);
}
export const ambilAksesLaporan = (): AksesLaporan => aksesLaporan;

export function hasModuleAccess(role?: UserRole | string, moduleId?: string): boolean {
  if (!moduleId) return false;
  const roleInfo = getRoleInfo(role);
  if (!roleInfo) return false;
  if (!roleInfo.allowedModules.includes(moduleId)) return false;
  if (PERAN_AKSES_LAPORAN_DIATUR.includes(roleInfo.role) && ID_MODUL_LAPORAN.includes(moduleId)) {
    return laporanTerbuka(roleInfo.role).includes(moduleId);
  }
  return true;
}

export function canUserPerform(
  role?: UserRole | string,
  capability?: keyof RolePermissionInfo['capabilities']
): boolean {
  if (!capability) return false;
  const roleInfo = getRoleInfo(role);
  return Boolean(roleInfo?.capabilities[capability]);
}

export const ALL_ROLES: UserRole[] = [
  'superadmin',
  'admin_sortir',
  'admin_timbang',
  'admin_kasir',
  'admin_pengiriman',
  'kepala_gudang',
];

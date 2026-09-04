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
      'modul-6-laporan-grade',
      'modul-6-laporan-pembelian',
      'modul-6-laporan-gudang',
      'modul-6-laporan-petani',
      'modul-6-laporan-pengiriman',
      'modul-1-petani',
      'modul-3-harga',
      'modul-3-harga-jual',
      'modul-7-gudang',
      'modul-2-barang',
      'modul-0-sortir',
      'modul-0-timbangan',
      'modul-0-kasir',
      'modul-0-transaksi',
      'modul-5-pengiriman',
      'modul-4-sample',
      'modul-status-batch',
      'modul-users',
      'modul-log-aktivitas',
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
    deskripsi: 'Akses proses sortir kupon & grade mutu, semua master data (Petani, Harga/Kualitas, Gudang, Inventaris Bal), serta modul laporan.',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-300',
    allowedModules: [
      'modul-home',
      'modul-0-sortir',
      'modul-1-petani',
      'modul-3-harga',
      'modul-3-harga-jual',
      'modul-7-gudang',
      'modul-2-barang',
      'modul-6-dashboard-analytic',
      'modul-6-laporan-grade',
      'modul-6-laporan-pembelian',
      'modul-6-laporan-gudang',
      'modul-6-laporan-petani',
      'modul-6-laporan-pengiriman',
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
    deskripsi: 'Akses khusus modul timbangan (input berat bruto/netto) dan Laporan Okupansi & Stok Gudang.',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    allowedModules: [
      'modul-home',
      'modul-0-timbangan',
      'modul-6-laporan-gudang',
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
    deskripsi: 'Akses khusus proses Pembelian (Kasir/Nota, Timbangan, Sortir) dan seluruh Laporan & Analitik Gudang.',
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
      'modul-6-laporan-grade',
      'modul-6-laporan-pembelian',
      'modul-6-laporan-gudang',
      'modul-6-laporan-petani',
      'modul-6-laporan-pengiriman',
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
      'modul-3-harga-jual',
      'modul-6-laporan-pengiriman',
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
      'modul-6-dashboard-analytic',
      'modul-6-laporan-grade',
      'modul-6-laporan-pembelian',
      'modul-6-laporan-gudang',
      'modul-6-laporan-petani',
      'modul-6-laporan-pengiriman',
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

export function hasModuleAccess(role?: UserRole | string, moduleId?: string): boolean {
  if (!moduleId) return false;
  const roleInfo = getRoleInfo(role);
  if (!roleInfo) return false;
  return roleInfo.allowedModules.includes(moduleId);
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

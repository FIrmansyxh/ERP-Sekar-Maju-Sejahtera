import React, { useState } from 'react';
import { 
  Home, 
  Database, 
  Tag, 
  ShoppingCart, 
  Package, 
  ChevronRight, 
  ChevronDown, 
  Users, 
  FlaskConical, 
  Truck, 
  BarChart3, 
  Scale,
  Warehouse,
  UserCheck,
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';
import { UserRole } from '../types';
import { hasModuleAccess } from '../utils/rbac';

interface SidebarProps {
  activeModuleId: string;
  onSelectModule: (id: string) => void;
  petaniCount: number;
  barangCount?: number;
  transaksiCount?: number;
  sampleCount?: number;
  pengirimanCount?: number;
  hargaJualCount?: number;
  hargaCount?: number;
  gudangCount?: number;
  userCount?: number;
  isCollapsed?: boolean;
  userRole?: UserRole;
}

export const MODULES_CONFIG = [
  {
    id: 'modul-home',
    title: 'Home',
    subtitle: 'Dasbor Menu Utama',
    icon: 'Home',
    moduleKey: 'home',
  },
  {
    id: 'modul-6-dashboard-analytic',
    title: 'Dashboard Laporan & Analytic ERP',
    subtitle: 'Executive Summary & Audit',
    icon: 'BarChart3',
    moduleKey: 'dashboard-analytic',
  },
  {
    id: 'modul-6-laporan-bal',
    title: 'Laporan Bal',
    subtitle: 'Detail Bal, Berat, Harga & Status',
    icon: 'Package',
    moduleKey: 'laporan-bal',
  },
  {
    id: 'modul-6-laporan-grade',
    title: 'Laporan Mutu Grade',
    subtitle: 'Stok, Intake & Valuasi per Grade',
    icon: 'Award',
    moduleKey: 'laporan-grade',
  },
  {
    id: 'modul-6-laporan-pembelian',
    title: 'Laporan Pembelian Barang',
    subtitle: 'Filter Dinamis & Unduh Rekap',
    icon: 'FileSpreadsheet',
    moduleKey: 'laporan-pembelian',
  },
  {
    id: 'modul-6-laporan-gudang',
    title: 'Laporan Okupansi & Stok Gudang',
    subtitle: 'Kapasitas & Inventaris Tembakau',
    icon: 'Warehouse',
    moduleKey: 'laporan-gudang',
  },
  {
    id: 'modul-6-laporan-petani',
    title: 'Laporan Petani & Setoran',
    subtitle: 'Rekapitulasi Penyetor & Nilai Pembelian',
    icon: 'Users',
    moduleKey: 'laporan-petani',
  },
  {
    id: 'modul-6-laporan-pengiriman',
    title: 'Laporan Pengiriman & DO',
    subtitle: 'Distribusi Pabrik & Realisasi Tonase',
    icon: 'Truck',
    moduleKey: 'laporan-pengiriman',
  },
  {
    id: 'modul-1-petani',
    title: 'Master Petani',
    subtitle: 'Registrasi & Kartu Petani',
    icon: 'Users',
    moduleKey: 'petani',
  },
  {
    id: 'modul-3-harga',
    title: 'Master Harga Beli',
    subtitle: 'Kode & Kriteria Tembakau',
    icon: 'Tag',
    moduleKey: 'harga',
  },
  {
    id: 'modul-3-harga-jual',
    title: 'Master Harga Jual',
    subtitle: 'Kode, Harga Jual & Tgl Berlaku',
    icon: 'DollarSign',
    moduleKey: 'harga-jual',
  },
  {
    id: 'modul-7-gudang',
    title: 'Master Data Gudang',
    subtitle: 'Lokasi Simpan & Kapasitas',
    icon: 'Warehouse',
    moduleKey: 'gudang',
  },
  {
    id: 'modul-2-barang',
    title: 'Inventaris Bal Gudang',
    subtitle: 'Stok Fisik & Label Thermal',
    icon: 'Package',
    moduleKey: 'barang',
  },
  {
    id: 'modul-0-sortir',
    title: 'Sortir',
    subtitle: 'Input Kupon & Mutu Grade',
    icon: 'Layers',
    moduleKey: 'sortir',
  },
  {
    id: 'modul-0-timbangan',
    title: 'Timbangan',
    subtitle: 'Input Berat Bruto & Netto',
    icon: 'Scale',
    moduleKey: 'timbangan',
  },
  {
    id: 'modul-0-kasir',
    title: 'Kasir',
    subtitle: 'Data Pembelian & Cetak Nota',
    icon: 'DollarSign',
    moduleKey: 'kasir',
  },
  {
    id: 'modul-0-transaksi',
    title: 'Transaksi Pembelian',
    subtitle: 'Timbang Bal & Kupon',
    icon: 'Scale',
    moduleKey: 'transaksi',
  },
  {
    id: 'modul-5-pengiriman',
    title: 'Pengiriman Reguler (DO)',
    subtitle: 'Surat Jalan ke Pabrik',
    icon: 'Truck',
    moduleKey: 'pengiriman',
  },
  {
    id: 'modul-4-sample',
    title: 'Pengiriman Sample',
    subtitle: 'Uji Mutu Laboratorium',
    icon: 'FlaskConical',
    moduleKey: 'sample',
  },
  {
    id: 'modul-status-batch',
    title: 'Status & Detail Batch',
    subtitle: 'Sortir Pembeli & Status DO',
    icon: 'Layers',
    moduleKey: 'status-batch',
  },
  {
    id: 'modul-users',
    title: 'Manajemen Pengguna',
    subtitle: 'Hak Akses & Otorisasi RBAC',
    icon: 'UserCheck',
    moduleKey: 'users',
  },
  ];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModuleId,
  onSelectModule,
  petaniCount = 0,
  barangCount = 0,
  transaksiCount = 0,
  sampleCount = 0,
  pengirimanCount = 0,
  hargaJualCount = 0,
  hargaCount = 0,
  gudangCount = 0,
  userCount = 0,
  isCollapsed = false,
  userRole = 'superadmin',
}) => {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    'report': true,
    'master-data': true,
    'pembelian': true,
    'pengiriman': true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const checkAccess = (modId: string) => hasModuleAccess(userRole, modId);

  const canSeeReport = checkAccess('modul-6-dashboard-analytic') || checkAccess('modul-6-laporan-bal') || checkAccess('modul-6-laporan-grade') || checkAccess('modul-6-laporan-harga-jual') || checkAccess('modul-6-laporan-pembelian') || checkAccess('modul-6-laporan-gudang') || checkAccess('modul-6-laporan-petani') || checkAccess('modul-6-laporan-pengiriman');
  const canSeeMaster = checkAccess('modul-1-petani') || checkAccess('modul-3-harga') || checkAccess('modul-3-harga-jual') || checkAccess('modul-7-gudang') || checkAccess('modul-2-barang');
  const canSeePembelian = checkAccess('modul-0-sortir') || checkAccess('modul-0-timbangan') || checkAccess('modul-0-kasir') || checkAccess('modul-0-transaksi');
  const canSeePengiriman = checkAccess('modul-5-pengiriman') || checkAccess('modul-4-sample') || checkAccess('modul-status-batch');
  const canSeeUsers = checkAccess('modul-users');
  
  const isReportActive = [
    'modul-6-dashboard-analytic',
    'modul-6-laporan-bal',
    'modul-6-laporan-grade',
    'modul-6-laporan-harga-jual',
    'modul-6-laporan-pembelian',
    'modul-6-laporan-gudang',
    'modul-6-laporan-petani',
    'modul-6-laporan-pengiriman',
  ].includes(activeModuleId);
  const isMasterActive = ['modul-1-petani', 'modul-3-harga', 'modul-3-harga-jual', 'modul-7-gudang', 'modul-2-barang'].includes(activeModuleId);
  const isPembelianActive = ['modul-0-sortir', 'modul-0-timbangan', 'modul-0-kasir', 'modul-0-transaksi'].includes(activeModuleId);
  const isPengirimanActive = ['modul-5-pengiriman', 'modul-4-sample', 'modul-status-batch'].includes(activeModuleId);
  const isUsersActive = activeModuleId === 'modul-users';
    const isHomeActive = activeModuleId === 'modul-home';

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-60 sm:w-64'} bg-white border-r border-gray-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] select-none transition-all duration-200`}>
      
      {/* Top Logo Brand */}
      <div className="h-16 border-b border-slate-200 flex items-center px-4 space-x-3 bg-white">
        <div className="w-8 h-8 rounded-sm bg-slate-900 flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0 tracking-wider">
          <span>SMS</span>
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 leading-tight">
              PR. SEKAR MAJU SEJAHTERA
            </h2>
            <p className="text-[10px] text-slate-500 font-normal leading-none mt-0.5">
              Sistem Data Gudang Tembakau
            </p>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        
        {/* 1. Home */}
        {checkAccess('modul-home') && (
          <button
            onClick={() => onSelectModule('modul-home')}
            className={`w-full text-left px-3 py-2.5 rounded-sm flex items-center justify-between text-xs transition cursor-pointer ${
              isHomeActive
                ? 'bg-slate-900 text-white font-medium shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <Home className={`w-4 h-4 shrink-0 ${isHomeActive ? 'text-white' : 'text-slate-500'}`} />
              {!isCollapsed && <span>Home</span>}
            </div>
          </button>
        )}

        {/* 2. Report & Analitik */}
        {canSeeReport && (
          <div className="space-y-0.5">
            <button
              onClick={() => toggleSection('report')}
              className={`w-full text-left px-3 py-2.5 rounded-sm flex items-center justify-between text-xs transition cursor-pointer ${
                isReportActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <BarChart3 className={`w-4 h-4 shrink-0 ${isReportActive ? 'text-slate-900' : 'text-slate-500'}`} />
                {!isCollapsed && <span>Report & Analitik</span>}
              </div>
              {!isCollapsed && (
                openSections['report'] ? (
                  <ChevronDown className={`w-3.5 h-3.5 ${isReportActive ? 'text-slate-900' : 'text-slate-400'}`} />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )
              )}
            </button>

            {!isCollapsed && openSections['report'] && (
              <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                {checkAccess('modul-6-dashboard-analytic') && (
                  <button
                    onClick={() => onSelectModule('modul-6-dashboard-analytic')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-6-dashboard-analytic'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Dashboard Analytic</span>
                  </button>
                )}

                {checkAccess('modul-6-laporan-bal') && (
                  <button
                    onClick={() => onSelectModule('modul-6-laporan-bal')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-6-laporan-bal'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Laporan Bal</span>
                  </button>
                )}

                {checkAccess('modul-6-laporan-grade') && (
                  <button
                    onClick={() => onSelectModule('modul-6-laporan-grade')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-6-laporan-grade'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Laporan Harga</span>
                  </button>
                )}

                                {checkAccess('modul-6-laporan-harga-jual') && (
                  <button
                    onClick={() => onSelectModule('modul-6-laporan-harga-jual')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-6-laporan-harga-jual'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Laporan Harga Jual</span>
                  </button>
                )}
                {checkAccess('modul-6-laporan-pembelian') && (
                  <button
                    onClick={() => onSelectModule('modul-6-laporan-pembelian')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-6-laporan-pembelian'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Laporan Pembelian</span>
                  </button>
                )}

                {checkAccess('modul-6-laporan-gudang') && (
                  <button
                    onClick={() => onSelectModule('modul-6-laporan-gudang')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-6-laporan-gudang'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Laporan Gudang</span>
                  </button>
                )}

                {checkAccess('modul-6-laporan-petani') && (
                  <button
                    onClick={() => onSelectModule('modul-6-laporan-petani')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-6-laporan-petani'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Laporan Petani</span>
                  </button>
                )}

                {checkAccess('modul-6-laporan-pengiriman') && (
                  <button
                    onClick={() => onSelectModule('modul-6-laporan-pengiriman')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-6-laporan-pengiriman'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Laporan Pengiriman</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Master Data */}
        {canSeeMaster && (
          <div className="space-y-0.5">
            <button
              onClick={() => toggleSection('master-data')}
              className={`w-full text-left px-3 py-2.5 rounded-sm flex items-center justify-between text-xs transition cursor-pointer ${
                isMasterActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Database className={`w-4 h-4 shrink-0 ${isMasterActive ? 'text-slate-900' : 'text-slate-500'}`} />
                {!isCollapsed && <span>Master Data</span>}
              </div>
              {!isCollapsed && (
                openSections['master-data'] ? (
                  <ChevronDown className={`w-3.5 h-3.5 ${isMasterActive ? 'text-slate-900' : 'text-slate-400'}`} />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )
              )}
            </button>

            {!isCollapsed && openSections['master-data'] && (
              <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                {checkAccess('modul-1-petani') && (
                  <button
                    onClick={() => onSelectModule('modul-1-petani')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-1-petani'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Master Petani</span>
                    <span className="text-[10px] font-mono font-medium px-1 bg-slate-100 text-slate-600 rounded-xs">
                      {petaniCount}
                    </span>
                  </button>
                )}

                {checkAccess('modul-3-harga') && (
                  <button
                    onClick={() => onSelectModule('modul-3-harga')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-3-harga'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Master Harga Beli</span>
                    <span className="text-[10px] font-mono font-medium px-1 bg-slate-100 text-slate-600 rounded-xs">
                      {hargaCount} Kode
                    </span>
                  </button>
                )}

                {checkAccess('modul-3-harga-jual') && (
                  <button
                    onClick={() => onSelectModule('modul-3-harga-jual')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-3-harga-jual'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Master Harga Jual</span>
                    <span className="text-[10px] font-mono font-medium px-1 bg-slate-100 text-slate-600 rounded-xs">
                      {hargaJualCount} Kode
                    </span>
                  </button>
                )}

                {checkAccess('modul-7-gudang') && (
                  <button
                    onClick={() => onSelectModule('modul-7-gudang')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-7-gudang'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Master Data Gudang</span>
                    <span className="text-[10px] font-mono font-medium px-1 bg-slate-100 text-slate-600 rounded-xs">
                      {gudangCount}
                    </span>
                  </button>
                )}

                {checkAccess('modul-2-barang') && (
                  <button
                    onClick={() => onSelectModule('modul-2-barang')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-2-barang'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Inventaris Bal Gudang</span>
                    <span className="text-[10px] font-mono font-medium px-1 bg-slate-100 text-slate-600 rounded-xs">
                      {barangCount > 9999 ? "9999+" : barangCount} Bal
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. Pembelian */}
        {canSeePembelian && (
          <div className="space-y-0.5">
            <button
              onClick={() => toggleSection('pembelian')}
              className={`w-full text-left px-3 py-2.5 rounded-sm flex items-center justify-between text-xs transition cursor-pointer ${
                isPembelianActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <ShoppingCart className={`w-4 h-4 shrink-0 ${isPembelianActive ? 'text-slate-900' : 'text-slate-500'}`} />
                {!isCollapsed && <span>Pembelian</span>}
              </div>
              {!isCollapsed && (
                openSections['pembelian'] ? (
                  <ChevronDown className={`w-3.5 h-3.5 ${isPembelianActive ? 'text-slate-900' : 'text-slate-400'}`} />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )
              )}
            </button>

            {!isCollapsed && openSections['pembelian'] && (
              <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                {/* 1. Sortir */}
                {checkAccess('modul-0-sortir') && (
                  <button
                    onClick={() => onSelectModule('modul-0-sortir')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-0-sortir'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Sortir</span>
                    <span className="text-[9px] font-medium px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-xs border border-slate-200">
                      Intake
                    </span>
                  </button>
                )}

                {/* 2. Timbangan */}
                {checkAccess('modul-0-timbangan') && (
                  <button
                    onClick={() => onSelectModule('modul-0-timbangan')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-0-timbangan'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Timbangan</span>
                    <span className="text-[9px] font-medium px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-xs border border-slate-200">
                      Berat
                    </span>
                  </button>
                )}

                {/* 3. Kasir */}
                {(checkAccess('modul-0-kasir') || checkAccess('modul-0-transaksi')) && (
                  <button
                    onClick={() => onSelectModule('modul-0-kasir')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-0-kasir' || activeModuleId === 'modul-0-transaksi'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Kasir</span>
                    <span className="text-[10px] font-mono font-medium px-1 bg-slate-100 text-slate-600 rounded-xs">
                      {transaksiCount}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. Pengiriman Barang */}
        {canSeePengiriman && (
          <div className="space-y-0.5">
            <button
              onClick={() => toggleSection('pengiriman')}
              className={`w-full text-left px-3 py-2.5 rounded-sm flex items-center justify-between text-xs transition cursor-pointer ${
                isPengirimanActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Truck className={`w-4 h-4 shrink-0 ${isPengirimanActive ? 'text-slate-900' : 'text-slate-500'}`} />
                {!isCollapsed && <span>Pengiriman Barang</span>}
              </div>
              {!isCollapsed && (
                openSections['pengiriman'] ? (
                  <ChevronDown className={`w-3.5 h-3.5 ${isPengirimanActive ? 'text-slate-900' : 'text-slate-400'}`} />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )
              )}
            </button>

            {!isCollapsed && openSections['pengiriman'] && (
              <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                {checkAccess('modul-4-sample') && (
                  <button
                    onClick={() => onSelectModule('modul-4-sample')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-4-sample'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Pengiriman Sample</span>
                    <span className="text-[10px] font-mono font-medium px-1 bg-slate-100 text-slate-600 rounded-xs">
                      {sampleCount}
                    </span>
                  </button>
                )}

                {checkAccess('modul-5-pengiriman') && (
                  <button
                    onClick={() => onSelectModule('modul-5-pengiriman')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-5-pengiriman'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Pengiriman Reguler (DO)</span>
                    <span className="text-[10px] font-mono font-medium px-1 bg-slate-100 text-slate-600 rounded-xs">
                      {pengirimanCount}
                    </span>
                  </button>
                )}

                {checkAccess('modul-status-batch') && (
                  <button
                    onClick={() => onSelectModule('modul-status-batch')}
                    className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                      activeModuleId === 'modul-status-batch'
                        ? 'text-slate-900 font-semibold bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>Status & Detail Batch</span>
                    <span className="text-[9px] font-medium px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-xs border border-amber-200">
                      Sortir & DO
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. User Management & RBAC */}
        {canSeeUsers && (
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onSelectModule('modul-users')}
              className={`w-full text-left px-3 py-2.5 rounded-sm flex items-center justify-between text-xs transition cursor-pointer ${
                isUsersActive
                  ? 'bg-slate-900 text-white font-medium shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <UserCheck className={`w-4 h-4 shrink-0 ${isUsersActive ? 'text-white' : 'text-slate-500'}`} />
                {!isCollapsed && <span>Manajemen Pengguna</span>}
              </div>
              {!isCollapsed && (
                <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-xs ${
                  isUsersActive 
                    ? 'bg-slate-800 text-slate-200' 
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {userCount || 5} User
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

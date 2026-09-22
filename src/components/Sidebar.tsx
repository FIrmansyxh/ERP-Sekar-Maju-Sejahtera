import React, { useState } from 'react';
import { Home, Database, ShoppingCart, ChevronRight, ChevronDown, Truck, BarChart3, UserCheck, LucideIcon } from 'lucide-react';
import { UserRole } from '../types';
import { hasModuleAccess } from '../utils/rbac';
import { APP_VERSION, APP_BUILD } from '../config/appInfo';

interface SidebarProps {
  activeModuleId: string;
  onSelectModule: (id: string) => void;
  petaniCount: number;
  transaksiCount?: number;
  sampleCount?: number;
  pengirimanCount?: number;
  hargaJualCount?: number;
  hargaCount?: number;
  userCount?: number;
  userRole?: UserRole;
}

interface ItemMenu {
  id: string;
  label: string;
  /** Modul lain yang juga menandai item ini aktif */
  aliasId?: string[];
  jumlah?: string;
}

interface GrupMenu {
  kunci: string;
  label: string;
  Ikon: LucideIcon;
  items: ItemMenu[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModuleId,
  onSelectModule,
  petaniCount = 0,
  transaksiCount = 0,
  sampleCount = 0,
  pengirimanCount = 0,
  hargaJualCount = 0,
  hargaCount = 0,
  userCount = 0,
  userRole = 'superadmin',
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    report: true,
    'master-data': true,
    pembelian: true,
    pengiriman: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const bolehBuka = (item: ItemMenu) => [item.id, ...(item.aliasId || [])].some((id) => hasModuleAccess(userRole, id));
  const isAktif = (item: ItemMenu) => item.id === activeModuleId || Boolean(item.aliasId?.includes(activeModuleId));

  const grupMenu: GrupMenu[] = [
    {
      kunci: 'report',
      label: 'Report & Analitik',
      Ikon: BarChart3,
      items: [
        { id: 'modul-6-dashboard-analytic', label: 'Dashboard Analytic' },
        { id: 'modul-6-laporan-bal', label: 'Laporan Bal' },
        { id: 'modul-6-laporan-grade', label: 'Laporan Harga' },
        { id: 'modul-6-laporan-pembelian', label: 'Laporan Pembelian' },
        { id: 'modul-6-laporan-petani', label: 'Laporan Petani' },
        { id: 'modul-6-laporan-pengiriman', label: 'Laporan Pengiriman' },
      ],
    },
    {
      kunci: 'master-data',
      label: 'Master Data',
      Ikon: Database,
      items: [
        { id: 'modul-1-petani', label: 'Master Petani', jumlah: String(petaniCount) },
        { id: 'modul-3-harga', label: 'Master Harga Beli', jumlah: String(hargaCount) },
        { id: 'modul-3-harga-jual', label: 'Master Harga Jual', jumlah: String(hargaJualCount) },
      ],
    },
    {
      kunci: 'pembelian',
      label: 'Pembelian',
      Ikon: ShoppingCart,
      items: [
        { id: 'modul-0-sortir', label: 'Sortir' },
        { id: 'modul-0-timbangan', label: 'Timbangan' },
        { id: 'modul-0-kasir', label: 'Kasir', aliasId: ['modul-0-transaksi'], jumlah: String(transaksiCount) },
      ],
    },
    {
      kunci: 'pengiriman',
      label: 'Pengiriman Barang',
      Ikon: Truck,
      items: [
        { id: 'modul-4-sample', label: 'Pengiriman Sample', jumlah: String(sampleCount) },
        { id: 'modul-status-batch', label: 'Status & Detail Batch' },
        { id: 'modul-5-pengiriman', label: 'Pengiriman Reguler (DO)', jumlah: String(pengirimanCount) },
      ],
    },
  ];

  const isHomeActive = activeModuleId === 'modul-home';
  const isUsersActive = activeModuleId === 'modul-users';

  return (
    <aside className="w-60 sm:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] select-none">
      <div className="h-16 border-b border-slate-200 flex items-center px-4 space-x-3 bg-white">
        <div className="w-8 h-8 rounded-sm bg-slate-900 flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0 tracking-wider">
          <span>SMS</span>
        </div>
        <div className="overflow-hidden">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 leading-tight">PT. SEKAR MAJU SEJAHTERA</h2>
          <p className="text-[10px] text-slate-500 font-normal leading-none mt-0.5">Sistem Data Gudang Tembakau</p>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {hasModuleAccess(userRole, 'modul-home') && (
          <button
            onClick={() => onSelectModule('modul-home')}
            className={`w-full text-left px-3 py-2.5 rounded-sm flex items-center space-x-3 text-xs transition cursor-pointer ${
              isHomeActive ? 'bg-slate-900 text-white font-medium shadow-2xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Home className={`w-4 h-4 shrink-0 ${isHomeActive ? 'text-white' : 'text-slate-500'}`} />
            <span>Home</span>
          </button>
        )}

        {grupMenu.map(({ kunci, label, Ikon, items }) => {
          const terlihat = items.filter(bolehBuka);
          if (terlihat.length === 0) return null;
          const grupAktif = items.some(isAktif);
          const terbuka = openSections[kunci];
          return (
            <div key={kunci} className="space-y-0.5">
              <button
                onClick={() => toggleSection(kunci)}
                className={`w-full text-left px-3 py-2.5 rounded-sm flex items-center justify-between text-xs transition cursor-pointer ${
                  grupAktif ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Ikon className={`w-4 h-4 shrink-0 ${grupAktif ? 'text-slate-900' : 'text-slate-500'}`} />
                  <span>{label}</span>
                </div>
                {terbuka ? (
                  <ChevronDown className={`w-3.5 h-3.5 ${grupAktif ? 'text-slate-900' : 'text-slate-400'}`} />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {terbuka && (
                <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                  {terlihat.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onSelectModule(item.id)}
                      className={`w-full text-left py-1.5 px-2 rounded-xs flex items-center justify-between cursor-pointer ${
                        isAktif(item) ? 'text-slate-900 font-semibold bg-slate-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.jumlah !== undefined && (
                        <span className="text-[10px] font-mono font-medium px-1 bg-slate-100 text-slate-600 rounded-xs">{item.jumlah}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {hasModuleAccess(userRole, 'modul-users') && (
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onSelectModule('modul-users')}
              className={`w-full text-left px-3 py-2.5 rounded-sm flex items-center justify-between text-xs transition cursor-pointer ${
                isUsersActive ? 'bg-slate-900 text-white font-medium shadow-2xs' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <UserCheck className={`w-4 h-4 shrink-0 ${isUsersActive ? 'text-white' : 'text-slate-500'}`} />
                <span>Manajemen Pengguna</span>
              </div>
              <span
                className={`text-[10px] font-mono font-medium px-1 rounded-xs ${
                  isUsersActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {userCount}
              </span>
            </button>
          </div>
        )}
      </nav>

      <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/70 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="font-mono font-semibold text-slate-500">v{APP_VERSION}</span>
        <span className="text-[9px] text-slate-400">{APP_BUILD}</span>
      </div>
    </aside>
  );
};

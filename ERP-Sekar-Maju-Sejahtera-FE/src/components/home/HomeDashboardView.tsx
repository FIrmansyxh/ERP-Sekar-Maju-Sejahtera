import React from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { User } from '../../types';
import { hasModuleAccess, getRoleInfo } from '../../utils/rbac';

interface HomeDashboardViewProps {
  onNavigate: (moduleId: string) => void;
  currentUser?: User | null;
  userCount?: number;
}

/** Nama menu sama dengan menu samping, urutan dikelompokkan per kategori (Report, Master Data, Pembelian, Pengiriman, Administrasi). */
const DAFTAR_MENU: Array<{ nama: string; modId: string; fungsi: string }> = [
  { nama: 'Dashboard Analytic', modId: 'modul-6-dashboard-analytic', fungsi: 'Ringkasan angka dan grafik utama dari seluruh proses' },
  { nama: 'Laporan Bal', modId: 'modul-6-laporan-bal', fungsi: 'Rekap data bal berdasarkan kode, status, dan periode' },
  { nama: 'Laporan Harga', modId: 'modul-6-laporan-grade', fungsi: 'Rekap harga per grade/kode hasil sortir' },
  { nama: 'Laporan Pembelian', modId: 'modul-6-laporan-pembelian', fungsi: 'Rekap transaksi pembelian dari petani per kupon' },
  { nama: 'Laporan Petani', modId: 'modul-6-laporan-petani', fungsi: 'Rekap aktivitas dan setoran per petani' },
  { nama: 'Laporan Pengiriman', modId: 'modul-6-laporan-pengiriman', fungsi: 'Rekap pengiriman barang keluar ke pembeli' },
  { nama: 'Master Petani', modId: 'modul-1-petani', fungsi: 'Kelola data induk petani' },
  { nama: 'Master Harga Beli', modId: 'modul-3-harga', fungsi: 'Kelola harga beli per grade/kode' },
  { nama: 'Master Harga Jual', modId: 'modul-3-harga-jual', fungsi: 'Kelola harga jual per grade/kode' },
  { nama: 'Sortir', modId: 'modul-0-sortir', fungsi: 'Mencatat hasil sortir dan grade tiap bal' },
  { nama: 'Timbangan', modId: 'modul-0-timbangan', fungsi: 'Mencatat berat bruto/netto hasil timbang bal' },
  { nama: 'Kasir', modId: 'modul-0-kasir', fungsi: 'Memproses pembayaran kupon ke petani' },
  { nama: 'Pengiriman Sample', modId: 'modul-4-sample', fungsi: 'Mengirim contoh bal ke calon pembeli' },
  { nama: 'Status & Detail Batch', modId: 'modul-status-batch', fungsi: 'Memantau status dan detail batch sample' },
  { nama: 'Pengiriman Reguler (DO)', modId: 'modul-5-pengiriman', fungsi: 'Membuat surat jalan pengiriman barang ke pembeli' },
  { nama: 'Manajemen Pengguna', modId: 'modul-users', fungsi: 'Kelola akun dan hak akses pengguna' },
];

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({ onNavigate, currentUser, userCount = 0 }) => {
  const currentRole = currentUser?.role || 'superadmin';
  const roleInfo = currentUser ? getRoleInfo(currentUser.role) : null;
  const menuList = DAFTAR_MENU.filter((item) => hasModuleAccess(currentRole, item.modId));

  return (
    <div className="space-y-3.5 font-sans text-gray-800">
      {currentUser && (
        <div className="bg-white border border-gray-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#b81d24] text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
              {(currentUser.nama_lengkap || currentUser.username || '').split(/[\s_]+/).filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-gray-900">Selamat Datang, {currentUser.nama_lengkap || currentUser.username}</span>
                {roleInfo && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-xs border ${roleInfo.badgeBg} ${roleInfo.badgeText} ${roleInfo.badgeBorder}`}>
                    {roleInfo.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {currentUser.unit_penugasan && (
                  <>
                    {currentUser.unit_penugasan} •{' '}
                  </>
                )}
                @{currentUser.username}
              </p>
            </div>
          </div>

          {hasModuleAccess(currentRole, 'modul-users') && (
            <button
              onClick={() => onNavigate('modul-users')}
              className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 text-xs font-semibold rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-[#b81d24]" />
              <span>Kelola Pengguna ({userCount})</span>
            </button>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800 tracking-tight">Menu</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4 w-16 text-center">No</th>
                <th className="py-2.5 px-4 w-[1%] whitespace-nowrap">Menu</th>
                <th className="py-2.5 px-4">Fungsi</th>
                <th className="py-2.5 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {menuList.map((item, idx) => (
                <tr key={item.modId} onClick={() => onNavigate(item.modId)} className="hover:bg-slate-50/80 cursor-pointer transition-colors">
                  <td className="py-2.5 px-4 text-center font-mono text-slate-500">{idx + 1}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">{item.nama}</td>
                  <td className="py-2.5 px-4 text-slate-600">{item.fungsi}</td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(item.modId);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded flex items-center justify-center space-x-1 mx-auto cursor-pointer transition-colors"
                    >
                      <span>Buka</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

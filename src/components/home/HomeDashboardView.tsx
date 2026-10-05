import React from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { User } from '../../types';
import { hasModuleAccess, getRoleInfo } from '../../utils/rbac';

interface HomeDashboardViewProps {
  onNavigate: (moduleId: string) => void;
  currentUser?: User | null;
  userCount?: number;
}

/** Nama, urutan, dan kelompok menu sama dengan menu samping. */
const DAFTAR_MENU: Array<{ grup: string; nama: string; modId: string; fungsi: string }> = [
  { grup: 'Report & Analitik', nama: 'Dashboard Analytic', modId: 'modul-6-dashboard-analytic', fungsi: 'Ringkasan angka dan grafik utama dari seluruh proses' },
  { grup: 'Report & Analitik', nama: 'Laporan Bal', modId: 'modul-6-laporan-bal', fungsi: 'Rekap data bal berdasarkan kode, status, dan periode' },
  { grup: 'Report & Analitik', nama: 'Laporan Harga', modId: 'modul-6-laporan-grade', fungsi: 'Rekap harga per grade/kode hasil sortir' },
  { grup: 'Report & Analitik', nama: 'Laporan Pembelian', modId: 'modul-6-laporan-pembelian', fungsi: 'Rekap transaksi pembelian dari petani per kupon' },
  { grup: 'Report & Analitik', nama: 'Laporan Petani', modId: 'modul-6-laporan-petani', fungsi: 'Rekap aktivitas dan setoran per petani' },
  { grup: 'Report & Analitik', nama: 'Laporan Pengiriman Reguler (DO)', modId: 'modul-6-laporan-pengiriman', fungsi: 'Rekap Surat Jalan dan bal yang dikirim ke pembeli' },
  { grup: 'Report & Analitik', nama: 'Laporan Pengiriman Sample', modId: 'modul-6-laporan-sample', fungsi: 'Rekap sample, selisih harga tawaran-deal dan jual-beli' },
  { grup: 'Master Data', nama: 'Master Petani', modId: 'modul-1-petani', fungsi: 'Kelola data induk petani' },
  { grup: 'Master Data', nama: 'Master Harga Beli', modId: 'modul-3-harga', fungsi: 'Kelola harga beli per grade/kode' },
  { grup: 'Master Data', nama: 'Master Harga Jual', modId: 'modul-3-harga-jual', fungsi: 'Kelola harga jual per grade/kode' },
  { grup: 'Master Data', nama: 'Master Potongan Tara', modId: 'modul-master-potongan', fungsi: 'Atur potongan tara per kode awalan bal dan rentang berat' },
  { grup: 'Pembelian', nama: 'Sortir', modId: 'modul-0-sortir', fungsi: 'Mencatat hasil sortir dan grade tiap bal' },
  { grup: 'Pembelian', nama: 'Timbangan', modId: 'modul-0-timbangan', fungsi: 'Mencatat berat bruto/netto hasil timbang bal' },
  { grup: 'Pembelian', nama: 'Kasir', modId: 'modul-0-kasir', fungsi: 'Memproses pembayaran kupon ke petani' },
  { grup: 'Pembelian', nama: 'Koreksi No Bal', modId: 'modul-koreksi-no-bal', fungsi: 'Mengganti No Bal dan menyimpan riwayat nomor lama' },
  { grup: 'Pengiriman Barang', nama: 'Pengiriman Sample', modId: 'modul-4-sample', fungsi: 'Mengirim contoh bal ke calon pembeli' },
  { grup: 'Pengiriman Barang', nama: 'Status Batch & Reclass', modId: 'modul-status-batch', fungsi: 'Memantau batch sample dan hasil sortir pembeli (ACC, Nego, Tolak)' },
  { grup: 'Pengiriman Barang', nama: 'Pengiriman Reguler (DO)', modId: 'modul-5-pengiriman', fungsi: 'Membuat surat jalan pengiriman barang ke pembeli' },
  { grup: 'Pengiriman Barang', nama: 'Status Pengiriman Reguler (DO)', modId: 'modul-status-pengiriman', fungsi: 'Memantau status Surat Jalan sampai Selesai' },
  { grup: 'Manajemen Pengguna', nama: 'Daftar Pengguna', modId: 'modul-users', fungsi: 'Kelola akun, role, dan status login pengguna' },
  { grup: 'Manajemen Pengguna', nama: 'Audit Trail', modId: 'modul-audit-trail', fungsi: 'Riwayat aktivitas pengguna yang tercatat di perangkat ini' },
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
              <span>Daftar Pengguna ({userCount})</span>
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
                <React.Fragment key={item.modId}>
                {item.grup !== menuList[idx - 1]?.grup && (
                  <tr className="bg-slate-50/70">
                    <td colSpan={4} className="py-1.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {item.grup}
                    </td>
                  </tr>
                )}
                <tr onClick={() => onNavigate(item.modId)} className="hover:bg-slate-50/80 cursor-pointer transition-colors">
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
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

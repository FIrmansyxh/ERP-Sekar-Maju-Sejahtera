import React from 'react';
import { 
  Users, 
  ChevronRight
} from 'lucide-react';
import { Petani, Barang, TransaksiPembelian, PengirimanSample, PengirimanBarang, User } from '../../types';
import { hasModuleAccess, getRoleInfo } from '../../utils/rbac';

interface HomeDashboardViewProps {
  onNavigate: (moduleId: string) => void;
  petaniList: Petani[];
  barangList: Barang[];
  transaksiList: TransaksiPembelian[];
  sampleList: PengirimanSample[];
  pengirimanList: PengirimanBarang[];
  currentUser?: User | null;
  userCount?: number;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  onNavigate,
  currentUser,
  userCount = 0,
}) => {
  const currentRole = currentUser?.role || 'superadmin';
  const roleInfo = currentUser ? getRoleInfo(currentUser.role) : null;

  const allMenus = [
    { no: 1, nama: 'Home', judul: 'Dasbor Menu Utama & Status Sistem', modId: 'modul-home' },
    { no: 2, nama: 'Dashboard Laporan & Analytic ERP', judul: 'Executive Summary, Distribusi Grade & Pusat Unduh Dokumen', modId: 'modul-6-dashboard-analytic' },
    { no: 3, nama: 'Laporan Bal', judul: 'Detail Setiap Bal, Berat, Harga Beli, Total Harga, Status Bayar & Filter Multi-Parameter', modId: 'modul-6-laporan-bal' },
    { no: 4, nama: 'Laporan Kode Bal', judul: 'Analisa Kode Awal Bal Tembakau', modId: 'modul-6-laporan-kode-bal' },
    { no: 5, nama: 'Laporan Stok & Mutu Grade', judul: 'Rekapitulasi Mutu Grade, Tonase Bal, Valuasi Inventaris & Perputaran Stok', modId: 'modul-6-laporan-grade' },
    { no: 6, nama: 'Laporan Pembelian Barang', judul: 'Rekapitulasi Pembelian Multi-Parameter, Potongan Kuli & Tikar', modId: 'modul-6-laporan-pembelian' },
    { no: 7, nama: 'Laporan Petani & Setoran', judul: 'Rekapitulasi Kinerja Penyetoran, Volume Bal & Nilai Pembelian Per Petani', modId: 'modul-6-laporan-petani' },
    { no: 8, nama: 'Laporan Pengiriman & DO Pabrik', judul: 'Distribusi Bal Tembakau, Surat Jalan Pabrik Rekanan & Armada Logistik', modId: 'modul-6-laporan-pengiriman' },
    { no: 9, nama: 'Master Petani', judul: 'Data Petani Tembakau & Kartu Scan Setoran', modId: 'modul-1-petani' },
    { no: 10, nama: 'Master Harga Beli', judul: 'Tarif Acuan Grade A-F Tembakau Masuk', modId: 'modul-3-harga' },
    { no: 11, nama: 'Master Harga Jual Pabrik', judul: 'Daftar Kode & Master Harga Jual Tembakau ke Pabrik Rekanan', modId: 'modul-3-harga-jual' },
    { no: 12, nama: 'Sortir', judul: 'Proses 1: Kupon Petani, Sortir Mutu Grade Bal & Penentuan No Bal', modId: 'modul-0-sortir' },
    { no: 13, nama: 'Timbangan', judul: 'Proses 2: Standby Scan No Bal, Input Berat Bruto/Netto', modId: 'modul-0-timbangan' },
    { no: 14, nama: 'Kasir', judul: 'Proses 3: Data Pembelian Barang, Rekap Pembayaran & Cetak Nota Resmi', modId: 'modul-0-kasir' },
    { no: 15, nama: 'Pengiriman Sample', judul: 'Uji Laboratorium Mutu & Approval Grade Sample Internal/Eksternal', modId: 'modul-4-sample' },
    { no: 16, nama: 'Status & Detail Batch', judul: 'Detail Evaluasi QC Sortir Buyer & Monitoring Distribusi Ekspedisi', modId: 'modul-status-batch' },
    { no: 17, nama: 'Pengiriman Reguler (DO Luar)', judul: 'Surat Jalan Pengiriman Bal ke Buyer Pabrik Rokok', modId: 'modul-5-pengiriman' },
    { no: 18, nama: 'Manajemen Pengguna (RBAC)', judul: 'Otorisasi Staf & Hak Akses Role Kerja', modId: 'modul-users' },
  ];

  // Filter menu list based on RBAC permissions
  const menuList = allMenus.filter((item) => {
    if (item.modId) {
      return hasModuleAccess(currentRole, item.modId);
    }
    return true;
  });

  return (
    <div className="space-y-3.5 font-sans text-gray-800">
      
      {/* Welcome Banner with RBAC identity */}
      {currentUser && (
        <div className="bg-white border border-gray-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#b81d24] text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
              {(currentUser.nama_lengkap || currentUser.username || '').split(/[\s_]+/).filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-gray-900">
                  Selamat Datang, {currentUser.nama_lengkap || currentUser.username}
                </span>
                {roleInfo && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-xs border ${roleInfo.badgeBg} ${roleInfo.badgeText} ${roleInfo.badgeBorder}`}>
                    {roleInfo.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {currentUser.unit_penugasan && (
                  <>Unit Penugasan: <strong className="text-gray-700">{currentUser.unit_penugasan}</strong> • </>
                )}
                Akun: <code className="text-gray-600">@{currentUser.username}</code>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {hasModuleAccess(currentRole, 'modul-users') && (
              <button
                onClick={() => onNavigate('modul-users')}
                className="px-3 py-1.5 bg-red-50 text-[#b81d24] border border-red-200 hover:bg-red-100 font-bold rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Kelola {userCount || 5} Pengguna (RBAC)</span>
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Menu Directory Table Card */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 tracking-tight">
            Menu Akses Anda ({roleInfo?.label})
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Sistem Data Gudang Tembakau - PR. SEKAR MAJU SEJAHTERA
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4 w-16 text-center">Nomor</th>
                <th className="py-2.5 px-4 w-64">Nama Modul</th>
                <th className="py-2.5 px-4">Keterangan & Cakupan Fungsi</th>
                <th className="py-2.5 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {menuList.map((item, idx) => (
                <tr 
                  key={item.no}
                  onClick={() => onNavigate(item.modId)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-900 flex items-center space-x-1.5">
                    <span>{item.nama}</span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {item.judul}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(item.modId);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded flex items-center justify-center space-x-1 mx-auto cursor-pointer transition-colors"
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

        <div className="p-3 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Menampilkan {menuList.length} modul aktif sesuai wewenang peran {roleInfo?.label}</span>
          <span className="font-medium text-slate-700">PR. SEKAR MAJU SEJAHTERA</span>
        </div>
      </div>

    </div>
  );
};

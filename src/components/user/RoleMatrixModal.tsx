import React from 'react';
import { X, ShieldCheck, Check, Ban } from 'lucide-react';
import { ALL_ROLES, ROLE_DEFINITIONS } from '../../utils/rbac';

interface RoleMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleMatrixModal: React.FC<RoleMatrixModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const modulesList = [
    { id: 'modul-home', name: 'Home Dasbor' },
    { id: 'modul-0-sortir', name: 'Sortir (Intake & Grade)' },
    { id: 'modul-0-timbangan', name: 'Timbangan (Input Berat)' },
    { id: 'modul-0-kasir', name: 'Kasir & Nota Pembayaran' },
    { id: 'modul-1-petani', name: 'Master Petani & Kartu' },
    { id: 'modul-3-harga', name: 'Master Kualitas & Harga' },
    { id: 'modul-7-gudang', name: 'Master Data Gudang' },
    { id: 'modul-2-barang', name: 'Inventaris Bal Gudang' },
    { id: 'modul-5-pengiriman', name: 'Pengiriman Reguler (DO)' },
    { id: 'modul-4-sample', name: 'Pengiriman Sample' },
    { id: 'modul-6-dashboard-analytic', name: 'Dashboard Analytic ERP' },
    { id: 'modul-6-laporan-grade', name: 'Laporan Mutu Grade' },
    { id: 'modul-6-laporan-pembelian', name: 'Laporan Pembelian Barang' },
    { id: 'modul-6-laporan-gudang', name: 'Laporan Okupansi & Stok Gudang' },
    { id: 'modul-6-laporan-petani', name: 'Laporan Petani & Setoran' },
    { id: 'modul-6-laporan-pengiriman', name: 'Laporan Pengiriman & DO' },
    { id: 'modul-users', name: 'Manajemen Pengguna (RBAC)' },
  ];

  const capabilitiesList = [
    { key: 'canManageUsers', label: 'Kelola Pengguna & Hak Akses (RBAC)' },
    { key: 'canManageMasterData', label: 'Kelola Master Data (Petani, Harga, Gudang, Bal)' },
    { key: 'canCreatePetani', label: 'Daftar / Edit Petani Baru' },
    { key: 'canInputTransaksi', label: 'Input Proses Sortir / Timbang Intake' },
    { key: 'canManageStok', label: 'Manajemen Stok Bal & Cetak Label' },
    { key: 'canManageQC', label: 'Penilaian Kualitas Grade & Sampel' },
    { key: 'canManagePengiriman', label: 'Buat Surat Jalan DO & Ekspedisi' },
    { key: 'canViewAnalytics', label: 'Lihat Analitik & Laporan Operasional' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-md shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-red-100 text-[#b81d24] rounded-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                Matriks Hak Akses Pengguna (Role-Based Access Control)
              </h2>
              <p className="text-xs text-gray-600">
                PR. SEKAR MAJU SEJAHTERA - Standar Pembagian Wewenang 6 Role Operasional
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-sm transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs text-gray-800">
          
          {/* Section 1: Role Overview Cards */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2.5">
              1. Definisi & Tanggung Jawab 6 Role
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_ROLES.map((role) => {
                const info = ROLE_DEFINITIONS[role];
                return (
                  <div 
                    key={role}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-sm space-y-1.5 hover:border-gray-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-[11px] font-bold rounded-xs border ${info.badgeBg} ${info.badgeText} ${info.badgeBorder}`}>
                        {info.label}
                      </span>
                      <span className="text-[10px] font-mono text-gray-600 uppercase">
                        {role}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      {info.deskripsi}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Module Access Matrix */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2.5">
              2. Matriks Akses Modul Aplikasi
            </h3>
            <div className="border border-gray-200 rounded-sm overflow-x-auto shadow-2xs">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold">
                    <th className="py-2 px-3 border-r border-gray-200 sticky left-0 bg-gray-100 z-10 w-48">
                      Modul Sistem
                    </th>
                    {ALL_ROLES.map((r) => (
                      <th key={r} className="py-2 px-2 text-center border-r border-gray-200 min-w-[110px]">
                        {ROLE_DEFINITIONS[r].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {modulesList.map((mod) => (
                    <tr key={mod.id} className="hover:bg-gray-50/80">
                      <td className="py-2 px-3 font-semibold text-gray-900 border-r border-gray-200 sticky left-0 bg-white z-10">
                        {mod.name}
                      </td>
                      {ALL_ROLES.map((r) => {
                        const hasAccess = ROLE_DEFINITIONS[r].allowedModules.includes(mod.id);
                        return (
                          <td key={r} className="py-2 px-2 text-center border-r border-gray-200">
                            {hasAccess ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 text-gray-300">
                                <Ban className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Wewenang Khusus */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2.5">
              3. Matriks Wewenang & Kemampuan Tindakan (Capabilities)
            </h3>
            <div className="border border-gray-200 rounded-sm overflow-x-auto shadow-2xs">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold">
                    <th className="py-2 px-3 border-r border-gray-200 sticky left-0 bg-gray-100 z-10 w-56">
                      Kemampuan Wewenang
                    </th>
                    {ALL_ROLES.map((r) => (
                      <th key={r} className="py-2 px-2 text-center border-r border-gray-200 min-w-[110px]">
                        {ROLE_DEFINITIONS[r].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {capabilitiesList.map((cap) => (
                    <tr key={cap.key} className="hover:bg-gray-50/80">
                      <td className="py-2 px-3 font-semibold text-gray-900 border-r border-gray-200 sticky left-0 bg-white z-10">
                        {cap.label}
                      </td>
                      {ALL_ROLES.map((r) => {
                        const canDo = ROLE_DEFINITIONS[r].capabilities[cap.key];
                        return (
                          <td key={r} className="py-2 px-2 text-center border-r border-gray-200">
                            {canDo ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 text-gray-300">
                                <Ban className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#545b62] hover:bg-[#464c52] text-white text-xs font-bold rounded-sm transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

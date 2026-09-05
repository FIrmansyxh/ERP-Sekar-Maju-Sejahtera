import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  Clock, 
  Scale, 
  Layers, 
  DollarSign, 
  Truck, 
  FlaskConical, 
  Database, 
  ShieldAlert, 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  ArrowRight,
  Eye,
  X
} from 'lucide-react';
import { LogAktivitas, User, UserRole } from '../../types';
import { getRoleInfo } from '../../utils/rbac';

interface LogAktivitasManagementProps {
  logs: LogAktivitas[];
  currentUser?: User | null;
  allUsers?: User[];
  onRefreshLogs?: () => void;
}

export const LogAktivitasManagement: React.FC<LogAktivitasManagementProps> = ({
  logs,
  currentUser,
  allUsers = [],
  onRefreshLogs,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModul, setSelectedModul] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedDetailLog, setSelectedDetailLog] = useState<LogAktivitas | null>(null);

  // Security Check: strictly Super Admin only
  const isSuperAdmin = currentUser?.role === 'superadmin';

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Modul filter
      if (selectedModul !== 'all' && log.modul !== selectedModul) {
        return false;
      }

      // User filter
      if (selectedUser !== 'all') {
        if (log.username !== selectedUser && log.user_id !== selectedUser) {
          return false;
        }
      }

      // Date filter
      if (selectedDateFilter === 'today') {
        const todayStr = '2026-09-02'; // simulation reference or today
        if (!log.timestamp.startsWith(todayStr)) {
          return false;
        }
      } else if (selectedDateFilter === 'yesterday') {
        const yestStr = '2026-09-01';
        if (!log.timestamp.startsWith(yestStr)) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchText = (
          (log.log_id || '') + ' ' +
          (log.nama_lengkap || '') + ' ' +
          (log.username || '') + ' ' +
          (log.aksi || '') + ' ' +
          (log.no_kupon || '') + ' ' +
          (log.no_bal || '') + ' ' +
          (log.rincian || '')
        ).toLowerCase();
        if (!matchText.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedModul, selectedUser, selectedDateFilter, searchTerm]);

  // Quick stats
  const stats = useMemo(() => {
    const total = logs.length;
    const timbanganCount = logs.filter((l) => l.modul === 'timbangan').length;
    const sortirCount = logs.filter((l) => l.modul === 'sortir').length;
    const uniqueUsers = new Set(logs.map((l) => l.username)).size;
    return { total, timbanganCount, sortirCount, uniqueUsers };
  }, [logs]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Log ID', 'Waktu', 'Username', 'Nama Petugas', 'Role', 'Modul', 'Aksi', 'No Kupon', 'No Bal', 'Grade', 'Netto (Kg)', 'Rincian'];
    const rows = filteredLogs.map((l) => [
      l.log_id,
      new Date(l.timestamp).toLocaleString('id-ID'),
      l.username,
      `"${l.nama_lengkap}"`,
      l.role,
      l.modul,
      `"${l.aksi}"`,
      l.no_kupon || '-',
      l.no_bal || '-',
      l.kode_grade || '-',
      l.berat_kg || '-',
      `"${(l.rincian || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Log_PR_Sekar_Maju_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getModulBadge = (modul: string) => {
    switch (modul) {
      case 'timbangan':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-xs text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Scale className="w-3 h-3 text-slate-500" />
            <span>Timbangan</span>
          </span>
        );
      case 'sortir':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-xs text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Layers className="w-3 h-3 text-slate-500" />
            <span>Meja Sortir</span>
          </span>
        );
      case 'kasir':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-xs text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <span className="inline-flex items-center justify-center font-bold leading-none w-3 h-3 text-slate-500 text-[10px]">Rp</span>
            <span>Kasir</span>
          </span>
        );
      case 'pengiriman':
      case 'sample':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-xs text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Truck className="w-3 h-3 text-slate-500" />
            <span>Pengiriman/QC</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-xs text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Database className="w-3 h-3 text-slate-500" />
            <span className="capitalize">{modul}</span>
          </span>
        );
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-sm p-6 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-red-900">Akses Terbatas: Hanya Super Admin</h2>
          <p className="text-sm text-red-700 max-w-lg mx-auto leading-relaxed">
            Halaman <strong>Log Aktivitas & Audit Trail</strong> berisi jejak otentikasi dan riwayat tindakan hukum/operasional seluruh petugas, sehingga hanya dapat diakses oleh akun <strong>Super Admin</strong>.
          </p>
          <div className="text-xs text-red-600 pt-2">
            Akun Anda saat ini: <span className="font-semibold">{currentUser?.nama_lengkap}</span> ({currentUser?.role})
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-sans">
      
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xs bg-[#b81d24] text-white flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Log Aktivitas & Audit Trail Sistem
              </h1>
              <p className="text-xs text-slate-500">
                Pencatatan Otomatis Jejak Akun & Akuntabilitas Mutlak (Super Admin Exclusive)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onRefreshLogs && (
            <button
              onClick={onRefreshLogs}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xs text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
              title="Perbarui Data Log"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xs text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV Audit</span>
          </button>
        </div>
      </div>

      {/* Case Study Explanatory Box (User Requirement Fulfillment) */}
      <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 text-xs text-slate-700 leading-relaxed shadow-2xs">
        <div className="flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-slate-900">Prinsip Akuntabilitas Jejak Akun:</span>
            <p className="text-slate-600">
              Setiap operator membawa jejak akunnya secara otomatis tanpa perlu mengisi kolom nama petugas secara manual.
              Sebagai contoh: Apabila <strong>Sortir A (Ahmad Fauzi)</strong> memproses tembakau kemarin dan hari ini berhalangan sakit sehingga digantikan oleh <strong>Sortir B (Bayu Pratama)</strong>, seluruh penentuan mutu hari ini akan tercatat rapi atas nama Sortir B. Jika di kemudian hari timbul ketidaksesuaian grade pada bal tersebut, Super Admin dapat menelusuri secara pasti siapa petugas yang bertanggung jawab di hari pengerjaan.
            </p>
            <div className="pt-1.5 flex items-center space-x-2 flex-wrap gap-y-1.5">
              <button
                onClick={() => {
                  setSelectedModul('sortir');
                  setSelectedUser('all');
                  setSearchTerm('');
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xs text-[11px] font-medium flex items-center space-x-1 transition cursor-pointer shadow-2xs"
              >
                <span>Filter Khusus: Meja Sortir (Sortir A vs Sortir B)</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  setSelectedModul('timbangan');
                  setSelectedUser('all');
                  setSearchTerm('');
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xs text-[11px] font-medium flex items-center space-x-1 transition cursor-pointer shadow-2xs"
              >
                <span>Filter Khusus: Timbangan Bal</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-sm p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Log Tercatat</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Seluruh jejak operasional</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Aktivitas Sortir</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{stats.sortirCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Penetapan Grade & Kupon</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Aktivitas Timbang</span>
            <Scale className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{stats.timbanganCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bruto, Tara & Netto</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Operator Bertugas</span>
            <UserIcon className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{stats.uniqueUsers} Akun</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tervalidasi identitas</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          
          {/* Keyword Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari No Bal (A001), No. Kupon, Petani, Petugas..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xs text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Modul Filter */}
          <div>
            <select
              value={selectedModul}
              onChange={(e) => setSelectedModul(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xs text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Modul Alur</option>
              <option value="sortir">Meja Sortir (QC)</option>
              <option value="timbangan">Meja Timbangan</option>
              <option value="kasir">Kasir & Pembayaran</option>
              <option value="pengiriman">Pengiriman Reguler (DO)</option>
              <option value="sample">Sample QC Laboratorium</option>
              <option value="master_harga">Master Kualitas & Harga</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xs text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Akun Petugas</option>
              <option value="adminsortir">Ahmad Fauzi (Sortir A)</option>
              <option value="adminsortir_b">Bayu Pratama (Sortir B)</option>
              <option value="admintimbang">Siti Rahayu (Admin Timbang)</option>
              <option value="adminkasir">Dewi Lestari (Admin Kasir)</option>
              <option value="superadmin">Bpk. H. Rahmat (Super Admin)</option>
            </select>
          </div>

        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 mr-2 text-[11px]">Rentang Waktu:</span>
            {[
              { id: 'all', label: 'Semua Waktu' },
              { id: 'today', label: 'Hari Ini (02 Sep 2026)' },
              { id: 'yesterday', label: 'Kemarin (01 Sep 2026)' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDateFilter(d.id)}
                className={`px-2.5 py-1 rounded-xs text-[11px] font-medium transition cursor-pointer ${
                  selectedDateFilter === d.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="text-slate-500 font-mono text-[11px]">
            Menampilkan <strong>{filteredLogs.length}</strong> dari {logs.length} entri log
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Waktu & Tanggal</th>
                <th className="py-2.5 px-3">Akun / Penanggung Jawab</th>
                <th className="py-2.5 px-3">Modul & Aksi</th>
                <th className="py-2.5 px-3">Objek Bal / Kupon</th>
                <th className="py-2.5 px-3">Rincian Pertanggungjawaban</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">Tidak ada log aktivitas yang cocok dengan filter</p>
                    <p className="text-[11px] text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau rentang tanggal</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const logDate = new Date(log.timestamp);
                  const formattedTime = logDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const formattedDate = logDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                  const roleDef = getRoleInfo(log.role);

                  const isSortirB = log.username === 'adminsortir_b';

                  return (
                    <tr 
                      key={log.log_id} 
                      className="hover:bg-slate-50 transition"
                    >
                      {/* Timestamp */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{formattedDate}</div>
                        <div className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formattedTime} WIB</span>
                        </div>
                      </td>

                      {/* Akun Petugas */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                          <span>{log.nama_lengkap}</span>
                          {isSortirB && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xs font-semibold">
                              Pengganti
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          @{log.username} • <span className={roleDef.badgeText}>{roleDef.label.split('(')[0]}</span>
                        </div>
                      </td>

                      {/* Modul & Aksi */}
                      <td className="py-2.5 px-3">
                        <div className="mb-1 flex items-center space-x-1.5 flex-wrap gap-y-1">
                          {getModulBadge(log.modul)}
                          {log.tipe_aksi === 'edit' && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-700 border border-slate-300">
                              Koreksi / Edit
                            </span>
                          )}
                          {log.tipe_aksi === 'hapus' && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-xs bg-red-50 text-red-700 border border-red-200">
                              Hapus
                            </span>
                          )}
                          {log.tipe_aksi === 'tambah' && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Tambah Baru
                            </span>
                          )}
                          {log.tipe_aksi === 'bayar' && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-700 border border-slate-300">
                              Pembayaran
                            </span>
                          )}
                        </div>
                        <div className="font-medium text-slate-800 text-[11px]">{log.aksi}</div>
                        {log.alasan && (
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5 italic">
                            Alasan: "{log.alasan}"
                          </div>
                        )}
                      </td>

                      {/* Objek */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {log.no_bal ? (
                          <div className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-xs inline-block text-[11px] border border-slate-200">
                            {log.no_bal}
                          </div>
                        ) : null}
                        {log.kode_grade && (
                          <span className="ml-1.5 font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-xs text-[10px]">
                            Grade {log.kode_grade}
                          </span>
                        )}
                        {log.no_kupon && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            Kupon: {log.no_kupon}
                          </div>
                        )}
                        {log.berat_kg ? (
                          <div className="text-[10px] text-slate-600 font-semibold">
                            Netto: {log.berat_kg} Kg
                          </div>
                        ) : null}
                      </td>

                      {/* Rincian */}
                      <td className="py-2.5 px-3 max-w-xs sm:max-w-md">
                        <p className="text-[11px] text-slate-700 leading-relaxed line-clamp-2">
                          {log.rincian}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-xs text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Otentik</span>
                        </span>
                      </td>

                      {/* Opsi */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedDetailLog(log)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xs text-[11px] font-medium transition cursor-pointer flex items-center space-x-1 ml-auto"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal Drawer */}
      {selectedDetailLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-sm w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold tracking-tight">Rincian Jejak Audit & Pertanggungjawaban</h3>
              </div>
              <button
                onClick={() => setSelectedDetailLog(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xs border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">ID Log Audit</span>
                  <div className="font-mono font-bold text-slate-900 text-xs">{selectedDetailLog.log_id}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Waktu Kejadian</span>
                  <div className="font-mono text-slate-900">
                    {new Date(selectedDetailLog.timestamp).toLocaleString('id-ID')} WIB
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Identitas Akun Penanggung Jawab</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-500">Nama Lengkap:</span>
                    <div className="font-semibold text-slate-900">{selectedDetailLog.nama_lengkap}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Username:</span>
                    <div className="font-mono font-medium text-slate-900">@{selectedDetailLog.username}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">User ID:</span>
                    <div className="font-mono text-slate-700">{selectedDetailLog.user_id}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Role / Hak Akses:</span>
                    <div className="capitalize font-medium text-slate-900">{selectedDetailLog.role}</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Alur Operasional & Objek</h4>
                <div className="grid grid-cols-3 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-500">Modul:</span>
                    <div className="font-semibold text-slate-900 capitalize">{selectedDetailLog.modul}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">No. Kupon:</span>
                    <div className="font-mono font-semibold text-slate-900">{selectedDetailLog.no_kupon || '-'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">No Bal:</span>
                    <div className="font-mono font-bold text-slate-900">{selectedDetailLog.no_bal || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Alasan Pengubahan / Penghapusan */}
              {selectedDetailLog.alasan && (
                <div className="border border-slate-200 bg-slate-50 p-3 rounded-xs space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-xs uppercase tracking-wide">
                    <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Alasan Pengubahan / Penghapusan Data:</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 font-mono">
                    "{selectedDetailLog.alasan}"
                  </p>
                </div>
              )}

              <div className="border-t border-slate-100 pt-3 space-y-1">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Rincian Narasi Perubahan</h4>
                <div className="p-3 bg-slate-100 rounded-xs font-mono text-[11px] text-slate-800 leading-relaxed border border-slate-200">
                  {selectedDetailLog.rincian}
                </div>
              </div>

              {/* Data Diff Snapshot (Audit Trail) */}
              {(selectedDetailLog.data_sebelum || selectedDetailLog.data_sesudah) && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center justify-between">
                    <span>Snapshot Data (Audit Trail Diff)</span>
                    <span className="text-[10px] text-slate-500 font-normal">Perbandingan sebelum & sesudah</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedDetailLog.data_sebelum && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Data Sebelum</span>
                        <pre className="p-2 bg-slate-50 border border-slate-200 rounded-xs text-[10px] font-mono text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
                          {selectedDetailLog.data_sebelum}
                        </pre>
                      </div>
                    )}
                    {selectedDetailLog.data_sesudah && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-700 uppercase">Data Sesudah</span>
                        <pre className="p-2 bg-slate-100 border border-slate-200 rounded-xs text-[10px] font-mono text-slate-900 max-h-40 overflow-y-auto whitespace-pre-wrap">
                          {selectedDetailLog.data_sesudah}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedDetailLog(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xs text-xs font-medium transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

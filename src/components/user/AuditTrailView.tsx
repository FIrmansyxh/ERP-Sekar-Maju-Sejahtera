import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Download,
  FileText
} from 'lucide-react';
import { AuditLogEntry } from '../../types';
import { loadAuditLogData } from '../../utils/storage';
import { downloadExcelReport, todayStamp } from '../../utils/excelExport';
import { Pagination } from '../common/Pagination';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModul, setFilterModul] = useState<string>('all');
  const [filterAksi, setFilterAksi] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(15);

  const refreshLogs = () => {
    const data = loadAuditLogData();
    setLogs(data);
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  const modulesList = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.modul) set.add(l.modul);
    });
    return Array.from(set);
  }, [logs]);

  const actionsList = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.aksi) set.add(l.aksi);
    });
    return Array.from(set);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterModul !== 'all' && log.modul !== filterModul) return false;
      if (filterAksi !== 'all' && log.aksi !== filterAksi) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchUser = log.user_nama.toLowerCase().includes(q);
        const matchRole = log.user_role.toLowerCase().includes(q);
        const matchTarget = log.target_id.toLowerCase().includes(q);
        const matchDesc = log.deskripsi.toLowerCase().includes(q);
        return matchUser || matchRole || matchTarget || matchDesc;
      }
      return true;
    });
  }, [logs, filterModul, filterAksi, searchQuery]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) return;
    downloadExcelReport(`Audit_Trail_ERP_${todayStamp()}`, [
      {
        name: 'Audit Trail',
        title: 'Audit Trail & Log Aktivitas Sistem',
        info: [
          [
            `Modul: ${filterModul !== 'all' ? filterModul : 'Semua'}`,
            `Aksi: ${filterAksi !== 'all' ? filterAksi : 'Semua'}`,
            searchQuery.trim() ? `Pencarian: ${searchQuery.trim()}` : '',
          ].filter(Boolean).join(' · '),
        ],
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'Waktu', type: 'datetime' },
          { header: 'Pengguna' },
          { header: 'Role', align: 'center' },
          { header: 'Modul' },
          { header: 'Aksi', align: 'center' },
          { header: 'Target ID', align: 'center' },
          { header: 'Deskripsi', width: 45 },
          { header: 'Rincian Perubahan', width: 50 },
        ],
        rows: filteredLogs.map((l, idx) => [
          idx + 1,
          l.timestamp,
          l.user_nama,
          l.user_role,
          l.modul,
          l.aksi,
          l.target_id,
          l.deskripsi,
          (l.rincian_perubahan || []).join('\n') || '-',
        ]),
      },
    ]);
  };

  const getAksiBadge = (aksi: string) => {
    switch (aksi) {
      case 'TAMBAH_TRANSAKSI':
        return <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">TAMBAH</span>;
      case 'UBAH_TRANSAKSI':
        return <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded">KOREKSI</span>;
      case 'HAPUS_TRANSAKSI':
        return <span className="px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 rounded">HAPUS</span>;
      case 'TIMBANG_BAL':
        return <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded">TIMBANG</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded">{aksi}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner Super Admin */}
      <div className="bg-white p-4 sm:p-5 border border-gray-300 rounded-sm shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-sm bg-[#b81d24] text-white flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Audit Trail</h1>
          </div>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={refreshLogs}
            className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-sm transition flex items-center space-x-1.5 border border-gray-300 shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredLogs.length === 0}
            className="px-3 py-1.5 bg-[#b81d24] hover:bg-[#a0181e] text-white text-xs font-semibold rounded-sm shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-3 rounded-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-slate-600 font-semibold mb-1">Cari Log / User / Target ID</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari user, kupon, deskripsi"
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#b81d24] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">Filter Modul</label>
          <select
            value={filterModul}
            onChange={(e) => {
              setFilterModul(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
          >
            <option value="all">Semua Modul ({modulesList.length})</option>
            {modulesList.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">Filter Tipe Aksi</label>
          <select
            value={filterAksi}
            onChange={(e) => {
              setFilterAksi(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
          >
            <option value="all">Semua Tipe Aksi ({actionsList.length})</option>
            {actionsList.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200 text-xs">
                <th className="py-2.5 px-3 w-40">Waktu & Tanggal</th>
                <th className="py-2.5 px-3 w-44">User / Operator</th>
                <th className="py-2.5 px-3 w-32">Modul</th>
                <th className="py-2.5 px-3 w-28 text-center">Aksi</th>
                <th className="py-2.5 px-3 w-36">Target ID</th>
                <th className="py-2.5 px-3">Deskripsi & Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-700">Belum ada aktivitas tercatat</p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((entry) => (
                  <tr key={entry.log_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-[11px] text-slate-500 font-mono whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{entry.user_nama}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Role: {entry.user_role}</div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                      {entry.modul}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {getAksiBadge(entry.aksi)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                      {entry.target_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{entry.deskripsi}</div>
                      {entry.rincian_perubahan && entry.rincian_perubahan.length > 0 && (
                        <ul className="mt-1 space-y-0.5 list-disc list-inside text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-200">
                          {entry.rincian_perubahan.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 text-[11px]">
            Menampilkan {filteredLogs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} dari {filteredLogs.length} rekaman audit
          </span>
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

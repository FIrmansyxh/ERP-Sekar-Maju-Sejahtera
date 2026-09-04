import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  RotateCcw, 
  Download, 
  Calendar, 
  Tag, 
  DollarSign, 
  FileSpreadsheet,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { MasterHargaJual, UserRole } from '../../types';
import { downloadCsvFile, downloadElementAsPdf } from '../../utils/printDownload';
import { Pagination } from '../common/Pagination';

interface LaporanHargaJualViewProps {
  hargaJualList: MasterHargaJual[];
  userRole?: UserRole;
}

export const LaporanHargaJualView: React.FC<LaporanHargaJualViewProps> = ({
  hargaJualList = [],
  userRole = 'superadmin',
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;
  const printDocumentRef = useRef<HTMLDivElement>(null);

  const filteredList = useMemo(() => {
    return hargaJualList.filter((item) => {
      if (filterStatus !== 'ALL') {
        const isAktif = filterStatus === 'aktif';
        if (item.status_aktif !== isAktif) return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (
          !item.kode.toLowerCase().includes(q) &&
          !(item.keterangan || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.tanggal_berlaku).getTime() - new Date(a.tanggal_berlaku).getTime());
  }, [hargaJualList, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const handleExportCSV = () => {
    const filename = `Laporan_Master_Harga_Jual_${new Date().toISOString().split('T')[0]}.csv`;
    const headers = ['Kode', 'Harga Jual (Rp)', 'Tanggal Berlaku', 'Status', 'Keterangan'];
    const rows = filteredList.map(h => [
      h.kode,
      h.harga_jual,
      h.tanggal_berlaku,
      h.status_aktif ? 'Aktif' : 'Non-Aktif',
      h.keterangan || '-',
    ]);
    downloadCsvFile(filename, headers, rows);
  };

  const handleExportPDF = async () => {
    if (!printDocumentRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf(printDocumentRef.current, `Laporan_Harga_Jual_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const summary = useMemo(() => {
    const activeCount = hargaJualList.filter(h => h.status_aktif).length;
    const inactiveCount = hargaJualList.length - activeCount;
    return {
      total: hargaJualList.length,
      active: activeCount,
      inactive: inactiveCount,
    };
  }, [hargaJualList]);

  return (
    <div className="space-y-4 font-sans pb-10">
      <div className="bg-white border border-gray-200 p-4 shadow-sm rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#b81d24]"></span>
            <h2 className="text-sm font-semibold text-gray-900 tracking-tight">LAPORAN MASTER HARGA JUAL</h2>
          </div>
          
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-sm text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isGeneratingPdf}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 text-[#b81d24] hover:bg-red-100 border border-red-200 rounded-sm text-xs font-semibold transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Memproses...' : 'Cetak PDF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-sm border border-gray-200 shadow-sm flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-sm">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Penawaran</p>
            <p className="text-lg font-bold text-gray-900">{summary.total} <span className="text-xs font-normal text-gray-500">Data</span></p>
          </div>
        </div>
        <div className="bg-white p-3 rounded-sm border border-gray-200 shadow-sm flex items-center space-x-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Harga Aktif</p>
            <p className="text-lg font-bold text-emerald-700">{summary.active} <span className="text-xs font-normal text-gray-500">Aktif</span></p>
          </div>
        </div>
        <div className="bg-white p-3 rounded-sm border border-gray-200 shadow-sm flex items-center space-x-3">
          <div className="p-2 bg-gray-50 text-gray-500 rounded-sm">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Non-Aktif</p>
            <p className="text-lg font-bold text-gray-600">{summary.inactive} <span className="text-xs font-normal text-gray-500">Histori</span></p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-sm shadow-sm">
        <div className="p-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center space-x-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari kode atau keterangan..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-sm focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24]"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="text-xs border border-gray-300 rounded-sm px-2 py-1.5 focus:outline-none focus:border-[#b81d24]"
            >
              <option value="ALL">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Non-Aktif</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('ALL');
              setCurrentPage(1);
            }}
            className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-900 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-900 border-b border-gray-200">
                <th className="py-2.5 px-3 font-semibold w-10 text-center">No</th>
                <th className="py-2.5 px-3 font-semibold">Kode Penawaran</th>
                <th className="py-2.5 px-3 font-semibold text-right">Harga Jual (Rp)</th>
                <th className="py-2.5 px-3 font-semibold text-center">Tanggal Berlaku</th>
                <th className="py-2.5 px-3 font-semibold">Keterangan</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <Search className="w-8 h-8 mb-2 opacity-20" />
                      <p>Tidak ada data harga jual ditemukan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, index) => (
                  <tr key={item.harga_jual_id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 text-center text-gray-500 font-mono">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-gray-900">{item.kode}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-mono font-semibold text-[#b81d24]">
                        Rp {item.harga_jual.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="flex items-center justify-center space-x-1 text-gray-600">
                        <Calendar className="w-3 h-3" />
                        <span>{item.tanggal_berlaku}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {item.keterangan || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.status_aktif ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm text-[10px] font-semibold">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 rounded-sm text-[10px] font-semibold">
                          Non-Aktif
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Menampilkan {paginatedList.length} dari {filteredList.length} data
          </span>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>

      {/* Hidden DOM for PDF */}
      <div className="hidden">
        <div ref={printDocumentRef} className="p-8 bg-white text-gray-900 font-sans text-xs space-y-6">
          {/* Header */}
          <div className="border-b-2 border-gray-900 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">PR. SEKAR MAJU SEJAHTERA</h1>
              <p className="text-xs font-semibold text-gray-600">SISTEM DATA GUDANG TEMBAKAU & LOGISTIK ERP</p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-bold uppercase text-[#b81d24]">LAPORAN MASTER HARGA JUAL</h2>
              <p className="text-[10px] text-gray-600">Tanggal Ekspor: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
            </div>
          </div>
          
          <table className="w-full text-left border-collapse border border-gray-300 text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold border-b border-gray-300">
                <th className="py-2 px-2 border-r border-gray-300 text-center w-8">No</th>
                <th className="py-2 px-2 border-r border-gray-300">Kode Penawaran</th>
                <th className="py-2 px-2 border-r border-gray-300 text-right">Harga Jual (Rp)</th>
                <th className="py-2 px-2 border-r border-gray-300 text-center">Tanggal Berlaku</th>
                <th className="py-2 px-2 border-r border-gray-300 text-center">Status</th>
                <th className="py-2 px-2">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredList.map((m, idx) => (
                <tr key={m.harga_jual_id}>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-mono">{idx + 1}</td>
                  <td className="py-2 px-2 border-r border-gray-300 font-bold">{m.kode}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-right font-mono">Rp {m.harga_jual.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center font-mono">{m.tanggal_berlaku}</td>
                  <td className="py-2 px-2 border-r border-gray-300 text-center">{m.status_aktif ? 'Aktif' : 'Non-Aktif'}</td>
                  <td className="py-2 px-2">{m.keterangan || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="pt-6 grid grid-cols-2 gap-6 text-center text-xs">
            <div>
              <p className="text-gray-500 mb-12">Supervisor Pemasaran,</p>
              <p className="font-bold border-t border-gray-400 pt-1 w-48 mx-auto">(................................)</p>
            </div>
            <div>
              <p className="text-gray-500 mb-12">Direktur Utama,</p>
              <p className="font-bold border-t border-gray-400 pt-1 w-48 mx-auto">(................................)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

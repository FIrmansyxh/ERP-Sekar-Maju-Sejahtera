import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Edit3, 
  MapPin, 
  Calendar, 
  User, 
  Scale,
  ArrowUpRight,
  Search,
  X
} from 'lucide-react';
import { Barang, StatusStokBarang } from '../../types';
import { GRADE_COLOR_MAP } from '../../data/initialHargaData';

interface BarangTableProps {
  items?: Barang[];
  barangList?: Barang[];
  onEditLocation: (barang: Barang) => void;
}

export const BarangTable: React.FC<BarangTableProps> = ({
  items,
  barangList,
  onEditLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const allItems = items || barangList || [];

  const displayItems = useMemo(() => {
    if (!searchQuery.trim()) return allItems;
    const q = searchQuery.toLowerCase().trim();
    return allItems.filter(b => 
      b.no_bal.toLowerCase().includes(q) ||
      b.barang_id.toLowerCase().includes(q) ||
      (b.nama_petani && b.nama_petani.toLowerCase().includes(q)) ||
      (b.lokasi_gudang && b.lokasi_gudang.toLowerCase().includes(q)) ||
      b.kode_grade.toLowerCase().includes(q)
    );
  }, [allItems, searchQuery]);

  const getStatusBadge = (status: StatusStokBarang) => {
    switch (status) {
      case 'di_gudang':
        return (
          <span className="text-gray-900 font-semibold text-[11px]">
            Di Gudang
          </span>
        );
      case 'keluar':
        return (
          <span className="text-gray-500 text-[11px]">
            Keluar
          </span>
        );
      case 'terkirim_sample':
        return (
          <span className="text-gray-700 font-semibold text-[11px]">
            Sample Lab
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-none border border-gray-200 shadow-2xs overflow-hidden">
      {/* Kolom Pencarian (Search Bar) di atas tabel */}
      <div className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-gray-200">
        <div className="text-gray-600 font-medium">
          {searchQuery.trim() ? (
            <span>
              Ditemukan: <strong className="text-gray-900">{displayItems.length}</strong> dari {allItems.length} barang
            </span>
          ) : (
            <span>Total: <strong className="text-gray-900">{allItems.length}</strong> barang</span>
          )}
        </div>
        <div className="w-full sm:w-80">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Cari No Bal, ID, Petani, Lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-sm pl-8 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f8f9fa] text-gray-700 font-bold text-[11px] border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">No Bal</th>
              <th className="px-4 py-3 text-center">Grade</th>
              <th className="px-4 py-3 text-right">Berat (KG)</th>
              <th className="px-4 py-3">Status Stok</th>
              <th className="px-4 py-3">Lokasi Gudang</th>
              <th className="px-4 py-3">Petani Asal</th>
              <th className="px-4 py-3">Tgl Masuk</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayItems.map((barang) => {
              const gradeColor: any = GRADE_COLOR_MAP[barang.kode_grade] || {
                badge: 'bg-gray-800 text-white',
              };

              return (
                <tr
                  key={barang.barang_id}
                  className="hover:bg-gray-50/80 transition group"
                >
                  {/* No Bal */}
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-gray-900 text-xs">
                      {barang.no_bal}
                    </div>
                    <div className="text-[10px] text-gray-400 font-normal font-mono">
                      {barang.barang_id}
                    </div>
                  </td>

                  {/* Grade */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-sm font-bold text-xs ${gradeColor.badge}`}>
                      {barang.kode_grade}
                    </span>
                  </td>

                  {/* Berat */}
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 text-xs">
                    {barang.berat_kg} kg
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {getStatusBadge(barang.status_stok)}
                    {barang.tanggal_keluar && (
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        Keluar: {barang.tanggal_keluar}
                      </div>
                    )}
                  </td>

                  {/* Lokasi */}
                  <td className="px-4 py-3 font-medium text-gray-700">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate max-w-[150px]">{barang.lokasi_gudang}</span>
                    </div>
                  </td>

                  {/* Petani */}
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-900 truncate max-w-[140px]">
                      {barang.nama_petani || '-'}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate max-w-[140px]">
                      {barang.desa_kecamatan || '-'}
                    </div>
                  </td>

                  {/* Tgl Masuk */}
                  <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                    {barang.tanggal_masuk}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => onEditLocation(barang)}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-sm transition cursor-pointer"
                        title="Ubah Lokasi & Catatan"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {displayItems.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">
                  <Package className="w-7 h-7 mx-auto mb-2 text-gray-300" />
                  Tidak ada bal tembakau yang cocok dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React from 'react';
import { 
  Package, 
  MapPin, 
  User, 
  Calendar, 
  Edit3, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  Scale 
} from 'lucide-react';
import { Barang, StatusStokBarang } from '../../types';

interface BarangCardGridProps {
  items?: Barang[];
  barangList?: Barang[];
  onEditLocation: (barang: Barang) => void;
  onQuickScanOut?: (barang: Barang) => void;
}

export const BarangCardGrid: React.FC<BarangCardGridProps> = ({
  items,
  barangList,
  onEditLocation,
  onQuickScanOut,
}) => {
  const displayItems = items || barangList || [];

  const getStatusBadge = (status: StatusStokBarang) => {
    switch (status) {
      case 'di_gudang':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-none text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Di Gudang</span>
          </span>
        );
      case 'keluar':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-none text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
            <span>Terkirim</span>
          </span>
        );
      case 'terkirim_sample':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-none text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <span>Sample QC</span>
          </span>
        );
      default:
        return null;
    }
  };

  if (displayItems.length === 0) {
    return (
      <div className="bg-white rounded-none p-8 text-center border border-gray-200 shadow-2xs space-y-2">
        <Package className="w-8 h-8 text-gray-400 mx-auto" />
        <h3 className="text-xs font-bold text-gray-800">Tidak Ada Bal Tembakau yang Sesuai</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Coba sesuaikan filter pencarian grade, status stok, atau kata kunci nomor bal.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {displayItems.map((barang) => {
        const isAvailable = barang.status_stok === 'di_gudang';

        return (
          <div
            key={barang.barang_id}
            className={`bg-white rounded-none border transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between ${
              isAvailable ? 'border-gray-300 hover:border-[#b81d24]' : 'border-gray-200 bg-gray-50/50'
            }`}
          >
            {/* Top Card Header */}
            <div className="p-3 border-b border-gray-200 space-y-2 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black px-2 py-0.5 bg-[#212529] text-white font-mono rounded-none">
                    GRADE {barang.kode_grade}
                  </span>
                  <span className="font-mono font-bold text-sm text-gray-900">
                    {barang.no_bal}
                  </span>
                </div>
                <div>{getStatusBadge(barang.status_stok)}</div>
              </div>

              {/* Weight Highlight */}
              <div className="flex items-baseline justify-between bg-[#f8f9fa] px-2.5 py-1.5 border border-gray-200">
                <span className="text-[11px] text-gray-600 font-semibold flex items-center space-x-1">
                  <Scale className="w-3.5 h-3.5 text-gray-400" />
                  <span>Berat Timbang:</span>
                </span>
                <span className="text-base font-mono font-bold text-gray-900">
                  {barang.berat_kg} <span className="text-xs text-gray-500 font-normal">KG</span>
                </span>
              </div>
            </div>

            {/* Middle Card Details */}
            <div className="p-3 space-y-1.5 text-xs text-gray-700 bg-white border-b border-gray-200">
              <div className="flex items-start space-x-1.5">
                <User className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-gray-900 truncate block">
                    {barang.nama_petani || 'Petani Anonim'}
                  </span>
                  <span className="text-[11px] text-gray-500 truncate block">
                    {barang.desa_kecamatan || '-'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="font-semibold text-gray-800 truncate font-mono text-[11px]">
                  {barang.lokasi_gudang}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 text-[11px] text-gray-500">
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Masuk: {barang.tanggal_masuk}</span>
              </div>

              {barang.tanggal_keluar && (
                <div className="flex items-center space-x-1.5 text-[11px] text-red-600 font-semibold">
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  <span>Keluar: {barang.tanggal_keluar}</span>
                </div>
              )}
            </div>

            {/* Card Action Buttons */}
            <div className="p-2.5 bg-[#f8f9fa] flex items-center justify-end">
              <button
                onClick={() => onEditLocation(barang)}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition cursor-pointer"
                title="Ubah lokasi rak bal"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Ubah Lokasi</span>
              </button>
            </div>

          </div>
        );
      })}
    </div>
  );
};


function hitungSimulasiHarga(harga: number, berat: number, jenis: string, algo: boolean) {
  return { beratNettoFinalKg: 45, totalKotor: harga * 45, hargaFinal: harga * 45 };
}

import React from 'react';
import { 
  Tag, 
  History, 
  Edit, 
  Trash2,
  CheckCircle2,
  Scale
} from 'lucide-react';
import { TabelHarga } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import {  } from '../../data/initialHargaData';

interface GradePriceCardProps {
  harga: TabelHarga;
  onEditHarga: (harga: TabelHarga) => void;
  onViewHistory: (gradeCode: string) => void;
  onDeleteHarga?: (harga: TabelHarga) => void;
}

export const GradePriceCard: React.FC<GradePriceCardProps> = ({
  harga,
  onEditHarga,
  onViewHistory,
  onDeleteHarga,
}) => {
  const simulasi = hitungSimulasiHarga(harga.harga_per_kg, 45, 'bruto', false);

  return (
    <div className="bg-white rounded-none border border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between overflow-hidden text-xs">
      
      {/* Top Banner */}
      <div className="p-4 border-b border-gray-100 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-sm bg-gray-900 text-white flex items-center justify-center font-bold text-sm font-mono">
              {harga.kode_grade}
            </span>
            <div>
              <h3 className="font-bold text-xs text-gray-900">
                Grade {harga.kode_grade}
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">
                ID: {harga.harga_id}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-sm">
            AKTIF
          </span>
        </div>

        {/* Central Price Display */}
        <div className="bg-[#f8f9fa] p-3 rounded-sm border border-gray-200 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">
            Harga Acuan Pembelian
          </span>
          <div className="text-xl font-bold text-gray-900 font-mono">
            {formatRupiah(harga.harga_per_kg)}
            <span className="text-xs font-normal text-gray-500 font-sans"> / kg</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Berlaku sejak: <span className="font-mono font-medium text-gray-700">{harga.tanggal_berlaku}</span>
          </p>
        </div>

        
      </div>

      {/* Live 45kg Bal Simulation */}
      <div className="p-4 space-y-2 bg-[#fcfcfd] flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600 flex items-center space-x-1">
          <Scale className="w-3 h-3 text-gray-500" />
          <span>Simulasi 1 Bal Standar (45 Kg Bruto):</span>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Netto (45 - 3 kg tara bawaan):</span>
            <span className="font-mono font-medium">{simulasi.beratNettoFinalKg} Kg</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Nilai Kotor ({simulasi.beratNettoFinalKg} kg × {formatRupiah(harga.harga_per_kg)}):</span>
            <span className="font-mono font-medium">{formatRupiah(simulasi.totalKotor)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Potongan (Kuli 7rb + Tali 3rb):</span>
            <span className="font-mono font-medium">-Rp 10.000</span>
          </div>
          <div className="flex justify-between text-gray-900 font-bold pt-1 border-t border-gray-200">
            <span>Harga Final Petani:</span>
            <span className="font-mono text-[#b81d24]">{formatRupiah(simulasi.hargaFinal)}</span>
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="p-3 bg-[#f8f9fa] border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={() => onViewHistory(harga.kode_grade)}
          className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 font-medium text-[11px] cursor-pointer"
        >
          <History className="w-3.5 h-3.5" />
          <span>Histori Tarif</span>
        </button>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onEditHarga(harga)}
            className="px-2.5 py-1 bg-[#545b62] hover:bg-[#464c52] text-white rounded-sm font-semibold text-[11px] flex items-center space-x-1 cursor-pointer"
          >
            <Edit className="w-3 h-3" />
            <span>Ubah Tarif</span>
          </button>

          {onDeleteHarga && (
            <button
              onClick={() => onDeleteHarga(harga)}
              className="p-1 bg-[#dc3545] hover:bg-[#c82333] text-white rounded-sm font-semibold text-[11px] flex items-center justify-center cursor-pointer shadow-xs"
              title="Hapus Tarif Grade"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

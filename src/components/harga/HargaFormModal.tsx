
function hitungSimulasiHarga(harga: number, berat: number, jenis: string, algo: boolean) {
  return { beratNettoFinalKg: 45, totalKotor: harga * 45, hargaFinal: harga * 45 };
}

import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Tag, PlusCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TabelHarga } from '../../types';
import { formatRupiah, validateGradeCode } from '../../utils/formatters';
import {  } from '../../data/initialHargaData';
import { ConfirmModal } from '../common/ConfirmModal';

interface HargaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNewPrice: (newPrice: TabelHarga, oldPriceIdToArchive?: string) => void;
  currentActivePrices: TabelHarga[];
  targetGradeCode?: string | null;
}

export const HargaFormModal: React.FC<HargaFormModalProps> = ({
  isOpen,
  onClose,
  onSaveNewPrice,
  currentActivePrices,
  targetGradeCode,
}) => {
  const isEditing = Boolean(targetGradeCode);
  const [kodeGrade, setKodeGrade] = useState('A');
  const [hargaPerKg, setHargaPerKg] = useState<number>(140000);
  const [deskripsi, setDeskripsi] = useState('');
  
  const [tanggalBerlaku, setTanggalBerlaku] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (targetGradeCode) {
        const existing = currentActivePrices.find((h) => h.kode_grade === targetGradeCode);
        if (existing) {
          setKodeGrade(existing.kode_grade);
          setHargaPerKg(existing.harga_per_kg);
          
          setTanggalBerlaku(existing.tanggal_berlaku || new Date().toISOString().split('T')[0]);
        }
      } else {
        setKodeGrade('');
        setHargaPerKg(100000);
        setDeskripsi('');
        setTanggalBerlaku(new Date().toISOString().split('T')[0]);
      }
      setErrors({});
      setIsConfirmOpen(false);
    }
  }, [targetGradeCode, currentActivePrices, isOpen]);

  if (!isOpen) return null;

  const existingActive = currentActivePrices.find((h) => h.kode_grade === kodeGrade.trim().toUpperCase());
  const simulasi = hitungSimulasiHarga(hargaPerKg || 0, 45, 'bruto', false);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    const gradeVal = validateGradeCode(kodeGrade);
    if (!gradeVal) {
      newErrors.kodeGrade = 'Kode grade tidak valid.';
    }

    if (!isEditing && currentActivePrices.some(p => p.kode_grade.toUpperCase() === kodeGrade.trim().toUpperCase())) {
      newErrors.kodeGrade = `Grade "${kodeGrade.toUpperCase()}" sudah terdaftar aktif. Gunakan menu edit untuk mengubah tarifnya.`;
    }

    if (!hargaPerKg || hargaPerKg <= 0) {
      newErrors.hargaPerKg = 'Harga per Kg harus lebih dari Rp 0.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsConfirmOpen(true);
    }
  };

  const handleConfirmSave = () => {
    const cleanCode = kodeGrade.trim().toUpperCase();
    const newPrice: TabelHarga = {
      harga_id: `HRG-2026-${cleanCode}-${Date.now().toString().slice(-4)}`,
      kode_grade: cleanCode,
      nama_grade: `Grade ${cleanCode}`,
      warna_badge: 'bg-slate-800 text-white',
      harga_per_kg: Number(hargaPerKg),
      berat_standar_kg: 45,
      
      tanggal_berlaku: tanggalBerlaku,
      status: 'aktif',
      dibuat_oleh: 'Kepala Gudang PR. Sekar Anom',
      deskripsi: deskripsi.trim() || `Standar mutu tembakau grade ${cleanCode}`,
    };

    onSaveNewPrice(newPrice, existingActive?.harga_id);
    setIsConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
        <div className="bg-white border border-gray-300 w-full max-w-lg rounded-none shadow-2xl flex flex-col text-xs text-gray-800">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-[#b81d24]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                  {isEditing ? `Edit Tarif Grade ${targetGradeCode}` : 'Tambah Grade & Tarif Baru'}
                </h2>
                <p className="text-[11px] text-gray-500 font-medium">
                  Master Kualitas & Tarif Pembelian PR. Sekar Anom
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Tarif</span>
              </button>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            
            {/* Input Grade & Harga Beli */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Kode Grade <span className="text-[#b81d24]">*</span>
                </label>
                <input
                  type="text"
                  maxLength={3}
                  placeholder="Contoh: A, A1, B"
                  disabled={isEditing}
                  value={kodeGrade}
                  onChange={(e) => {
                    setKodeGrade(e.target.value.toUpperCase());
                    if (errors.kodeGrade) setErrors({ ...errors, kodeGrade: '' });
                  }}
                  className={`w-full bg-white border ${
                    errors.kodeGrade ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                  } rounded-sm px-3 py-2 text-xs font-mono font-bold uppercase text-gray-900 focus:outline-none focus:border-[#b81d24] disabled:bg-gray-100`}
                />
                {errors.kodeGrade ? (
                  <p className="text-[11px] text-red-600 font-medium mt-1">{errors.kodeGrade}</p>
                ) : (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Karakter grade resmi (contoh: A, A1, B, C).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Harga Beli per Kg <span className="text-[#b81d24]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-xs">
                    Rp
                  </span>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    placeholder="Contoh: 140000"
                    value={hargaPerKg || ''}
                    onChange={(e) => {
                      setHargaPerKg(Number(e.target.value));
                      if (errors.hargaPerKg) setErrors({ ...errors, hargaPerKg: '' });
                    }}
                    className={`w-full bg-white border ${
                      errors.hargaPerKg ? 'border-red-500' : 'border-gray-300'
                    } rounded-sm pl-9 pr-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#b81d24]`}
                  />
                </div>
                {errors.hargaPerKg && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">{errors.hargaPerKg}</p>
                )}
              </div>
            </div>

            {/* Tanggal Berlaku */}
            <div>
              <label className="block text-gray-700 font-bold mb-1">Tanggal Mulai Berlaku</label>
              <input
                type="date"
                value={tanggalBerlaku}
                onChange={(e) => setTanggalBerlaku(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-sm px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              />
            </div>

            

            {/* Live Calculation Preview Box */}
            <div className="bg-gray-50 border border-gray-300 p-3.5 space-y-2">
              <div className="font-bold text-gray-800 text-[11px] border-b border-gray-200 pb-1 flex items-center justify-between">
                <span>POTONGAN OPERASIONAL RESMI</span>
                <span className="text-[#b81d24] font-mono font-bold">Grade {kodeGrade || '...'}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-500">Harga Acuan per Kg:</span>
                  <div className="font-bold text-gray-900">{formatRupiah(hargaPerKg || 0)}/kg</div>
                </div>
                <div>
                  <span className="text-gray-500">Potongan Kuli Timbang:</span>
                  <div className="font-bold text-slate-700">-Rp 7.000 / bal</div>
                </div>
                <div>
                  <span className="text-gray-500">Potongan Tali:</span>
                  <div className="font-bold text-slate-700">-Rp 3.000 / bal</div>
                </div>
                <div>
                  <span className="text-gray-500">Jika Ganti Tikar:</span>
                  <div className="font-bold text-amber-700">+ Sesuai Nominal Input (Per Bal)</div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-500 space-y-0.5">
                <div className="font-semibold text-gray-700">Aturan Potongan Tara Berat:</div>
                <div>• &lt; 50 kg: <strong>2 kg</strong> (ganti tikar) / <strong>3 kg</strong> (tikar bawaan)</div>
                <div>• 50 - 59 kg: <strong>3 kg</strong> (ganti tikar) / <strong>4 kg</strong> (tikar bawaan)</div>
                <div>• &ge; 60 kg: <strong>4 kg</strong> (ganti tikar) / <strong>5 kg</strong> (tikar bawaan)</div>
              </div>
            </div>

          </form>

          {/* Footer Info */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span>Semua meja timbangan & loket kasir otomatis menerapkan acuan tarif ini.</span>
            </span>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Konfirmasi Perubahan Tarif Grade"
        message={`Apakah Anda yakin ingin menetapkan tarif Grade ${kodeGrade.toUpperCase()} sebesar ${formatRupiah(hargaPerKg)}/kg?`}
        variant="primary"
        confirmText="Ya, Simpan Tarif"
        onConfirm={handleConfirmSave}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
};

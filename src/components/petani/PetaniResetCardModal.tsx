import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  Sparkles, 
  AlertCircle, 
  Check, 
  CreditCard,
  History,
  ArrowLeft,
  Save
} from 'lucide-react';
import { Petani } from '../../types';
import { generateSuggestedCardNumber } from '../../utils/formatters';

interface PetaniResetCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  petani: Petani | null;
  onConfirmReset: (petaniId: string, newCardNumber: string, reason: string) => void;
  existingPetaniList: Petani[];
}

export const PetaniResetCardModal: React.FC<PetaniResetCardModalProps> = ({
  isOpen,
  onClose,
  petani,
  onConfirmReset,
  existingPetaniList,
}) => {
  const [newCardNumber, setNewCardNumber] = useState<string>('');
  const [reason, setReason] = useState<string>('Kartu lama hilang di ladang');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && petani) {
      const suggested = generateSuggestedCardNumber('WRA');
      setNewCardNumber(suggested);
      setReason('Kartu lama hilang/rusak fisik');
      setError('');
    }
  }, [isOpen, petani]);

  if (!isOpen || !petani) return null;

  const handleGenerateNew = () => {
    let card = generateSuggestedCardNumber('WRA');
    while (existingPetaniList.some((p) => p.nomor_kartu.toUpperCase() === card.toUpperCase())) {
      card = generateSuggestedCardNumber('WRA');
    }
    setNewCardNumber(card);
    setError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCard = newCardNumber.trim().toUpperCase();

    if (!cleanCard) {
      setError('Nomor kartu baru wajib diisi.');
      return;
    }

    if (cleanCard === petani.nomor_kartu.toUpperCase()) {
      setError('Nomor kartu baru tidak boleh sama dengan nomor kartu lama.');
      return;
    }

    const duplicate = existingPetaniList.find(
      (p) => p.nomor_kartu.toUpperCase() === cleanCard
    );

    if (duplicate) {
      setError(`Nomor kartu "${cleanCard}" sudah digunakan oleh petani ${duplicate.nama_petani}. Pilih nomor lain.`);
      return;
    }

    onConfirmReset(petani.petani_id, cleanCard, reason);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-gray-300 w-full max-w-lg rounded-none shadow-xl flex flex-col text-xs text-gray-800">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-4 h-4 text-[#b81d24]" />
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                Penerbitan Ulang Nomor Kartu Fisik
              </h2>
              <p className="text-[11px] text-gray-500">Ganti kartu hilang/rusak dengan audit log</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#545b62] hover:bg-[#464c52] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Batal</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Terbitkan Kartu Baru</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-4 space-y-3.5 bg-white">
          
          <div className="bg-[#f8f9fa] p-3 border border-gray-200">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 font-semibold">Petani:</span>
              <strong className="text-gray-900">{petani.nama_petani} ({petani.petani_id})</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-semibold">Nomor Kartu Saat Ini:</span>
              <span className="font-mono font-bold text-red-600 bg-white px-1.5 py-0.5 border border-gray-300">
                {petani.nomor_kartu}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-gray-700">
                Nomor Kartu Baru <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateNew}
                className="text-[11px] text-[#b81d24] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Generate Saran</span>
              </button>
            </div>

            <input
              type="text"
              required
              value={newCardNumber}
              onChange={(e) => {
                setNewCardNumber(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Contoh: KRT-WRA-1002"
              className="w-full uppercase font-mono font-bold text-xs rounded-sm px-2.5 py-1.5 border border-[#ced4da] focus:border-[#b81d24] focus:outline-none bg-white text-gray-900"
            />
            {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-gray-700">
              Alasan Penggantian Kartu
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Kartu fisik patah, hilang di kebun..."
              className="w-full text-xs rounded-sm px-2.5 py-1.5 border border-[#ced4da] focus:border-[#b81d24] focus:outline-none bg-white text-gray-900"
            />
          </div>

          <div className="bg-[#f8f9fa] border border-gray-300 p-2.5 text-[11px] text-gray-600">
            <strong>Catatan Keamanan:</strong> Nomor kartu lama akan secara otomatis dinonaktifkan dari sistem loket dan dicatat dalam log riwayat mutasi kartu.
          </div>

        </form>

      </div>
    </div>
  );
};

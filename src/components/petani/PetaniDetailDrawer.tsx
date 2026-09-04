import React, { useState } from 'react';
import { 
  X, 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  CreditCard, 
  Printer, 
  Edit3, 
  Trash2,
  History, 
  Scale, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { Petani, UserRole } from '../../types';
import { formatDateIndo, formatNumber } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

interface PetaniDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  petani: Petani | null;
  userRole: UserRole;
  onEdit: (petani: Petani) => void;
  onPrintCard: (petani: Petani) => void;
  onToggleStatus: (petani: Petani) => void;
  onResetCard: (petani: Petani) => void;
  onDeletePetani?: (petani: Petani) => void;
}

export const PetaniDetailDrawer: React.FC<PetaniDetailDrawerProps> = ({
  isOpen,
  onClose,
  petani,
  userRole,
  onEdit,
  onPrintCard,
  onToggleStatus,
  onResetCard,
  onDeletePetani,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'transaksi' | 'kartu'>('info');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  if (!isOpen || !petani) return null;

  const isAdmin = userRole === 'admin_gudang';

  const mockTransactions = [
    {
      no_bal: 'BAL-WRA-8821',
      tanggal: petani.statistik?.kunjungan_terakhir || '2026-08-10',
      grade: petani.statistik?.grade_dominan || 'Grade A',
      berat_kg: 46.5,
      potongan: '2.0 Kg',
      status: 'Selesai Dibayar',
    },
    {
      no_bal: 'BAL-WRA-8790',
      tanggal: '2026-08-08',
      grade: 'Grade B',
      berat_kg: 52.0,
      potongan: '2.5 Kg',
      status: 'Selesai Dibayar',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end font-sans">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-gray-300 text-xs text-gray-800 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-700" />
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                Detail Master Petani & Profil Timbang
              </h2>
              <p className="text-[11px] font-mono text-gray-500">{petani.petani_id} | {petani.nomor_kartu}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(petani)}
              className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-none transition flex items-center space-x-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => onPrintCard(petani)}
              className="px-2.5 py-1 text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-none transition flex items-center space-x-1 cursor-pointer shadow-xs"
            >
              <Printer className="w-3 h-3" />
              <span>Cetak Kartu</span>
            </button>

            {onDeletePetani && (
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-2.5 py-1 text-xs font-bold text-white bg-[#dc3545] hover:bg-[#c82333] rounded-none transition flex items-center space-x-1 cursor-pointer shadow-xs"
                title="Hapus Data Petani"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-none transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-[#f8f9fa] px-4 pt-2">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 text-xs font-bold transition cursor-pointer border-b-2 -mb-px ${
              activeTab === 'info'
                ? 'border-gray-900 text-gray-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Informasi Profil
          </button>
          <button
            onClick={() => setActiveTab('transaksi')}
            className={`px-4 py-2 text-xs font-bold transition cursor-pointer border-b-2 -mb-px ${
              activeTab === 'transaksi'
                ? 'border-gray-900 text-gray-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Riwayat Setoran ({petani.statistik?.total_setoran_bal || 0} Bal)
          </button>
          <button
            onClick={() => setActiveTab('kartu')}
            className={`px-4 py-2 text-xs font-bold transition cursor-pointer border-b-2 -mb-px ${
              activeTab === 'kartu'
                ? 'border-gray-900 text-gray-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Status Kartu Petani
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'info' && (
            <div className="space-y-4">
              
              {/* Main Farmer ID Card */}
              <div className="bg-[#f8f9fa] p-4 border border-gray-200 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Nama Lengkap Petani</span>
                    <h3 className="text-base font-bold text-gray-900">{petani.nama_petani}</h3>
                    <p className="text-xs text-gray-600 flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{petani.desa_kecamatan}</span>
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 font-bold text-[11px] ${
                      petani.status_aktif ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500 bg-gray-200'
                    }`}
                  >
                    {petani.status_aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 text-xs">
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase block font-bold">No. Kontak / HP</span>
                    <span className="font-mono text-gray-900 font-semibold">{petani.no_hp || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase block font-bold">Terdaftar Sejak</span>
                    <span className="font-mono text-gray-900">{petani.tanggal_daftar}</span>
                  </div>
                </div>
              </div>

              {/* Statistics Card */}
              <div className="border border-gray-200 p-3 space-y-2">
                <span className="font-bold text-xs text-gray-800 block">Statistik Riwayat Penimbangan:</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#f8f9fa] p-2 border border-gray-200">
                    <span className="text-[10px] text-gray-500 uppercase block">Total Bal</span>
                    <span className="text-sm font-bold font-mono text-gray-900">
                      {petani.statistik?.total_setoran_bal || 0}
                    </span>
                  </div>
                  <div className="bg-[#f8f9fa] p-2 border border-gray-200">
                    <span className="text-[10px] text-gray-500 uppercase block">Total Berat</span>
                    <span className="text-sm font-bold font-mono text-gray-900">
                      {petani.statistik?.total_berat_kg || 0} kg
                    </span>
                  </div>
                  <div className="bg-[#f8f9fa] p-2 border border-gray-200">
                    <span className="text-[10px] text-gray-500 uppercase block">Grade Dominan</span>
                    <span className="text-sm font-bold font-mono text-gray-900">
                      {petani.statistik?.grade_dominan || 'Grade A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Alamat & Catatan */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-gray-700 block">Alamat Lengkap / Dusun:</span>
                  <p className="text-gray-600 bg-gray-50 p-2 border border-gray-200 mt-1">
                    {petani.alamat || '-'}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-gray-700 block">Catatan Operasional:</span>
                  <p className="text-gray-600 bg-gray-50 p-2 border border-gray-200 mt-1">
                    {petani.catatan || 'Tidak ada catatan khusus.'}
                  </p>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'transaksi' && (
            <div className="space-y-3">
              <div className="text-xs text-gray-600">
                Daftar transaksi timbangan bal tembakau yang telah disetor oleh petani:
              </div>

              <div className="border border-gray-200 divide-y divide-gray-200">
                {mockTransactions.map((tx, idx) => (
                  <div key={idx} className="p-3 hover:bg-gray-50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-gray-900 block">{tx.no_bal}</span>
                      <span className="text-[11px] text-gray-500">Tgl: {tx.tanggal} • Grade: {tx.grade}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-gray-900 block">{tx.berat_kg} kg</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'kartu' && (
            <div className="space-y-4">
              
              {/* Card visual preview */}
              <div className="bg-[#f8f9fa] border border-gray-300 p-4 space-y-3 text-center">
                <span className="text-xs font-bold text-gray-700 block uppercase">Kartu Fisik Identitas Petani</span>
                <div className="bg-white border border-gray-300 p-4 max-w-xs mx-auto shadow-2xs space-y-2">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">KARTU PETANI TEMBAKAU</span>
                  <span className="text-sm font-bold text-gray-900 block">{petani.nama_petani}</span>
                  <div className="bg-gray-50 border border-gray-200 p-2 my-2">
                    <span className="text-[10px] text-gray-500 block uppercase">Nomor Kartu</span>
                    <span className="text-base font-mono font-bold text-gray-900 block tracking-widest">{petani.nomor_kartu}</span>
                  </div>
                  <span className="text-[11px] text-gray-500 block">{petani.desa_kecamatan}</span>
                </div>
              </div>

              {/* Card Reset Action */}
              <div className="border border-gray-200 p-3 space-y-2">
                <span className="font-bold text-xs text-gray-800 block">Tindakan Kartu:</span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => onResetCard(petani)}
                    className="flex-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-none flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ganti / Reset Nomor Kartu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleStatus(petani)}
                    className={`px-3 py-2 text-xs font-bold text-white rounded-none flex items-center justify-center space-x-1 cursor-pointer ${
                      petani.status_aktif ? 'bg-gray-800 hover:bg-gray-900' : 'bg-emerald-700 hover:bg-emerald-800'
                    }`}
                  >
                    <span>{petani.status_aktif ? 'Nonaktifkan' : 'Aktifkan'}</span>
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            Terakhir diubah: {petani.tanggal_daftar}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-none transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* Confirmation Modal Delete Petani */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Konfirmasi Hapus Data Petani"
        message={`Apakah Anda yakin ingin menghapus data petani "${petani.nama_petani}" (${petani.nomor_kartu}) secara permanen?`}
        detail="Tindakan ini akan menghapus master data registrasi petani dari sistem."
        variant="danger"
        confirmText="Hapus Permanen"
        onConfirm={() => {
          if (onDeletePetani) {
            onDeletePetani(petani);
          }
          setIsDeleteConfirmOpen(false);
          onClose();
        }}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

    </div>
  );
};

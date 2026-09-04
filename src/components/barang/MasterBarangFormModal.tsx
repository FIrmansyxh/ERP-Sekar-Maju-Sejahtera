import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Package, AlertCircle } from 'lucide-react';
import { MasterBarang } from '../../types';
import { STANDARD_GUDANG_LOCATIONS } from '../../data/initialGudangData';
import { ConfirmModal } from '../common/ConfirmModal';

interface MasterBarangFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MasterBarang) => void;
  editingItem: MasterBarang | null;
  existingItems: MasterBarang[];
}

export const MasterBarangFormModal: React.FC<MasterBarangFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  existingItems,
}) => {
  const [kodeBarang, setKodeBarang] = useState('');
  const [namaBarang, setNamaBarang] = useState('');
  const [kodeGrade, setKodeGrade] = useState('A');
  const [kategori, setKategori] = useState('Tembakau Rajangan Halus');
  const [varietas, setVarietas] = useState('Prancak Super');
  const [beratStandarKg, setBeratStandarKg] = useState<number>(45.0);
  const [satuan, setSatuan] = useState('Bal (Keranjang)');
  const [hargaReferensiKg, setHargaReferensiKg] = useState<number>(90000);
  const [lokasiDefaultGudang, setLokasiDefaultGudang] = useState('Gudang Pusat Induk & Intake - Pamekasan / Blok A-01');
  const [keterangan, setKeterangan] = useState('');
  const [statusAktif, setStatusAktif] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<MasterBarang | null>(null);

  useEffect(() => {
    if (editingItem) {
      setKodeBarang(editingItem.kode_barang);
      setNamaBarang(editingItem.nama_barang);
      setKodeGrade(editingItem.kode_grade);
      setKategori(editingItem.kategori);
      setVarietas(editingItem.varietas);
      setBeratStandarKg(editingItem.berat_standar_kg || 45.0);
      setSatuan(editingItem.satuan || 'Bal (Keranjang)');
      setHargaReferensiKg(editingItem.harga_referensi_kg || 0);
      setLokasiDefaultGudang(editingItem.lokasi_default_gudang || '');
      setKeterangan(editingItem.keterangan || '');
      setStatusAktif(editingItem.status_aktif !== false);
      setErrorMessage('');
    } else {
      const nextNum = existingItems.length + 1;
      setKodeBarang(`MB-TBK-00${nextNum}`);
      setNamaBarang('');
      setKodeGrade('A');
      setKategori('Tembakau Rajangan Halus');
      setVarietas('Prancak Super');
      setBeratStandarKg(45.0);
      setSatuan('Bal (Keranjang)');
      setHargaReferensiKg(90000);
      setLokasiDefaultGudang('Gudang Pusat Induk & Intake - Pamekasan / Blok A-01');
      setKeterangan('');
      setStatusAktif(true);
      setErrorMessage('');
    }
  }, [editingItem, isOpen, existingItems]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!kodeBarang.trim()) {
      setErrorMessage('Kode master barang wajib diisi.');
      return;
    }
    if (!kodeGrade.trim()) {
      setErrorMessage('Kode Grade tembakau wajib diisi.');
      return;
    }
    if (!namaBarang.trim()) {
      setErrorMessage('Nama master barang / deskripsi varietas wajib diisi.');
      return;
    }
    if (beratStandarKg <= 0) {
      setErrorMessage('Berat standar per bal harus lebih dari 0 kg.');
      return;
    }

    // Check duplicate code
    const isDuplicate = existingItems.some(
      (item) =>
        item.kode_barang.toLowerCase() === kodeBarang.trim().toLowerCase() &&
        (!editingItem || item.master_id !== editingItem.master_id)
    );

    if (isDuplicate) {
      setErrorMessage(`Kode barang "${kodeBarang}" sudah digunakan oleh master item lain.`);
      return;
    }

    const payload: MasterBarang = {
      master_id: editingItem?.master_id || `MB-TBK-${Date.now()}`,
      kode_barang: kodeBarang.trim().toUpperCase(),
      nama_barang: namaBarang.trim(),
      kode_grade: kodeGrade.trim().toUpperCase(),
      kategori: kategori.trim(),
      varietas: varietas.trim(),
      berat_standar_kg: Number(beratStandarKg),
      satuan: satuan.trim(),
      harga_referensi_kg: Number(hargaReferensiKg),
      lokasi_default_gudang: lokasiDefaultGudang.trim(),
      keterangan: keterangan.trim(),
      status_aktif: statusAktif,
      tanggal_dibuat: editingItem?.tanggal_dibuat || new Date().toISOString().split('T')[0],
    };

    setPendingPayload(payload);
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    if (pendingPayload) {
      onSave(pendingPayload);
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
        <div className="bg-white border border-gray-300 w-full max-w-3xl rounded-none shadow-2xl flex flex-col text-xs text-gray-800">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-[#b81d24]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                  {editingItem ? 'Edit Master Data Barang / Bal' : 'Tambah Master Data Barang Baru'}
                </h2>
                <p className="text-[11px] text-gray-500 font-medium">
                  Katalog Spesifikasi Mutu & Karakteristik Bahan Baku Tembakau Madura
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
                <span>Simpan Master Barang</span>
              </button>
            </div>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto bg-[#f8f9fa]">
            
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-sm flex items-center space-x-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            <div className="bg-white p-4 border border-gray-300 space-y-3.5 shadow-xs">
              <div className="text-xs font-bold text-gray-800 border-b border-gray-200 pb-1.5 uppercase tracking-wide">
                Informasi SKU & Identifikasi Tembakau
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Kode Master Barang (SKU) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={kodeBarang}
                    onChange={(e) => setKodeBarang(e.target.value)}
                    placeholder="Contoh: MB-TBK-A"
                    className="w-full px-3 py-2 font-mono font-bold bg-white border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none uppercase text-xs"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-gray-700 font-bold">
                      Kode Grade Tembakau <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-gray-500 italic">Bisa ketik nama Grade custom</span>
                  </div>
                  <input
                    type="text"
                    value={kodeGrade}
                    onChange={(e) => setKodeGrade(e.target.value)}
                    placeholder="Ketik Grade custom (misal: A, B+, SUPER-01, DAUN-TOP)..."
                    className="w-full px-3 py-2 font-mono font-bold bg-white border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none uppercase text-xs"
                    required
                  />
                  {/* Quick Preset Grade Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] text-gray-500 font-medium">Contoh / Rekomendasi:</span>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'SUPER', 'EXPORT'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setKodeGrade(preset)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-xs border cursor-pointer transition ${
                          kodeGrade.toUpperCase() === preset
                            ? 'bg-[#b81d24] text-white border-[#b81d24]'
                            : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Nama Master Barang / Deskripsi Item <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={namaBarang}
                  onChange={(e) => setNamaBarang(e.target.value)}
                  placeholder="Contoh: Tembakau Rajangan Madura Gunung Grade A (Super Top Leaves)"
                  className="w-full px-3 py-2 bg-white border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Kategori Tembakau</label>
                  <input
                    type="text"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    placeholder="Rajangan Halus / Standar / Cacah"
                    className="w-full px-3 py-2 bg-white border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Varietas & Asal Daun</label>
                  <input
                    type="text"
                    value={varietas}
                    onChange={(e) => setVarietas(e.target.value)}
                    placeholder="Prancak Super, Madura Cangkring, dll."
                    className="w-full px-3 py-2 bg-white border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 border border-gray-300 space-y-3.5 shadow-xs">
              <div className="text-xs font-bold text-gray-800 border-b border-gray-200 pb-1.5 uppercase tracking-wide">
                Standarisasi Berat, Lokasi Gudang & Tarif Harga Acuan
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Berat Standar Bal (Kg) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={beratStandarKg}
                      onChange={(e) => setBeratStandarKg(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 font-mono font-bold bg-white border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none pr-9 text-xs"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-[11px]">KG</span>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Satuan Kemasan</label>
                  <input
                    type="text"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    placeholder="Bal (Keranjang)"
                    className="w-full px-3 py-2 bg-white border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Harga Acuan per Kg (Rp) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={hargaReferensiKg}
                      onChange={(e) => setHargaReferensiKg(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 font-mono font-bold bg-white border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none pl-9 text-xs"
                      required
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-[11px]">Rp</span>
                  </div>
                </div>
              </div>

              {/* Price reference info & estimate */}
              <div className="p-2.5 bg-red-50/60 border border-red-200 rounded-sm flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-gray-800">Estimasi Nilai per Bal Standar:</span>{' '}
                  <span className="font-mono font-bold text-[#b81d24]">
                    Rp {(beratStandarKg * hargaReferensiKg).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] text-gray-500 ml-1.5">
                    ({beratStandarKg} kg @ Rp {hargaReferensiKg.toLocaleString('id-ID')}/kg)
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 italic hidden sm:inline">
                  Tersinkron langsung dengan tarif intake transaksi
                </span>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Lokasi Default Penempatan Rak Gudang</label>
                <select
                  value={lokasiDefaultGudang}
                  onChange={(e) => setLokasiDefaultGudang(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none text-xs text-gray-900 cursor-pointer"
                >
                  {STANDARD_GUDANG_LOCATIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Karakteristik & Spesifikasi Mutu</label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Catatan aroma, kadar air maksimal, kelenturan daun, atau peruntukan linting..."
                  className="w-full px-3 py-2 bg-white border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="statusAktifCheck"
                  checked={statusAktif}
                  onChange={(e) => setStatusAktif(e.target.checked)}
                  className="w-4 h-4 accent-[#b81d24] text-[#b81d24] rounded cursor-pointer"
                />
                <label htmlFor="statusAktifCheck" className="text-xs text-gray-800 font-semibold cursor-pointer">
                  Status Master Barang Aktif (Tersedia untuk Intake Pembelian & Produksi)
                </label>
              </div>
            </div>

          </form>

        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title={editingItem ? 'Konfirmasi Simpan Perubahan SKU' : 'Konfirmasi Tambah Master Barang'}
        message={
          editingItem
            ? `Apakah Anda yakin ingin menyimpan perubahan data spesifikasi master barang "${pendingPayload?.kode_barang}"?`
            : `Apakah Anda yakin ingin mendaftarkan SKU master barang baru "${pendingPayload?.kode_barang}"?`
        }
        detail={pendingPayload ? `SKU: ${pendingPayload.kode_barang} | Nama: ${pendingPayload.nama_barang} | Grade: ${pendingPayload.kode_grade} | Lokasi: ${pendingPayload.lokasi_default_gudang}` : undefined}
        confirmText={editingItem ? 'Ya, Simpan Perubahan' : 'Ya, Daftarkan SKU'}
        cancelText="Periksa Kembali"
        variant="primary"
        onConfirm={handleConfirmSave}
        onClose={() => setIsConfirmOpen(false)}
      />
    </>
  );
};

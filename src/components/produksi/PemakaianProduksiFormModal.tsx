import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Factory, 
  Package, 
  Scale, 
  CheckCircle2, 
  Save, 
  Search, 
  Scan, 
  Zap, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { PengirimanBarang, Barang } from '../../types';
import { formatDateDDMMYY } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

interface PemakaianProduksiFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  barangList: Barang[];
  onSavePengeluaran: (pengeluaran: PengirimanBarang, updatedBarangIds: string[]) => void;
}

export const PemakaianProduksiFormModal: React.FC<PemakaianProduksiFormModalProps> = ({
  isOpen,
  onClose,
  barangList,
  onSavePengeluaran,
}) => {
  const [unitProduksi, setUnitProduksi] = useState('Unit Pelintingan SKT Lini 1 (Kretek Tangan)');
  const [customUnit, setCustomUnit] = useState('');
  const [mandorProduksi, setMandorProduksi] = useState('Bpk. Ahmad Dahlan (Mandor Produksi)');
  const [saranaAngkut, setSaranaAngkut] = useState('Internal Hand-Trolley / Forklift Gudang');
  const [targetBatchRokok, setTargetBatchRokok] = useState('Produksi Rokok PR. Sekar Maju Sejahtera SKT Kretek Super');
  const [catatan, setCatatan] = useState('');
  const [selectedBarangIds, setSelectedBarangIds] = useState<string[]>([]);
  const [searchBalQuery, setSearchBalQuery] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Barcode scanner states
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const scannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scannerInputRef.current?.focus(), 150);
    } else {
      setSelectedBarangIds([]);
      setScanFeedback(null);
      setBarcodeInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Active items in warehouse available for internal consumption
  const availableBal = barangList.filter(
    (b) => b.status_stok === 'di_gudang' || b.status_stok === 'terkirim_sample'
  );

  const filteredAvailableBal = availableBal.filter((b) => {
    return (
      searchBalQuery === '' ||
      b.barcode.toLowerCase().includes(searchBalQuery.toLowerCase()) ||
      b.no_bal.toLowerCase().includes(searchBalQuery.toLowerCase()) ||
      b.kode_grade.toLowerCase().includes(searchBalQuery.toLowerCase()) ||
      (b.nama_petani && b.nama_petani.toLowerCase().includes(searchBalQuery.toLowerCase()))
    );
  });

  const selectedBalObjects = barangList.filter((b) => selectedBarangIds.includes(b.barang_id));
  const totalBalCount = selectedBalObjects.length;
  const totalBeratTonaseKg = selectedBalObjects.reduce((acc, b) => acc + (b.berat_kg || 0), 0);

  const toggleSelectBal = (id: string) => {
    setSelectedBarangIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleScanBarcode = (codeToScan: string) => {
    const trimmed = codeToScan.trim();
    if (!trimmed) return;

    const matched = availableBal.find(
      (b) =>
        b.barcode.toLowerCase() === trimmed.toLowerCase() ||
        b.no_bal.toLowerCase() === trimmed.toLowerCase()
    );

    if (!matched) {
      setScanFeedback({
        type: 'error',
        message: `Barcode / No Bal "${trimmed}" tidak ditemukan atau sudah keluar dari gudang!`,
      });
      setBarcodeInput('');
      return;
    }

    if (selectedBarangIds.includes(matched.barang_id)) {
      setScanFeedback({
        type: 'info',
        message: `Bal ${matched.no_bal} (${matched.barcode}) sudah tercentang dalam daftar keluar produksi.`,
      });
      setBarcodeInput('');
      return;
    }

    setSelectedBarangIds((prev) => [...prev, matched.barang_id]);
    setScanFeedback({
      type: 'success',
      message: `BERHASIL SCAN: Bal #${matched.no_bal} (Grade ${matched.kode_grade} - ${matched.berat_kg}kg) siap dibongkar ke produksi!`,
    });
    setBarcodeInput('');
    setTimeout(() => scannerInputRef.current?.focus(), 100);
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredAvailableBal.map((b) => b.barang_id);
    setSelectedBarangIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
  };

  const handleDeselectAll = () => {
    setSelectedBarangIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedBarangIds.length === 0) {
      alert('Pilih minimal satu bal tembakau untuk dikeluarkan ke produksi rokok!');
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    const finalUnit = unitProduksi === 'lainnya' ? (customUnit.trim() || 'Unit Produksi Khusus') : unitProduksi;
    const now = new Date();
    const noBon = `BPP-SA-${formatDateDDMMYY(now)}-${Math.floor(100 + Math.random() * 900)}`;

    const selectedBarcodes = selectedBalObjects.map((b) => b.barcode);

    const newPengeluaran: PengirimanBarang = {
      pengiriman_id: `BPP-${Date.now()}`,
      jenis_pengeluaran: 'produksi_sendiri',
      no_surat_jalan: noBon,
      tanggal_kirim: now.toISOString().split('T')[0],
      tujuan: `Pabrik PR. Sekar Maju Sejahtera - ${finalUnit}`,
      unit_produksi: finalUnit,
      mandor_produksi: mandorProduksi.trim(),
      total_bal: totalBalCount,
      total_berat_kg: Math.round(totalBeratTonaseKg * 100) / 100,
      status: 'dikirim',
      driver_nama: mandorProduksi.trim(),
      plat_nomor: saranaAngkut.trim(),
      catatan: catatan.trim() ? `${targetBatchRokok} | ${catatan.trim()}` : targetBatchRokok,
      barang_ids: selectedBarangIds,
      barcode_list: selectedBarcodes,
      dibuat_oleh: 'Kepala Gudang Bahan Baku PR. Sekar Maju Sejahtera',
    };

    onSavePengeluaran(newPengeluaran, selectedBarangIds);
    setIsConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-gray-300 w-full max-w-4xl rounded-none shadow-xl flex flex-col max-h-[92vh] text-xs text-gray-800">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <Factory className="w-4 h-4 text-[#b81d24]" />
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                Bon Pengeluaran Bahan Baku Produksi Rokok PR. Sekar Maju Sejahtera
              </h2>
              <p className="text-[11px] text-gray-500">
                Pilih atau scan bal tembakau untuk dialirkan ke lantai produksi rokok internal
              </p>
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
              onClick={handleSubmit}
              disabled={selectedBarangIds.length === 0}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan & Terbitkan Bon Produksi ({totalBalCount} Bal)</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* Left: Unit Produksi & Mandor (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">
                  Unit Kerja / Lini Produksi PR. Sekar Maju Sejahtera <span className="text-red-500">*</span>
                </label>
                <select
                  value={unitProduksi}
                  onChange={(e) => {
                    setUnitProduksi(e.target.value);
                    setCustomUnit('');
                  }}
                  className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none bg-white text-gray-900"
                >
                  <option value="Unit Pelintingan SKT Lini 1 (Kretek Tangan)">Unit Pelintingan SKT Lini 1 (Kretek Tangan)</option>
                  <option value="Unit Pelintingan SKT Lini 2 (Kretek Tangan)">Unit Pelintingan SKT Lini 2 (Kretek Tangan)</option>
                  <option value="Unit Pelintingan SKM Filter Lini A (Mesin)">Unit Pelintingan SKM Filter Lini A (Mesin)</option>
                  <option value="Unit Blending & Casing Flavoring">Unit Blending & Casing Flavoring</option>
                  <option value="Unit Pengolahan & Sortir Rajangan">Unit Pengolahan & Sortir Rajangan</option>
                  <option value="lainnya">-- Input Unit Produksi Lainnya --</option>
                </select>
              </div>

              {unitProduksi === 'lainnya' && (
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 block">
                    Nama Unit Kerja Baru <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="Contoh: Unit Kemasan & Packing"
                    className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none bg-white text-gray-900"
                  />
                </div>
              )}

              {/* Mandor Produksi & Sarana */}
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">
                  Mandor / Kepala Shift Penerima <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={mandorProduksi}
                  onChange={(e) => setMandorProduksi(e.target.value)}
                  placeholder="Contoh: Bpk. Ahmad Dahlan"
                  className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none bg-white text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">
                  Peruntukan Batch Produksi Rokok
                </label>
                <input
                  type="text"
                  value={targetBatchRokok}
                  onChange={(e) => setTargetBatchRokok(e.target.value)}
                  placeholder="Contoh: Batch SKT Sekar Maju Sejahtera Merah #2026-08A"
                  className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none bg-white text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">
                  Sarana Pemindahan Internal
                </label>
                <input
                  type="text"
                  value={saranaAngkut}
                  onChange={(e) => setSaranaAngkut(e.target.value)}
                  placeholder="Hand-Trolley / Forklift"
                  className="w-full px-2.5 py-1.5 font-mono border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none bg-white text-gray-900"
                />
              </div>

              {/* Catatan */}
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">
                  Catatan Tambahan / Instruksi Khusus
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Instruksi kadar air atau perajangan ulang..."
                  className="w-full px-2.5 py-1.5 border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none bg-white text-gray-900"
                />
              </div>

            </div>

            {/* Right: Bal Multi-Select / Barcode Scanner (7 cols) */}
            <div className="lg:col-span-7 bg-[#f8f9fa] p-3.5 border border-gray-300 space-y-2.5">
              
              {/* Barcode Scanner Gun Bar */}
              <div className="p-2.5 bg-white border border-gray-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                    <Scan className="w-4 h-4 text-[#b81d24]" />
                    <span>TEMBAKKAN SCANNER GUN UNTUK KELUAR PRODUKSI</span>
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    Scan = Otomatis Tercentang
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    ref={scannerInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScanBarcode(barcodeInput);
                      }
                    }}
                    placeholder="Arahkan scanner ke bal tembakau..."
                    className="flex-1 bg-white border border-[#ced4da] rounded-sm px-2.5 py-1.5 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#b81d24]"
                  />
                  <button
                    type="button"
                    onClick={() => handleScanBarcode(barcodeInput)}
                    className="px-3.5 py-1.5 bg-[#b81d24] hover:bg-[#a0181e] text-white rounded-sm font-bold text-xs flex items-center space-x-1 transition cursor-pointer shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Scan Bal</span>
                  </button>
                </div>

                {/* Scan Feedback Banner */}
                {scanFeedback && (
                  <div
                    className={`p-2 border flex items-center space-x-2 text-xs ${
                      scanFeedback.type === 'success'
                        ? 'bg-red-50 border-red-300 text-red-800'
                        : scanFeedback.type === 'info'
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-red-50 border-red-300 text-red-800'
                    }`}
                  >
                    {scanFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    )}
                    <span className="font-semibold text-[11px]">{scanFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* Bal Checklist Controls */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="font-bold text-gray-900 text-xs block">
                    Pilih Bal Tembakau dari Gudang
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Stok aktif tersedia: {availableBal.length} Bal
                  </span>
                </div>

                <div className="flex space-x-1 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded-sm text-gray-700 font-semibold cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded-sm text-gray-700 font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Filter Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchBalQuery}
                  onChange={(e) => setSearchBalQuery(e.target.value)}
                  placeholder="Filter no bal, barcode, grade..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#ced4da] rounded-sm focus:outline-none focus:border-[#b81d24]"
                />
              </div>

              {/* Bal Checklist Scrollable */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-gray-100">
                {filteredAvailableBal.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    Tidak ada bal aktif yang cocok
                  </div>
                ) : (
                  filteredAvailableBal.map((b) => {
                    const isSelected = selectedBarangIds.includes(b.barang_id);
                    return (
                      <label
                        key={b.barang_id}
                        className={`flex items-center justify-between p-2 cursor-pointer transition text-xs ${
                          isSelected
                            ? 'bg-red-50 border border-[#b81d24] text-gray-900 font-bold'
                            : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectBal(b.barang_id)}
                            className="w-3.5 h-3.5 accent-[#b81d24] text-[#b81d24] rounded-none cursor-pointer"
                          />
                          <div>
                            <span className="font-mono font-bold">{b.no_bal}</span>
                            <span className="text-[10px] text-gray-500 font-mono ml-2">
                              {b.barcode}
                            </span>
                            <div className="text-[10px] text-gray-500 font-normal">
                              Petani: {b.nama_petani} • {b.lokasi_gudang}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="px-1.5 py-0.5 bg-gray-800 text-white rounded-none text-[10px] font-bold">
                            {b.kode_grade}
                          </span>
                          <span className="font-mono font-bold">{b.berat_kg} kg</span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              {/* Tonase Summary */}
              <div className="bg-[#f8f9fa] border border-gray-300 p-2.5 flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-gray-500 font-sans block">Bal Dikeluarkan ke Produksi:</span>
                  <span className="text-sm font-bold text-[#b81d24]">{totalBalCount} Bal</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-sans block">Total Tonase Bahan Baku:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {totalBeratTonaseKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} KG
                  </span>
                </div>
              </div>

            </div>

          </div>

        </form>

      </div>
    </div>

    {/* Confirmation Dialog */}
    <ConfirmModal
      isOpen={isConfirmOpen}
      title="Konfirmasi Penerbitan Bon Pengeluaran Produksi (SPBB)"
      message={`Apakah Anda yakin ingin menyetujui dan menerbitkan Bon Pengeluaran Bahan Baku untuk ${totalBalCount} bal tembakau?`}
      detail={`Tujuan: ${unitProduksi === 'lainnya' ? customUnit : unitProduksi} | Total Tonase: ${totalBeratTonaseKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg | Mandor: ${mandorProduksi}`}
      variant="primary"
      confirmText="Ya, Terbitkan Bon Produksi"
      cancelText="Periksa Kembali"
      onConfirm={handleConfirmSave}
      onClose={() => setIsConfirmOpen(false)}
    />
  </>
  );
};

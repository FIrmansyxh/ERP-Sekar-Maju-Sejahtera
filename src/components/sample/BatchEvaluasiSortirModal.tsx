import React, { useState, useEffect, useMemo } from 'react';
import { 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Save, 
  ArrowLeft, 
  Check, 
  X, 
  RefreshCw,
  Building2,
  DollarSign,
  FileText,
  HelpCircle,
  Truck
} from 'lucide-react';
import { BatchPengirimanSample, SampleItemDetail, StatusSample, StatusBatchSample, Barang } from '../../types';
import { formatRupiah, formatNumber } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

interface BatchEvaluasiSortirModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: BatchPengirimanSample | null;
  barangList: Barang[];
  onSaveEvaluasi: (updatedBatch: BatchPengirimanSample, updatedBarangs: Barang[]) => void;
  onNavigateToPengiriman?: (batch: BatchPengirimanSample) => void;
}

export const BatchEvaluasiSortirModal: React.FC<BatchEvaluasiSortirModalProps> = ({
  isOpen,
  onClose,
  batch,
  barangList,
  onSaveEvaluasi,
  onNavigateToPengiriman,
}) => {
  const [items, setItems] = useState<SampleItemDetail[]>([]);
  const [petugasQCPabrik, setPetugasQCPabrik] = useState('');
  const [catatanBatch, setCatatanBatch] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [itemToReject, setItemToReject] = useState<SampleItemDetail | null>(null);
  const [rejectedBarangIds, setRejectedBarangIds] = useState<string[]>([]);

  useEffect(() => {
    if (batch) {
      setItems(JSON.parse(JSON.stringify(batch.items || [])));
      setPetugasQCPabrik(batch.petugas_qc_pabrik || '');
      setCatatanBatch(batch.catatan || '');
      setRejectedBarangIds([]);
    }
  }, [batch, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConfirmOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConfirmOpen, onClose]);

  if (!isOpen || !batch) return null;

  // Update item status
  const handleItemStatusChange = (index: number, newStatus: StatusSample) => {
    if (newStatus === 'ditolak') {
      setItemToReject(items[index]);
      return;
    }

    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      target.status_item = newStatus;
      
      const now = new Date();
      target.tanggal_evaluasi = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (newStatus === 'disetujui') {
        if (!target.harga_deal_kg) {
          target.harga_deal_kg = target.harga_tawaran_kg;
        }
      } else if (newStatus === 'nego') {
        if (!target.catatan_nego) {
          target.catatan_nego = 'Pabrik mengajukan penyesuaian harga';
        }
      }

      copy[index] = target;
      return copy;
    });
  };

  const confirmRejectItem = () => {
    if (itemToReject) {
      setItems((prev) => prev.filter((it) => it.sample_item_id !== itemToReject.sample_item_id));
      setRejectedBarangIds((prev) => [...prev, itemToReject.barang_id]);
      setItemToReject(null);
    }
  };

  // Update specific field in item
  const handleItemFieldChange = (index: number, field: keyof SampleItemDetail, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  // Quick action: Setujui semua sesuai penawaran awal
  const handleApproveAll = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        status_item: 'disetujui',
        harga_deal_kg: item.harga_deal_kg || item.harga_tawaran_kg,
        tanggal_evaluasi: dateStr,
      }))
    );
  };

  // Quick action: Accept counter-offer and change to disetujui
  const handleAcceptNegotiation = (index: number, agreedPrice: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      target.status_item = 'disetujui';
      target.harga_deal_kg = agreedPrice;
      target.catatan_nego = `Nego disepakati pada harga ${formatRupiah(agreedPrice)}/kg`;
      const now = new Date();
      target.tanggal_evaluasi = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      copy[index] = target;
      return copy;
    });
  };

  // Calculate Batch summary metrics
  const totalItems = items.length;
  const countDisetujui = items.filter((i) => i.status_item === 'disetujui').length;
  const countDitolak = items.filter((i) => i.status_item === 'ditolak').length;
  const countNego = items.filter((i) => i.status_item === 'nego').length;
  const countMenunggu = items.filter((i) => i.status_item === 'dikirim' || i.status_item === 'diterima').length;

  const totalNilaiPenawaran = items.reduce((sum, item) => sum + item.berat_bal_kg * item.harga_tawaran_kg, 0);
  const totalNilaiDeal = items
    .filter((i) => i.status_item === 'disetujui')
    .reduce((sum, item) => sum + item.berat_bal_kg * (item.harga_deal_kg || item.harga_tawaran_kg), 0);

  // Compute final batch status
  let computedBatchStatus: StatusBatchSample = 'sample';
  if (countDisetujui === totalItems) {
    computedBatchStatus = 'diproses';
  } else if (countDitolak === totalItems) {
    computedBatchStatus = 'dibatalkan';
  } else if (countDisetujui > 0) {
    computedBatchStatus = 'diproses';
  } else if (countNego > 0 || countDisetujui > 0) {
    computedBatchStatus = 'sample';
  } else {
    computedBatchStatus = 'sample';
  }

  // Filtered items for display
  const displayItems = items.filter((item) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'disetujui') return item.status_item === 'disetujui';
    if (filterStatus === 'ditolak') return item.status_item === 'ditolak';
    if (filterStatus === 'nego') return item.status_item === 'nego';
    if (filterStatus === 'menunggu') return item.status_item === 'dikirim' || item.status_item === 'diterima';
    return true;
  });

  // Handle Save
  const handleConfirmSave = () => {
    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const updatedBatch: BatchPengirimanSample = {
      ...batch,
      petugas_qc_pabrik: petugasQCPabrik.trim() || 'Tim Evaluasi Mutu QC Pabrik',
      catatan: catatanBatch.trim(),
      tanggal_respon: dateFormatted,
      status: computedBatchStatus,
      items: items,
      total_sample_bal: totalItems,
      total_bal_disetujui: countDisetujui,
      total_bal_ditolak: countDitolak,
      total_bal_nego: countNego,
      total_estimasi_nilai: totalNilaiPenawaran,
      total_nilai_deal: totalNilaiDeal,
    };

    // Update corresponding barang status in inventory
    const updatedBarangs = barangList.map((b) => {
      if (rejectedBarangIds.includes(b.barang_id)) {
        return {
          ...b,
          status_stok: 'di_gudang' as const,
          catatan_qc: `Sample Ditolak di Pabrik. Bal dikembalikan ke stok gudang.`,
        };
      }
      const matchItem = items.find((it) => it.barang_id === b.barang_id);
      if (matchItem) {
        if (matchItem.status_item === 'ditolak') {
          // Return rejected bale back to regular warehouse inventory
          return {
            ...b,
            status_stok: 'di_gudang' as const,
            catatan_qc: `Sample Ditolak di Pabrik (${matchItem.alasan_tolak || 'Kadar air tinggi'}). Bal dikembalikan ke gudang.`,
          };
        } else if (matchItem.status_item === 'disetujui') {
          return {
            ...b,
            status_stok: 'terkirim_sample' as const,
            catatan_qc: `ACC Sample Pabrik (${formatRupiah(matchItem.harga_deal_kg || matchItem.harga_tawaran_kg)}/kg). Siap Delivery Order.`,
          };
        }
      }
      return b;
    });

    onSaveEvaluasi(updatedBatch, updatedBarangs);
    setIsConfirmOpen(false);
    onClose();
  };

  const presetAlasanTolak = [
    'Kadar air tinggi (> 14%) - perlu penjemuran ulang',
    'Aroma & kematangan daun kurang optimal untuk blend kretek',
    'Warna rajangan kurang seragam / terdapat bercak hijau',
    'Grade tidak memenuhi standar spesifikasi mesin linting otomatis',
    'Ditolak atas pertimbangan kapasitas gudang pabrik penuh',
  ];

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isConfirmOpen) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-white border border-gray-300 w-full max-w-5xl rounded-none shadow-2xl flex flex-col max-h-[92vh] text-xs text-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 bg-linear-to-r from-gray-900 via-gray-850 to-gray-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-sm bg-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <FlaskConical className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    Sortir & Evaluasi QC Pabrik (Gudang Buyer)
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded-xs">
                    {batch.kode_batch}
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 truncate">
                  Penerima: <span className="text-yellow-400 font-semibold">{batch.tujuan_buyer}</span> • Tanggal Kirim: {batch.tanggal_kirim}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Sortir item sample: Bal ACC akan disiapkan untuk DO, bal ditolak dikembalikan ke stok gudang, dan bal nego dapat disesuaikan harganya hingga deal.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-200 bg-white/10 hover:bg-white/20 border border-white/20 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-md whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Hasil Evaluasi</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white rounded-sm hover:bg-white/10 transition cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Stats & Buyer Request Banner */}
          <div className="bg-gray-50 border-b border-gray-200 p-4 space-y-3 shrink-0">
            {batch.permintaan_buyer && (
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-sm flex items-start space-x-2 text-[11px] text-amber-900">
                <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Spesifikasi Permintaan Buyer: </span>
                  {batch.permintaan_buyer}
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="bg-white p-2.5 border border-gray-200 rounded-sm shadow-xs">
                <div className="text-[10px] text-gray-500 font-medium">Total Bal Sample</div>
                <div className="text-base font-bold text-gray-900">{totalItems} Bal</div>
                <div className="text-[10px] text-gray-400">Est. {formatRupiah(totalNilaiPenawaran)}</div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-sm shadow-xs">
                <div className="text-[10px] text-emerald-700 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Disetujui (ACC / Deal)</span>
                </div>
                <div className="text-base font-bold text-emerald-800">{countDisetujui} Bal</div>
                <div className="text-[10px] font-bold text-emerald-700">{formatRupiah(totalNilaiDeal)}</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-sm shadow-xs">
                <div className="text-[10px] text-amber-700 font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Nego / Penyesuaian</span>
                </div>
                <div className="text-base font-bold text-amber-800">{countNego} Bal</div>
                <div className="text-[10px] text-amber-700">Perlu Konfirmasi</div>
              </div>

              <div className="bg-red-50 border border-red-200 p-2.5 rounded-sm shadow-xs">
                <div className="text-[10px] text-red-700 font-bold flex items-center space-x-1">
                  <XCircle className="w-3 h-3" />
                  <span>Ditolak (Kembali Gudang)</span>
                </div>
                <div className="text-base font-bold text-red-800">{countDitolak} Bal</div>
                <div className="text-[10px] text-red-700">Tidak diambil</div>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-sm shadow-xs">
                <div className="text-[10px] text-rose-700 font-bold flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Menunggu Evaluasi</span>
                </div>
                <div className="text-base font-bold text-rose-800">{countMenunggu} Bal</div>
                <div className="text-[10px] text-rose-700">Dalam proses lab</div>
              </div>
            </div>

            {/* Filter and Quick Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                <span className="text-[11px] font-semibold text-gray-600 mr-1">Filter Item:</span>
                {[
                  { id: 'all', label: `Semua (${totalItems})` },
                  { id: 'disetujui', label: `Disetujui (${countDisetujui})` },
                  { id: 'nego', label: `Nego (${countNego})` },
                  { id: 'ditolak', label: `Ditolak (${countDitolak})` },
                  { id: 'menunggu', label: `Menunggu (${countMenunggu})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterStatus(f.id)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-xs transition cursor-pointer ${
                      filterStatus === f.id
                        ? 'bg-[#b81d24] text-white font-bold'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Body: Bal List for Evaluation */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 bg-gray-100/70">
            {displayItems.length === 0 ? (
              <div className="bg-white p-8 border border-gray-200 text-center text-gray-500 rounded-sm">
                Tidak ada bal sample dengan filter status ini.
              </div>
            ) : (
              displayItems.map((item) => {
                // Find original index
                const originalIndex = items.findIndex((it) => it.sample_item_id === item.sample_item_id);
                const isAcc = item.status_item === 'disetujui';
                const isReject = item.status_item === 'ditolak';
                const isNego = item.status_item === 'nego';
                const isPending = item.status_item === 'dikirim' || item.status_item === 'diterima';

                const totalTawaran = item.berat_bal_kg * item.harga_tawaran_kg;
                const totalDeal = item.berat_bal_kg * (item.harga_deal_kg || item.harga_tawaran_kg);

                return (
                  <div 
                    key={item.sample_item_id}
                    className={`p-4 border rounded-sm transition-all shadow-xs ${
                      isAcc 
                        ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200' 
                        : isReject 
                        ? 'bg-red-50/60 border-red-300 ring-1 ring-red-200'
                        : isNego
                        ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-200'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {/* Top Row: Bal Information & Status Toggles */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-200/80 pb-3">
                      <div className="flex items-start space-x-3">
                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-[#b81d24] text-white font-mono rounded-xs shrink-0">
                          <span className="text-[10px] font-semibold text-gray-400">GRADE</span>
                          <span className="text-base font-bold text-yellow-400">{item.kode_grade}</span>
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-gray-900 font-mono">{item.no_bal || item.barang_id}</span>
                            <span className="px-1.5 py-0.2 text-[10px] font-mono text-gray-500 bg-gray-200 rounded-xs">
                              {item.sample_item_id}
                            </span>
                            {item.sudah_dikirim_do && (
                              <span className="px-1.5 py-0.2 text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-200 rounded-xs flex items-center space-x-0.5">
                                <Truck className="w-2.5 h-2.5" />
                                <span>Terkirim DO ({item.no_surat_jalan_do})</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-600 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span>Netto: <strong className="text-gray-900">{formatNumber(item.berat_bal_kg, 1)} Kg</strong></span>
                            <span>Bruto: <strong className="text-gray-900">{formatNumber(item.berat_bruto_kg || (item.berat_bal_kg > 0 ? item.berat_bal_kg + (item.potongan_tara_kg !== undefined ? item.potongan_tara_kg : 2) : 0), 1)} Kg</strong></span>
                            {item.harga_beli_kg && item.harga_beli_kg > 0 && (
                              <span>Harga Beli: <strong className="text-emerald-800 font-mono">{formatRupiah(item.harga_beli_kg)}/Kg</strong></span>
                            )}
                            {item.kode_harga_jual && (
                              <span>Kode Jual: <strong className="text-gray-900 font-mono bg-slate-100 px-1 py-0.2 rounded-xs">{item.kode_harga_jual}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Action Buttons */}
                      <div className="flex items-center space-x-1.5 shrink-0 self-start lg:self-center">
                        <button
                          type="button"
                          onClick={() => handleItemStatusChange(originalIndex, 'disetujui')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xs flex items-center space-x-1 cursor-pointer transition ${
                            isAcc
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ACC / Ambil</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleItemStatusChange(originalIndex, 'nego')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xs flex items-center space-x-1 cursor-pointer transition ${
                            isNego
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Nego Harga</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleItemStatusChange(originalIndex, 'ditolak')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xs flex items-center space-x-1 cursor-pointer transition ${
                            isReject
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-white text-red-700 border border-red-300 hover:bg-red-50'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak / Retur</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleItemStatusChange(originalIndex, 'diterima')}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-xs flex items-center space-x-1 cursor-pointer transition ${
                            isPending
                              ? 'bg-[#b81d24] text-white shadow-xs'
                              : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50'
                          }`}
                          title="Tandai sedang diuji laboratorium"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Uji Lab</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Detail Sortir & Price Breakdown */}
                    <div className="pt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                      
                      {/* Left: Financial & Price Data (5 cols) */}
                      <div className="md:col-span-5 bg-white/80 p-2.5 border border-gray-200 rounded-xs space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Harga Penawaran Awal Kita:</span>
                          <span className="font-bold font-mono text-gray-800">{formatRupiah(item.harga_tawaran_kg)}/kg</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-500">
                          <span>Total Nilai Penawaran Bal:</span>
                          <span className="font-semibold font-mono">{formatRupiah(totalTawaran)}</span>
                        </div>

                        {isAcc && (
                          <div className="pt-1.5 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-emerald-700 font-bold">Harga Deal Final:</span>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-gray-500 font-mono">Rp</span>
                              <input
                                type="number"
                                value={item.harga_deal_kg || item.harga_tawaran_kg}
                                onChange={(e) => handleItemFieldChange(originalIndex, 'harga_deal_kg', Number(e.target.value))}
                                className="w-28 px-2 py-0.5 text-xs font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-xs focus:ring-1 focus:ring-emerald-500"
                              />
                              <span className="text-[10px] text-gray-500">/kg</span>
                            </div>
                          </div>
                        )}

                        {isAcc && (
                          <div className="flex justify-between items-center bg-emerald-100/70 px-2 py-1 rounded-xs font-bold text-emerald-900">
                            <span>Total Pembelian Bal (Deal):</span>
                            <span className="font-mono text-xs">{formatRupiah(totalDeal)}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Sortir Decisions, Notes, or Negotiation Inputs (7 cols) */}
                      <div className="md:col-span-7 space-y-2">
                        {isAcc && (
                          <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-xs space-y-1 text-[11px] text-emerald-900">
                            <div className="flex items-center space-x-1.5 font-bold text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Bal Disetujui (ACC) - Siap Dipanggil untuk Pengiriman DO</span>
                            </div>
                            <p className="text-gray-600 text-[10px]">
                              Bal ini telah di-ACC oleh pihak pabrik dan akan otomatis muncul di menu Surat Jalan / Pengiriman Barang saat memilih Batch ini.
                            </p>
                            {item.catatan_nego && (
                              <div className="text-[10px] text-emerald-700 font-mono bg-white/70 px-2 py-0.5 rounded-xs">
                                Riwayat: {item.catatan_nego}
                              </div>
                            )}
                          </div>
                        )}

                        {isNego && (
                          <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-xs space-y-2 text-[11px] text-amber-900">
                            <div className="flex items-center justify-between">
                              <div className="font-bold flex items-center space-x-1 text-amber-800">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Penyesuaian Harga / Nego Pabrik</span>
                              </div>
                              <span className="text-[10px] text-amber-700">Tawaran Awal: {formatRupiah(item.harga_tawaran_kg)}/kg</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                                  Counter Offer Pabrik (Rp/Kg):
                                </label>
                                <input
                                  type="number"
                                  placeholder="Misal: 135000"
                                  value={item.harga_deal_kg || ''}
                                  onChange={(e) => handleItemFieldChange(originalIndex, 'harga_deal_kg', Number(e.target.value))}
                                  className="w-full px-2 py-1 text-xs font-mono font-bold bg-white border border-amber-400 rounded-xs focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                                  Catatan Penyesuaian:
                                </label>
                                <input
                                  type="text"
                                  placeholder="Catatan permintaan pabrik..."
                                  value={item.catatan_nego || ''}
                                  onChange={(e) => handleItemFieldChange(originalIndex, 'catatan_nego', e.target.value)}
                                  className="w-full px-2 py-1 text-xs bg-white border border-amber-400 rounded-xs focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            </div>

                            {item.harga_deal_kg && item.harga_deal_kg > 0 && (
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleAcceptNegotiation(originalIndex, item.harga_deal_kg!)}
                                  className="px-3 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xs flex items-center space-x-1 cursor-pointer shadow-xs"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Sepakati & Jadikan Deal ({formatRupiah(item.harga_deal_kg)}/kg)</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {isReject && (
                          <div className="bg-red-50 border border-red-300 p-2.5 rounded-xs space-y-2 text-[11px] text-red-900">
                            <div className="font-bold flex items-center space-x-1 text-red-800">
                              <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              <span>Bal Ditolak - Dikembalikan ke Gudang</span>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-red-900 mb-0.5">
                                Alasan Penolakan Lab / Pabrik:
                              </label>
                              <input
                                type="text"
                                value={item.alasan_tolak || ''}
                                onChange={(e) => handleItemFieldChange(originalIndex, 'alasan_tolak', e.target.value)}
                                placeholder="Masukkan alasan penolakan..."
                                className="w-full px-2 py-1 text-xs bg-white border border-red-300 rounded-xs focus:ring-1 focus:ring-red-500 text-red-900"
                              />
                            </div>

                            <div className="flex flex-wrap gap-1">
                              <span className="text-[10px] text-gray-500 mr-1">Pilihan Cepat:</span>
                              {presetAlasanTolak.map((preset, pIdx) => (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => handleItemFieldChange(originalIndex, 'alasan_tolak', preset)}
                                  className="px-1.5 py-0.5 text-[9px] bg-white border border-red-200 text-red-800 hover:bg-red-100 rounded-xs cursor-pointer"
                                >
                                  {preset.split('-')[0].trim()}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {isPending && (
                          <div className="bg-rose-50/70 border border-rose-200 p-2.5 rounded-xs text-[11px] text-rose-900 flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-[#b81d24] shrink-0" />
                            <span>Sample bal ini sedang dalam antrean pengujian organoleptik dan uji kadar air lab pabrik.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Footer Form Meta: Petugas QC Pabrik & Catatan Umum Batch */}
            <div className="bg-white p-4 border border-gray-300 rounded-sm space-y-3 mt-4">
              <h4 className="text-xs font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                Catatan Hasil Sortir Batch & Petugas Evaluator
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Nama Petugas QC / Evaluator Pabrik:
                  </label>
                  <input
                    type="text"
                    value={petugasQCPabrik}
                    onChange={(e) => setPetugasQCPabrik(e.target.value)}
                    placeholder="Misal: Bpk. Ir. Hariyadi (QC Daun Djarum)"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Catatan Keseluruhan Batch:
                  </label>
                  <input
                    type="text"
                    value={catatanBatch}
                    onChange={(e) => setCatatanBatch(e.target.value)}
                    placeholder="Catatan hasil sortir atau rekomendasi pengiriman bal..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-gray-600">
              Hasil: <strong className="text-emerald-700">{countDisetujui} Bal ACC (Deal)</strong>, <strong className="text-amber-700">{countNego} Nego</strong>, <strong className="text-red-700">{countDitolak} Ditolak</strong>.
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm transition cursor-pointer"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#b81d24] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Evaluasi</span>
              </button>

              {countDisetujui > 0 && onNavigateToPengiriman && (
                <button
                  type="button"
                  onClick={() => {
                    handleConfirmSave();
                    onNavigateToPengiriman(batch);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Kirim Bal ACC ({countDisetujui} Bal) ➔</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Konfirmasi Simpan Evaluasi Sortir Sample"
        message={`Apakah Anda yakin ingin menyimpan hasil sortir untuk Batch ${batch.kode_batch}? Status bal yang di-ACC (${countDisetujui} bal) akan siap untuk dibuatkan Surat Jalan DO, dan bal yang ditolak (${countDitolak} bal) akan dikembalikan ke status stok gudang.`}
        confirmText="Ya, Simpan Evaluasi"
        cancelText="Periksa Lagi"
        onConfirm={handleConfirmSave}
        onClose={() => setIsConfirmOpen(false)}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <ConfirmModal
        isOpen={!!itemToReject}
        title="Konfirmasi Tolak & Kembalikan Bal"
        message={`Apakah Anda yakin ingin menolak bal #${itemToReject?.no_bal || ''} (${itemToReject?.kode_grade || ''})? Bal ini akan otomatis dihapus dari daftar batch dan statusnya direset kembali ke stok gudang sehingga kodenya dapat digunakan untuk pengiriman sample baru.`}
        confirmText="Ya, Tolak & Kembalikan ke Gudang"
        cancelText="Batal"
        onConfirm={confirmRejectItem}
        onClose={() => setItemToReject(null)}
      />
    </>
  );
};

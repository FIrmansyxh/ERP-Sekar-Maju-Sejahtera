import { SearchableSelect } from '../common/SearchableSelect';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Layers, 
  Scale, 
  User, 
  Calendar, 
  Warehouse, 
  Tag, 
  FileText, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { 
  TransaksiPembelian, 
  Petani, 
  TabelHarga, 
  Barang, 
  Gudang, 
  TransaksiItemBal, 
  User as UserType 
} from '../../types';
import { formatRupiah, generateBalId, generateNextUniqueNoBal } from '../../utils/formatters';
import { getGudangLocationOptions } from '../../data/initialGudangData';

interface TransaksiEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksi: TransaksiPembelian | null;
  petaniList: Petani[];
  hargaList: TabelHarga[];
  barangList?: Barang[];
  gudangList?: Gudang[];
  currentUser?: UserType | null;
  onSaveTransaksi: (newTx: TransaksiPembelian, generatedBarang: Barang | Barang[]) => void;
  onSuccessToast?: (msg: string) => void;
}

interface EditBalRow {
  item_id: string;
  barang_id?: string;
  no_bal: string;
  kode_grade: string;
  harga_per_kg: number;
  berat_bruto_kg?: number;
  potongan_tara_kg?: number;
  berat_kg: number;
  potongan: number;
  potongan_kuli?: number;
  potongan_tali?: number;
  potongan_tikar?: number;
  total_kotor: number;
  subtotal_bersih: number;
  catatan?: string;
}

export const TransaksiEditModal: React.FC<TransaksiEditModalProps> = ({
  isOpen,
  onClose,
  transaksi,
  petaniList = [],
  hargaList = [],
  barangList = [],
  gudangList = [],
  currentUser,
  onSaveTransaksi,
  onSuccessToast,
}) => {
  const gudangOptions = getGudangLocationOptions(gudangList);
  const activeGrades = useMemo(() => hargaList.filter(h => h.status === 'aktif'), [hargaList]);

  // Form Fields
  const [selectedPetaniId, setSelectedPetaniId] = useState('');
  const [tanggalTransaksi, setTanggalTransaksi] = useState('');
  const [lokasiGudang, setLokasiGudang] = useState('');
  const [statusPembayaran, setStatusPembayaran] = useState<'lunas' | 'belum_lunas'>('belum_lunas');
  const [catatan, setCatatan] = useState('');
  const [catatanKasir, setCatatanKasir] = useState('');
  const [balRows, setBalRows] = useState<EditBalRow[]>([]);
  const [alasanEdit, setAlasanEdit] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize form with original transaction data
  useEffect(() => {
    if (isOpen && transaksi) {
      setSelectedPetaniId(transaksi.petani_id);
      setTanggalTransaksi(
        transaksi.tanggal_transaksi ? transaksi.tanggal_transaksi.split(' ')[0] : new Date().toISOString().split('T')[0]
      );
      setLokasiGudang(transaksi.lokasi_gudang || gudangOptions[0] || 'Gudang Utama Pamekasan');
      setStatusPembayaran(transaksi.status_pembayaran === 'lunas' ? 'lunas' : 'belum_lunas');
      setCatatan(transaksi.catatan || '');
      setCatatanKasir(transaksi.catatan_kasir || '');
      setAlasanEdit('');
      setValidationError(null);

      // Parse item bal rows
      if (transaksi.items && transaksi.items.length > 0) {
        setBalRows(
          transaksi.items.map((it) => ({
            item_id: it.item_id,
            barang_id: it.barang_id,
            no_bal: it.no_bal,
            kode_grade: it.kode_grade,
            harga_per_kg: it.harga_per_kg || 0,
            berat_bruto_kg: it.berat_bruto_kg,
            potongan_tara_kg: it.potongan_tara_kg || 0,
            berat_kg: it.berat_kg,
            potongan: it.potongan || 0,
            potongan_kuli: it.potongan_kuli || 7000,
            potongan_tali: it.potongan_tali || 3000,
            potongan_tikar: it.potongan_tikar || 0,
            total_kotor: it.total_kotor || Math.round((it.berat_kg || 0) * (it.harga_per_kg || 0)),
            subtotal_bersih: it.subtotal_bersih || Math.max(0, Math.round((it.berat_kg || 0) * (it.harga_per_kg || 0)) - (it.potongan || 0)),
            catatan: it.catatan || '',
          }))
        );
      } else {
        // Fallback for single bal
        setBalRows([
          {
            item_id: `item-${Date.now()}-0`,
            barang_id: transaksi.barang_ids?.[0],
            no_bal: transaksi.no_bal || 'A001',
            kode_grade: transaksi.kode_grade,
            harga_per_kg: transaksi.harga_per_kg || 0,
            berat_kg: transaksi.berat_kg,
            potongan: transaksi.total_potongan || 0,
            total_kotor: transaksi.total_kotor || Math.round(transaksi.berat_kg * (transaksi.harga_per_kg || 0)),
            subtotal_bersih: transaksi.harga_final || transaksi.total_harga_beli || 0,
            catatan: transaksi.catatan || '',
          },
        ]);
      }
    }
  }, [isOpen, transaksi]);

  if (!isOpen || !transaksi) return null;

  const currentPetani = petaniList.find((p) => p.petani_id === selectedPetaniId) || {
    petani_id: transaksi.petani_id,
    nama_petani: transaksi.nama_petani,
        no_hp: transaksi.no_hp,
    desa_kecamatan: transaksi.desa_kecamatan,
  };

  // Helper to get grade price from active master list
  const getGradeTarif = (gradeCode: string): number => {
    const found = hargaList.find((h) => h.kode_grade.toUpperCase() === gradeCode.toUpperCase());
    return found ? found.harga_per_kg : 0;
  };

  // Handle grade change in row
  const handleGradeChange = (index: number, newGrade: string) => {
    const newTarif = getGradeTarif(newGrade);
    setBalRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const totalKotor = Math.round(row.berat_kg * newTarif);
        const subtotalBersih = Math.round(Math.max(0, totalKotor - row.potongan));
        return {
          ...row,
          kode_grade: newGrade,
          harga_per_kg: newTarif,
          total_kotor: totalKotor,
          subtotal_bersih: subtotalBersih,
        };
      })
    );
  };

  // Handle berat netto change in row
  const handleBeratChange = (index: number, newBerat: number) => {
    setBalRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const beratVal = Math.max(0, newBerat);
        const totalKotor = Math.round(beratVal * row.harga_per_kg);
        const subtotalBersih = Math.round(Math.max(0, totalKotor - row.potongan));
        return {
          ...row,
          berat_kg: beratVal,
          total_kotor: totalKotor,
          subtotal_bersih: subtotalBersih,
        };
      })
    );
  };

  // Handle potongan change in row
  const handlePotonganChange = (index: number, newPotongan: number) => {
    setBalRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const potVal = Math.max(0, newPotongan);
        const subtotalBersih = Math.round(Math.max(0, row.total_kotor - potVal));
        return {
          ...row,
          potongan: potVal,
          subtotal_bersih: subtotalBersih,
        };
      })
    );
  };

  // Add new bal row
  const handleAddBalRow = () => {
    const defaultGrade = activeGrades[0]?.kode_grade || '50';
    const defaultTarif = getGradeTarif(defaultGrade);
    const existingNoBals = balRows.map((b) => ({ noBal: b.no_bal }));
    const uniqueNoBal = generateNextUniqueNoBal(defaultGrade, barangList, existingNoBals);

    const newRow: EditBalRow = {
      item_id: `item-${Date.now()}-${balRows.length}`,
      no_bal: uniqueNoBal,
      kode_grade: defaultGrade,
      harga_per_kg: defaultTarif,
      berat_kg: 45.0,
      potongan: 10000,
      potongan_kuli: 7000,
      potongan_tali: 3000,
      potongan_tikar: 0,
      total_kotor: Math.round(45.0 * defaultTarif),
      subtotal_bersih: Math.max(0, Math.round(45.0 * defaultTarif) - 10000),
      catatan: '',
    };
    setBalRows([...balRows, newRow]);
  };

  // Remove bal row
  const handleRemoveBalRow = (index: number) => {
    if (balRows.length <= 1) {
      setValidationError('Transaksi harus memiliki minimal 1 bal.');
      return;
    }
    setBalRows(balRows.filter((_, i) => i !== index));
  };

  // Computed Totals for Updated Data
  const totalNettoBaru = Number(balRows.reduce((acc, r) => acc + (Number(r.berat_kg) || 0), 0).toFixed(1));
  const totalKotorBaru = balRows.reduce((acc, r) => acc + r.total_kotor, 0);
  const totalPotonganBaru = balRows.reduce((acc, r) => acc + r.potongan, 0);
  const totalHargaFinalBaru = balRows.reduce((acc, r) => acc + r.subtotal_bersih, 0);
  const primaryGradeBaru = balRows[0]?.kode_grade || transaksi.kode_grade;
  const noBalCombinedBaru = balRows.map((r) => r.no_bal).join(', ');

  // Compute Diffs (Sebelum vs Sesudah)
  const isPetaniChanged = selectedPetaniId !== transaksi.petani_id;
  const oldPetaniNama = transaksi.nama_petani;
  const newPetaniNama = currentPetani.nama_petani;

  const isTanggalChanged = tanggalTransaksi !== (transaksi.tanggal_transaksi ? transaksi.tanggal_transaksi.split(' ')[0] : '');
  const isStatusBayarChanged = statusPembayaran !== transaksi.status_pembayaran;
  const isBalCountChanged = balRows.length !== (transaksi.total_bal || transaksi.items?.length || 1);
  const isBeratChanged = Math.abs(totalNettoBaru - transaksi.berat_kg) > 0.05;
  const isHargaChanged = totalHargaFinalBaru !== (transaksi.harga_final || transaksi.total_harga_beli);
  const selisihHarga = totalHargaFinalBaru - (transaksi.harga_final || transaksi.total_harga_beli || 0);

  // Quick preset reason tags
  const reasonPresets = [
    'Koreksi salah input grade tembakau',
    'Koreksi berat timbangan netto',
    'Koreksi identitas petani penyetor',
    'Penyesuaian tarif / potongan bal',
    'Koreksi status pembayaran kasir',
  ];

  // Save changes & record audit log
  const handleSave = () => {
    if (balRows.length === 0) {
      setValidationError('Harap tambahkan minimal 1 bal.');
      return;
    }
    if (balRows.some((r) => !r.no_bal.trim())) {
      setValidationError('Semua nomor bal harus terisi valid.');
      return;
    }
    if (balRows.some((r) => !activeGrades.some((g) => g.kode_grade === r.kode_grade))) {
      setValidationError('Ada Grade yang tidak valid / tidak terdaftar di Master Harga Beli.');
      return;
    }
    if (!alasanEdit.trim()) {
      setValidationError('Harap isi alasan pengubahan data untuk catatan Audit Trail Admin.');
      return;
    }

    // Construct detailed changes narrative for admin audit trail
    const changesList: string[] = [];
    if (isPetaniChanged) {
      changesList.push(`Petani diubah dari "${oldPetaniNama}" menjadi "${newPetaniNama}"`);
    }
    if (isTanggalChanged) {
      changesList.push(`Tanggal diubah dari "${transaksi.tanggal_transaksi}" menjadi "${tanggalTransaksi}"`);
    }
    if (isStatusBayarChanged) {
      changesList.push(`Status pembayaran diubah dari "${transaksi.status_pembayaran}" ke "${statusPembayaran}"`);
    }
    if (isBalCountChanged) {
      changesList.push(`Jumlah bal diubah dari ${transaksi.total_bal || 1} bal ke ${balRows.length} bal`);
    }
    if (isBeratChanged) {
      changesList.push(`Total berat netto diubah dari ${transaksi.berat_kg} Kg menjadi ${totalNettoBaru} Kg`);
    }
    if (isHargaChanged) {
      const tanda = selisihHarga >= 0 ? `+${formatRupiah(selisihHarga)}` : `-${formatRupiah(Math.abs(selisihHarga))}`;
      changesList.push(`Total nilai akhir diubah dari ${formatRupiah(transaksi.harga_final || transaksi.total_harga_beli)} ke ${formatRupiah(totalHargaFinalBaru)} (${tanda})`);
    }
    if (changesList.length === 0) {
      changesList.push('Pembaruan data rincian bal / catatan transaksi');
    }

    // Prepare updated items
    const updatedItems: TransaksiItemBal[] = balRows.map((row, idx) => {
      const generatedBarangId = row.barang_id || (transaksi.barang_ids?.[idx]) || generateBalId(row.kode_grade, idx + 1);
      return {
        item_id: row.item_id,
        barang_id: generatedBarangId,
        no_bal: row.no_bal.trim(),
        kode_grade: row.kode_grade,
        harga_per_kg: row.harga_per_kg,
        berat_bruto_kg: row.berat_bruto_kg || row.berat_kg + (row.potongan_tara_kg || 0),
        potongan_tara_kg: row.potongan_tara_kg || 0,
        berat_kg: row.berat_kg,
        potongan_kuli: row.potongan_kuli || 7000,
        potongan_tali: row.potongan_tali || 3000,
        potongan_tikar: row.potongan_tikar || 0,
        potongan: row.potongan,
        total_kotor: row.total_kotor,
        subtotal_bersih: row.subtotal_bersih,
        status_timbang: row.berat_kg > 0 ? 'selesai' : 'menunggu_timbang',
        sample_label_code: row.no_bal.trim(),
        sample_label_printed: true,
        catatan: row.catatan || '',
      };
    });

    // Prepare updated Transaksi
    const updatedTx: TransaksiPembelian = {
      ...transaksi,
      petani_id: currentPetani.petani_id,
      nama_petani: currentPetani.nama_petani,
            no_hp: currentPetani.no_hp,
      desa_kecamatan: (currentPetani.alamat || currentPetani.desa_kecamatan || '') as string,
      no_bal: noBalCombinedBaru,
      kode_grade: primaryGradeBaru,
      total_bal: balRows.length,
      bal_selesai_timbang: balRows.filter((b) => b.berat_kg > 0).length,
      berat_kg: totalNettoBaru,
      berat_terukur_kg: totalNettoBaru,
      harga_per_kg: balRows[0]?.harga_per_kg || transaksi.harga_per_kg,
      total_kotor: totalKotorBaru,
      total_potongan: totalPotonganBaru,
      total_harga_beli: totalKotorBaru,
      harga_final: totalHargaFinalBaru,
      status_pembayaran: statusPembayaran,
      metode_pembayaran: statusPembayaran === 'lunas' ? (transaksi.metode_pembayaran || 'cash') : undefined,
      tanggal_transaksi: tanggalTransaksi,
      lokasi_gudang: lokasiGudang,
      catatan: catatan.trim(),
      catatan_kasir: catatanKasir.trim(),
      items: updatedItems,
      barang_ids: updatedItems.map((it) => it.barang_id as string),
      terakhir_diubah_oleh: `${currentUser?.nama_lengkap || 'Admin'} (@${currentUser?.username || 'admin'})`,
      terakhir_diubah_pada: new Date().toISOString(),
      alasan_perubahan_terakhir: alasanEdit.trim(),
    };

    // Prepare updated Barang entities for warehouse inventory sync
    const updatedBarangs: Barang[] = updatedItems.map((it) => ({
      barang_id: it.barang_id as string,
      no_bal: it.no_bal,
      kode_grade: it.kode_grade,
      berat_kg: it.berat_kg,
      harga_per_kg: it.harga_per_kg,
      total_harga: it.berat_kg * it.harga_per_kg,
      status_stok: 'di_gudang',
      petani_id: transaksi.petani_id,
      nama_petani: transaksi.nama_petani,
      transaksi_pembelian_id: updatedTx.transaksi_id,
      tanggal_masuk: tanggalTransaksi,
      lokasi_gudang: lokasiGudang,
      tanggal_keluar: undefined,
    }));

    // Data Before vs After for Audit Comparison
    const dataSebelum = JSON.stringify({
      petani: transaksi.nama_petani,
      petani_id: transaksi.petani_id,
      total_bal: transaksi.total_bal || (transaksi.items ? transaksi.items.length : 1),
      berat_kg: transaksi.berat_kg,
      total_nilai: transaksi.harga_final || transaksi.total_harga_beli,
      status_pembayaran: transaksi.status_pembayaran,
      items: (transaksi.items || []).map((i) => ({ no_bal: i.no_bal, grade: i.kode_grade, berat_kg: i.berat_kg, subtotal: i.subtotal_bersih })),
    });

    const dataSesudah = JSON.stringify({
      petani: updatedTx.nama_petani,
      petani_id: updatedTx.petani_id,
      total_bal: updatedTx.total_bal,
      berat_kg: updatedTx.berat_kg,
      total_nilai: updatedTx.harga_final,
      status_pembayaran: updatedTx.status_pembayaran,
      items: updatedItems.map((i) => ({ no_bal: i.no_bal, grade: i.kode_grade, berat_kg: i.berat_kg, subtotal: i.subtotal_bersih })),
    });

    // Record Detailed Audit Log
    

    // Save transaction state
    onSaveTransaksi(updatedTx, updatedBarangs);
    if (onSuccessToast) {
      onSuccessToast(`Transaksi ${updatedTx.no_kupon} berhasil diperbarui & dicatat ke Audit Trail!`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-sm shadow-2xl max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-sm bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-800">
                  Edit & Koreksi Data Transaksi Pembelian
                </h2>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-mono text-xs font-bold rounded-xs">
                  {transaksi.no_kupon}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ({transaksi.transaksi_id})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Petugas pengubah: <strong className="text-slate-700">{currentUser?.nama_lengkap || 'Admin'}</strong> ({currentUser?.role || 'admin'})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xs transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Trail Notification Banner */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Perhatian Audit Trail:</strong> Setiap pengubahan data transaksi (petani, bal, grade, berat, harga, status) akan dicatat lengkap dalam Log Aktivitas Admin untuk pengawasan riwayat antar user.
            </span>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto grow">

          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xs text-rose-800 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Section 1: Header Form (Petani, Tanggal, Gudang, Status Bayar) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xs">
            {/* Petani */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Petani Penyetor</span>
              </label>
              <SearchableSelect
                value={selectedPetaniId}
                onChange={(val) => setSelectedPetaniId(val)}
                options={petaniList.map(p => ({ value: p.petani_id, label: `${p.nama_petani} - ${p.petani_id} (${p.desa_kecamatan || p.alamat || 'Pamekasan'})` }))}
                placeholder="Pilih Petani..."
              />
              {isPetaniChanged && (
                <p className="text-[11px] text-amber-700 font-medium">
                  Semula: <span className="line-through">{oldPetaniNama}</span> → Baru: <strong>{newPetaniNama}</strong>
                </p>
              )}
            </div>

            {/* Tanggal */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Tanggal Transaksi</span>
              </label>
              <input
                type="date"
                value={tanggalTransaksi}
                onChange={(e) => setTanggalTransaksi(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-xs focus:ring-1 focus:ring-[#b81d24] focus:outline-none"
              />
            </div>

            {/* Status Pembayaran */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Status Pembayaran</span>
              </label>
              <select
                value={statusPembayaran}
                onChange={(e) => setStatusPembayaran(e.target.value as 'lunas' | 'belum_lunas')}
                className={`w-full text-xs px-2.5 py-1.5 border rounded-xs font-medium focus:ring-1 focus:outline-none ${
                  statusPembayaran === 'lunas'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                <option value="belum_lunas">Belum Lunas (Kredit/Kasir)</option>
                <option value="lunas">Lunas (Sudah Dibayarkan)</option>
              </select>
            </div>

            {/* Lokasi Gudang */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                <Warehouse className="w-3.5 h-3.5 text-slate-500" />
                <span>Lokasi Gudang Simpan</span>
              </label>
              <SearchableSelect
                value={lokasiGudang}
                onChange={(val) => setLokasiGudang(val)}
                options={gudangOptions.map(opt => ({ value: opt, label: opt }))}
                placeholder="Lokasi Gudang..."
              />
            </div>

            {/* Catatan / Keterangan Transaksi */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Catatan Transaksi / Kasir</span>
              </label>
              <input
                type="text"
                placeholder="Catatan tambahan (opsional)"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-xs focus:ring-1 focus:ring-[#b81d24] focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Bal Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-slate-600" />
                  <span>Daftar Bal Tembakau ({balRows.length} Bal)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ubah grade mutu, berat timbang netto, atau tarif potongan per bal.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddBalRow}
                className="px-2.5 py-1 bg-[#b81d24] hover:bg-[#b81d24] text-white text-xs font-semibold rounded-xs transition flex items-center space-x-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Bal</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#f8f9fa] border-b border-gray-200 text-gray-700 font-bold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-gray-200 text-center w-10">No</th>
                    <th className="py-2.5 px-3 border-r border-gray-200 w-28">No. Bal</th>
                    <th className="py-2.5 px-3 border-r border-gray-200 w-36">Grade Mutu</th>
                    <th className="py-2.5 px-3 border-r border-gray-200 text-right w-28">Tarif/Kg</th>
                    <th className="py-2.5 px-3 border-r border-gray-200 text-right w-28">Netto (Kg)</th>
                    <th className="py-2.5 px-3 border-r border-gray-200 text-right w-28">Potongan (Rp)</th>
                    <th className="py-2.5 px-3 border-r border-gray-200 text-right w-32">Subtotal Bersih</th>
                    <th className="py-2.5 px-3 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {balRows.map((row, idx) => (
                    <tr key={row.item_id || idx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* No Bal */}
                      <td className="py-2 px-2.5">
                        <input
                          type="text"
                          value={row.no_bal}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setBalRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, no_bal: val } : r))
                            );
                          }}
                          className="w-full font-mono font-bold text-xs px-2 py-1 border border-slate-300 rounded-xs uppercase focus:ring-1 focus:ring-[#b81d24] focus:outline-none"
                        />
                      </td>

                      {/* Grade */}
                      <td className="py-2 px-2.5">
                        <SearchableSelect allowCustom={true} value={row.kode_grade}
                          onChange={(val) => handleGradeChange(idx, val)}
                          options={activeGrades.map(g => ({ value: g.kode_grade, label: `Grade ${g.kode_grade} (${formatRupiah(g.harga_per_kg)})` }))}
                          placeholder="Grade..."
                        />
                      </td>

                      {/* Tarif/Kg */}
                      <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                        {formatRupiah(row.harga_per_kg)}
                      </td>

                      {/* Netto Kg */}
                      <td className="py-2 px-2.5 text-right">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={row.berat_kg}
                          onChange={(e) => handleBeratChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-20 text-right font-mono font-bold text-xs px-2 py-1 border border-slate-300 rounded-xs focus:ring-1 focus:ring-[#b81d24] focus:outline-none ml-auto"
                        />
                      </td>

                      {/* Potongan */}
                      <td className="py-2 px-2.5 text-right">
                        <input
                          type="text"
                          value={formatRupiah(row.potongan)}
                          disabled
                          className="w-24 text-right font-mono text-xs px-2 py-1 border border-slate-300 rounded-xs bg-slate-100 text-slate-500 cursor-not-allowed ml-auto"
                          title="Potongan bersifat default (SOP Perusahaan) dan tidak bisa diedit secara manual"
                        />
                      </td>

                      {/* Subtotal */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(row.subtotal_bersih)}
                      </td>

                      {/* Action */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveBalRow(idx)}
                          disabled={balRows.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Hapus Bal dari transaksi ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Table Footer Totals */}
                <tfoot className="bg-slate-100 font-bold border-t border-slate-300 text-slate-800">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-3 text-right">
                      TOTAL AKHIR:
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-900">
                      {totalNettoBaru} Kg
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-700">
                      {formatRupiah(totalPotonganBaru)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-emerald-800 text-sm">
                      {formatRupiah(totalHargaFinalBaru)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 3: Live Comparison & Audit Diff Preview */}
          <div className="p-4 bg-slate-100 border border-slate-300 rounded-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Scale className="w-4 h-4 text-slate-600" />
              <span>Pratinjau Perubahan Data (Audit Trail Diff)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Diff Petani */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Penyetor</span>
                <div className="mt-1 font-medium">
                  {isPetaniChanged ? (
                    <div className="space-y-0.5">
                      <span className="text-rose-700 line-through text-[11px] block">{oldPetaniNama}</span>
                      <span className="text-emerald-700 font-bold block">→ {newPetaniNama}</span>
                    </div>
                  ) : (
                    <span className="text-slate-700">{oldPetaniNama} (Tetap)</span>
                  )}
                </div>
              </div>

              {/* Diff Berat */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Netto</span>
                <div className="mt-1 font-medium">
                  {isBeratChanged ? (
                    <div className="space-y-0.5">
                      <span className="text-rose-700 line-through text-[11px] block">{transaksi.berat_kg} Kg</span>
                      <span className="text-emerald-700 font-bold block">→ {totalNettoBaru} Kg (Selisih: {(totalNettoBaru - transaksi.berat_kg).toFixed(1)} Kg)</span>
                    </div>
                  ) : (
                    <span className="text-slate-700">{transaksi.berat_kg} Kg (Tetap)</span>
                  )}
                </div>
              </div>

              {/* Diff Total Bayar */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Nilai Pembelian</span>
                <div className="mt-1 font-medium">
                  {isHargaChanged ? (
                    <div className="space-y-0.5">
                      <span className="text-rose-700 line-through text-[11px] block">{formatRupiah(transaksi.harga_final || transaksi.total_harga_beli)}</span>
                      <span className="text-emerald-700 font-bold block">
                        → {formatRupiah(totalHargaFinalBaru)}
                        <span className="text-[11px] ml-1 font-normal">
                          ({selisihHarga >= 0 ? `+${formatRupiah(selisihHarga)}` : `-${formatRupiah(Math.abs(selisihHarga))}`})
                        </span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-700">{formatRupiah(totalHargaFinalBaru)} (Tetap)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Mandatory Reason for Audit Accountability */}
          <div className="space-y-2 p-4 bg-amber-50/70 border border-amber-200 rounded-xs">
            <label className="text-xs font-bold text-amber-950 flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>Alasan Pengubahan Data (Wajib Diisi untuk Audit Trail)</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Koreksi grade dari B ke A atas instruksi QC, atau perbaikan berat timbangan"
              value={alasanEdit}
              onChange={(e) => {
                setAlasanEdit(e.target.value);
                setValidationError(null);
              }}
              className="w-full text-xs px-3 py-2 bg-white border border-amber-300 rounded-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />

            {/* Quick preset chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 font-semibold">Pilih Cepat:</span>
              {reasonPresets.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAlasanEdit(r)}
                  className="px-2 py-0.5 bg-white hover:bg-amber-100 border border-amber-200 text-[10px] text-amber-900 rounded-xs transition cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xs transition cursor-pointer"
          >
            Batal
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-xs transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4 text-white" />
              <span>Simpan Perubahan & Rekam Audit Log</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

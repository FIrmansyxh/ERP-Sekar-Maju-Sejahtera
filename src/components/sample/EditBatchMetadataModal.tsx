import React, { useState, useEffect } from 'react';
import { X, Save, Building2, Calendar, User, Truck } from 'lucide-react';
import { BatchPengirimanSample } from '../../types';

interface EditBatchMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: BatchPengirimanSample | null;
  onSave: (updatedBatch: BatchPengirimanSample) => void;
}

export const EditBatchMetadataModal: React.FC<EditBatchMetadataModalProps> = ({
  isOpen,
  onClose,
  batch,
  onSave,
}) => {
  const [tujuanBuyer, setTujuanBuyer] = useState('');
  const [permintaanBuyer, setPermintaanBuyer] = useState('');
  const [sumberGudang, setSumberGudang] = useState('');
  const [tanggalKirim, setTanggalKirim] = useState('');
  const [dikirimOleh, setDikirimOleh] = useState('');

  useEffect(() => {
    if (batch) {
      setTujuanBuyer(batch.tujuan_buyer || '');
      setPermintaanBuyer(batch.permintaan_buyer || '');
      setSumberGudang(batch.sumber_gudang || '');
      setTanggalKirim(batch.tanggal_kirim || '');
      setDikirimOleh(batch.dikirim_oleh || '');
    }
  }, [batch]);

  if (!isOpen || !batch) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...batch,
      tujuan_buyer: tujuanBuyer,
      permintaan_buyer: permintaanBuyer,
      sumber_gudang: sumberGudang,
      tanggal_kirim: tanggalKirim,
      dikirim_oleh: dikirimOleh,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-sm shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-sm font-bold text-gray-900 flex items-center">
            <Truck className="w-4 h-4 mr-2 text-[#b81d24]" />
            Edit Info Batch Sample
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-4 overflow-y-auto space-y-3 text-xs">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Tujuan Buyer / Pabrik</label>
            <input 
              type="text" 
              required
              value={tujuanBuyer} 
              onChange={e => setTujuanBuyer(e.target.value)} 
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs focus:ring-1 focus:ring-[#b81d24] focus:border-[#b81d24]" 
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Permintaan / Catatan Buyer</label>
            <input 
              type="text" 
              value={permintaanBuyer} 
              onChange={e => setPermintaanBuyer(e.target.value)} 
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs focus:ring-1 focus:ring-[#b81d24] focus:border-[#b81d24]" 
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Sumber Gudang</label>
            <input 
              type="text" 
              required
              value={sumberGudang} 
              onChange={e => setSumberGudang(e.target.value)} 
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs focus:ring-1 focus:ring-[#b81d24] focus:border-[#b81d24]" 
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Tanggal Kirim</label>
            <input 
              type="date" 
              required
              value={tanggalKirim} 
              onChange={e => setTanggalKirim(e.target.value)} 
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs focus:ring-1 focus:ring-[#b81d24] focus:border-[#b81d24]" 
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Petugas QC / Pengirim</label>
            <input 
              type="text" 
              required
              value={dikirimOleh} 
              onChange={e => setDikirimOleh(e.target.value)} 
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs focus:ring-1 focus:ring-[#b81d24] focus:border-[#b81d24]" 
            />
          </div>
          <div className="pt-4 border-t border-gray-200 flex justify-end space-x-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-1.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xs font-semibold"
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="px-4 py-1.5 text-white bg-[#b81d24] hover:bg-[#b81d24] rounded-xs font-bold shadow-xs"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

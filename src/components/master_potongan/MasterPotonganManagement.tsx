import React, { useState, useEffect, useMemo } from 'react';
import { MasterPotongan } from '../../types';
import { Plus, Edit3, Trash2, Search, Activity, Tag, Scale } from 'lucide-react';
import { apiRequest } from '../../services/apiClient';
import { tampilkanInfo, mintaKonfirmasi } from '../../utils/dialog';

export const MasterPotonganManagement: React.FC = () => {
  const [items, setItems] = useState<MasterPotongan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterPotongan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<MasterPotongan>>({
    kode_awalan_bal: 'HF',
    batas_bawah_kg: 0,
    batas_atas_kg: null,
    potongan_kg: 3,
    status: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest('/master/potongan');
      if (res.status === 'success' && res.data) {
        setItems(res.data);
      }
    } catch (error: any) {
      tampilkanInfo(error?.message || 'Gagal memuat data master potongan.', { judul: 'Gagal Memuat', varian: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) => item.kode_awalan_bal.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.kode_awalan_bal.localeCompare(b.kode_awalan_bal) || a.batas_bawah_kg - b.batas_bawah_kg);
  }, [items, searchQuery]);

  const handleOpenModal = (item?: MasterPotongan) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        kode_awalan_bal: 'HF',
        batas_bawah_kg: 0,
        batas_atas_kg: null,
        potongan_kg: 3,
        status: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.kode_awalan_bal || formData.batas_bawah_kg === undefined || formData.potongan_kg === undefined) {
      tampilkanInfo('Harap isi semua kolom wajib (Kode, Batas Bawah, Potongan).', { judul: 'Data Tidak Lengkap', varian: 'warning' });
      return;
    }

    try {
      if (editingItem && editingItem.id) {
        await apiRequest(`/master/potongan/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        tampilkanInfo('Data potongan berhasil diperbarui.', { judul: 'Berhasil', varian: 'success' });
      } else {
        await apiRequest('/master/potongan', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        tampilkanInfo('Data potongan berhasil ditambahkan.', { judul: 'Berhasil', varian: 'success' });
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      tampilkanInfo(error?.message || 'Terjadi kesalahan saat menyimpan data.', { judul: 'Gagal', varian: 'danger' });
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirm = await mintaKonfirmasi('Anda yakin ingin menghapus data aturan potongan ini?', { judul: 'Hapus Data', varian: 'danger' });
    if (confirm) {
      try {
        await apiRequest(`/master/potongan/${id}`, { method: 'DELETE' });
        tampilkanInfo('Data berhasil dihapus.', { judul: 'Berhasil', varian: 'success' });
        loadData();
      } catch (error: any) {
        tampilkanInfo(error?.message || 'Terjadi kesalahan saat menghapus data.', { judul: 'Gagal', varian: 'danger' });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari Kode Awalan Bal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Tambah Aturan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="px-4 py-3"><div className="flex items-center gap-2"><Tag className="w-4 h-4" /> Kode Bal</div></th>
                <th className="px-4 py-3"><div className="flex items-center gap-2"><Scale className="w-4 h-4" /> Rentang Berat (Kg)</div></th>
                <th className="px-4 py-3">Potongan (Kg)</th>
                <th className="px-4 py-3"><div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Status</div></th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data aturan potongan.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.kode_awalan_bal}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.batas_bawah_kg} {item.batas_atas_kg !== null ? `- ${item.batas_atas_kg}` : 'ke atas'}
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-600">{item.potongan_kg} Kg</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.status ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleOpenModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-800">{editingItem ? 'Edit' : 'Tambah'} Aturan Potongan</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode Awalan Bal (Misal: HF, SB, TS)</label>
                <input
                  type="text"
                  value={formData.kode_awalan_bal}
                  onChange={(e) => setFormData({ ...formData, kode_awalan_bal: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batas Bawah (Kg)</label>
                  <input
                    type="number"
                    value={formData.batas_bawah_kg}
                    onChange={(e) => setFormData({ ...formData, batas_bawah_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batas Atas (Kg)</label>
                  <input
                    type="number"
                    value={formData.batas_atas_kg === null ? '' : formData.batas_atas_kg}
                    onChange={(e) => setFormData({ ...formData, batas_atas_kg: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Kosong = tak terbatas"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Potongan Tara (Kg)</label>
                <input
                  type="number"
                  value={formData.potongan_kg}
                  onChange={(e) => setFormData({ ...formData, potongan_kg: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="status"
                  checked={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="status" className="text-sm font-medium text-gray-700">Aktif</label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

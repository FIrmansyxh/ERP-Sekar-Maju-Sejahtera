#!/bin/bash

# Update HargaJualManagement.tsx
sed -i 's/import {/import {\n  ChevronDown,\n  ChevronUp,/g' src/components/harga_jual/HargaJualManagement.tsx

# Find where to insert isFilterOpen state
sed -i '/const \[searchTerm, setSearchTerm\] = useState('"'"''"'"');/a \  const [isFilterOpen, setIsFilterOpen] = useState(true);' src/components/harga_jual/HargaJualManagement.tsx

# Replace the block
cat << 'REPLACE_HARGAJUAL' > /tmp/hargajual_replacement.txt
    <div className="space-y-4 font-sans text-gray-800">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-100 border border-emerald-400 text-emerald-800 px-4 py-3 rounded-xs shadow-lg flex items-center space-x-2 animate-in slide-in-from-right-4 fade-in">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-semibold text-sm">{successToast}</span>
        </div>
      )}

      {/* 1. Filter Section */}
      <div className="bg-white border border-gray-200 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold text-gray-800 bg-white hover:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <span className="text-[#b81d24] font-black">▼</span>
            <span className="font-bold tracking-wide uppercase text-xs">Filter Harga Jual</span>
          </div>
          {isFilterOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {isFilterOpen && (
          <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                }}
                className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-sm transition cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Table Card */}
      <div className="bg-white border border-gray-200 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {/* Header Actions */}
        <div className="p-3 sm:px-4 sm:py-2.5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">
              Master Data Harga Jual
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-red-50 text-[#b81d24] border border-red-200 rounded-sm">
              {filteredList.length} Kode
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenAddModal}
              className="px-3 py-1.5 bg-[#b81d24] text-white hover:bg-[#991b1b] text-xs font-bold rounded-sm flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Tambah Master</span>
            </button>
          </div>
        </div>

        {/* Table Toolbar / Controls */}
        <div className="p-2 sm:px-4 sm:py-2 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-end gap-2 text-xs border-b border-gray-200">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-gray-600 font-medium">Pencarian:</span>
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Cari kode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-sm px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-[#b81d24]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto border-t border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-gray-200 text-[11px] font-bold text-gray-700">
                <th className="py-2.5 px-3 border-r border-gray-200 w-12 text-center">No</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-32">Kode</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-40">Harga Jual</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-32">Tanggal Berlaku</th>
                <th className="py-2.5 px-3 border-r border-gray-200 min-w-[200px]">Keterangan</th>
                <th className="py-2.5 px-3 border-r border-gray-200 w-24 text-center">Status</th>
                <th className="py-2.5 px-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 bg-white">
                    <div className="text-sm font-bold text-gray-700">Tidak ada data Master Harga Jual</div>
                    <div className="mt-1">
                      {searchTerm ? 'Coba ubah kata kunci pencarian Anda' : 'Klik tombol Tambah Master untuk membuat data baru'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => (
                  <tr key={item.harga_jual_id} className="hover:bg-[#f8f9fa] transition-colors border-b border-gray-100 last:border-0">
                    <td className="py-2.5 px-3 border-r border-gray-200 text-center text-gray-500">{index + 1}</td>
                    <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-[#b81d24]">
                      {item.kode}
                    </td>
                    <td className="py-2.5 px-3 border-r border-gray-200 font-mono font-bold text-emerald-700">
                      {formatRupiah(item.harga_jual)}/kg
                    </td>
                    <td className="py-2.5 px-3 border-r border-gray-200">
                      <div className="flex items-center space-x-1.5 text-gray-600">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.tanggal_berlaku ? new Date(item.tanggal_berlaku).toLocaleDateString('id-ID') : '-'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 border-r border-gray-200">
                      <div className="text-gray-700 leading-relaxed line-clamp-2">
                        {item.keterangan || '-'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                      {item.status_aktif !== false ? (
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-sm text-[10px] font-bold flex items-center justify-center space-x-1 w-max mx-auto">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-sm text-[10px] font-bold flex items-center justify-center space-x-1 w-max mx-auto">
                          <XCircle className="w-3 h-3" />
                          <span>Nonaktif</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xs transition cursor-pointer"
                          title="Edit Master Harga Jual"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xs transition cursor-pointer"
                          title="Hapus Master Harga Jual"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
REPLACE_HARGAJUAL

# Use perl to replace the block
perl -0777 -pi -e 's/<div className="space-y-5 animate-in fade-in duration-150">.*?<\/div>\s*\{\/\* Modal Add \/ Edit Form \*\//`cat \/tmp\/hargajual_replacement.txt`\n      {\/\* Modal Add \/ Edit Form \*\//s' src/components/harga_jual/HargaJualManagement.tsx


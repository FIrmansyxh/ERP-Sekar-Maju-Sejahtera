import React, { useState } from 'react';
import {  
  X, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  HelpCircle,
  Copy,
  ArrowLeft
, AlertTriangle } from 'lucide-react';
import { Petani } from '../../types';
import { downloadExcelReport, todayStamp } from '../../utils/excelExport';

// Judul kolom dari file Excel ekspor dipetakan ke nama kolom impor
const HEADER_ALIAS: Record<string, string> = {
  'id petani': 'petani_id',
  'nama petani': 'nama_petani',
  'nama': 'nama_petani',
  'no hp': 'no_hp',
  'desa / kecamatan': 'desa_kecamatan',
  'desa': 'desa_kecamatan',
  'tanggal daftar': 'tanggal_daftar',
};

interface PetaniImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  petaniList: Petani[];
  onImportSuccess: (imported: Petani[]) => void;
}

export const PetaniImportExportModal: React.FC<PetaniImportExportModalProps> = ({
  isOpen,
  onClose,
  petaniList,
  onImportSuccess,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [csvText, setCsvText] = useState<string>('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  if (!isOpen) return null;

  const handleExportExcel = () => {
    downloadExcelReport(`Master_Petani_Tembakau_${todayStamp()}`, [
      {
        name: 'Master Petani',
        title: 'Master Data Petani Tembakau',
        info: [`${petaniList.length} petani terdaftar`],
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'ID Petani', align: 'center' },
          { header: 'Nama Petani' },
          { header: 'No HP', align: 'center' },
          { header: 'Alamat' },
          { header: 'Desa / Kecamatan' },
          { header: 'Status', align: 'center' },
          { header: 'Tanggal Daftar', type: 'date' },
          { header: 'Catatan' },
        ],
        rows: petaniList.map((p, idx) => [
          idx + 1,
          p.petani_id,
          p.nama_petani || '-',
          p.no_hp || '-',
          p.alamat || '-',
          p.desa_kecamatan || '-',
          p.status_aktif ? 'Aktif' : 'Nonaktif',
          p.tanggal_daftar,
          p.catatan || '-',
        ]),
      },
    ]);
  };

  const handleProcessImport = () => {
    setImportErrors([]);
    setSuccessCount(null);

    if (!csvText.trim()) {
      setImportErrors(['Data yang ditempel tidak boleh kosong.']);
      return;
    }

    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // Salinan dari Excel dipisah tab, teks CSV dipisah koma
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map((h) => {
      const key = h.replace(/^"|"$/g, '').trim().toLowerCase();
      return HEADER_ALIAS[key] || key;
    });
    const nameIdx = headers.indexOf('nama_petani');
    const desaIdx = headers.indexOf('desa_kecamatan');
    const hpIdx = headers.indexOf('no_hp');
    const alamatIdx = headers.indexOf('alamat');

    // Tanpa judul kolom "Nama Petani": setiap baris dianggap satu nama petani
    const hanyaNama = nameIdx === -1;

    // Nilai "-" dari file ekspor dianggap kosong
    const cell = (cols: string[], idx: number) => {
      const val = idx !== -1 ? (cols[idx] || '').trim() : '';
      return val === '-' ? '' : val;
    };

    const importedPetani: Petani[] = [];
    const errors: string[] = [];

    // ID Petani selalu diterbitkan sistem sesuai urutan baris
    for (let i = hanyaNama ? 0 : 1; i < lines.length; i++) {
      const line = lines[i];
      let nama: string;
      let cols: string[] = [];

      if (hanyaNama) {
        // Buang penanda daftar seperti "* ", "- ", "1. " di awal baris
        nama = line.replace(/^"|"$/g, '').replace(/^([*•-]|[0-9]+[.)])\s+/, '').trim();
      } else {
        cols = line.split(delimiter).map((c) => c.replace(/^"|"$/g, '').trim());
        nama = cell(cols, nameIdx);
      }

      if (!nama) {
        errors.push(`Baris ${i + 1}: nama petani kosong, dilewati.`);
        continue;
      }

      importedPetani.push({
        petani_id: '',
        nama_petani: nama,
        no_hp: hanyaNama ? '' : cell(cols, hpIdx),
        alamat: hanyaNama ? '' : cell(cols, alamatIdx),
        desa_kecamatan: (hanyaNama ? '' : cell(cols, desaIdx)) || undefined,
        status_aktif: true,
        tanggal_daftar: new Date().toISOString().split('T')[0],
      });
    }

    if (errors.length > 0) {
      setImportErrors(errors);
    }

    if (importedPetani.length > 0) {
      onImportSuccess(importedPetani);
      setSuccessCount(importedPetani.length);
      setCsvText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-gray-300 w-full max-w-xl rounded-none shadow-xl flex flex-col text-xs text-gray-800">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-[#b81d24]" />
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">
              Import & Export Master Data Petani
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#545b62] hover:bg-[#464c52] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-gray-200 bg-[#f8f9fa] px-4 pt-2">
          <button
            onClick={() => setTab('export')}
            className={`px-4 py-2 text-xs font-bold transition cursor-pointer border-b-2 -mb-px ${
              tab === 'export'
                ? 'border-[#b81d24] text-[#b81d24] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Export Excel
          </button>
          <button
            onClick={() => setTab('import')}
            className={`px-4 py-2 text-xs font-bold transition cursor-pointer border-b-2 -mb-px ${
              tab === 'import'
                ? 'border-[#b81d24] text-[#b81d24] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Import Data
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {tab === 'export' ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Unduh seluruh data registrasi master petani ({petaniList.length} petani aktif/terdaftar) ke dalam file Excel (.xlsx) yang sudah rapi dan siap cetak.
              </p>

              <div className="bg-[#f8f9fa] p-3 border border-gray-200 space-y-2">
                <span className="font-bold text-gray-800 block text-xs">Kolom yang disertakan:</span>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  No, ID Petani, Nama Petani, No HP, Alamat, Desa / Kecamatan, Status, Tanggal Daftar, Catatan
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowExportConfirm(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File Excel Master Petani</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <p className="text-xs text-gray-600 leading-relaxed">
                Pilih file CSV atau tempel daftar nama petani, satu nama per baris. Bisa juga salinan dari Excel dengan baris judul kolom (minimal kolom Nama Petani; No HP, Alamat, dan Desa / Kecamatan boleh kosong). ID Petani diterbitkan sistem berurutan sesuai urutan baris: baris pertama mendapat ID paling awal.
              </p>

              <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm cursor-pointer shadow-xs">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#b81d24]" />
                <span>Pilih File CSV / TXT</span>
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    // Isi file ditampilkan dulu di kotak teks agar bisa diperiksa sebelum diproses
                    file.text().then((isi) => {
                      setCsvText(isi.replace(/^\uFEFF/, ''));
                      setImportErrors([]);
                      setSuccessCount(null);
                    });
                  }}
                />
              </label>

              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Satu nama petani per baris"
                className="w-full font-mono text-xs p-2.5 border border-[#ced4da] rounded-sm focus:border-[#b81d24] focus:outline-none bg-white text-gray-900"
              />

              {successCount !== null && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>Berhasil mengimpor {successCount} petani baru ke master data!</span>
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="p-2.5 bg-red-50 border border-red-300 text-red-800 text-xs space-y-1">
                  <span className="font-bold block">Terdapat kesalahan data:</span>
                  {importErrors.map((err, idx) => (
                    <p key={idx} className="text-[11px]">• {err}</p>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleProcessImport}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Proses Import Data</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Konfirmasi Ekspor */}
        {showExportConfirm && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-gray-300 w-full max-w-sm rounded-none shadow-xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center space-x-2 bg-yellow-50">
                <AlertTriangle className="w-4 h-4 text-yellow-700" />
                <h2 className="text-sm font-bold text-yellow-900 tracking-tight">Konfirmasi Ekspor Data</h2>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-gray-700 leading-relaxed">
                  Apakah Anda yakin ingin mengekspor seluruh data master petani?
                </p>
                <p className="text-[11px] font-medium text-yellow-800 bg-yellow-100/50 p-2 border border-yellow-200">
                  Data yang diekspor berisi informasi yang mungkin bersifat sensitif (Nomor HP, Alamat, dll). Pastikan Anda menjaga kerahasiaan file unduhan.
                </p>
              </div>
              <div className="bg-[#f8f9fa] px-4 py-3 border-t border-gray-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExportConfirm(false)}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-sm text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExportExcel();
                    setShowExportConfirm(false);
                  }}
                  className="px-3 py-1.5 bg-[#b81d24] hover:bg-[#a0181e] text-white rounded-sm text-xs font-bold transition cursor-pointer shadow-xs flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ya, Ekspor Data</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

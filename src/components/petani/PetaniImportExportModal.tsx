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
import { generatePetaniId } from '../../utils/formatters';
import { downloadExcelReport, todayStamp } from '../../utils/excelExport';

// Judul kolom dari file Excel ekspor dipetakan ke nama kolom impor
const HEADER_ALIAS: Record<string, string> = {
  'id petani': 'petani_id',
  'nama petani': 'nama_petani',
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

    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) {
      setImportErrors(['Data membutuhkan baris judul kolom dan minimal 1 baris data.']);
      return;
    }

    // Salinan dari Excel dipisah tab, teks CSV dipisah koma
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map((h) => {
      const key = h.replace(/^"|"$/g, '').trim().toLowerCase();
      return HEADER_ALIAS[key] || key;
    });
    const cardIdx = headers.indexOf('petani_id');
    const nameIdx = headers.indexOf('nama_petani');
    const desaIdx = headers.indexOf('desa_kecamatan');
    const hpIdx = headers.indexOf('no_hp');
    const alamatIdx = headers.indexOf('alamat');

    if (cardIdx === -1 || nameIdx === -1) {
      setImportErrors([
        'Kolom wajib "ID Petani" (petani_id) dan "Nama Petani" (nama_petani) tidak ditemukan pada baris judul kolom.',
      ]);
      return;
    }

    // Nilai "-" dari file ekspor dianggap kosong
    const cell = (cols: string[], idx: number) => {
      const val = idx !== -1 ? (cols[idx] || '').trim() : '';
      return val === '-' ? '' : val;
    };

    const importedPetani: Petani[] = [];
    const errors: string[] = [];
    const existingCards = new Set(petaniList.map((p) => p.petani_id.toUpperCase()));

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(delimiter).map((c) => c.replace(/^"|"$/g, '').trim());
      const cardNumber = cell(cols, cardIdx).toUpperCase();
      const nama = cell(cols, nameIdx);
      const desa = cell(cols, desaIdx);

      if (!cardNumber || !nama) {
        errors.push(`Baris ${i + 1}: ID Petani dan nama tidak boleh kosong.`);
        continue;
      }

      if (existingCards.has(cardNumber)) {
        errors.push(`Baris ${i + 1}: ID Petani "${cardNumber}" sudah terdaftar.`);
        continue;
      }

      existingCards.add(cardNumber);

      const newPetani: Petani = {
        petani_id: generatePetaniId([...petaniList, ...importedPetani]),

        nama_petani: nama,
        no_hp: cell(cols, hpIdx),
        alamat: cell(cols, alamatIdx),
        desa_kecamatan: desa || undefined,
        status_aktif: true,
        tanggal_daftar: new Date().toISOString().split('T')[0],
      };

      importedPetani.push(newPetani);
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
                Salin baris dari Excel / Google Sheets (mulai dari baris judul kolom) lalu tempel di bawah ini. Minimal memuat kolom ID Petani dan Nama Petani; No HP, Alamat, dan Desa / Kecamatan boleh dikosongkan.
              </p>

              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="petani_id,nama_petani,desa_kecamatan&#10;PTN-WRA-2001,Bpk. Ahmad Fauzi,Ds. Wringin Anom&#10;PTN-WRA-2002,Bpk. Hendro,Ds. Besuki"
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

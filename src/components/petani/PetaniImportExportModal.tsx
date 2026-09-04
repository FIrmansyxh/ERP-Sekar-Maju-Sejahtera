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
} from 'lucide-react';
import { Petani } from '../../types';
import { generatePetaniId } from '../../utils/formatters';
import { downloadCsvFile } from '../../utils/printDownload';

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

  if (!isOpen) return null;

  const handleExportCSV = () => {
    const headers = [
      'petani_id',
      'nama_petani',
      'no_hp',
      'alamat',
      'status_aktif',
      'tanggal_daftar',
      'catatan',
    ];

    const rows = petaniList.map((p) => [
      p.petani_id,
      p.nama_petani || '',
      p.no_hp || '',
      p.alamat || p.desa_kecamatan || '',
      p.status_aktif ? 'TRUE' : 'FALSE',
      p.tanggal_daftar,
      p.catatan || '',
    ]);

    downloadCsvFile(
      `Master_Petani_Tembakau_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  };

  const handleProcessImport = () => {
    setImportErrors([]);
    setSuccessCount(null);

    if (!csvText.trim()) {
      setImportErrors(['Teks CSV tidak boleh kosong.']);
      return;
    }

    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      setImportErrors(['Format CSV membutuhkan baris header dan minimal 1 baris data.']);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const cardIdx = headers.indexOf('nomor_kartu');
    const nameIdx = headers.indexOf('nama_petani');
    const desaIdx = headers.indexOf('desa_kecamatan');

    if (cardIdx === -1 || nameIdx === -1) {
      setImportErrors([
        'Kolom wajib "nomor_kartu" dan "nama_petani" tidak ditemukan pada baris header CSV.',
      ]);
      return;
    }

    const importedPetani: Petani[] = [];
    const errors: string[] = [];
    const existingCards = new Set(petaniList.map((p) => p.nomor_kartu.toUpperCase()));

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      const cardNumber = cols[cardIdx]?.toUpperCase();
      const nama = cols[nameIdx];
      const desa = desaIdx !== -1 ? cols[desaIdx] : 'Desa Tembakau';

      if (!cardNumber || !nama) {
        errors.push(`Baris ${i + 1}: Nomor kartu dan nama tidak boleh kosong.`);
        continue;
      }

      if (existingCards.has(cardNumber)) {
        errors.push(`Baris ${i + 1}: Nomor kartu "${cardNumber}" sudah terdaftar.`);
        continue;
      }

      existingCards.add(cardNumber);

      const newPetani: Petani = {
        petani_id: generatePetaniId([...petaniList, ...importedPetani]),
        nomor_kartu: generatePetaniId([...petaniList, ...importedPetani]),
        nama_petani: nama,
        no_hp: '0812-3456-7890',
        alamat: desa || 'Ds. Wringin Anom, Pamekasan',
        desa_kecamatan: desa || 'Ds. Wringin Anom',
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto font-sans">
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
            Export CSV
          </button>
          <button
            onClick={() => setTab('import')}
            className={`px-4 py-2 text-xs font-bold transition cursor-pointer border-b-2 -mb-px ${
              tab === 'import'
                ? 'border-[#b81d24] text-[#b81d24] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Import CSV
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {tab === 'export' ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Unduh seluruh data registrasi master petani ({petaniList.length} petani aktif/terdaftar) ke dalam format file spreadsheet CSV standar.
              </p>

              <div className="bg-[#f8f9fa] p-3 border border-gray-200 space-y-2">
                <span className="font-bold text-gray-800 block text-xs">Kolom yang disertakan:</span>
                <p className="text-[11px] font-mono text-gray-600 leading-relaxed">
                  petani_id, nama_petani, no_hp, alamat, status_aktif, tanggal_daftar, catatan
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File CSV Master Petani</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <p className="text-xs text-gray-600 leading-relaxed">
                Tempel teks CSV dari Excel / Google Sheets di bawah ini. Pastikan baris pertama memuat kolom header.
              </p>

              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="nomor_kartu,nama_petani,desa_kecamatan&#10;KRT-WRA-2001,Bpk. Ahmad Fauzi,Ds. Wringin Anom&#10;KRT-WRA-2002,Bpk. Hendro,Ds. Besuki"
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

      </div>
    </div>
  );
};

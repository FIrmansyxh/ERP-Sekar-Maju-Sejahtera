import React, { useEffect, useState } from 'react';
import { X, FileBarChart, AlertTriangle } from 'lucide-react';
import { MODUL_LAPORAN } from '../../utils/rbac';

interface AksesLaporanModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Laporan yang saat ini terbuka untuk Admin Sortir. */
  terbuka: string[];
  /** Menyimpan ke server; melempar galat bila server menolak atau tidak terjangkau. */
  onSimpan: (modul: string[]) => Promise<void>;
}

/** Super Admin memilih laporan yang boleh dibuka Admin Sortir (berlaku untuk semua akun Admin Sortir). */
export const AksesLaporanModal: React.FC<AksesLaporanModalProps> = ({ isOpen, onClose, terbuka, onSimpan }) => {
  const [dipilih, setDipilih] = useState<string[]>(terbuka);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDipilih(terbuka);
      setGalat(null);
    }
  }, [isOpen, terbuka]);

  if (!isOpen) return null;

  const semuaDipilih = dipilih.length === MODUL_LAPORAN.length;
  const ubah = (id: string) =>
    setDipilih((lama) => (lama.includes(id) ? lama.filter((m) => m !== id) : [...lama, id]));

  const handleSimpan = async () => {
    setMenyimpan(true);
    setGalat(null);
    try {
      // Urutan mengikuti menu samping
      await onSimpan(MODUL_LAPORAN.map((m) => m.id).filter((id) => dipilih.includes(id)));
      onClose();
    } catch (err: any) {
      setGalat(`Belum tersimpan: ${err?.message || 'server menolak'}.`);
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-label="Akses Laporan Admin Sortir"
        className="bg-white rounded-md shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-5 py-4 border-b border-gray-200 bg-white flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <FileBarChart className="w-4 h-4 text-[#b81d24]" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight truncate">Akses Laporan Admin Sortir</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-sm transition cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs text-gray-800">
          {galat && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{galat}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700">
              {dipilih.length} dari {MODUL_LAPORAN.length} laporan terbuka
            </span>
            <button
              type="button"
              onClick={() => setDipilih(semuaDipilih ? [] : MODUL_LAPORAN.map((m) => m.id))}
              className="px-2 py-0.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold rounded-xs cursor-pointer transition"
            >
              {semuaDipilih ? 'Tutup Semua' : 'Pilih Semua'}
            </button>
          </div>

          <ul className="border border-gray-200 rounded-sm divide-y divide-gray-100">
            {MODUL_LAPORAN.map((m) => (
              <li key={m.id}>
                <label className="flex items-center space-x-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={dipilih.includes(m.id)}
                    onChange={() => ubah(m.id)}
                    className="w-3.5 h-3.5 accent-[#b81d24] cursor-pointer"
                  />
                  <span>{m.nama}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-sm cursor-pointer transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSimpan}
            disabled={menyimpan}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#b81d24] hover:bg-[#9a181e] rounded-sm cursor-pointer transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {menyimpan ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CloudUpload, LogIn, RefreshCw } from 'lucide-react';
import { antrianSinkron, RingkasanAntrian } from '../../services/antrianSinkron';

/**
 * Status simpanan ke server di Header. Tidak tampil bila semuanya sudah tersimpan; muncul hanya
 * saat ada kupon yang sedang atau belum berhasil dikirim, agar operator tahu data BELUM aman di server.
 */
export const IndikatorSinkron: React.FC = () => {
  const [ringkasan, setRingkasan] = useState<RingkasanAntrian>(() => antrianSinkron.ringkasan());

  useEffect(() => {
    const perbarui = () => setRingkasan(antrianSinkron.ringkasan());
    perbarui();
    return antrianSinkron.berlangganan(perbarui);
  }, []);

  if (ringkasan.menunggu === 0) return null;

  const rincian = ringkasan.rincian
    .map((r) => `${r.noKupon}${r.percobaan > 0 ? ` (percobaan ${r.percobaan})` : ''}${r.selisih?.length ? `: ${r.selisih.join('; ')}` : r.galat ? `: ${r.galat}` : ''}`)
    .join('\n');

  const adaMasalah = ringkasan.bermasalah > 0;
  const gagal = ringkasan.rincian.some((r) => r.percobaan > 0) || adaMasalah || ringkasan.butuhLoginUlang;

  let kelas = 'bg-slate-50 text-slate-700 border-slate-200';
  let Ikon = CloudUpload;
  let teks = `Menyimpan ke server (${ringkasan.menunggu})`;
  let petunjuk = 'Perubahan sedang dikirim ke server.';

  if (ringkasan.butuhLoginUlang) {
    kelas = 'bg-red-50 text-red-800 border-red-200';
    Ikon = LogIn;
    teks = `Sesi login habis: ${ringkasan.menunggu} simpanan menunggu`;
    petunjuk = 'Keluar lalu login kembali; simpanan yang tertunda akan terkirim otomatis.';
  } else if (adaMasalah) {
    kelas = 'bg-red-50 text-red-800 border-red-200';
    Ikon = AlertTriangle;
    teks = `${ringkasan.bermasalah} kupon tidak tersimpan utuh di server`;
    petunjuk = 'Server menjawab tetapi sebagian data (mis. ganti tikar) tidak tersimpan. Hubungi administrator.';
  } else if (gagal) {
    kelas = 'bg-amber-50 text-amber-900 border-amber-300';
    Ikon = AlertTriangle;
    teks = `${ringkasan.menunggu} simpanan belum sampai ke server`;
    petunjuk = 'Dicoba ulang otomatis. Jangan tutup halaman sebelum status ini hilang.';
  }

  return (
    <div
      className={`flex items-center space-x-2 px-2.5 py-1.5 border rounded-md text-[11px] font-semibold ${kelas}`}
      title={`${petunjuk}\n${rincian}`}
      role="status"
      aria-live="polite"
    >
      <Ikon className={`w-3.5 h-3.5 shrink-0 ${!gagal && ringkasan.berjalan ? 'animate-pulse' : ''}`} />
      <span className="hidden md:inline whitespace-nowrap">{teks}</span>
      <span className="md:hidden">{ringkasan.menunggu}</span>
      {gagal && !ringkasan.butuhLoginUlang && (
        <button
          type="button"
          onClick={() => void antrianSinkron.kirimUlangSekarang()}
          className="ml-1 px-1.5 py-0.5 bg-white border border-current rounded-sm flex items-center space-x-1 cursor-pointer hover:bg-white/70"
          title="Kirim ulang sekarang"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden lg:inline">Kirim ulang</span>
        </button>
      )}
    </div>
  );
};

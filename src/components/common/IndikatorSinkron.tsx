import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudUpload, HardDrive, LogIn, RefreshCw, X } from 'lucide-react';
import { antrianSinkron } from '../../services/antrianSinkron';
import { antrianMutasi } from '../../services/antrianMutasi';
import { PeringatanSimpanan, peringatanSimpanan } from '../../utils/peringatanSimpanan';

/**
 * Status simpanan di Header. Tidak tampil bila semuanya aman; muncul saat:
 *  - ada kupon yang sedang atau belum berhasil dikirim ke server (antrean sinkron kupon),
 *  - ada perubahan lain (petani, harga, batch sample, Surat Jalan, penghapusan) yang belum sampai ke server
 *    atau ditolak server (antrean mutasi),
 *  - penyimpanan peramban penuh.
 * Tujuannya agar operator tahu data BELUM aman di server.
 */
export const IndikatorSinkron: React.FC = () => {
  const [kupon, setKupon] = useState(() => antrianSinkron.ringkasan());
  const [mutasi, setMutasi] = useState(() => antrianMutasi.ringkasan());
  const [peringatan, setPeringatan] = useState<PeringatanSimpanan[]>(() => peringatanSimpanan.semua());
  // Hasil percobaan "Kirim ulang" terakhir, ditampilkan sebentar supaya klik tombol terasa berbuat sesuatu
  // (bukan cuma diam kalau server menolak lagi dengan alasan yang sama).
  const [sedangKirimUlang, setSedangKirimUlang] = useState(false);
  const [hasilKirimUlang, setHasilKirimUlang] = useState<{ pesan: string; berhasil: boolean } | null>(null);
  const timerHasilRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const perbarui = () => setKupon(antrianSinkron.ringkasan());
    perbarui();
    return antrianSinkron.berlangganan(perbarui);
  }, []);

  useEffect(() => {
    const perbarui = () => setMutasi(antrianMutasi.ringkasan());
    perbarui();
    return antrianMutasi.berlangganan(perbarui);
  }, []);

  useEffect(() => {
    const perbarui = () => setPeringatan([...peringatanSimpanan.semua()]);
    perbarui();
    return peringatanSimpanan.berlangganan(perbarui);
  }, []);

  useEffect(() => () => {
    if (timerHasilRef.current) clearTimeout(timerHasilRef.current);
  }, []);

  const daftarPeringatan = peringatan.map((p) => (
    <div
      key={p.id}
      className="flex items-center space-x-2 px-2.5 py-1.5 border rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border-amber-300"
      title={[p.rincian, p.jenis === 'server' ? 'Data tersimpan di komputer ini. Periksa koneksi, lalu ulangi perubahan atau hubungi administrator.' : ''].filter(Boolean).join('\n')}
      role="alert"
    >
      {p.jenis === 'kuota' ? <HardDrive className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
      <span className="hidden md:inline whitespace-nowrap">{p.pesan}</span>
      <span className="md:hidden">!</span>
      <button
        type="button"
        onClick={() => peringatanSimpanan.tutup(p.id)}
        className="ml-1 p-0.5 rounded-sm hover:bg-white/70 cursor-pointer"
        title="Tutup peringatan"
        aria-label={`Tutup peringatan: ${p.pesan}`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  ));

  const menunggu = kupon.menunggu + mutasi.menunggu;

  const hasilKirimUlangEl = hasilKirimUlang ? (
    <div
      className={`flex items-center space-x-2 px-2.5 py-1.5 border rounded-md text-[11px] font-semibold ${
        hasilKirimUlang.berhasil ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
      }`}
      role="status"
    >
      {hasilKirimUlang.berhasil ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
      <span className="whitespace-nowrap">{hasilKirimUlang.pesan}</span>
    </div>
  ) : null;

  if (menunggu === 0) {
    return daftarPeringatan.length > 0 || hasilKirimUlangEl ? (
      <>
        {daftarPeringatan}
        {hasilKirimUlangEl}
      </>
    ) : null;
  }

  const rincian = [
    ...kupon.rincian.map((r) => `Kupon ${r.noKupon}${r.percobaan > 0 ? ` (percobaan ${r.percobaan})` : ''}${r.selisih?.length ? `: ${r.selisih.join('; ')}` : r.galat ? `: ${r.galat}` : ''}`),
    ...mutasi.rincian.map((r) => `${r.label}${r.percobaan > 0 ? ` (percobaan ${r.percobaan})` : ''}${r.selisih?.length ? `: ${r.selisih.join('; ')}` : r.galat ? `: ${r.galat}` : ''}`),
  ].join('\n');

  const bermasalah = kupon.bermasalah + mutasi.bermasalah;
  const butuhLoginUlang = kupon.butuhLoginUlang || mutasi.butuhLoginUlang;
  const berjalan = kupon.berjalan || mutasi.berjalan;
  const gagal =
    kupon.rincian.some((r) => r.percobaan > 0) ||
    mutasi.rincian.some((r) => r.percobaan > 0) ||
    bermasalah > 0 ||
    butuhLoginUlang;

  let kelas = 'bg-slate-50 text-slate-700 border-slate-200';
  let Ikon = CloudUpload;
  let teks = `Menyimpan ke server (${menunggu})`;
  let petunjuk = 'Perubahan sedang dikirim ke server.';

  if (butuhLoginUlang) {
    kelas = 'bg-red-50 text-red-800 border-red-200';
    Ikon = LogIn;
    teks = `Sesi login habis: ${menunggu} simpanan menunggu`;
    petunjuk = 'Keluar lalu login kembali; simpanan yang tertunda akan terkirim otomatis.';
  } else if (bermasalah > 0) {
    kelas = 'bg-red-50 text-red-800 border-red-200';
    Ikon = AlertTriangle;
    teks = `${bermasalah} perubahan tidak tersimpan utuh di server`;
    petunjuk = 'Server menolak atau hanya menyimpan sebagian data (mis. ganti tikar, bal batch sample). Hubungi administrator.';
  } else if (gagal) {
    kelas = 'bg-amber-50 text-amber-900 border-amber-300';
    Ikon = AlertTriangle;
    teks = `${menunggu} simpanan belum sampai ke server`;
    petunjuk = 'Dicoba ulang otomatis. Jangan tutup halaman sebelum status ini hilang.';
  }

  const klikKirimUlang = async () => {
    if (timerHasilRef.current) clearTimeout(timerHasilRef.current);
    setHasilKirimUlang(null);
    setSedangKirimUlang(true);
    await Promise.all([antrianSinkron.kirimUlangSekarang(), antrianMutasi.kirimUlangSekarang()]);
    setSedangKirimUlang(false);

    const kuponSetelah = antrianSinkron.ringkasan();
    const mutasiSetelah = antrianMutasi.ringkasan();
    const menungguSetelah = kuponSetelah.menunggu + mutasiSetelah.menunggu;
    const bermasalahSetelah = kuponSetelah.bermasalah + mutasiSetelah.bermasalah;
    const rincianSetelah = [...kuponSetelah.rincian, ...mutasiSetelah.rincian];
    const alasan = rincianSetelah.find((r) => r.selisih?.length || r.galat);
    const alasanTeks = alasan ? (alasan.selisih?.length ? alasan.selisih.join('; ') : alasan.galat) : undefined;

    const berhasil = menungguSetelah === 0;
    const pesan = berhasil
      ? 'Berhasil! Semua perubahan sekarang tersimpan di server.'
      : kuponSetelah.butuhLoginUlang || mutasiSetelah.butuhLoginUlang
      ? 'Sesi login habis. Keluar lalu login kembali untuk melanjutkan.'
      : bermasalahSetelah > 0
      ? `Dicoba lagi, tetapi server masih menolak${alasanTeks ? `: ${alasanTeks}` : ''}.`
      : 'Dicoba lagi, masih belum sampai ke server. Akan dicoba lagi otomatis.';
    setHasilKirimUlang({ pesan, berhasil });
    timerHasilRef.current = setTimeout(() => setHasilKirimUlang(null), 8000);
  };

  return (
    <>
      {daftarPeringatan}
      <div
        className={`flex items-center space-x-2 px-2.5 py-1.5 border rounded-md text-[11px] font-semibold ${kelas}`}
        title={`${petunjuk}\n${rincian}`}
        role="status"
        aria-live="polite"
      >
        <Ikon className={`w-3.5 h-3.5 shrink-0 ${!gagal && berjalan ? 'animate-pulse' : ''}`} />
        <span className="hidden md:inline whitespace-nowrap">{teks}</span>
        <span className="md:hidden">{menunggu}</span>
        {gagal && !butuhLoginUlang && (
          <button
            type="button"
            disabled={sedangKirimUlang}
            onClick={() => void klikKirimUlang()}
            className="ml-1 px-1.5 py-0.5 bg-white border border-current rounded-sm flex items-center space-x-1 cursor-pointer hover:bg-white/70 disabled:opacity-60 disabled:cursor-wait"
            title="Kirim ulang sekarang"
          >
            <RefreshCw className={`w-3 h-3 ${sedangKirimUlang ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">{sedangKirimUlang ? 'Mencoba...' : 'Kirim ulang'}</span>
          </button>
        )}
      </div>
      {hasilKirimUlangEl}
    </>
  );
};

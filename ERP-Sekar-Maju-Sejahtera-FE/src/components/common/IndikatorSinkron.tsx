import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, CloudUpload, HardDrive, LogIn, RefreshCw, X } from 'lucide-react';
import { antrianKupon } from '../../services/antrianKupon';
import { statusServer } from '../../services/statusServer';
import { PeringatanSimpanan, peringatanSimpanan } from '../../utils/peringatanSimpanan';

const jam = (waktu: number | null) =>
  waktu ? new Date(waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';

/**
 * Status simpanan di Header. Tidak tampil bila semuanya aman; muncul saat:
 *  - ada simpanan kupon (Sortir / Timbangan / Kasir) yang sedang atau belum berhasil sampai ke server,
 *  - server tidak terhubung, sehingga layar tidak mengikuti perubahan dari komputer lain,
 *  - penyimpanan peramban penuh.
 * Perubahan lain (petani, harga, pengguna, batch sample, Surat Jalan, hapus) langsung ke server dan hasilnya
 * ditampilkan saat itu juga, jadi tidak pernah menunggu di sini.
 */
export const IndikatorSinkron: React.FC = () => {
  const [kupon, setKupon] = useState(() => antrianKupon.ringkasan());
  const [server, setServer] = useState(() => statusServer.ambil());
  const [peringatan, setPeringatan] = useState<PeringatanSimpanan[]>(() => peringatanSimpanan.semua());
  const [sedangKirimUlang, setSedangKirimUlang] = useState(false);
  const [hasilKirimUlang, setHasilKirimUlang] = useState<{ pesan: string; berhasil: boolean } | null>(null);
  const timerHasilRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const perbarui = () => setKupon(antrianKupon.ringkasan());
    perbarui();
    return antrianKupon.berlangganan(perbarui);
  }, []);

  useEffect(() => {
    const perbarui = () => setServer(statusServer.ambil());
    perbarui();
    return statusServer.berlangganan(perbarui);
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
      title={p.rincian || ''}
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

  const terputus = server.terhubung === false ? (
    <div
      className="flex items-center space-x-2 px-2.5 py-1.5 border rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border-amber-300"
      title={`Data di layar belum tentu sama dengan server dan komputer lain. Dicoba lagi otomatis.\n${server.galat || ''}`}
      role="alert"
    >
      <CloudOff className="w-3.5 h-3.5 shrink-0" />
      <span className="hidden md:inline whitespace-nowrap">Server tidak terhubung (data terakhir {jam(server.terakhirBerhasil)})</span>
      <span className="md:hidden">!</span>
    </div>
  ) : null;

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

  const menunggu = kupon.menunggu;
  if (menunggu === 0) {
    return daftarPeringatan.length > 0 || terputus || hasilKirimUlangEl ? (
      <>
        {daftarPeringatan}
        {terputus}
        {hasilKirimUlangEl}
      </>
    ) : null;
  }

  const rincian = kupon.rincian
    .map((r) => `${r.label}${r.percobaan > 0 ? ` (percobaan ${r.percobaan})` : ''}${r.galat ? `: ${r.galat}` : ''}`)
    .join('\n');
  const gagal = kupon.butuhLoginUlang || kupon.rincian.some((r) => r.percobaan > 0);

  let kelas = 'bg-slate-50 text-slate-700 border-slate-200';
  let Ikon = CloudUpload;
  let teks = `Menyimpan ke server (${menunggu})`;
  let petunjuk = 'Perubahan kupon sedang dikirim ke server.';

  if (kupon.butuhLoginUlang) {
    kelas = 'bg-red-50 text-red-800 border-red-200';
    Ikon = LogIn;
    teks = `Sesi login habis: ${menunggu} simpanan menunggu`;
    petunjuk = 'Login kembali; simpanan yang tertunda akan terkirim otomatis.';
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
    await antrianKupon.kirimUlangSekarang();
    setSedangKirimUlang(false);
    const setelah = antrianKupon.ringkasan();
    const berhasil = setelah.menunggu === 0;
    setHasilKirimUlang({
      berhasil,
      pesan: berhasil
        ? 'Berhasil! Semua simpanan sudah tersimpan di server.'
        : setelah.butuhLoginUlang
        ? 'Sesi login habis. Login kembali untuk melanjutkan.'
        : `Masih belum sampai ke server${setelah.galatTerakhir ? `: ${setelah.galatTerakhir}` : ''}. Akan dicoba lagi otomatis.`,
    });
    timerHasilRef.current = setTimeout(() => setHasilKirimUlang(null), 8000);
  };

  return (
    <>
      {daftarPeringatan}
      {terputus}
      <div
        className={`flex items-center space-x-2 px-2.5 py-1.5 border rounded-md text-[11px] font-semibold ${kelas}`}
        title={`${petunjuk}\n${rincian}`}
        role="status"
        aria-live="polite"
      >
        <Ikon className={`w-3.5 h-3.5 shrink-0 ${!gagal && kupon.berjalan ? 'animate-pulse' : ''}`} />
        <span className="hidden md:inline whitespace-nowrap">{teks}</span>
        <span className="md:hidden">{menunggu}</span>
        {gagal && !kupon.butuhLoginUlang && (
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

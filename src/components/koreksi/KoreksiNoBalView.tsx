import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, History, Lock, Replace, Search, X } from 'lucide-react';
import type {
  Barang,
  BatchPengirimanSample,
  PengirimanBarang,
  RiwayatNoBal,
  TransaksiPembelian,
  User,
} from '../../types';
import {
  alasanNoBalBaruDitolak,
  BalKoreksi,
  cariBalKoreksi,
  daftarBalKoreksi,
  LABEL_TAHAP_GANTI,
  normalisasiNoBal,
  noBalTerpakai,
  RencanaGantiNoBal,
  rantaiNoBal,
  siapkanGantiNoBal,
  SumberKoreksi,
} from '../../utils/gantiNoBal';
import { formatDateTimeIndo, formatNumber } from '../../utils/formatters';
import { labelStatusPengiriman, labelStatusStok, downloadExcelReport, todayStamp } from '../../utils/excelExport';
import { mintaKonfirmasi } from '../../utils/dialog';
import { Pagination } from '../common/Pagination';

interface KoreksiNoBalViewProps {
  transaksiList: TransaksiPembelian[];
  barangList: Barang[];
  pengirimanList: PengirimanBarang[];
  batchSampleList: BatchPengirimanSample[];
  riwayatList: RiwayatNoBal[];
  currentUser: User;
  onGantiNoBal: (rencana: RencanaGantiNoBal) => Promise<boolean>;
}

type Tab = 'ganti' | 'riwayat';

// Gaya seragam dengan menu Pembelian (Sortir, Kasir)
const LABEL = 'block text-xs font-semibold text-slate-700 mb-1';
const INPUT =
  'w-full bg-white border border-slate-300 rounded-sm px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed';
const INPUT_TERKUNCI = 'w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-xs text-slate-500 cursor-not-allowed';
const BAGIAN = 'p-4 bg-slate-50 border border-slate-200 rounded-sm';
const TH = 'py-3 px-3.5 text-center border-r border-slate-200 last:border-r-0 whitespace-nowrap';
const TD = 'py-2.5 px-3.5 border-r border-slate-100 last:border-r-0 whitespace-nowrap';
const PER_HALAMAN = [10, 25, 50, 100];

const WajibIsi = () => <span className="text-red-500">*</span>;

const BilahJudul: React.FC<{ Ikon: typeof Replace; judul: string; children?: React.ReactNode }> = ({ Ikon, judul, children }) => (
  <div className="bg-gray-100/80 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between gap-2">
    <div className="flex items-center space-x-2">
      <Ikon className="w-4 h-4 text-[#b81d24]" />
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">{judul}</h3>
    </div>
    {children}
  </div>
);

const Info: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({ label, children, mono }) => (
  <div className="min-w-0">
    <div className="text-[11px] font-semibold text-slate-500">{label}</div>
    <div className={`mt-0.5 text-xs font-semibold text-slate-900 truncate ${mono ? 'font-mono' : ''}`}>{children}</div>
  </div>
);

export const KoreksiNoBalView: React.FC<KoreksiNoBalViewProps> = ({
  transaksiList,
  barangList,
  pengirimanList,
  batchSampleList,
  riwayatList,
  currentUser,
  onGantiNoBal,
}) => {
  const [tab, setTab] = useState<Tab>('ganti');
  const [cari, setCari] = useState('');
  const [pilihan, setPilihan] = useState<{ transaksiId: string; itemId: string } | null>(null);
  const [pesanCari, setPesanCari] = useState<string | null>(null);
  const [noBaru, setNoBaru] = useState('');
  const [alasan, setAlasan] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const [cariRiwayat, setCariRiwayat] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [perHalaman, setPerHalaman] = useState(25);
  const [saranBuka, setSaranBuka] = useState(false);
  const [sorot, setSorot] = useState(-1);
  const inputCariRef = useRef<HTMLInputElement>(null);
  const petugas = currentUser.nama_lengkap || currentUser.username;

  const sumber: SumberKoreksi = useMemo(
    () => ({ transaksiList, barangList, pengirimanList, batchSampleList, riwayat: riwayatList }),
    [transaksiList, barangList, pengirimanList, batchSampleList, riwayatList]
  );
  const semuaBal = useMemo(() => daftarBalKoreksi(sumber), [sumber]);

  // Bal terpilih selalu dihitung ulang dari data terbaru (perubahan dari perangkat lain langsung terlihat)
  const bal: BalKoreksi | null = useMemo(() => {
    if (!pilihan) return null;
    return semuaBal.find((b) => b.tx.transaksi_id === pilihan.transaksiId && b.item.item_id === pilihan.itemId) || null;
  }, [pilihan, semuaBal]);

  // Rekomendasi saat mengetik: cocok ke nomor sekarang, nomor di nota, atau nomor awal; yang berawalan sama duluan
  const saran = useMemo(() => {
    const q = normalisasiNoBal(cari);
    if (!q) return [];
    const cocok = semuaBal.filter((b) => [b.noBalSekarang, b.noBalNota, b.noBalAwal].some((n) => n.includes(q)));
    const awalan = (b: BalKoreksi) => ([b.noBalSekarang, b.noBalNota, b.noBalAwal].some((n) => n.startsWith(q)) ? 0 : 1);
    return cocok
      .sort((a, b) => awalan(a) - awalan(b) || a.noBalSekarang.localeCompare(b.noBalSekarang, undefined, { numeric: true }))
      .slice(0, 15);
  }, [cari, semuaBal]);

  const rantai = useMemo(() => (bal ? rantaiNoBal(bal.noBalSekarang, riwayatList) : []), [bal, riwayatList]);

  const terpakai = useMemo(() => noBalTerpakai(sumber), [sumber]);
  const noBaruBersih = normalisasiNoBal(noBaru);
  const alasanNoBal = bal && noBaruBersih ? alasanNoBalBaruDitolak(noBaruBersih, bal, sumber, terpakai) : null;
  const bolehSimpan = Boolean(bal && !bal.alasanTerkunci && noBaruBersih && !alasanNoBal && alasan.trim() && !menyimpan);

  const pilihBal = (b: BalKoreksi) => {
    setPilihan({ transaksiId: b.tx.transaksi_id, itemId: b.item.item_id });
    setCari(b.noBalSekarang);
    setSaranBuka(false);
    setSorot(-1);
    setPesanCari(null);
    setBerhasil(null);
    setNoBaru('');
    setAlasan('');
  };

  const handleCari = (e?: React.FormEvent) => {
    e?.preventDefault();
    setBerhasil(null);
    const q = normalisasiNoBal(cari);
    if (!q) return;
    // Nomor lengkap, atau satu-satunya rekomendasi yang cocok
    const hasil = cariBalKoreksi(q, sumber, semuaBal) || (saran.length === 1 ? saran[0] : null);
    if (!hasil && saran.length > 1) {
      setSaranBuka(true);
      return;
    }
    if (!hasil) {
      setPilihan(null);
      setSaranBuka(false);
      setPesanCari(`No Bal ${q} tidak ditemukan.`);
      return;
    }
    pilihBal(hasil);
  };

  const handleBersihkan = () => {
    setCari('');
    setSaranBuka(false);
    setPilihan(null);
    setPesanCari(null);
    setNoBaru('');
    setAlasan('');
    setBerhasil(null);
    inputCariRef.current?.focus();
  };

  const handleSimpan = async () => {
    if (!bal || !bolehSimpan) return;
    const rencana = siapkanGantiNoBal(bal, noBaruBersih, alasan, petugas);
    const baris = [
      `No Bal ${bal.noBalSekarang} diganti menjadi ${noBaruBersih}.`,
      bal.lunas
        ? `Nota dan Laporan Pembelian Kupon ${bal.tx.no_kupon} tetap memakai No Bal ${bal.noBalNota}.`
        : `No Bal di Kupon ${bal.tx.no_kupon} ikut berganti.`,
    ];
    const lanjut = await mintaKonfirmasi(baris.join('\n'), { judul: 'Ganti No Bal', teksOk: 'Ganti', varian: 'primary' });
    if (!lanjut) return;
    setMenyimpan(true);
    try {
      const ok = await onGantiNoBal(rencana);
      if (!ok) return;
      setBerhasil(`No Bal ${rencana.riwayat.no_bal_lama} diganti menjadi ${rencana.riwayat.no_bal_baru}.`);
      setCari(rencana.riwayat.no_bal_baru);
      setNoBaru('');
      setAlasan('');
    } finally {
      setMenyimpan(false);
    }
  };

  const riwayatTampil = useMemo(() => {
    const q = cariRiwayat.trim().toUpperCase();
    const urut = [...riwayatList].sort((a, b) => String(b.diganti_pada).localeCompare(String(a.diganti_pada)));
    if (!q) return urut;
    return urut.filter((r) =>
      [r.no_bal_lama, r.no_bal_baru, r.no_kupon, r.nama_petani, r.alasan, r.diganti_oleh].some((v) => String(v || '').toUpperCase().includes(q))
    );
  }, [riwayatList, cariRiwayat]);
  const totalHalaman = Math.max(1, Math.ceil(riwayatTampil.length / perHalaman));
  const halamanAman = Math.min(halaman, totalHalaman);
  const riwayatHalaman = riwayatTampil.slice((halamanAman - 1) * perHalaman, halamanAman * perHalaman);

  const handleUnduhRiwayat = () => {
    void downloadExcelReport(`Riwayat_Ganti_No_Bal_${todayStamp()}`, [
      {
        name: 'Riwayat Ganti No Bal',
        title: 'Riwayat Ganti No Bal',
        columns: [
          { header: 'No', type: 'integer', align: 'center' },
          { header: 'Tanggal', type: 'datetime' },
          { header: 'No Bal Lama', align: 'center' },
          { header: 'No Bal Baru', align: 'center' },
          { header: 'Kupon', align: 'center' },
          { header: 'Petani' },
          { header: 'Tahap', align: 'center' },
          { header: 'Alasan' },
          { header: 'Diganti Oleh' },
        ],
        rows: riwayatTampil.map((r, i) => [
          i + 1,
          r.diganti_pada ? new Date(r.diganti_pada) : '',
          r.no_bal_lama,
          r.no_bal_baru,
          r.no_kupon || '-',
          r.nama_petani || '-',
          LABEL_TAHAP_GANTI[r.tahap] || r.tahap,
          r.alasan,
          r.diganti_oleh,
        ]),
      },
    ]);
  };

  const tombolTab = (kunci: Tab, label: string, Ikon: typeof Replace) => (
    <button
      type="button"
      onClick={() => setTab(kunci)}
      className={`px-4 py-2 text-xs font-bold cursor-pointer transition border-b-2 flex items-center space-x-1.5 ${
        tab === kunci ? 'border-[#b81d24] text-[#b81d24] bg-white' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <Ikon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );

  const badgeBayar = (lunas: boolean) => (
    <span
      className={`px-2 py-0.5 text-[10px] font-bold rounded-xs border ${
        lunas ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
      }`}
    >
      {lunas ? 'Lunas' : 'Belum Lunas'}
    </span>
  );

  return (
    <div className="space-y-4 font-sans pb-10">
      <div className="flex items-center space-x-1 border-b border-gray-200">
        {tombolTab('ganti', 'Ganti No Bal', Replace)}
        {tombolTab('riwayat', `Riwayat (${riwayatList.length})`, History)}
      </div>

      {tab === 'ganti' && (
        <>
          {berhasil && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-sm flex items-center justify-between shadow-2xs">
              <div className="flex items-center space-x-2.5 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{berhasil}</span>
              </div>
              <button type="button" onClick={() => setBerhasil(null)} className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer">
                Tutup
              </button>
            </div>
          )}

          <div className="bg-white border border-gray-200 shadow-2xs">
            <BilahJudul Ikon={Replace} judul="Ganti No Bal">
              <span className="text-[11px] text-gray-500 font-medium">
                Petugas: <strong className="text-gray-900">{petugas}</strong>
              </span>
            </BilahJudul>

            <div className="p-4 sm:p-5 space-y-5">
              {/* 1. Cari bal */}
              <div className={`${BAGIAN} space-y-3`}>
                <form onSubmit={handleCari} className="relative max-w-xl">
                  <label htmlFor="koreksi-cari-no-bal" className={LABEL}>
                    1. No Bal <WajibIsi />
                  </label>
                  <div className="flex">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="koreksi-cari-no-bal"
                        ref={inputCariRef}
                        autoFocus
                        autoComplete="off"
                        value={cari}
                        onChange={(e) => {
                          setCari(e.target.value.toUpperCase());
                          setSaranBuka(true);
                          setSorot(-1);
                        }}
                        onFocus={() => cari.trim() && !bal && setSaranBuka(true)}
                        onBlur={() => setTimeout(() => setSaranBuka(false), 150)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown' && saran.length > 0) {
                            e.preventDefault();
                            setSaranBuka(true);
                            setSorot((p) => (p + 1) % saran.length);
                          } else if (e.key === 'ArrowUp' && saran.length > 0) {
                            e.preventDefault();
                            setSaranBuka(true);
                            setSorot((p) => (p <= 0 ? saran.length - 1 : p - 1));
                          } else if (e.key === 'Enter' && saranBuka && sorot >= 0 && sorot < saran.length) {
                            e.preventDefault();
                            pilihBal(saran[sorot]);
                          } else if (e.key === 'Escape') {
                            setSaranBuka(false);
                          }
                        }}
                        placeholder="Scan / ketik No Bal"
                        className="w-full bg-white border border-r-0 border-slate-300 rounded-l-sm pl-8 pr-8 py-2 text-xs font-mono font-semibold text-slate-900 uppercase focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:text-slate-400"
                      />
                      {cari && (
                        <button
                          type="button"
                          onClick={handleBersihkan}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                          title="Hapus input"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#b81d24] hover:bg-[#9e161c] text-white text-xs font-medium rounded-r-sm transition-colors cursor-pointer shrink-0 inline-flex items-center space-x-1.5 shadow-2xs"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Cari</span>
                    </button>
                  </div>

                  {saranBuka && saran.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-sm shadow-lg overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-600 tracking-wider flex items-center justify-between">
                        <span>Rekomendasi Bal ({saran.length})</span>
                        <span className="text-[9px] text-slate-400 font-normal lowercase">gunakan panah ↑↓ & enter</span>
                      </div>
                      {saran.map((b, idx) => (
                        <button
                          key={`${b.tx.transaksi_id}-${b.item.item_id}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pilihBal(b)}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                            idx === sorot ? 'bg-slate-100' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-mono font-semibold text-xs text-slate-900">
                              {b.noBalSekarang}
                              {b.noBalAwal !== b.noBalSekarang && <span className="ml-2 font-sans font-normal text-[10px] text-slate-500">awal {b.noBalAwal}</span>}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {b.tx.no_kupon} • {b.tx.nama_petani || '-'} • Grade {b.item.kode_grade || '-'}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-xs border ${
                              b.alasanTerkunci
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : b.lunas
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {b.alasanTerkunci ? 'Terkunci' : LABEL_TAHAP_GANTI[b.tahap]}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </form>

                {pesanCari && (
                  <div className="text-xs px-3 py-1.5 rounded-sm font-medium bg-red-50 text-red-800 border border-red-200">{pesanCari}</div>
                )}
              </div>

              {bal && (
                <>
                  {/* Data bal terpilih */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-800">Data Bal</h4>
                    <div className="border border-slate-200 rounded-sm bg-white p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3">
                      <Info label="No Bal Sekarang" mono>
                        {bal.noBalSekarang}
                      </Info>
                      <Info label="No Bal di Nota" mono>
                        {bal.noBalNota}
                      </Info>
                      <Info label="No Bal Awal" mono>
                        {bal.noBalAwal}
                      </Info>
                      <Info label="Kupon" mono>
                        {bal.tx.no_kupon}
                      </Info>
                      <Info label="Petani">{bal.tx.nama_petani || '-'}</Info>
                      <Info label="Grade">{bal.item.kode_grade || '-'}</Info>
                      <Info label="Bruto" mono>
                        {(bal.item.berat_bruto_kg || 0) > 0 ? `${formatNumber(bal.item.berat_bruto_kg, 1)} kg` : '-'}
                      </Info>
                      <Info label="Netto" mono>
                        {(bal.item.berat_kg || 0) > 0 ? `${formatNumber(bal.item.berat_kg, 1)} kg` : '-'}
                      </Info>
                      <Info label="Status Bayar">{badgeBayar(bal.lunas)}</Info>
                      <Info label="Status Bal">
                        {bal.barang ? labelStatusStok(bal.barang.status_stok) : labelStatusStok((bal.item.berat_kg || 0) > 0 ? 'di_gudang' : 'proses_sortir')}
                      </Info>
                      <Info label="Tahap">{LABEL_TAHAP_GANTI[bal.tahap]}</Info>
                      <Info label="Surat Jalan">
                        {bal.suratJalan ? `${bal.suratJalan.no_surat_jalan} (${labelStatusPengiriman(bal.suratJalan.status)})` : '-'}
                      </Info>
                    </div>
                    {rantai.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-slate-500 font-medium">Riwayat Nomor:</span>
                        {rantai.map((n, i) => (
                          <React.Fragment key={n}>
                            {i > 0 && <span className="text-slate-400">→</span>}
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xs font-mono font-semibold">{n}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2-3. Nomor baru */}
                  {bal.alasanTerkunci ? (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-3.5 py-2.5 rounded-sm flex items-center space-x-2.5 text-xs font-semibold">
                      <Lock className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{bal.alasanTerkunci}</span>
                    </div>
                  ) : (
                    <div className={`${BAGIAN} space-y-3`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-start">
                        <div className="lg:col-span-3">
                          <label htmlFor="koreksi-no-bal-baru" className={LABEL}>
                            2. No Bal Baru <WajibIsi />
                          </label>
                          <input
                            id="koreksi-no-bal-baru"
                            autoComplete="off"
                            value={noBaru}
                            onChange={(e) => {
                              setNoBaru(e.target.value.toUpperCase());
                              setBerhasil(null);
                            }}
                            className={`${INPUT} font-mono font-semibold uppercase ${alasanNoBal ? 'border-red-500 focus:border-red-600 focus:ring-red-600 bg-red-50/40' : ''}`}
                          />
                        </div>
                        <div className="lg:col-span-4">
                          <label htmlFor="koreksi-alasan" className={LABEL}>
                            3. Alasan <WajibIsi />
                          </label>
                          <input id="koreksi-alasan" autoComplete="off" value={alasan} onChange={(e) => setAlasan(e.target.value)} className={INPUT} />
                        </div>
                        <div className="lg:col-span-3">
                          <label htmlFor="koreksi-petugas" className={LABEL}>
                            Petugas
                          </label>
                          <input id="koreksi-petugas" value={petugas} readOnly disabled className={INPUT_TERKUNCI} />
                        </div>
                        <div className="lg:col-span-2">
                          <span className={`${LABEL} invisible hidden lg:block`}>Simpan</span>
                          <button
                            type="button"
                            onClick={handleSimpan}
                            disabled={!bolehSimpan}
                            className="w-full py-2 bg-[#b81d24] hover:bg-[#9e161c] text-white font-medium text-xs rounded-sm transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Replace className="w-4 h-4" />
                            <span>{menyimpan ? 'Menyimpan...' : 'Simpan'}</span>
                          </button>
                        </div>
                      </div>
                      {alasanNoBal && (
                        <div className="text-xs px-3 py-1.5 rounded-sm font-medium bg-red-50 text-red-800 border border-red-200 flex items-center space-x-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{alasanNoBal}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'riwayat' && (
        <div className="bg-white border border-slate-200 shadow-2xs rounded-sm overflow-hidden">
          <BilahJudul Ikon={History} judul="Riwayat Ganti No Bal">
            <button
              type="button"
              onClick={handleUnduhRiwayat}
              disabled={riwayatTampil.length === 0}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-sm font-semibold text-xs flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Unduh Excel</span>
            </button>
          </BilahJudul>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-700">
              <span>Tampil</span>
              <select
                value={perHalaman}
                onChange={(e) => {
                  setPerHalaman(Number(e.target.value));
                  setHalaman(1);
                }}
                className="bg-white border border-slate-300 rounded-xs px-2 py-1 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800 cursor-pointer"
              >
                {PER_HALAMAN.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>per hal.</span>
              {cariRiwayat.trim() && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Ditemukan: <strong className="text-slate-900">{riwayatTampil.length}</strong> data
                </span>
              )}
            </div>
            <div className="w-full sm:w-80 md:w-96 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={cariRiwayat}
                onChange={(e) => {
                  setCariRiwayat(e.target.value);
                  setHalaman(1);
                }}
                placeholder="Cari No Bal, kupon, petani..."
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-sm pl-8 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#b81d24] focus:ring-1 focus:ring-[#b81d24] transition shadow-2xs"
              />
              {cariRiwayat && (
                <button
                  type="button"
                  onClick={() => setCariRiwayat('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/90 text-slate-600 font-semibold text-xs border-b border-slate-200">
                  <th className={`${TH} w-12`}>#</th>
                  <th className={TH}>Tanggal</th>
                  <th className={TH}>No Bal Lama</th>
                  <th className={TH}>No Bal Baru</th>
                  <th className={TH}>Kupon</th>
                  <th className={TH}>Petani</th>
                  <th className={TH}>Tahap</th>
                  <th className={TH}>Alasan</th>
                  <th className={TH}>Diganti Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {riwayatHalaman.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700 text-xs">Belum ada riwayat</p>
                    </td>
                  </tr>
                ) : (
                  riwayatHalaman.map((r, i) => (
                    <tr key={r.riwayat_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className={`${TD} text-center font-mono text-slate-500`}>{(halamanAman - 1) * perHalaman + i + 1}</td>
                      <td className={`${TD} font-mono`}>{r.diganti_pada ? formatDateTimeIndo(r.diganti_pada) : '-'}</td>
                      <td className={`${TD} text-center font-mono`}>{r.no_bal_lama}</td>
                      <td className={`${TD} text-center font-mono font-semibold text-slate-900`}>{r.no_bal_baru}</td>
                      <td className={`${TD} text-center font-mono`}>{r.no_kupon || '-'}</td>
                      <td className={TD}>{r.nama_petani || '-'}</td>
                      <td className={`${TD} text-center`}>{LABEL_TAHAP_GANTI[r.tahap] || r.tahap}</td>
                      <td className="py-2.5 px-3.5 border-r border-slate-100 min-w-[220px]">{r.alasan}</td>
                      <td className={TD}>{r.diganti_oleh || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalHalaman > 1 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Pagination
                currentPage={halamanAman}
                totalPages={totalHalaman}
                totalItems={riwayatTampil.length}
                itemsPerPage={perHalaman}
                onPageChange={setHalaman}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

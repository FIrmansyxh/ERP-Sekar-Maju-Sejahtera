import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDateIndo, formatNumber, formatRupiah } from '../../utils/formatters';
import { ResumePengiriman, susunNarasiResume } from '../../utils/resumePengiriman';

/** Jumlah baris teratas untuk tabel pabrik dan grade; sisanya dilihat di tab rekapitulasi masing-masing. */
const BATAS_PABRIK = 5;
const BATAS_GRADE = 6;
const BATAS_DO_PERHATIAN = 5;

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const labelBulan = (kunci: string): string => {
  const [tahun, bulan] = kunci.split('-');
  const nama = NAMA_BULAN[parseInt(bulan, 10) - 1];
  return nama ? `${nama} ${tahun}` : kunci;
};

const persen = (n: number | null | undefined): string => (n === null || n === undefined ? '-' : `${formatNumber(n, 1)}%`);

const Kartu: React.FC<{ judul: string; nilai: string; ket?: string; warna?: string }> = ({ judul, nilai, ket, warna = 'text-gray-900' }) => (
  <div className="bg-white p-3 border border-gray-200 shadow-2xs flex flex-col justify-between">
    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{judul}</div>
    <div className="mt-1">
      <div className={`text-lg font-bold font-mono ${warna}`}>{nilai}</div>
      {ket && <div className="text-[10px] text-gray-500 font-medium mt-0.5">{ket}</div>}
    </div>
  </div>
);

const Bagian: React.FC<{ judul: string; catatan?: string; children: React.ReactNode }> = ({ judul, catatan, children }) => (
  <section className="bg-white border border-gray-200 shadow-2xs overflow-hidden">
    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">{judul}</h3>
      {catatan && <span className="text-[11px] text-gray-500">{catatan}</span>}
    </div>
    {children}
  </section>
);

const th = 'py-2 px-3 border-r border-gray-200 last:border-r-0 text-center';
const td = 'py-2 px-3 border-r border-gray-200 last:border-r-0';

interface ResumePengirimanPanelProps {
  resume: ResumePengiriman;
}

export const ResumePengirimanPanel: React.FC<ResumePengirimanPanelProps> = ({ resume: r }) => {
  const pabrikTampil = r.pabrik.slice(0, BATAS_PABRIK);
  const gradeTampil = r.grade.slice(0, BATAS_GRADE);
  const selisihNegatif = r.selisihTimbangUlang < 0;
  const sample = r.sample;
  const adaPerhatian =
    r.perhatian.belumSelesai.length > 0 || r.perhatian.selesaiTanpaNilai.length > 0 || r.perhatian.balTidakDitemukan.length > 0;

  if (r.jumlahDO === 0) {
    return (
      <div className="bg-white border border-gray-200 shadow-2xs p-6 text-center text-xs text-gray-500">
        {susunNarasiResume(r)}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="resume-pengiriman">
      {/* Narasi ringkas */}
      <Bagian judul="Resume Pengiriman">
        <p className="p-3 text-xs text-gray-800 leading-relaxed">{susunNarasiResume(r)}</p>
      </Bagian>

      {/* Angka utama */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <Kartu judul="Surat Jalan (DO)" nilai={formatNumber(r.jumlahDO)} ket={`${formatNumber(r.jumlahPabrik)} pabrik tujuan`} />
        <Kartu judul="Total Bal" nilai={formatNumber(r.totalBal)} ket={`~ ${formatNumber(r.rataBalPerDO, 1)} bal per DO`} />
        <Kartu judul="Bruto Dikirim" nilai={`${formatNumber(r.brutoKirim, 1)} kg`} ket={`${formatNumber(r.brutoKirim / 1000, 2)} ton • ~ ${formatNumber(r.rataKgPerDO, 0)} kg per DO`} warna="text-blue-900" />
        <Kartu judul="Netto Jual" nilai={`${formatNumber(r.nettoJual, 1)} kg`} ket={`Potongan netto ${formatNumber(r.potonganNetto, 1)} kg`} warna="text-blue-900" />
        <Kartu
          judul="Selisih Timbang Ulang"
          nilai={`${r.selisihTimbangUlang > 0 ? '+' : ''}${formatNumber(r.selisihTimbangUlang, 1)} kg`}
          ket={r.persenSelisih === null ? 'Belum ada bal pembanding' : `${persen(r.persenSelisih)} dari bruto gudang`}
          warna={selisihNegatif ? 'text-amber-700' : 'text-gray-900'}
        />
        <Kartu
          judul="Harga Rata-rata"
          nilai={r.hargaRataNetto === null ? '-' : formatRupiah(r.hargaRataNetto)}
          ket="Rp per kg netto, DO Selesai"
        />
        <Kartu judul="Nilai Penjualan" nilai={formatRupiah(r.nilaiPenjualan)} ket="Hanya DO berstatus Selesai" warna="text-emerald-700" />
        <Kartu judul="Nilai Berjalan" nilai={formatRupiah(r.nilaiBerjalan)} ket="DO belum Selesai" warna="text-amber-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Status pengiriman */}
        <Bagian judul="Status Surat Jalan">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                  <th className={th}>Status</th>
                  <th className={th}>DO</th>
                  <th className={th}>Bal</th>
                  <th className={th}>Bruto (Kg)</th>
                  <th className={th}>Porsi DO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {r.status.map((s) => (
                  <tr key={s.status}>
                    <td className={`${td} font-semibold text-gray-900`}>{s.label}</td>
                    <td className={`${td} text-center font-mono`}>{formatNumber(s.jumlahDO)}</td>
                    <td className={`${td} text-center font-mono`}>{formatNumber(s.bal)}</td>
                    <td className={`${td} text-right font-mono`}>{formatNumber(s.kg, 1)}</td>
                    <td className={`${td} text-center font-mono`}>{persen(s.persenDO)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bagian>

        {/* Sample QC */}
        <Bagian judul="Sample QC Pembeli" catatan="Sesuai periode dan pabrik terfilter">
          {sample.total === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500">Tidak ada pengiriman sample pada filter ini.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                    <th className={th}>Total</th>
                    <th className={th}>Disetujui</th>
                    <th className={th}>Nego</th>
                    <th className={th}>Ditolak</th>
                    <th className={th}>Menunggu</th>
                    <th className={th}>Tingkat Setuju</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${td} text-center font-mono font-bold`}>{formatNumber(sample.total)}</td>
                    <td className={`${td} text-center font-mono text-emerald-700 font-bold`}>{formatNumber(sample.disetujui)}</td>
                    <td className={`${td} text-center font-mono text-amber-700 font-bold`}>{formatNumber(sample.nego)}</td>
                    <td className={`${td} text-center font-mono text-red-700 font-bold`}>{formatNumber(sample.ditolak)}</td>
                    <td className={`${td} text-center font-mono`}>{formatNumber(sample.menunggu)}</td>
                    <td className={`${td} text-center font-mono font-bold`}>{persen(sample.persenSetuju)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="px-3 py-2 text-[11px] text-gray-500 border-t border-gray-200">
                {formatNumber(sample.sudahMasukDO)} sample sudah masuk Surat Jalan • total contoh {formatNumber(sample.totalGram / 1000, 2)} kg
              </p>
            </div>
          )}
        </Bagian>
      </div>

      {/* Pabrik tujuan */}
      <Bagian
        judul="Pabrik Tujuan Terbesar"
        catatan={r.pabrik.length > BATAS_PABRIK ? `${BATAS_PABRIK} dari ${r.pabrik.length} pabrik, selengkapnya di tab Rekapitulasi per Pabrik` : undefined}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                <th className={th}>Pabrik</th>
                <th className={th}>DO</th>
                <th className={th}>Bal</th>
                <th className={th}>Bruto (Kg)</th>
                <th className={th}>Netto Jual (Kg)</th>
                <th className={th}>Nilai Penjualan</th>
                <th className={th}>Porsi Tonase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pabrikTampil.map((p) => (
                <tr key={p.pabrik}>
                  <td className={`${td} font-semibold text-gray-900`}>{p.pabrik}</td>
                  <td className={`${td} text-center font-mono`}>{formatNumber(p.jumlahDO)}</td>
                  <td className={`${td} text-center font-mono`}>{formatNumber(p.bal)}</td>
                  <td className={`${td} text-right font-mono`}>{formatNumber(p.kg, 1)}</td>
                  <td className={`${td} text-right font-mono`}>{formatNumber(p.nettoJual, 1)}</td>
                  <td className={`${td} text-right font-mono`}>{formatRupiah(p.nilai)}</td>
                  <td className={`${td} text-center font-mono`}>{persen(p.persenKg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bagian>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Komposisi grade */}
        <Bagian judul="Komposisi Grade Terkirim" catatan={r.grade.length > BATAS_GRADE ? `${BATAS_GRADE} dari ${r.grade.length} grade` : undefined}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                  <th className={th}>Grade</th>
                  <th className={th}>Bal</th>
                  <th className={th}>Bruto (Kg)</th>
                  <th className={th}>Porsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {gradeTampil.map((g) => (
                  <tr key={g.grade}>
                    <td className={`${td} text-center font-mono font-bold text-gray-900`}>{g.grade}</td>
                    <td className={`${td} text-center font-mono`}>{formatNumber(g.bal)}</td>
                    <td className={`${td} text-right font-mono`}>{formatNumber(g.kg, 1)}</td>
                    <td className={`${td} text-center font-mono`}>{persen(g.persenKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bagian>

        {/* Per bulan */}
        <Bagian judul="Pengiriman per Bulan">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                  <th className={th}>Bulan</th>
                  <th className={th}>DO</th>
                  <th className={th}>Bal</th>
                  <th className={th}>Bruto (Kg)</th>
                  <th className={th}>Nilai Penjualan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {r.bulan.map((b) => (
                  <tr key={b.bulan}>
                    <td className={`${td} font-semibold text-gray-900`}>{labelBulan(b.bulan)}</td>
                    <td className={`${td} text-center font-mono`}>{formatNumber(b.jumlahDO)}</td>
                    <td className={`${td} text-center font-mono`}>{formatNumber(b.bal)}</td>
                    <td className={`${td} text-right font-mono`}>{formatNumber(b.kg, 1)}</td>
                    <td className={`${td} text-right font-mono`}>{formatRupiah(b.nilai)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bagian>
      </div>

      {/* Perlu perhatian */}
      <Bagian judul="Perlu Perhatian">
        {adaPerhatian ? (
          <ul className="divide-y divide-gray-200 text-xs">
            {r.perhatian.belumSelesai.length > 0 && (
              <li className="p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-gray-900">{formatNumber(r.perhatian.belumSelesai.length)} Surat Jalan belum Selesai</span>
                  <span className="text-gray-600"> (nilainya belum dihitung sebagai penjualan): </span>
                  <span className="font-mono text-gray-800">
                    {r.perhatian.belumSelesai
                      .slice(0, BATAS_DO_PERHATIAN)
                      .map((d) => `${d.no_surat_jalan}${d.hariSejakKirim !== null ? ` (${formatNumber(d.hariSejakKirim)} hari)` : ''}`)
                      .join(', ')}
                    {r.perhatian.belumSelesai.length > BATAS_DO_PERHATIAN ? `, +${r.perhatian.belumSelesai.length - BATAS_DO_PERHATIAN} lainnya` : ''}
                  </span>
                </div>
              </li>
            )}
            {r.perhatian.selesaiTanpaNilai.length > 0 && (
              <li className="p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-gray-900">{formatNumber(r.perhatian.selesaiTanpaNilai.length)} Surat Jalan Selesai tanpa nilai</span>
                  <span className="text-gray-600"> (harga jual belum terisi): </span>
                  <span className="font-mono text-gray-800">{r.perhatian.selesaiTanpaNilai.join(', ')}</span>
                </div>
              </li>
            )}
            {r.perhatian.balTidakDitemukan.length > 0 && (
              <li className="p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-gray-900">{formatNumber(r.perhatian.balTidakDitemukan.length)} Surat Jalan memuat bal yang datanya tidak ditemukan</span>
                  <span className="text-gray-600"> (berat dibaca dari catatan DO, grade tidak diketahui): </span>
                  <span className="font-mono text-gray-800">{r.perhatian.balTidakDitemukan.join(', ')}</span>
                </div>
              </li>
            )}
          </ul>
        ) : (
          <div className="p-3 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Semua Surat Jalan pada filter ini sudah Selesai dan lengkap datanya.</span>
          </div>
        )}
      </Bagian>

      {r.tanggalAwal && (
        <p className="text-[11px] text-gray-500">
          Rentang tanggal kirim pada data: {formatDateIndo(r.tanggalAwal)} s.d. {formatDateIndo(r.tanggalAkhir)}. Angka mengikuti filter yang sedang diterapkan.
        </p>
      )}
    </div>
  );
};

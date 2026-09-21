import React from 'react';
import { KopSurat } from './KopSurat';
import { susunHalamanDokumen, UkuranDokumen } from '../../utils/paginasiDokumen';

export interface DokumenBerlembarProps {
  ukuran: UkuranDokumen;
  /** Judul di kop surat halaman pertama. */
  judul: string;
  /** Teks kiri dan kanan pada judul lanjutan (halaman ke-2 dst.). */
  lanjutanKiri: string;
  lanjutanKanan?: string;
  /** Kotak data dokumen, hanya di halaman pertama. */
  meta: React.ReactNode;
  /** Lebar kolom tabel (elemen <colgroup>). */
  kolom: React.ReactNode;
  /** Isi <thead> (satu <tr>), diulang di tiap halaman. Tingginya harus ukuran.thead - 2. */
  kepalaTabel: React.ReactNode;
  /** Baris data; tiap <tr> wajib bertinggi ukuran.baris. */
  baris: React.ReactNode[];
  /** Baris TOTAL di ujung tabel. */
  barisTotal: React.ReactNode;
  /** Blok penutup: terbilang, catatan, syarat, tanda tangan. */
  ekor: React.ReactNode;
  footerKiri: string;
  footerKanan: string;
}

/**
 * Kerangka dokumen bertabel berlembar-lembar dengan aturan yang sama seperti Nota Pembelian.
 * Satu lembar = satu halaman PDF/cetak (data-pdf-page), jadi baris tidak terpotong di pergantian
 * halaman, judul kolom berulang, dan batas antarhalaman tampak jelas sebagai kertas terpisah.
 */
export const DokumenBerlembar: React.FC<DokumenBerlembarProps> = ({
  ukuran,
  judul,
  lanjutanKiri,
  lanjutanKanan,
  meta,
  kolom,
  kepalaTabel,
  baris,
  barisTotal,
  ekor,
  footerKiri,
  footerKanan,
}) => {
  const halamanList = susunHalamanDokumen(baris.length, ukuran);
  const jumlahHalaman = halamanList.length;

  return (
    <div className="nota-sheets text-xs text-slate-900 font-sans leading-normal">
      {halamanList.map((hal) => {
        const barisHalaman = baris.slice(hal.barisMulai, hal.barisAkhir);
        const punyaTabel = barisHalaman.length > 0 || hal.totalBaris;

        return (
          <section
            key={hal.nomor}
            className="nota-sheet"
            data-pdf-page
            aria-label={`Halaman ${hal.nomor} dari ${jumlahHalaman}`}
          >
            {hal.pertama ? (
              <>
                <KopSurat judul={judul} />
                {meta}
              </>
            ) : (
              <div className="flex items-end justify-between border-b-2 border-slate-800 pb-2">
                <div className="font-black uppercase tracking-wider text-slate-900 text-xs">{lanjutanKiri}</div>
                <div className="text-[11px] text-slate-600 font-medium">
                  {lanjutanKanan ? `${lanjutanKanan} • Lanjutan` : 'Lanjutan'}
                </div>
              </div>
            )}

            {/* Judul kolom diulang di setiap halaman dan bingkai tabel selalu tertutup */}
            {punyaTabel && (
              <div className="border border-slate-300 rounded-sm overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left border-collapse table-fixed">
                  {kolom}
                  <thead>{kepalaTabel}</thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800 text-[13px]">
                    {barisHalaman}
                    {hal.totalBaris && barisTotal}
                  </tbody>
                </table>
              </div>
            )}

            {hal.ekor && ekor}

            <div className="nota-footer mt-auto pt-3 border-t border-slate-300 flex justify-between items-center text-[11px] text-slate-500 font-mono">
              <div>{footerKiri}</div>
              <div>
                Halaman {hal.nomor} dari {jumlahHalaman} • {footerKanan}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};

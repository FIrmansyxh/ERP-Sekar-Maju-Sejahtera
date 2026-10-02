import { afterEach, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buatBal } from '../test/fixtures';
import type { Barang, MasterHargaJual, RiwayatNoBal } from '../types';
import { aturRiwayatNoBal } from './noBalPensiun';
import {
  KonteksImpor,
  angkaHarga,
  bacaBerkasImpor,
  cocokkanHarga,
  kenaliKolom,
  pecahCsv,
  periksaBarisImpor,
} from './imporSample';

const HJ: MasterHargaJual[] = [
  { harga_jual_id: 'HJ-001', kode: 'HJ-45', harga_jual: 45000, tanggal_berlaku: '2026-09-01', status_aktif: true },
  { harga_jual_id: 'HJ-002', kode: 'HJ-50', harga_jual: 50000, tanggal_berlaku: '2026-09-01', status_aktif: true },
];

const konteks = (extra: Partial<KonteksImpor> = {}, barang: Barang[] = []): KonteksImpor => ({
  barangList: barang.length
    ? barang
    : [
        buatBal('SB0001'),
        buatBal('SB0002'),
        buatBal('HF0003', { berat_bruto_kg: 0, berat_kg: 0, status_stok: 'proses_sortir' }),
        buatBal('SB0009', { status_stok: 'keluar' }),
      ],
  hargaJualAktif: HJ,
  cekBal: (bal) =>
    bal.status_stok === 'keluar'
      ? { isAvailable: false, message: `Bal ${bal.no_bal} tidak tersedia: sudah keluar gudang` }
      : { isAvailable: true, message: '' },
  noJadiDipakai: () => false,
  ...extra,
});

describe('impor Batch Sample: membaca kolom dan harga', () => {
  it('mengenali baris judul walau ada judul laporan di atasnya', () => {
    const peta = kenaliKolom([
      ['PENGIRIMAN SAMPLE PT X', '', ''],
      [''],
      ['Gulungan', 'No. Bal', 'Harga Tawaran'],
    ]);
    expect(peta).toEqual({ barisJudul: 2, noBal: 1, harga: 2, gulungan: 0, noJadi: null });
  });

  it('kolom No Jadi tidak tertukar dengan No Bal', () => {
    expect(kenaliKolom([['No Jadi', 'No Bal', 'Harga Jual']])).toMatchObject({ noBal: 1, noJadi: 0, harga: 2 });
  });

  it('judul tidak dikenali = null (user memilih kolom sendiri)', () => {
    expect(kenaliKolom([['A', 'B', 'C']])).toBeNull();
  });

  it('angka harga dari berbagai penulisan', () => {
    expect(angkaHarga('45000')).toBe(45000);
    expect(angkaHarga('45.000')).toBe(45000);
    expect(angkaHarga('Rp 45.000')).toBe(45000);
    expect(angkaHarga('45,000')).toBe(45000);
    expect(angkaHarga('45000.00')).toBe(45000);
    expect(angkaHarga('HJ-45')).toBeNull();
  });

  it('harga boleh kode atau angka; yang tidak ada di Master = null', () => {
    expect(cocokkanHarga('hj-45', HJ)?.kode).toBe('HJ-45');
    expect(cocokkanHarga('50.000', HJ)?.kode).toBe('HJ-50');
    expect(cocokkanHarga('47500', HJ)).toBeNull();
    expect(cocokkanHarga('HJ-99', HJ)).toBeNull();
  });

  it('CSV dengan titik koma dan tanda kutip', () => {
    expect(pecahCsv('Gulungan;No Bal;Harga Jual\r\n1;SB0001;"45.000"\n')).toEqual([
      ['Gulungan', 'No Bal', 'Harga Jual'],
      ['1', 'SB0001', '45.000'],
    ]);
  });
});

describe('impor Batch Sample: pemeriksaan per baris', () => {
  afterEach(() => aturRiwayatNoBal([]));

  const tab = (baris: string[][]) => ({ nama: 'Sample 1', baris: [['Gulungan', 'No Bal', 'Harga Jual'], ...baris] });
  const peta = { barisJudul: 0, noBal: 1, harga: 2, gulungan: 0, noJadi: null };

  it('bal ditemukan: berat & harga beli dari sistem, harga dicocokkan ke kode Master', () => {
    const [b] = periksaBarisImpor(tab([['1', 'SB0001', '45000']]), peta, konteks());
    expect(b).toMatchObject({ status: 'siap', barisExcel: 2, gulungan: '1', noJadi: 'SB0001' });
    expect(b.bal?.barang_id).toBe('SB0001');
    expect(b.hargaJual?.kode).toBe('HJ-45');
  });

  it('melaporkan No Bal tidak ada, sudah keluar, dobel, harga tidak ada di Master, dan kolom kosong', () => {
    const hasil = periksaBarisImpor(
      tab([
        ['1', 'SB0001', 'HJ-45'],
        ['', 'XX9999', 'HJ-45'],
        ['', 'SB0009', 'HJ-45'],
        ['2', 'sb-0001', 'HJ-50'],
        ['', 'SB0002', '47500'],
        ['', '', '45000'],
        ['', 'HF0003', ''],
      ]),
      peta,
      konteks()
    );
    expect(hasil.map((b) => [b.barisExcel, b.status, b.pesan[0]])).toEqual([
      [2, 'siap', undefined],
      [3, 'tolak', 'No Bal tidak ada di sistem'],
      [4, 'tolak', 'Bal SB0009 tidak tersedia: sudah keluar gudang'],
      [5, 'tolak', 'Dobel di file (sama dengan baris 2)'],
      [6, 'tolak', 'Harga "47500" tidak ada di Master Harga Jual'],
      [7, 'tolak', 'No Bal kosong'],
      [8, 'tolak', 'Harga kosong'],
    ]);
  });

  it('gulungan yang digabung (merge) atau hanya di baris pertama ikut ke baris di bawahnya; baris kosong dilewati', () => {
    const hasil = periksaBarisImpor(
      tab([
        ['G1', 'SB0001', 'HJ-45'],
        ['', 'SB0002', 'HJ-45'],
        ['', '', ''],
        ['G2', 'HF0003', 'HJ-50'],
      ]),
      peta,
      konteks()
    );
    expect(hasil.map((b) => [b.barisExcel, b.gulungan])).toEqual([
      [2, 'G1'],
      [3, 'G1'],
      [5, 'G2'],
    ]);
  });

  it('bal belum ditimbang tetap masuk dengan peringatan', () => {
    const [b] = periksaBarisImpor(tab([['1', 'HF0003', 'HJ-50']]), peta, konteks());
    expect(b.status).toBe('peringatan');
    expect(b.pesan).toEqual(['Belum ditimbang (berat 0 kg)']);
  });

  it('No Bal lama hasil Koreksi No Bal dikenali dan diganti ke nomor baru', () => {
    aturRiwayatNoBal([{ no_bal_lama: 'SB0100', no_bal_baru: 'SB0001', diganti_pada: '2026-09-30' } as RiwayatNoBal]);
    const [b] = periksaBarisImpor(tab([['1', 'SB0100', 'HJ-45']]), peta, konteks());
    expect(b.status).toBe('peringatan');
    expect(b.bal?.barang_id).toBe('SB0001');
    expect(b.pesan).toEqual(['No Bal lama, sekarang SB0001']);
  });

  it('No Jadi dari kolom No Jadi; yang sudah dipakai atau dobel ditolak', () => {
    const p = { barisJudul: 0, noBal: 1, harga: 2, gulungan: null, noJadi: 0 };
    const hasil = periksaBarisImpor(
      { nama: 't', baris: [['No Jadi', 'No Bal', 'Harga'], ['J1', 'SB0001', 'HJ-45'], ['J1', 'SB0002', 'HJ-45']] },
      p,
      konteks()
    );
    expect(hasil[0]).toMatchObject({ status: 'siap', noJadi: 'J1' });
    expect(hasil[1]).toMatchObject({ status: 'tolak', pesan: ['No Jadi J1 dobel di file (baris 2)'] });

    const [dipakai] = periksaBarisImpor(
      { nama: 't', baris: [['No Jadi', 'No Bal', 'Harga'], ['J9', 'SB0001', 'HJ-45']] },
      p,
      konteks({ noJadiDipakai: (n) => n === 'J9' })
    );
    expect(dipakai).toMatchObject({ status: 'tolak', pesan: ['No Jadi J9 sudah dipakai'] });
  });
});

describe('impor Batch Sample: membaca file', () => {
  const sebagaiFile = (isi: BlobPart, nama: string) => {
    const file = new File([isi], nama);
    // jsdom lama tidak punya File.arrayBuffer/text
    if (!('arrayBuffer' in file)) {
      Object.defineProperty(file, 'arrayBuffer', { value: () => new Response(isi).arrayBuffer() });
    }
    if (!('text' in file)) Object.defineProperty(file, 'text', { value: () => new Response(isi).text() });
    return file;
  };

  it('xlsx: semua tab terbaca, angka, rumus, dan sel gabungan menjadi teks', async () => {
    const wb = new ExcelJS.Workbook();
    const a = wb.addWorksheet('Sample PJM');
    a.addRow(['Gulungan', 'No Bal', 'Harga Jual']);
    a.addRow([1, 'SB0001', 45000]);
    a.addRow([null, 'SB0002', { formula: '40000+5000', result: 45000 }]);
    a.mergeCells('A2:A3');
    wb.addWorksheet('Sample GG').addRow(['No Bal', 'Harga']);
    const buffer = await wb.xlsx.writeBuffer();

    const tab = await bacaBerkasImpor(sebagaiFile(buffer as ArrayBuffer, 'daftar.xlsx'));
    expect(tab.map((t) => t.nama)).toEqual(['Sample PJM', 'Sample GG']);
    expect(tab[0].baris).toEqual([
      ['Gulungan', 'No Bal', 'Harga Jual'],
      ['1', 'SB0001', '45000'],
      ['1', 'SB0002', '45000'],
    ]);
  });

  it('csv dibaca sebagai satu tab; .xls lama ditolak dengan pesan jelas', async () => {
    const tab = await bacaBerkasImpor(sebagaiFile('No Bal,Harga Jual\nSB0001,HJ-45\n', 'pjm.csv'));
    expect(tab).toEqual([{ nama: 'pjm', baris: [['No Bal', 'Harga Jual'], ['SB0001', 'HJ-45']] }]);
    await expect(bacaBerkasImpor(sebagaiFile('x', 'lama.xls'))).rejects.toThrow(/\.xls lama/);
  });
});

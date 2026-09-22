import { describe, expect, it } from 'vitest';
import { buatBal, buatBatch, buatItemSample, buatSuratJalan } from '../test/fixtures';
import {
  cariSuratJalanBentrok,
  keluarkanBal,
  kembalikanBalKeGudang,
  masukkanBalKeMuatan,
  sesuaikanBatchSetelahPerubahanDO,
} from './alurPengiriman';

describe('stok bal mengikuti Surat Jalan (bal baru "keluar" sungguhan saat Surat Jalan Selesai)', () => {
  const daftar = [
    buatBal('B1', { status_stok: 'keluar', pengiriman_id: '1' }),
    buatBal('B2', { status_stok: 'di_gudang' }),
    buatBal('B3', { status_stok: 'terkirim_sample' }),
  ];

  it('bal yang sudah keluar (Surat Jalan Selesai lalu dibatalkan) kembali ke gudang dan tidak lagi menunjuk Surat Jalan', () => {
    const hasil = kembalikanBalKeGudang(daftar, new Set(['B1']));
    expect(hasil[0]).toMatchObject({ status_stok: 'di_gudang', pengiriman_id: undefined });
  });

  it('bal yang belum pernah keluar tetap tidak berubah status, tapi tautan Surat Jalannya tetap dilepas', () => {
    const hasil = kembalikanBalKeGudang(daftar, new Set(['B2', 'B3']));
    expect(hasil[1]).toMatchObject({ status_stok: 'di_gudang', pengiriman_id: undefined });
    expect(hasil[2]).toMatchObject({ status_stok: 'terkirim_sample', pengiriman_id: undefined });
  });

  it('bal masuk muatan Surat Jalan: hanya menunjuk Surat Jalannya, status stok tidak berubah', () => {
    const hasil = masukkanBalKeMuatan(daftar, new Set(['B2']), '7');
    expect(hasil[1]).toMatchObject({ status_stok: 'di_gudang', pengiriman_id: '7' });
    expect(hasil[0]).toBe(daftar[0]);
  });

  it('bal benar-benar keluar (dipanggil saat Surat Jalan Selesai) dan mencatat nomor Surat Jalannya', () => {
    const hasil = keluarkanBal(daftar, new Set(['B2']), '7');
    expect(hasil[1]).toMatchObject({ status_stok: 'keluar', pengiriman_id: '7' });
    expect(hasil[0]).toBe(daftar[0]);
  });
});

describe('cariSuratJalanBentrok', () => {
  const daftarSJ = [buatSuratJalan('1', 'dikirim', { barang_ids: ['B1'] }), buatSuratJalan('2', 'dikirim', { barang_ids: ['B2'] })];

  it('menemukan Surat Jalan lain yang sudah memuat bal', () => {
    expect(cariSuratJalanBentrok(daftarSJ, '1', new Set(['B2']))?.pengiriman_id).toBe('2');
  });
  it('bal milik Surat Jalan yang sedang diedit sendiri tidak dianggap bentrok', () => {
    expect(cariSuratJalanBentrok(daftarSJ, '1', new Set(['B1']))).toBeUndefined();
  });
});

describe('sesuaikanBatchSetelahPerubahanDO', () => {
  it('tanpa rujukan batch atau tanpa perubahan bal, daftar tidak berubah', () => {
    const daftar = [buatBatch('1', 'sample')];
    expect(sesuaikanBatchSetelahPerubahanDO(daftar, undefined, new Set(['B1']), new Set()).batchList).toBe(daftar);
    expect(sesuaikanBatchSetelahPerubahanDO(daftar, '1', new Set(), new Set()).batchList).toBe(daftar);
  });

  it('semua bal yang tidak ditolak punya DO: batch menjadi selesai', () => {
    const daftar = [buatBatch('1', 'diproses', { items: [buatItemSample('B1'), buatItemSample('B2', { status_item: 'ditolak' })] })];
    const { batchList, batchTerkait } = sesuaikanBatchSetelahPerubahanDO(daftar, '1', new Set(['B1']), new Set());
    expect(batchList[0].status).toBe('selesai');
    expect(batchList[0].items[0].sudah_dikirim_do).toBe(true);
    expect(batchTerkait?.batch_id).toBe('1');
  });

  it('DO dibatalkan: tanda dicabut dan batch selesai dibuka lagi menjadi diproses', () => {
    const daftar = [
      buatBatch('1', 'selesai', { items: [buatItemSample('B1', { sudah_dikirim_do: true }), buatItemSample('B2', { sudah_dikirim_do: true })] }),
    ];
    const { batchList } = sesuaikanBatchSetelahPerubahanDO(daftar, '1', new Set(), new Set(['B1', 'B2']));
    expect(batchList[0].status).toBe('diproses');
    expect(batchList[0].items.every((it) => it.sudah_dikirim_do === false)).toBe(true);
  });

  it('sebagian bal dikeluarkan dari DO: batch selesai terbuka lagi, batch lain tidak tersentuh', () => {
    const daftar = [
      buatBatch('1', 'selesai', { items: [buatItemSample('B1', { sudah_dikirim_do: true }), buatItemSample('B2', { sudah_dikirim_do: true })] }),
      buatBatch('2', 'sample'),
    ];
    const { batchList } = sesuaikanBatchSetelahPerubahanDO(daftar, 'SAMPLE-1', new Set(), new Set(['B2']));
    expect(batchList[0].status).toBe('diproses');
    expect(batchList[0].items.map((it) => it.sudah_dikirim_do)).toEqual([true, false]);
    expect(batchList[1]).toBe(daftar[1]);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { buatKupon } from '../test/fixtures';
import type { TransaksiItemBal } from '../types';
import { mergeKuponParalel } from './kuponSortir';
import {
  balDihapusDariKupon,
  batalkanBalDihapus,
  catatBalDihapus,
  isIdBalServer,
  konfirmasiBalDihapus,
  pindahkanBalDihapus,
} from './balDihapus';

const item = (no: string, extra: Partial<TransaksiItemBal> = {}) =>
  ({ item_id: `TRX-1-BAL-${no}`, no_bal: no, kode_grade: '57', harga_per_kg: 45000, berat_kg: 0, ...extra }) as TransaksiItemBal;

const noBal = (tx: { items?: TransaksiItemBal[] }) => (tx.items || []).map((i) => i.no_bal).sort();

beforeEach(() => {
  localStorage.clear();
});

describe('penanda bal yang dihapus', () => {
  it('dicatat per kupon, dibatalkan saat No Bal ditambah lagi, dan dipindah saat ID kupon diganti server', () => {
    catatBalDihapus('TRX-1', '12b');
    expect(balDihapusDariKupon('TRX-1')).toEqual(new Set(['12B']));
    expect(balDihapusDariKupon('TRX-2').size).toBe(0);

    pindahkanBalDihapus('TRX-1', 'TRX-9');
    expect(balDihapusDariKupon('TRX-1').size).toBe(0);
    expect(balDihapusDariKupon('TRX-9')).toEqual(new Set(['12B']));

    batalkanBalDihapus('TRX-9', '12B');
    expect(balDihapusDariKupon('TRX-9').size).toBe(0);
  });

  it('hilang begitu server tidak memuat bal itu lagi (penghapusan terkonfirmasi)', () => {
    catatBalDihapus('TRX-1', '02');
    konfirmasiBalDihapus('TRX-1', ['01', '02']);
    expect(balDihapusDariKupon('TRX-1').size).toBe(1);
    konfirmasiBalDihapus('TRX-1', ['01']);
    expect(balDihapusDariKupon('TRX-1').size).toBe(0);
  });

  it('mengenali ID bal buatan server', () => {
    expect(isIdBalServer('TRX-23092026-005-K7Q2-BAL-03')).toBe(true);
    expect(isIdBalServer('BAL-ITEM-1717171717-2')).toBe(false);
    expect(isIdBalServer(undefined)).toBe(false);
  });
});

describe('mergeKuponParalel: hapus & ganti No Bal tidak dibatalkan oleh versi server', () => {
  it('bal yang dihapus di perangkat ini tidak terbawa balik dari versi server', () => {
    catatBalDihapus('TRX-1', '02');
    const layar = buatKupon('TRX-1', { items: [item('01')] });
    const server = buatKupon('TRX-1', { items: [item('01'), item('02')] });

    expect(noBal(mergeKuponParalel(layar, server, { incomingDariServer: true }))).toEqual(['01']);
    expect(noBal(mergeKuponParalel(server, layar))).toEqual(['01']);
  });

  it('bal yang sudah dihapus di perangkat lain (ber-ID server, tidak ada lagi di server) tidak dipertahankan', () => {
    const layarBasi = buatKupon('TRX-1', { items: [item('01'), item('02')] });
    const server = buatKupon('TRX-1', { items: [item('01')] });

    expect(noBal(mergeKuponParalel(layarBasi, server, { incomingDariServer: true }))).toEqual(['01']);
  });

  it('bal baru di perangkat ini yang belum sampai ke server tetap ada', () => {
    const layar = buatKupon('TRX-1', { items: [item('01'), item('03', { item_id: 'BAL-ITEM-1717-3' })] });
    const server = buatKupon('TRX-1', { items: [item('01')] });

    expect(noBal(mergeKuponParalel(layar, server, { incomingDariServer: true }))).toEqual(['01', '03']);
  });

  it('bal tambahan dari perangkat lain tetap ikut digabung', () => {
    const layar = buatKupon('TRX-1', { items: [item('01')] });
    const server = buatKupon('TRX-1', { items: [item('01'), item('04')] });

    expect(noBal(mergeKuponParalel(layar, server, { incomingDariServer: true }))).toEqual(['01', '04']);
  });

  it('ganti No Bal yang lebih baru di layar menang atas nomor lama di server (bal yang sama, item_id sama)', () => {
    const layar = buatKupon('TRX-1', { items: [item('01'), { ...item('02'), no_bal: '02X', diubah_lokal_pada: Date.now() }] });
    const server = buatKupon('TRX-1', { items: [item('01'), item('02')] });

    const hasil = mergeKuponParalel(layar, server, { incomingDariServer: true });
    expect(noBal(hasil)).toEqual(['01', '02X']);
    expect(hasil.items?.find((i) => i.no_bal === '02X')?.item_id).toBe('TRX-1-BAL-02');
  });

  it('tanpa tanda waktu, nomor dari versi yang datang tetap dipakai (perilaku lama)', () => {
    const lama = buatKupon('TRX-1', { items: [item('02')] });
    const baru = buatKupon('TRX-1', { items: [{ ...item('02'), no_bal: '02Y' }] });

    expect(noBal(mergeKuponParalel(lama, baru))).toEqual(['02Y']);
  });
});

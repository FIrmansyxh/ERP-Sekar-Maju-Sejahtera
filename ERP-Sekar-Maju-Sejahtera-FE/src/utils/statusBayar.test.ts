import { describe, expect, it } from 'vitest';
import { Barang, TransaksiPembelian } from '../types';
import { alasanKuponTerkunciBayar, filterBarangLunas, isTransaksiLunas, labelStatusBayar } from './statusBayar';

const tx = (id: string, bayar: Partial<TransaksiPembelian>): TransaksiPembelian =>
  ({ transaksi_id: id, items: [], ...bayar }) as unknown as TransaksiPembelian;
const bal = (id: string, transaksi?: string): Barang =>
  ({ barang_id: id, transaksi_pembelian_id: transaksi }) as unknown as Barang;

describe('isTransaksiLunas', () => {
  it('lunas hanya bila status lunas atau metode cash', () => {
    expect(isTransaksiLunas({ status_pembayaran: 'lunas' })).toBe(true);
    expect(isTransaksiLunas({ metode_pembayaran: 'cash' })).toBe(true);
  });
  it('status kosong atau data lama dianggap belum lunas', () => {
    expect(isTransaksiLunas({})).toBe(false);
    expect(isTransaksiLunas(null)).toBe(false);
    expect(labelStatusBayar(undefined)).toBe('Belum Lunas');
  });
});

describe('filterBarangLunas', () => {
  it('membuang bal dari kupon yang belum lunas, mempertahankan bal tanpa kaitan transaksi', () => {
    const transaksi = [tx('T1', { status_pembayaran: 'lunas' }), tx('T2', {})];
    const hasil = filterBarangLunas([bal('A', 'T1'), bal('B', 'T2'), bal('C')], transaksi);
    expect(hasil.map((b) => b.barang_id)).toEqual(['A', 'C']);
  });
});

describe('alasanKuponTerkunciBayar', () => {
  it('kupon yang sudah dibayar terkunci dan menyebut nomor kuponnya', () => {
    expect(alasanKuponTerkunciBayar({ no_kupon: 'KUP0001', status_pembayaran: 'lunas' })).toContain('KUP0001');
    expect(alasanKuponTerkunciBayar({ no_kupon: 'KUP0002', metode_pembayaran: 'cash' })).not.toBeNull();
  });
  it('kupon belum dibayar atau tidak ada tidak terkunci', () => {
    expect(alasanKuponTerkunciBayar({ no_kupon: 'KUP0003', status_pembayaran: 'belum_lunas' })).toBeNull();
    expect(alasanKuponTerkunciBayar(undefined)).toBeNull();
  });
});

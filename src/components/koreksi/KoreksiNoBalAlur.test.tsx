import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { DialogHost } from '../common/DialogHost';
import { INITIAL_USER_DATA } from '../../data/initialUserData';
import {
  loadBarangData,
  loadTransaksiData,
  saveBarangData,
  saveCurrentUser,
  saveRiwayatNoBalData,
  saveTransaksiData,
  STORAGE_KEY_BARANG,
  STORAGE_KEY_RIWAYAT_NO_BAL,
} from '../../utils/storage';
import { buatBal, buatKupon } from '../../test/fixtures';
import type { TransaksiItemBal } from '../../types';

const item = (no: string, seq: number, extra: Partial<TransaksiItemBal> = {}) =>
  ({ item_id: `TRX-1-BAL-0${seq}`, no_bal: no, kode_grade: '57', harga_per_kg: 45000, berat_kg: 50, berat_bruto_kg: 55, potongan: 10000, ...extra }) as TransaksiItemBal;

const tombolMenu = (awalan: string) => within(document.body).getAllByRole('button').find((b) => (b.textContent || '').startsWith(awalan))!;

/** Alur nyata: ganti No Bal di menu Koreksi No Bal, lalu nomor lama tetap bisa dicari di Laporan Bal. */
describe('Koreksi No Bal sampai Laporan Bal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('server tidak terjangkau')));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    saveCurrentUser({ ...INITIAL_USER_DATA[0] });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  for (const lunas of [false, true]) {
    it(`kupon ${lunas ? 'lunas' : 'belum lunas'}: nomor lama tetap bisa dicari`, async () => {
      saveTransaksiData([
        buatKupon('TRX-1', {
          items: [item('SB0011', 1, { barang_id: 'BAL-1-01' }), item('SB0012', 2, { barang_id: 'BAL-1-02' })],
          status_pembayaran: lunas ? 'lunas' : 'belum_lunas',
        }),
      ]);
      saveBarangData([
        buatBal('BAL-1-01', { no_bal: 'SB0011', transaksi_pembelian_id: 'TRX-1', tanggal_masuk: '2026-09-19' }),
        buatBal('BAL-1-02', { no_bal: 'SB0012', transaksi_pembelian_id: 'TRX-1', tanggal_masuk: '2026-09-19' }),
      ]);
      const u = userEvent.setup();
      render(
        <>
          <App />
          <DialogHost />
        </>
      );
      await screen.findByRole('button', { name: /^Home/ });

      await u.click(tombolMenu('Koreksi No Bal'));
      await u.type(await screen.findByPlaceholderText(/ketik No Bal/, {}, { timeout: 8000 }), 'SB0011{Enter}');
      await u.type(await screen.findByLabelText(/No Bal Baru/), 'SB0999');
      await u.type(screen.getByLabelText(/Alasan/), 'label tertukar');
      await u.click(screen.getByRole('button', { name: /Simpan/ }));
      await u.click(await screen.findByRole('button', { name: 'Ganti' }));
      await screen.findAllByText(/diganti menjadi SB0999/);
      // Kupon & nota tetap nomor saat disortir
      expect(loadTransaksiData()[0].items!.map((it) => it.no_bal)).toEqual(['SB0011', 'SB0012']);

      await u.click(tombolMenu('Laporan Bal'));
      const cepat = await screen.findByPlaceholderText(/Cari cepat/, {}, { timeout: 8000 });
      await u.type(cepat, 'SB0011');
      expect(screen.queryAllByText('SB0999').length).toBeGreaterThan(0);
      expect(screen.queryAllByText('SB0012')).toHaveLength(0);
      // Satu baris: No Bal Awal SB0011, No Bal Baru SB0999
      const baris = screen.getAllByText('SB0999')[0].closest('tr')!;
      expect(within(baris).getByText('SB0011')).toBeInTheDocument();
      await u.clear(cepat);

      await u.type(screen.getByPlaceholderText('No bal, petani, barcode...'), 'SB0011{Enter}');
      expect(screen.queryAllByText('SB0999').length).toBeGreaterThan(0);
      expect(screen.queryAllByText('SB0012')).toHaveLength(0);
    }, 30000);
  }

  it('server belum punya endpoint: penggantian tetap berlaku di perangkat ini dan menunggu di antrean; kupon tidak berubah', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        String(url).includes('/bal/ganti-no-bal')
          ? Promise.resolve(
              new Response(JSON.stringify({ message: 'The route api/v1/bal/ganti-no-bal could not be found.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
              })
            )
          : Promise.reject(new Error('server tidak terjangkau'))
      )
    );
    saveTransaksiData([buatKupon('TRX-1', { items: [item('SB0011', 1, { barang_id: 'BAL-1-01' })], status_pembayaran: 'belum_lunas' })]);
    saveBarangData([buatBal('BAL-1-01', { no_bal: 'SB0011', transaksi_pembelian_id: 'TRX-1', tanggal_masuk: '2026-09-19' })]);
    const u = userEvent.setup();
    render(
      <>
        <App />
        <DialogHost />
      </>
    );
    await screen.findByRole('button', { name: /^Home/ });
    await u.click(tombolMenu('Koreksi No Bal'));
    await u.type(await screen.findByPlaceholderText(/ketik No Bal/, {}, { timeout: 8000 }), 'SB0011{Enter}');
    await u.type(await screen.findByLabelText(/No Bal Baru/), 'SB0999');
    await u.type(screen.getByLabelText(/Alasan/), 'uji');
    await u.click(screen.getByRole('button', { name: /Simpan/ }));
    await u.click(await screen.findByRole('button', { name: 'Ganti' }));

    await screen.findAllByText(/diganti menjadi SB0999/);
    expect(loadBarangData().find((b) => b.barang_id === 'BAL-1-01')?.no_bal).toBe('SB0999');
    expect(loadTransaksiData()[0].items![0].no_bal).toBe('SB0011');
    await vi.waitFor(() => expect(localStorage.getItem('sms_antrian_mutasi_v1') || '').toContain('no_bal|'));
  }, 30000);

  it('No Bal diganti di tab lain: Laporan Bal yang sudah terbuka ikut mengenal nomor lamanya', async () => {
    saveTransaksiData([buatKupon('TRX-1', { items: [item('SB0011', 1, { barang_id: 'BAL-1-01' })], status_pembayaran: 'belum_lunas' })]);
    saveBarangData([buatBal('BAL-1-01', { no_bal: 'SB0011', transaksi_pembelian_id: 'TRX-1', tanggal_masuk: '2026-09-19' })]);
    const u = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: /^Home/ });
    await u.click(tombolMenu('Laporan Bal'));
    const cepat = await screen.findByPlaceholderText(/Cari cepat/, {}, { timeout: 8000 });

    // Tab lain mengganti SB0011 menjadi SB0999 lalu menyimpan bal dan riwayatnya (kupon tetap SB0011)
    saveBarangData([buatBal('BAL-1-01', { no_bal: 'SB0999', transaksi_pembelian_id: 'TRX-1', tanggal_masuk: '2026-09-19' })]);
    saveRiwayatNoBalData([
      {
        riwayat_id: 'R1', transaksi_id: 'TRX-1', item_id: 'TRX-1-BAL-01', barang_id: 'BAL-1-01', no_bal_lama: 'SB0011', no_bal_baru: 'SB0999',
        tahap: 'timbang', ubah_nota: false, alasan: 'x', diganti_oleh: 'A', diganti_pada: '2026-09-30T01:00:00Z',
      },
    ]);
    act(() => {
      [STORAGE_KEY_BARANG, STORAGE_KEY_RIWAYAT_NO_BAL].forEach((key) => window.dispatchEvent(new StorageEvent('storage', { key })));
    });

    await u.type(cepat, 'SB0011');
    await vi.waitFor(() => expect(screen.queryAllByText('SB0999').length).toBeGreaterThan(0));
  }, 30000);
});

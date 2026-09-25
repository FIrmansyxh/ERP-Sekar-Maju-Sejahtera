import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortirPageView } from './SortirPageView';
import { buatKupon } from '../../test/fixtures';
import { TransaksiItemBal, TransaksiPembelian } from '../../types';

const bal = (extra: Partial<TransaksiItemBal> = {}) =>
  ({ item_id: 'TRX-1-BAL-01', barang_id: 'BAL-1-01', no_bal: 'A1', kode_grade: '57', harga_per_kg: 30000, berat_kg: 0, ...extra }) as TransaksiItemBal;

const kuponSortir = (item: TransaksiItemBal) =>
  buatKupon('TRX-1', { status_tahap: 'proses_sortir', status_pembayaran: 'belum_lunas', items: [item], total_bal: 1 } as Partial<TransaksiPembelian>);

describe('Sortir: hapus bal', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('bal yang ternyata sudah ditimbang di komputer lain tidak ikut terhapus', async () => {
    // Regresi 2026-09-25: Sortir dulu tidak disegarkan dan memeriksa status timbang dari salinan layarnya sendiri,
    // sehingga bal yang baru ditimbang di Timbangan bisa dihapus beserta hasil timbangnya
    const simpan = vi.fn().mockResolvedValue(true);
    render(
      <SortirPageView
        petaniList={[]}
        hargaList={[]}
        transaksiList={[kuponSortir(bal())]}
        userRole="superadmin"
        onSaveTransaksi={simpan}
        onNavigateToTimbangan={vi.fn()}
        onRefreshTransaksiList={vi.fn().mockResolvedValue([kuponSortir(bal({ berat_kg: 40, berat_bruto_kg: 42 }))])}
        initialTxId="TRX-1"
      />
    );

    await userEvent.click(await screen.findByTitle('Hapus bal ini dari kupon'));

    await waitFor(() => expect(screen.getByText(/sudah ditimbang \(40 kg\) sehingga tidak bisa dihapus/)).toBeInTheDocument());
    expect(simpan).not.toHaveBeenCalled();
  });
});

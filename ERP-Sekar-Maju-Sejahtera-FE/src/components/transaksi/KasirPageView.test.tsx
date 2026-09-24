import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KasirPageView } from './KasirPageView';
import { buatKupon } from '../../test/fixtures';
import { TransaksiItemBal } from '../../types';

const item = (no: string, berat: number) => ({ item_id: `I-${no}`, no_bal: no, berat_kg: berat, kode_grade: '57' }) as unknown as TransaksiItemBal;

const kuponList = [
  buatKupon('1', { status_pembayaran: 'lunas', items: [item('T1', 30)], total_bal: 1, harga_final: 900000 }),
  buatKupon('2', { items: [item('T2', 30)], total_bal: 1, harga_final: 800000 }), // siap bayar
  buatKupon('3', { items: [item('T3', 0)], total_bal: 1, harga_final: 0 }), // belum lengkap timbang
];

const props = {
  transaksiList: kuponList,
  petaniList: [],
  hargaList: [],
  barangList: [],
  userRole: 'superadmin' as const,
  onSaveTransaksi: vi.fn(),
  onNavigateToSortir: vi.fn(),
  onNavigateToTimbangan: vi.fn(),
};

const kartu = (judul: string) => screen.getByRole('button', { name: new RegExp(`^${judul}`) });

describe('Kasir: kartu status pembayaran', () => {
  it('menampilkan lima kartu dengan jumlah kupon per status', () => {
    render(<KasirPageView {...props} />);
    expect(within(kartu('Semua Status')).getByText('3')).toBeInTheDocument();
    expect(within(kartu('Siap Bayar')).getByText('1')).toBeInTheDocument();
    expect(within(kartu('Belum Lengkap Timbang')).getByText('1')).toBeInTheDocument();
    expect(within(kartu('Lunas')).getByText('1')).toBeInTheDocument();
    expect(within(kartu('Belum Lunas')).getByText('2')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Siap Bayar/ })).not.toBeInTheDocument(); // dropdown lama sudah diganti
  });

  it('satu klik pada kartu menyaring tabel dan menandai kartu aktif', async () => {
    render(<KasirPageView {...props} />);
    expect(screen.getByText('KUP1')).toBeInTheDocument();
    expect(screen.getByText('KUP2')).toBeInTheDocument();
    expect(screen.getByText('KUP3')).toBeInTheDocument();

    await userEvent.click(kartu('Lunas'));
    expect(kartu('Lunas')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('KUP1')).toBeInTheDocument();
    expect(screen.queryByText('KUP2')).not.toBeInTheDocument();
    expect(screen.queryByText('KUP3')).not.toBeInTheDocument();

    await userEvent.click(kartu('Belum Lengkap Timbang'));
    expect(screen.getByText('KUP3')).toBeInTheDocument();
    expect(screen.queryByText('KUP1')).not.toBeInTheDocument();

    await userEvent.click(kartu('Semua Status'));
    expect(screen.getByText('KUP1')).toBeInTheDocument();
    expect(screen.getByText('KUP2')).toBeInTheDocument();
  });
});

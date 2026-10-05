import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KasirPageView } from './KasirPageView';
import { buatKupon } from '../../test/fixtures';
import { TransaksiItemBal } from '../../types';
import { ErpApiService } from '../../services/erpApi';

const item = (no: string, berat: number) => ({ item_id: `I-${no}`, no_bal: no, berat_kg: berat, kode_grade: '57' }) as unknown as TransaksiItemBal;

const i = (no: string, berat: number) => ({ item_id: `I-${no}`, no_bal: no, berat_kg: berat, kode_grade: '57' });
const b = (id: string, extra: any) => ({
  transaksi_id: id,
  no_kupon: `KUP${id}`,
  petani_id: 'P1',
  nama_petani: 'Petani Satu',
  ...extra
});

const mockKuponList = [
  b('1', { status_pembayaran: 'lunas', items: [i('T1', 30)], total_bal: 1, harga_final: 900000 }),
  b('2', { status_pembayaran: 'belum_lunas', items: [i('T2', 30)], total_bal: 1, harga_final: 800000 }), // siap bayar
  b('3', { status_pembayaran: 'belum_lunas', items: [i('T3', 0)], total_bal: 1, harga_final: 0 }), // belum lengkap timbang
];

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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(ErpApiService, 'getTransaksiListPaginated').mockImplementation((page, limit, filters) => {
      let filtered = mockKuponList;
      if (filters?.status_bayar) {
         if (filters.status_bayar === 'cash') filtered = filtered.filter(t => t.status_pembayaran === 'lunas');
         if (filters.status_bayar === 'kredit') filtered = filtered.filter(t => t.status_pembayaran !== 'lunas');
         if (filters.status_bayar === 'siap_bayar') filtered = filtered.filter(t => t.status_pembayaran !== 'lunas' && !t.items?.some((item: any) => item.berat_kg <= 0));
         if (filters.status_bayar === 'belum_lengkap') filtered = filtered.filter(t => t.items?.some((item: any) => item.berat_kg <= 0));
      }
      return Promise.resolve({ data: filtered, pagination: { total: filtered.length }, fromBackend: true } as any);
    });

    vi.spyOn(ErpApiService, 'getKasirSummary').mockImplementation(() => {
      return Promise.resolve({
        data: {
          semua: { jumlah: 3, nilai: 1700000 },
          siapBayar: { jumlah: 1, nilai: 800000 },
          belumLengkap: { jumlah: 1, nilai: 0 },
          lunas: { jumlah: 1, nilai: 900000 },
          belumLunas: { jumlah: 2, nilai: 800000 },
          totalTx: 3,
          totalBal: 3,
          totalNetto: 60,
          totalKotor: 1700000,
          totalPajak: 0,
          totalPotongan: 0,
          totalBayar: 1700000,
        },
        tidakBerubah: false,
      });
    });
  });

  it('menampilkan lima kartu dengan jumlah kupon per status', async () => {
    render(<KasirPageView {...props} />);
    await waitFor(() => {
      expect(within(kartu('Semua Status')).getByText('3')).toBeInTheDocument();
    });
    expect(within(kartu('Siap Bayar')).getByText('1')).toBeInTheDocument();
    expect(within(kartu('Belum Lengkap Timbang')).getByText('1')).toBeInTheDocument();
    expect(within(kartu('Lunas')).getByText('1')).toBeInTheDocument();
    expect(within(kartu('Belum Lunas')).getByText('2')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Siap Bayar/ })).not.toBeInTheDocument(); // dropdown lama sudah diganti
  });

  it('satu klik pada kartu menyaring tabel dan menandai kartu aktif', async () => {
    render(<KasirPageView {...props} />);
    
    await waitFor(() => {
      expect(screen.getByText('KUP1')).toBeInTheDocument();
    });
    expect(screen.getByText('KUP2')).toBeInTheDocument();
    expect(screen.getByText('KUP3')).toBeInTheDocument();

    await userEvent.click(kartu('Lunas'));
    await waitFor(() => {
      expect(kartu('Lunas')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('KUP1')).toBeInTheDocument();
      expect(screen.queryByText('KUP2')).not.toBeInTheDocument();
      expect(screen.queryByText('KUP3')).not.toBeInTheDocument();
    });

    await userEvent.click(kartu('Belum Lengkap Timbang'));
    await waitFor(() => {
      expect(screen.getByText('KUP3')).toBeInTheDocument();
      expect(screen.queryByText('KUP1')).not.toBeInTheDocument();
    });

    await userEvent.click(kartu('Semua Status'));
    await waitFor(() => {
      expect(screen.getByText('KUP1')).toBeInTheDocument();
      expect(screen.getByText('KUP2')).toBeInTheDocument();
    });
  });
});

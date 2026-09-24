import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LaporanBalRekap } from './LaporanBalRekap';
import { BalRekapInput } from '../../utils/rekapKodeBal';

const rows: BalRekapInput[] = [
  { no_bal: 'HF0001', berat_kg: 0, harga_per_kg: 50000, status_bayar: 'belum_lunas' },
  { no_bal: 'HF0002', berat_kg: 40, berat_bruto_kg: 44, harga_per_kg: 50000, status_bayar: 'belum_lunas' },
  { no_bal: 'HF0003', berat_kg: 30, berat_bruto_kg: 33, harga_per_kg: 60000, status_bayar: 'lunas' },
  { no_bal: 'SB0001', berat_kg: 20, berat_bruto_kg: 22, harga_per_kg: 100000, status_bayar: 'lunas' },
];

const tampil = (extra: Partial<React.ComponentProps<typeof LaporanBalRekap>> = {}) =>
  render(<LaporanBalRekap rows={rows} rowsSepanjangMasa={rows} adaFilterTanggal={false} konteks="Semua tanggal" {...extra} />);

const baris = (kode: string) => within(screen.getByText(kode, { selector: 'td' }).closest('tr') as HTMLElement);

describe('Rekap per Kode Bal: tampilan besar seperti Laporan Kode Bal yang lama', () => {
  it('kolom sama dengan laporan lama, jumlah bal semua bal dengan rincian belum ditimbang / belum lunas', () => {
    tampil();
    const kepala = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(kepala).toEqual(['Kode Bal', 'Jumlah Bal', 'Berat Bruto', 'Berat Netto', 'AVG Harga', 'Total Nilai']);

    const sel = baris('HF').getAllByRole('cell');
    expect(sel[1]).toHaveTextContent(/^3 Bal/);
    expect(sel[1]).toHaveTextContent('1 belum ditimbang · 1 belum lunas');
    // berat dan nilai hanya dari bal yang ditimbang dan lunas (HF0003)
    expect(sel[2]).toHaveTextContent('33 Kg');
    expect(sel[3]).toHaveTextContent('30 Kg');
    expect(sel[4]).toHaveTextContent('Rp 60.000');
    expect(sel[5]).toHaveTextContent('Rp 1.800.000');
  });

  it('baris TOTAL menjumlahkan semua kode', () => {
    tampil();
    const total = within(screen.getByText('TOTAL').closest('tr') as HTMLElement);
    expect(total.getByText('4 Bal')).toBeInTheDocument();
    expect(total.getByText('55 Kg')).toBeInTheDocument(); // bruto lunas 33 + 22
    expect(total.getByText('50 Kg')).toBeInTheDocument(); // netto lunas 30 + 20
    expect(total.getByText('Rp 3.800.000')).toBeInTheDocument();
  });

  it('kolom bisa diurutkan dan kode bisa dicari', async () => {
    tampil();
    const urutan = () => screen.getAllByRole('row').map((r) => r.textContent).filter((t) => /^(HF|SB)/.test(t || '')).map((t) => (t || '').slice(0, 2));
    expect(urutan()).toEqual(['HF', 'SB']);

    await userEvent.click(screen.getByRole('columnheader', { name: /Total Nilai/ }));
    await userEvent.click(screen.getByRole('columnheader', { name: /Total Nilai/ })); // menurun
    expect(urutan()).toEqual(['SB', 'HF']);

    await userEvent.type(screen.getByPlaceholderText('Cari Kode Bal...'), 'sb');
    expect(urutan()).toEqual(['SB']);
    expect(screen.getByText('(Hasil pencarian)')).toBeInTheDocument();
  });

  it('dengan filter tanggal muncul kolom Bal Sepanjang Masa; tanpa itu tidak', () => {
    const { unmount } = tampil({ adaFilterTanggal: true, rows: rows.slice(0, 2) });
    expect(screen.getByRole('columnheader', { name: /Bal Sepanjang Masa/ })).toBeInTheDocument();
    // SB tidak ada di periode tetapi tetap tampil dengan nol
    const sel = baris('SB').getAllByRole('cell');
    expect(sel[1]).toHaveTextContent('0 Bal');
    expect(sel[6]).toHaveTextContent('1 Bal');
    unmount();

    tampil();
    expect(screen.queryByRole('columnheader', { name: /Bal Sepanjang Masa/ })).not.toBeInTheDocument();
  });

  it('tanpa bal menampilkan pesan kosong', () => {
    tampil({ rows: [], rowsSepanjangMasa: [] });
    expect(screen.getByText('Tidak ada bal pada filter ini.')).toBeInTheDocument();
  });
});

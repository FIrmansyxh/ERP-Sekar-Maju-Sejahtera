import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimbanganPageView } from './TimbanganPageView';
import { buatKupon } from '../../test/fixtures';
import { TransaksiItemBal, TransaksiPembelian } from '../../types';

const itemBal = (no: string, extra: Partial<TransaksiItemBal> = {}) =>
  ({
    item_id: `I-${no}`,
    barang_id: `B-${no}`,
    no_bal: no,
    barcode: no,
    kode_grade: '57',
    harga_per_kg: 30000,
    berat_kg: 0,
    berat_bruto_kg: 0,
    ganti_tikar: false,
    ...extra,
  }) as unknown as TransaksiItemBal;

const kupon = () =>
  buatKupon('1', {
    status_tahap: 'menunggu_timbang',
    items: [itemBal('TS113'), itemBal('TS114'), itemBal('TS115')],
    total_bal: 3,
  } as Partial<TransaksiPembelian>);

/** Induk sederhana: menyimpan kupon seperti App, supaya perubahan hasil timbang kembali ke Timbangan. */
function Induk({
  initialBalNo,
  initialKuponNo,
  awal,
}: {
  initialBalNo?: string;
  initialKuponNo?: string;
  awal?: Partial<TransaksiPembelian>;
}) {
  const [daftar, setDaftar] = useState<TransaksiPembelian[]>([{ ...kupon(), ...awal }]);
  return (
    <TimbanganPageView
      transaksiList={daftar}
      petaniList={[]}
      hargaList={[]}
      barangList={[]}
      userRole="superadmin"
      initialBalNo={initialBalNo}
      initialKuponNo={initialKuponNo}
      onSaveTransaksi={async (tx) => {
        setDaftar((prev) => prev.map((t) => (t.transaksi_id === tx.transaksi_id ? tx : t)));
        return true;
      }}
      onNavigateToKasir={vi.fn()}
      onNavigateToSortir={vi.fn()}
    />
  );
}

describe('Timbangan: panel Penimbangan Bal tidak pernah terisi otomatis', () => {
  it('membuka kupon tanpa memilih bal: panel kosong', () => {
    render(<Induk initialKuponNo="KUP1" />);
    expect(screen.getByText('Tidak ada bal dipilih')).toBeInTheDocument();
    expect(screen.queryByText(/Penimbangan Bal:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Siap Ditimbang')).not.toBeInTheDocument();
  });

  it('membuka bal tertentu menampilkan panelnya', () => {
    render(<Induk initialBalNo="TS113" />);
    expect(screen.getByText(/Penimbangan Bal:/)).toBeInTheDocument();
    expect(screen.getByText('TS113', { selector: 'span.font-mono' })).toBeInTheDocument();
  });

  it('setelah menyimpan berat, panel kembali kosong dan bal berikutnya TIDAK dipilih otomatis', async () => {
    render(<Induk initialBalNo="TS113" />);

    await userEvent.type(screen.getAllByPlaceholderText('0.0')[0], '34'); // kolom pertama = Berat Kotor (Bruto)
    await userEvent.click(screen.getByRole('button', { name: /Simpan Timbangan/ }));

    await waitFor(() => expect(screen.getByText('Tidak ada bal dipilih')).toBeInTheDocument());
    expect(screen.queryByText(/Penimbangan Bal:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Siap Ditimbang')).not.toBeInTheDocument();
  });
});

describe('Timbangan: kupon yang sudah dibayar di Kasir terkunci', () => {
  const lunas = {
    status_pembayaran: 'lunas',
    metode_pembayaran: 'cash',
    items: [itemBal('TS113', { berat_kg: 32, berat_bruto_kg: 34 })],
    total_bal: 1,
  } as Partial<TransaksiPembelian>;

  it('bal yang sudah ditimbang tidak punya tombol Buka Kunci dan kolom berat tidak bisa diedit', () => {
    render(<Induk initialBalNo="TS113" awal={lunas} />);
    expect(screen.getByText(/Terkunci • Sudah Dibayar/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buka Kunci/ })).not.toBeInTheDocument();
    screen.getAllByPlaceholderText('0.0').forEach((kolom) => expect(kolom).toBeDisabled());
    expect(screen.getByRole('button', { name: /Simpan Timbangan/ })).toBeDisabled();
  });

  it('bal yang belum ditimbang pada kupon lunas juga tidak bisa ditimbang', () => {
    render(<Induk initialBalNo="TS113" awal={{ ...lunas, items: [itemBal('TS113')] }} />);
    screen.getAllByPlaceholderText('0.0').forEach((kolom) => expect(kolom).toBeDisabled());
    expect(screen.getByRole('button', { name: /Simpan Timbangan/ })).toBeDisabled();
  });

  it('kupon belum dibayar tetap punya tombol Buka Kunci untuk bal yang sudah ditimbang', () => {
    render(<Induk initialBalNo="TS113" awal={{ items: [itemBal('TS113', { berat_kg: 32, berat_bruto_kg: 34 })], total_bal: 1 }} />);
    expect(screen.getByRole('button', { name: /Buka Kunci/ })).toBeInTheDocument();
  });
});

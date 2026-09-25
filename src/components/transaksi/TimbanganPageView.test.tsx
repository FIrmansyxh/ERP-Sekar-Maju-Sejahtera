import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimbanganPageView } from './TimbanganPageView';
import { buatKupon } from '../../test/fixtures';
import { SaveTransaksiMeta, TransaksiItemBal, TransaksiPembelian } from '../../types';

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
  hasilSimpan = true,
  onSimpan,
}: {
  initialBalNo?: string;
  initialKuponNo?: string;
  awal?: Partial<TransaksiPembelian>;
  /** Jawaban server tiruan: false = simpanan ditolak */
  hasilSimpan?: boolean;
  onSimpan?: (tx: TransaksiPembelian, meta?: SaveTransaksiMeta) => void;
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
      onSaveTransaksi={async (tx, _bal, meta) => {
        onSimpan?.(tx, meta);
        if (!hasilSimpan) return false;
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

describe('Timbangan: perubahan langsung tersimpan ke server', () => {
  // Regresi 2026-09-25: centang Ganti Tikar dulu hanya ada di layar sampai bal ditimbang
  it('centang Ganti Tikar langsung disimpan, tidak menunggu bal ditimbang', async () => {
    const onSimpan = vi.fn();
    render(<Induk initialBalNo="TS113" onSimpan={onSimpan} />);

    await userEvent.click(screen.getByRole('checkbox', { name: /Ada Ganti Tikar/ }));

    await waitFor(() => expect(onSimpan).toHaveBeenCalledTimes(1));
    const [tx] = onSimpan.mock.calls[0] as [TransaksiPembelian];
    expect(tx.items?.find((it) => it.no_bal === 'TS113')?.ganti_tikar).toBe(true);
  });

  it('centang Ganti Tikar yang ditolak server dikembalikan, tidak tinggal di layar saja', async () => {
    render(<Induk initialBalNo="TS113" hasilSimpan={false} />);
    const centang = screen.getByRole('checkbox', { name: /Ada Ganti Tikar/ });

    await userEvent.click(centang);

    await waitFor(() => expect(centang).not.toBeChecked());
    expect(screen.getByText(/belum tersimpan ke server/)).toBeInTheDocument();
  });

  it('simpan berat hanya mengirim hasil timbang bal itu (daftar bal tidak dikirim ulang)', async () => {
    const onSimpan = vi.fn();
    render(<Induk initialBalNo="TS113" onSimpan={onSimpan} />);

    await userEvent.type(screen.getAllByPlaceholderText('0.0')[0], '34');
    await userEvent.click(screen.getByRole('button', { name: /Simpan Timbangan/ }));

    await waitFor(() => expect(onSimpan).toHaveBeenCalledTimes(1));
    expect(onSimpan.mock.calls[0][1]).toMatchObject({ hanyaTimbang: ['TS113'] });
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

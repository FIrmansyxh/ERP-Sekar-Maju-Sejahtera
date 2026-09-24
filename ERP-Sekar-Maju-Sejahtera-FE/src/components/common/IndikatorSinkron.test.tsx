import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IndikatorSinkron } from './IndikatorSinkron';
import { laporkanGagalSimpan, peringatanSimpanan } from '../../utils/peringatanSimpanan';
import { antrianKupon } from '../../services/antrianKupon';
import { statusServer } from '../../services/statusServer';
import { ApiError } from '../../services/apiClient';
import { buatItemBal, buatKupon } from '../../test/fixtures';

afterEach(() => {
  act(() => peringatanSimpanan._atur([]));
  act(() => statusServer.atur({ terhubung: null, terakhirBerhasil: null }));
  antrianKupon.reset();
  vi.restoreAllMocks();
});

describe('IndikatorSinkron: operator harus tahu data belum aman di server', () => {
  it('tidak menampilkan apa pun saat semuanya aman', () => {
    const { container } = render(<IndikatorSinkron />);
    expect(container).toBeEmptyDOMElement();
  });

  it('peringatan bisa ditutup dan yang sama tidak menumpuk', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<IndikatorSinkron />);
    act(() => {
      laporkanGagalSimpan('Status Surat Jalan');
      laporkanGagalSimpan('Status Surat Jalan');
    });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /Tutup peringatan/ }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('server tidak terhubung: layar diberi tanda tidak mengikuti server', async () => {
    render(<IndikatorSinkron />);
    act(() => statusServer.gagal('server tidak dapat dihubungi'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server tidak terhubung');
    act(() => statusServer.berhasil());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('simpanan kupon yang belum sampai ke server terlihat di Header', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    antrianKupon.aturJeda(() => 60_000);
    antrianKupon.pasang(async () => {
      throw new ApiError('Failed to fetch', 0);
    });
    render(<IndikatorSinkron />);

    const kupon = buatKupon('TRX-1', { no_kupon: 'KUP0009', items: [buatItemBal('A1')] });
    await act(async () => {
      antrianKupon.masukkan('TRX-1', 'KUP0009', { jenis: 'buat', kupon });
      await new Promise((r) => setTimeout(r, 0));
    });

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('1 simpanan belum sampai ke server');
    expect(status).toHaveAttribute('title', expect.stringContaining('Kupon KUP0009'));
  });

  it('penyimpanan peramban penuh diberitahukan', async () => {
    render(<IndikatorSinkron />);
    act(() => peringatanSimpanan.laporkanKuotaPenuh('erp_barang'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Penyimpanan peramban penuh');
  });
});

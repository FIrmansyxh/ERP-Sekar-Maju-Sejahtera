import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IndikatorSinkron } from './IndikatorSinkron';
import { laporkanGagalSimpan, peringatanSimpanan } from '../../utils/peringatanSimpanan';
import { antrianMutasi } from '../../services/antrianMutasi';

afterEach(() => {
  act(() => peringatanSimpanan._atur([]));
  antrianMutasi.reset();
  vi.restoreAllMocks();
});

describe('IndikatorSinkron: operator harus tahu data belum aman di server', () => {
  it('tidak menampilkan apa pun saat semuanya aman', () => {
    const { container } = render(<IndikatorSinkron />);
    expect(container).toBeEmptyDOMElement();
  });

  it('gagal kirim perubahan Surat Jalan ke server memunculkan peringatan yang bisa ditutup', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<IndikatorSinkron />);

    act(() => laporkanGagalSimpan('Perubahan Surat Jalan', new Error('404')));
    const peringatan = await screen.findByRole('alert');
    expect(peringatan).toHaveTextContent('Perubahan Surat Jalan belum tersimpan di server');

    await userEvent.click(screen.getByRole('button', { name: /Tutup peringatan/ }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('peringatan untuk hal yang sama tidak menumpuk', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<IndikatorSinkron />);
    act(() => {
      laporkanGagalSimpan('Status Surat Jalan');
      laporkanGagalSimpan('Status Surat Jalan');
      laporkanGagalSimpan('Data harga');
    });
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('perubahan yang belum sampai ke server (mis. hapus batch sample) terlihat di Header', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    antrianMutasi.aturJeda(() => 60_000);
    antrianMutasi.pasang({ 'batch_sample:hapus': { kirim: async () => { throw new Error('Failed to fetch'); } } });
    render(<IndikatorSinkron />);

    await act(async () => {
      await antrianMutasi.masukkan({ entitas: 'batch_sample', id: 'B1', aksi: 'hapus', label: 'Hapus batch sample SS-01' });
    });

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('1 simpanan belum sampai ke server');
    expect(status).toHaveAttribute('title', expect.stringContaining('Hapus batch sample SS-01'));
  });

  it('server menolak perubahan: ditandai tidak tersimpan utuh, bukan sekadar menunggu', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    antrianMutasi.pasang({
      'pengiriman:hapus': { kirim: async () => { throw Object.assign(new Error('Method Not Allowed'), { status: 405 }); } },
    });
    render(<IndikatorSinkron />);

    await act(async () => {
      await antrianMutasi.masukkan({ entitas: 'pengiriman', id: 'P1', aksi: 'hapus', label: 'Batalkan Surat Jalan SJ-1' });
    });

    expect(await screen.findByRole('status')).toHaveTextContent('1 perubahan tidak tersimpan utuh di server');
  });

  it('penyimpanan peramban penuh diberitahukan', async () => {
    render(<IndikatorSinkron />);
    act(() => peringatanSimpanan.laporkanKuotaPenuh('erp_barang'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Penyimpanan peramban penuh');
  });
});

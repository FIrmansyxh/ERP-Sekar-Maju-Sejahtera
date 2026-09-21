import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DialogHost } from './DialogHost';
import { mintaKonfirmasi, tampilkanInfo } from '../../utils/dialog';

describe('DialogHost: pengganti alert() dan confirm()', () => {
  it('pemberitahuan hanya punya satu tombol dan promise selesai saat ditutup', async () => {
    render(<DialogHost />);
    let selesai = false;
    act(() => {
      void tampilkanInfo('Kupon belum lengkap.\nTimbang dulu.').then(() => {
        selesai = true;
      });
    });

    expect(await screen.findByText(/Kupon belum lengkap/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Batal' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mengerti' }));
    expect(screen.queryByText(/Kupon belum lengkap/)).not.toBeInTheDocument();
    expect(selesai).toBe(true);
  });

  it('konfirmasi mengembalikan true saat setuju dan false saat batal', async () => {
    render(<DialogHost />);

    let hasil: Promise<boolean> = Promise.resolve(false);
    act(() => {
      hasil = mintaKonfirmasi('Hapus bal ini?', { teksOk: 'Ya, Hapus' });
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Ya, Hapus' }));
    await expect(hasil).resolves.toBe(true);

    act(() => {
      hasil = mintaKonfirmasi('Hapus bal ini?');
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Batal' }));
    await expect(hasil).resolves.toBe(false);
  });

  it('beberapa dialog ditampilkan satu per satu sesuai urutan', async () => {
    render(<DialogHost />);
    act(() => {
      void tampilkanInfo('Pesan pertama');
      void tampilkanInfo('Pesan kedua');
    });

    expect(await screen.findByText('Pesan pertama')).toBeInTheDocument();
    expect(screen.queryByText('Pesan kedua')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mengerti' }));
    expect(await screen.findByText('Pesan kedua')).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AksesLaporanModal } from './AksesLaporanModal';
import { MODUL_LAPORAN } from '../../utils/rbac';

const SEMUA = MODUL_LAPORAN.map((m) => m.id);

describe('Akses Laporan Admin Sortir', () => {
  it('menutup satu laporan lalu menyimpan sesuai urutan menu samping', async () => {
    const onSimpan = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<AksesLaporanModal isOpen onClose={onClose} terbuka={SEMUA} onSimpan={onSimpan} />);

    expect(screen.getByText('7 dari 7 laporan terbuka')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Laporan Bal'));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(onSimpan).toHaveBeenCalledWith(SEMUA.filter((id) => id !== 'modul-6-laporan-bal'));
    expect(onClose).toHaveBeenCalled();
  });

  it('Pilih Semua dan Tutup Semua', async () => {
    const onSimpan = vi.fn().mockResolvedValue(undefined);
    render(<AksesLaporanModal isOpen onClose={vi.fn()} terbuka={['modul-6-laporan-petani']} onSimpan={onSimpan} />);

    await userEvent.click(screen.getByRole('button', { name: 'Pilih Semua' }));
    expect(screen.getByText('7 dari 7 laporan terbuka')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tutup Semua' }));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onSimpan).toHaveBeenCalledWith([]);
  });

  it('server menolak: jendela tetap terbuka dengan alasannya', async () => {
    const onClose = vi.fn();
    const onSimpan = vi.fn().mockRejectedValue(new Error('server tidak dapat dihubungi'));
    render(<AksesLaporanModal isOpen onClose={onClose} terbuka={SEMUA} onSimpan={onSimpan} />);

    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByText('Belum tersimpan: server tidak dapat dihubungi.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

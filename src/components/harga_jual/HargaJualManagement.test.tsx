import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HargaJualManagement } from './HargaJualManagement';

/**
 * Regresi 2026-09-25: formulir dulu ditutup dan "berhasil" tampil sebelum server menjawab. Bila server menolak,
 * harga jual itu hanya ada di komputer ini.
 */
const isiDanSimpan = async (onSaveHargaJual: ReturnType<typeof vi.fn>) => {
  render(<HargaJualManagement hargaJualList={[]} onSaveHargaJual={onSaveHargaJual} />);
  await userEvent.click(screen.getByRole('button', { name: /Tambah Master/ }));
  await userEvent.type(screen.getByPlaceholderText('Kode harga jual'), 'hj-45');
  await userEvent.type(screen.getByPlaceholderText('0'), '45000');
  await userEvent.click(screen.getByRole('button', { name: /Simpan Data/ }));
};

describe('Master Harga Jual: simpan menunggu jawaban server', () => {
  it('ditolak server: formulir tetap terbuka dan tidak ada pesan berhasil', async () => {
    const simpan = vi.fn().mockResolvedValue(false);
    await isiDanSimpan(simpan);

    expect(simpan).toHaveBeenCalledWith(expect.objectContaining({ kode: 'HJ-45', harga_jual: 45000 }));
    expect(screen.getByRole('button', { name: /Simpan Data/ })).toBeInTheDocument();
    expect(screen.queryByText(/berhasil/)).not.toBeInTheDocument();
  });

  it('diterima server: formulir ditutup dan pesan berhasil tampil', async () => {
    await isiDanSimpan(vi.fn().mockResolvedValue(true));

    expect(screen.queryByRole('button', { name: /Simpan Data/ })).not.toBeInTheDocument();
    expect(screen.getByText('Master Harga Jual baru berhasil ditambahkan')).toBeInTheDocument();
  });
});

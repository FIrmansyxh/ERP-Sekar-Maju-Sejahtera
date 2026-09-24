import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PengirimanManagement } from './PengirimanManagement';
import { buatBal, buatSuratJalan } from '../../test/fixtures';

const buatProps = (extra: Partial<React.ComponentProps<typeof PengirimanManagement>> = {}) => ({
  pengirimanList: [buatSuratJalan('1', 'dikirim')],
  barangList: [
    buatBal('B1', { status_stok: 'keluar' }),
    buatBal('B2', { status_stok: 'keluar' }),
    buatBal('B3', { status_stok: 'di_gudang' }),
  ],
  userRole: 'superadmin' as const,
  onSaveNewPengiriman: vi.fn(),
  onUpdatePengiriman: vi.fn().mockResolvedValue(true),
  onSelesaiEdit: vi.fn(),
  editPengirimanId: '1',
  ...extra,
});

const simpanPerubahan = async () => {
  await userEvent.click(screen.getByRole('button', { name: /Simpan Perubahan Surat Jalan/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Ya, Simpan Perubahan' }));
};

describe('Pengiriman Reguler: mode edit Surat Jalan yang belum Selesai', () => {
  it('memuat Surat Jalan ke formulir dengan banner edit dan tanpa tombol Pilih dari Stok Gudang', () => {
    render(<PengirimanManagement {...buatProps()} />);

    expect(screen.getByText('Mengedit Surat Jalan SJ-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simpan Perubahan Surat Jalan \(2 Bal\)/ })).toBeInTheDocument();
    expect(screen.getByDisplayValue('SJ-1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pabrik A')).toBeInTheDocument();
    expect(screen.queryByText(/Pilih dari Stok Gudang/)).not.toBeInTheDocument();
    // Kedua bal Surat Jalan tampil di tabel muatan
    expect(screen.getAllByText('B1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('B2').length).toBeGreaterThan(0);
  });

  it('menyimpan tanpa perubahan mempertahankan nilai, status, dan bal', async () => {
    const props = buatProps();
    render(<PengirimanManagement {...props} />);
    await simpanPerubahan();

    expect(props.onUpdatePengiriman).toHaveBeenCalledTimes(1);
    const [disimpan, balDitambah, balDikeluarkan] = (props.onUpdatePengiriman as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(disimpan).toMatchObject({
      pengiriman_id: '1',
      no_surat_jalan: 'SJ-1',
      status: 'dikirim',
      tujuan: 'Pabrik A',
      barang_ids: ['B1', 'B2'],
      total_nilai_deal: 44 * 45000 + 44 * 46000, // harga saat diterbitkan dipertahankan
    });
    expect(balDitambah).toEqual([]);
    expect(balDikeluarkan).toEqual([]);
    expect(props.onSelesaiEdit).toHaveBeenCalled();
  });

  it('mengeluarkan satu bal melaporkannya sebagai dikeluarkan', async () => {
    const props = buatProps();
    render(<PengirimanManagement {...props} />);

    const baris = screen.getAllByTitle('Hapus bal dari pengiriman ini');
    await userEvent.click(baris[1]);
    await simpanPerubahan();

    const [disimpan, balDitambah, balDikeluarkan] = (props.onUpdatePengiriman as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(disimpan.barang_ids).toEqual(['B1']);
    expect(disimpan.total_nilai_deal).toBe(44 * 45000);
    expect(balDitambah).toEqual([]);
    expect(balDikeluarkan).toEqual(['B2']);
  });

  it('menambah bal lewat kolom scan; bal tanpa harga jual menahan penyimpanan', async () => {
    const props = buatProps();
    render(<PengirimanManagement {...props} />);

    const kolomScan = screen.getByPlaceholderText(/Scan \/ ketik No Bal/);
    await userEvent.type(kolomScan, 'B3{Enter}');
    await userEvent.click(screen.getByRole('button', { name: /Simpan Perubahan Surat Jalan \(3 Bal\)/ }));

    expect(screen.getByText(/belum punya harga jual/)).toBeInTheDocument();
    expect(props.onUpdatePengiriman).not.toHaveBeenCalled();
  });

  it('bal yang sudah keluar lewat Surat Jalan lain ditolak saat discan', async () => {
    const props = buatProps({
      barangList: [
        buatBal('B1', { status_stok: 'keluar' }),
        buatBal('B2', { status_stok: 'keluar' }),
        buatBal('B9', { status_stok: 'keluar' }),
      ],
    });
    render(<PengirimanManagement {...props} />);

    await userEvent.type(screen.getByPlaceholderText(/Scan \/ ketik No Bal/), 'B9{Enter}');
    expect(screen.getByText(/sudah tercatat di Surat Jalan lain/)).toBeInTheDocument();
  });

  it('Surat Jalan yang sudah Selesai tidak dapat diedit', () => {
    const props = buatProps({ pengirimanList: [buatSuratJalan('1', 'selesai')] });
    render(<PengirimanManagement {...props} />);

    expect(screen.queryByText(/Mengedit Surat Jalan/)).not.toBeInTheDocument();
    expect(screen.getByText(/sudah Selesai dan tidak dapat diedit lagi/)).toBeInTheDocument();
    expect(props.onSelesaiEdit).toHaveBeenCalled();
  });

  it('Batal Edit mengosongkan formulir dan menutup mode edit', async () => {
    const props = buatProps();
    render(<PengirimanManagement {...props} />);
    const banner = screen.getByText('Mengedit Surat Jalan SJ-1').closest('div.p-4') as HTMLElement;
    await userEvent.click(within(banner).getByRole('button', { name: 'Batal Edit' }));

    expect(props.onSelesaiEdit).toHaveBeenCalled();
    expect(screen.queryByText('Mengedit Surat Jalan SJ-1')).not.toBeInTheDocument();
    expect(props.onUpdatePengiriman).not.toHaveBeenCalled();
  });
});

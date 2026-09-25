import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusBatchPengirimanManagement } from './StatusBatchPengirimanManagement';
import { buatBal, buatBatch, buatItemSample, buatSuratJalan } from '../../test/fixtures';

const buatProps = (extra: Partial<React.ComponentProps<typeof StatusBatchPengirimanManagement>> = {}) => ({
  batchSampleList: [],
  pengirimanList: [],
  barangList: [buatBal('B1', { status_stok: 'keluar' }), buatBal('B2', { status_stok: 'keluar' })],
  hargaJualList: [],
  onUpdateBatchSample: vi.fn().mockResolvedValue(true),
  onUpdatePengirimanStatus: vi.fn(),
  onNavigateToPengirimanWithBatch: vi.fn(),
  onEditBatchSample: vi.fn(),
  onDeleteBatchSample: vi.fn(),
  onDeletePengiriman: vi.fn(),
  onEditPengiriman: vi.fn(),
  ...extra,
});

const barisSuratJalan = (no: string) => screen.getByText(no).closest('tr') as HTMLElement;

describe('Status & Detail Batch: tab Status Pengiriman', () => {
  it('membuka Status Pengiriman lebih dulu, lalu Detail Batch', () => {
    render(<StatusBatchPengirimanManagement {...buatProps()} />);
    const tab = screen.getAllByRole('button').filter((b) => /Status Pengiriman Barang|Batch Sample & Reclass/.test(b.textContent || ''));
    expect(tab.map((b) => b.textContent)).toEqual([
      expect.stringContaining('Status Pengiriman Barang'),
      expect.stringContaining('Batch Sample & Reclass'),
    ]);
    expect(screen.getByText('Semua Surat Jalan')).toBeInTheDocument();
  });

  it('Surat Jalan belum Selesai boleh diedit dan dihapus; yang Selesai terkunci', async () => {
    const props = buatProps({
      pengirimanList: [
        buatSuratJalan('1', 'dikirim'),
        buatSuratJalan('2', 'selesai', { barang_ids: ['B3'] }),
      ],
    });
    render(<StatusBatchPengirimanManagement {...props} />);

    const baris1 = within(barisSuratJalan('SJ-1'));
    await userEvent.click(baris1.getByTitle(/Edit Surat Jalan/));
    expect(props.onEditPengiriman).toHaveBeenCalledWith('1');

    await userEvent.click(baris1.getByTitle(/Batalkan \/ hapus Surat Jalan/));
    await userEvent.click(screen.getByRole('button', { name: 'Ya, Batalkan' }));
    expect(props.onDeletePengiriman).toHaveBeenCalledWith('1');

    const baris2 = within(barisSuratJalan('SJ-2'));
    expect(baris2.queryByTitle(/Edit Surat Jalan/)).not.toBeInTheDocument();
    expect(baris2.queryByTitle(/Batalkan \/ hapus Surat Jalan/)).not.toBeInTheDocument();
    expect(baris2.getByTitle(/sudah berstatus Selesai/)).toBeInTheDocument();
    expect(baris2.getByRole('combobox')).toBeDisabled();
  });

  it('menandai Selesai harus dikonfirmasi lebih dulu karena bersifat final', async () => {
    const props = buatProps({ pengirimanList: [buatSuratJalan('1', 'diterima')] });
    render(<StatusBatchPengirimanManagement {...props} />);

    await userEvent.click(within(barisSuratJalan('SJ-1')).getByRole('button', { name: /^Selesai$/ }));
    expect(props.onUpdatePengirimanStatus).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Ya, Selesai' }));
    expect(props.onUpdatePengirimanStatus).toHaveBeenCalledWith('1', 'selesai');
  });
});

describe('Status & Detail Batch: tab Batch Sample & Reclass menampilkan semua daftar batch', () => {
  const batchList = [
    buatBatch('1', 'sample'),
    buatBatch('2', 'dikirim', { tujuan_buyer: 'Buyer B' }),
    buatBatch('3', 'selesai', { items: [buatItemSample('B3', { sudah_dikirim_do: true })] }),
  ];

  const bukaTabDetail = async (props = buatProps({ batchSampleList: batchList })) => {
    render(<StatusBatchPengirimanManagement {...props} />);
    await userEvent.click(screen.getByRole('button', { name: /Batch Sample & Reclass/ }));
    return props;
  };

  it('langsung memuat seluruh batch beserta kartu status', async () => {
    await bukaTabDetail();
    expect(screen.getByText('SAMPLE-1')).toBeInTheDocument();
    expect(screen.getByText('SAMPLE-2')).toBeInTheDocument();
    expect(screen.getByText('SAMPLE-3')).toBeInTheDocument();
    expect(screen.getByText('Semua Batch Sample')).toBeInTheDocument();
  });

  it('kartu status menyaring daftar dengan satu klik', async () => {
    await bukaTabDetail();
    await userEvent.click(screen.getByText('Selesai / DO Terbit'));
    expect(screen.queryByText('SAMPLE-1')).not.toBeInTheDocument();
    expect(screen.getByText('SAMPLE-3')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Sedang Berangkat'));
    expect(screen.getByText('SAMPLE-2')).toBeInTheDocument();
    expect(screen.queryByText('SAMPLE-3')).not.toBeInTheDocument();
  });

  it('Edit hanya aktif untuk batch yang belum punya Surat Jalan', async () => {
    const props = await bukaTabDetail(
      buatProps({
        batchSampleList: batchList,
        pengirimanList: [buatSuratJalan('9', 'dikirim', { batch_sample_id_ref: '2' })],
      })
    );
    const editBatch1 = within(screen.getByText('SAMPLE-1').closest('tr') as HTMLElement).getByTitle(/Edit Batch Sample/);
    await userEvent.click(editBatch1);
    expect(props.onEditBatchSample).toHaveBeenCalledWith('1');

    const barisBatch2 = within(screen.getByText('SAMPLE-2').closest('tr') as HTMLElement);
    // Tombol Edit nonaktif dan Hapus diganti gembok; keduanya menyebut alasan yang sama
    const [tombolEdit, gembok] = barisBatch2.getAllByTitle(/sudah dibuatkan Surat Jalan SJ-9/i);
    expect(tombolEdit).toBeDisabled();
    expect(gembok).toBeInTheDocument();
  });

  it('ACC Semua meminta konfirmasi lalu menyetujui seluruh bal (sebelumnya tombol ini tidak berbuat apa-apa)', async () => {
    const props = await bukaTabDetail();
    await userEvent.click(within(screen.getByText('SAMPLE-1').closest('tr') as HTMLElement).getByRole('button', { name: /Detail/ }));

    await userEvent.click(screen.getByRole('button', { name: /ACC Semua/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Ya, ACC Semua' }));
    await userEvent.click(screen.getByRole('button', { name: /Simpan Hasil Sortir Buyer/ }));

    const [batchTersimpan] = (props.onUpdateBatchSample as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(batchTersimpan.items.map((it: { status_item: string }) => it.status_item)).toEqual(['disetujui', 'disetujui']);
    expect(batchTersimpan.status).toBe('diproses');
  });

  it('hasil sortir yang ditolak server tidak dinyatakan tersimpan dan tetap bisa disimpan ulang', async () => {
    // Regresi 2026-09-25: dulu "berhasil disimpan" tampil sebelum server menjawab, jadi hasil sortir yang gagal
    // terkirim hanya ada di layar komputer ini
    const props = await bukaTabDetail(buatProps({ batchSampleList: batchList, onUpdateBatchSample: vi.fn().mockResolvedValue(false) }));
    await userEvent.click(within(screen.getByText('SAMPLE-1').closest('tr') as HTMLElement).getByRole('button', { name: /Detail/ }));

    await userEvent.click(screen.getByRole('button', { name: /ACC Semua/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Ya, ACC Semua' }));
    await userEvent.click(screen.getByRole('button', { name: /Simpan Hasil Sortir Buyer/ }));

    expect(props.onUpdateBatchSample).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/berhasil disimpan/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simpan Hasil Sortir Buyer/ })).toBeInTheDocument();
  });

  it('Detail membuka satu batch dan dapat kembali ke daftar', async () => {
    await bukaTabDetail();
    await userEvent.click(within(screen.getByText('SAMPLE-1').closest('tr') as HTMLElement).getByRole('button', { name: /Detail/ }));
    expect(screen.getByRole('button', { name: /Kembali ke Daftar Batch/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Kembali ke Daftar Batch/ }));
    expect(screen.getByText('Semua Batch Sample')).toBeInTheDocument();
  });
});

describe('Status & Detail Batch: batch Draft', () => {
  const draft = buatBatch('1', 'draft');
  const final = buatBatch('2', 'sample', { tujuan_buyer: 'Buyer B' });

  const bukaTabDetail = async (props = buatProps({ batchSampleList: [draft, final] })) => {
    render(<StatusBatchPengirimanManagement {...props} />);
    await userEvent.click(screen.getByRole('button', { name: /Batch Sample & Reclass/ }));
    return props;
  };
  const baris = (kode: string) => within(screen.getByText(kode).closest('tr') as HTMLElement);

  it('kartu Draft menyaring daftar dan batch final tidak ikut', async () => {
    await bukaTabDetail();
    await userEvent.click(screen.getByText('Belum Final'));
    expect(screen.getByText('SAMPLE-1')).toBeInTheDocument();
    expect(screen.queryByText('SAMPLE-2')).not.toBeInTheDocument();
  });

  it('cetak Draft ditolak dengan penjelasan, cetak batch final tidak', async () => {
    await bukaTabDetail();
    await userEvent.click(baris('SAMPLE-1').getByTitle(/Finalkan dulu sebelum mencetak/));
    expect(screen.getByText(/masih berstatus Draft/)).toBeInTheDocument();
    expect(screen.queryByText(/Pratinjau/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mengerti' }));

    expect(baris('SAMPLE-2').getByTitle('Cetak Surat Pengiriman Sample')).toBeInTheDocument();
    expect(baris('SAMPLE-2').queryByRole('button', { name: 'Finalkan' })).not.toBeInTheDocument();
  });

  it('Finalkan meminta konfirmasi, lalu status menjadi sample tanpa mengubah bal', async () => {
    const props = await bukaTabDetail();
    await userEvent.click(baris('SAMPLE-1').getByRole('button', { name: 'Finalkan' }));
    expect(props.onUpdateBatchSample).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Ya, Finalkan' }));
    const [batchFinal, balDiperbarui] = (props.onUpdateBatchSample as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(batchFinal.status).toBe('sample');
    expect(batchFinal.batch_id).toBe('1');
    // Reclass tidak mempengaruhi bal: tidak ada bal yang diubah statusnya
    expect(balDiperbarui).toBeUndefined();
  });

  it('detail Draft menutup sortir pembeli, tetapi DO bisa dibuat langsung dan Edit tetap terbuka', async () => {
    const props = await bukaTabDetail();
    await userEvent.click(baris('SAMPLE-1').getByRole('button', { name: /Detail/ }));

    expect(screen.getByText('Batch masih Draft')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ACC Semua/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buat DO Reguler/ })).toBeInTheDocument();
    screen.getAllByRole('button', { name: /^ACC$|^Nego$|^Tolak$/ }).forEach((tombol) => expect(tombol).toBeDisabled());

    await userEvent.click(screen.getByRole('button', { name: /^Edit$/ }));
    expect(props.onEditBatchSample).toHaveBeenCalledWith('1');
  });
});

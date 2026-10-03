import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SampleManagement } from './SampleManagement';
import { buatBal, buatBatch } from '../../test/fixtures';
import { BatchPengirimanSample } from '../../types';

const buatProps = (batch: BatchPengirimanSample) => ({
  sampleList: [],
  batchSampleList: [batch],
  barangList: [buatBal('B1', { status_stok: 'di_gudang' }), buatBal('B2', { status_stok: 'di_gudang' })],
  userRole: 'superadmin' as const,
  onSaveBatchSamples: vi.fn(),
  onSaveBatchSample: vi.fn().mockResolvedValue(true),
  onUpdateBatchSample: vi.fn().mockResolvedValue(true),
  onUpdateSample: vi.fn(),
  editBatchId: batch.batch_id,
  onSelesaiEdit: vi.fn(),
});

const batchTersimpan = (props: ReturnType<typeof buatProps>) =>
  (props.onUpdateBatchSample as ReturnType<typeof vi.fn>).mock.calls[0][0] as BatchPengirimanSample;

describe('Pengiriman Sample: status Draft', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('mengedit Draft: tombol Simpan sebagai Draft menyimpan tanpa konfirmasi dan tetap Draft', async () => {
    const props = buatProps(buatBatch('1', 'draft'));
    render(<SampleManagement {...props} />);

    expect(screen.getByText('DRAFT')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Simpan sebagai Draft \(2 Bal\)/ }));

    expect(props.onUpdateBatchSample).toHaveBeenCalledTimes(1);
    const batch = batchTersimpan(props);
    expect(batch.status).toBe('draft');
    expect(batch.items).toHaveLength(2);
    // Reclass tidak mempengaruhi bal: tidak ada bal yang diubah
    expect((props.onUpdateBatchSample as ReturnType<typeof vi.fn>).mock.calls[0][1]).toEqual([]);
  });

  it('mengedit Draft: Simpan & Finalkan meminta konfirmasi lalu menjadikan batch siap pakai (sample)', async () => {
    const props = buatProps(buatBatch('1', 'draft'));
    render(<SampleManagement {...props} />);

    await userEvent.click(screen.getByRole('button', { name: /Simpan & Finalkan Batch Sample/ }));
    expect(props.onUpdateBatchSample).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Ya, Finalkan Batch Sample' }));

    expect(batchTersimpan(props).status).toBe('sample');
    expect((props.onUpdateBatchSample as ReturnType<typeof vi.fn>).mock.calls[0][1]).toEqual([]);
  });

  it('mengedit batch yang sudah final: tidak ada tombol Draft dan tahapnya dipertahankan', async () => {
    const props = buatProps(buatBatch('1', 'diproses'));
    render(<SampleManagement {...props} />);

    expect(screen.queryByRole('button', { name: /Simpan sebagai Draft/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Simpan Perubahan Batch Sample \(2 Bal\)/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Ya, Simpan Perubahan' }));

    expect(batchTersimpan(props).status).toBe('diproses');
  });
});

describe('Pengiriman Sample: bal yang sudah disortir boleh dipilih walau belum ditimbang dan belum dibayar', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    sessionStorage.clear();
    localStorage.clear();
  });

  const propsDenganBal = (bal: ReturnType<typeof buatBal>[]) => ({
    sampleList: [],
    batchSampleList: [],
    barangList: bal,
    userRole: 'superadmin' as const,
    onSaveBatchSamples: vi.fn(),
    onSaveBatchSample: vi.fn(),
    onUpdateBatchSample: vi.fn(),
    onUpdateSample: vi.fn(),
  });

  it('bal proses sortir muncul sebagai TERSEDIA dengan keterangan belum ditimbang', async () => {
    const baru = buatBal('HF0007', { status_stok: 'proses_sortir', berat_kg: 0, berat_bruto_kg: 0, harga_per_kg: 45000 });
    render(<SampleManagement {...propsDenganBal([baru])} />);

    await userEvent.type(screen.getByPlaceholderText('Scan / ketik No Bal'), 'HF0007');
    expect(await screen.findByText('TERSEDIA')).toBeInTheDocument();
    expect(screen.getByText(/Baru disortir, belum ditimbang/)).toBeInTheDocument();
  });

  it('bal yang sudah dikirim (keluar) tetap ditolak', async () => {
    const keluar = buatBal('HF0008', { status_stok: 'keluar' });
    render(<SampleManagement {...propsDenganBal([keluar])} />);

    await userEvent.type(screen.getByPlaceholderText('Scan / ketik No Bal'), 'HF0008');
    expect(await screen.findByText('STATUS: KELUAR')).toBeInTheDocument();
    expect(screen.queryByText('TERSEDIA')).not.toBeInTheDocument();
  });
});

describe('Pengiriman Sample: impor Excel/CSV', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    sessionStorage.clear();
    localStorage.clear();
  });

  const fileCsv = (isi: string, nama: string) => {
    const file = new File([isi], nama, { type: 'text/csv' });
    if (!('text' in file)) Object.defineProperty(file, 'text', { value: () => new Response(isi).text() });
    return file;
  };

  it('bal di file masuk ke tabel; yang tidak ada di sistem dilaporkan dan tidak masuk', async () => {
    render(
      <SampleManagement
        {...({
          batchSampleList: [],
          barangList: [buatBal('SB0001'), buatBal('SB0002')],
          hargaJualList: [{ harga_jual_id: 'HJ-1', kode: 'HJ-45', harga_jual: 45000, tanggal_berlaku: '2026-09-01', status_aktif: true }],
          userRole: 'superadmin',
          onSaveBatchSample: vi.fn().mockResolvedValue(true),
          onUpdateBatchSample: vi.fn().mockResolvedValue(true),
        } as unknown as React.ComponentProps<typeof SampleManagement>)}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Impor Excel\/CSV/ }));
    await userEvent.upload(
      screen.getByLabelText('Pilih file'),
      fileCsv('Gulungan;No Bal;Harga Jual\n1;SB0001;45.000\n;SB0002;HJ-45\n2;XX0404;45000\n', 'pjm.csv')
    );

    expect(await screen.findByText('Siap 2')).toBeInTheDocument();
    expect(screen.getByText('Tidak Dimasukkan 1')).toBeInTheDocument();
    expect(screen.getByText('No Bal tidak ada di sistem')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Masukkan 2 Bal ke Batch' }));
    expect(screen.queryByRole('dialog', { name: 'Impor Batch Sample' })).not.toBeInTheDocument();
    expect(screen.getByText(/2 bal dari pjm\.csv \(tab pjm\) masuk ke tabel\. 1 baris tidak dimasukkan\./)).toBeInTheDocument();
    expect(screen.getByText('2 Bal Terpilih', { exact: false })).toBeInTheDocument();
  });
});

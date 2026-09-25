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

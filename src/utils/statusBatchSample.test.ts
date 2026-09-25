import { describe, expect, it } from 'vitest';
import { alasanBatchBelumFinal, barisSampleDariBatch, isBatchDraft, statusKeServer, statusSetelahSinkron, tandaiServerKenalDraft } from './statusBatchSample';
import type { BatchPengirimanSample } from '../types';

describe('isBatchDraft', () => {
  it('hanya status draft yang dianggap Draft', () => {
    expect(isBatchDraft({ status: 'draft' })).toBe(true);
    expect(isBatchDraft({ status: 'sample' })).toBe(false);
    expect(isBatchDraft(null)).toBe(false);
    expect(isBatchDraft(undefined)).toBe(false);
  });
});

describe('alasanBatchBelumFinal', () => {
  it('Draft menolak cetak, evaluasi, dan pembuatan DO dengan menyebut nomor batch', () => {
    expect(alasanBatchBelumFinal({ status: 'draft', kode_batch: 'SS-01' }, 'cetak')).toMatch(/Batch SS-01 masih berstatus Draft.*dicetak/);
    expect(alasanBatchBelumFinal({ status: 'draft', kode_batch: 'SS-01' }, 'evaluasi')).toMatch(/hasil sortir/);
    expect(alasanBatchBelumFinal({ status: 'draft', kode_batch: 'SS-01' }, 'do')).toMatch(/Surat Jalan/);
  });
  it('batch final atau tidak ada tidak ditolak', () => {
    expect(alasanBatchBelumFinal({ status: 'sample', kode_batch: 'SS-01' })).toBeNull();
    expect(alasanBatchBelumFinal({ status: 'selesai' })).toBeNull();
    expect(alasanBatchBelumFinal(null)).toBeNull();
  });
});

describe('sinkron ke server', () => {
  it('Draft dikirim apa adanya; sebagai sample hanya bila server belum mengenal Draft', () => {
    expect(statusKeServer('draft')).toBe('draft');
    expect(statusKeServer('draft', false)).toBe('sample');
    expect(statusKeServer('diproses', false)).toBe('diproses');
  });

  it('server lama yang menolak Draft: Draft lokal bertahan bila server membalas sample, tetapi tunduk pada tahap yang lebih lanjut', () => {
    tandaiServerKenalDraft(false);
    try {
      expect(statusSetelahSinkron('draft', 'sample')).toBe('draft');
      expect(statusSetelahSinkron('draft', undefined)).toBe('draft');
      expect(statusSetelahSinkron('draft', 'diproses')).toBe('diproses');
      expect(statusSetelahSinkron('draft', 'dibatalkan')).toBe('dibatalkan');
    } finally {
      tandaiServerKenalDraft(null);
    }
  });

  it('dukungan Draft belum diketahui (tidak ada Draft di server): batch yang difinalkan di komputer lain tetap terlihat final', () => {
    // Regresi 2026-09-25: Draft lokal dulu bertahan, lalu simpanan berikutnya dari sini mengembalikannya ke Draft
    expect(statusSetelahSinkron('draft', 'sample')).toBe('sample');
    expect(statusSetelahSinkron('draft', undefined)).toBe('draft');
  });

  it('server yang menyimpan Draft menjadi acuan: batch yang difinalkan di komputer lain terlihat final di sini', () => {
    tandaiServerKenalDraft(true);
    try {
      expect(statusSetelahSinkron('draft', 'sample')).toBe('sample');
      expect(statusSetelahSinkron('sample', 'draft')).toBe('draft');
    } finally {
      tandaiServerKenalDraft(null);
    }
  });

  it('batch final mengikuti server seperti sebelumnya', () => {
    expect(statusSetelahSinkron('sample', 'diproses')).toBe('diproses');
    expect(statusSetelahSinkron('sample', undefined)).toBe('sample');
    expect(statusSetelahSinkron(undefined, undefined)).toBe('sample');
  });
});

describe('barisSampleDariBatch', () => {
  const batch = (status: BatchPengirimanSample['status'], kode: string): BatchPengirimanSample =>
    ({
      batch_id: `B-${kode}`,
      kode_batch: kode,
      tujuan_buyer: 'Pabrik A',
      sumber_gudang: 'Gudang',
      tanggal_kirim: '2026-09-10',
      status,
      dikirim_oleh: 'Budi',
      items: [
        { sample_item_id: `${kode}-1`, barang_id: 'BAL-1', no_bal: 'HF0001', kode_grade: '66', berat_bal_kg: 40, harga_tawaran_kg: 70000, status_item: 'disetujui', berat_sample_gram: 200 },
        { sample_item_id: `${kode}-2`, barang_id: 'BAL-2', no_bal: 'HF0002', kode_grade: '66', berat_bal_kg: 41, harga_tawaran_kg: 70000, status_item: 'nego' },
      ],
      total_sample_bal: 2,
      total_bal_disetujui: 1,
      total_bal_ditolak: 0,
      total_bal_nego: 1,
      total_estimasi_nilai: 0,
      total_nilai_deal: 0,
    }) as BatchPengirimanSample;

  it('satu baris per bal dengan tujuan, tanggal, dan status dari batch', () => {
    const baris = barisSampleDariBatch([batch('sample', 'SS-01')]);
    expect(baris).toHaveLength(2);
    expect(baris[0]).toMatchObject({ sample_id: 'SS-01-1', no_bal: 'HF0001', tujuan: 'Pabrik A', tanggal_kirim: '2026-09-10', status: 'disetujui', berat_sample_gram: 200 });
    expect(baris[1]).toMatchObject({ status: 'nego', berat_sample_gram: 0 });
  });

  it('batch Draft dan yang dibatalkan tidak dihitung', () => {
    const baris = barisSampleDariBatch([batch('draft', 'D'), batch('dibatalkan', 'X'), batch('selesai', 'S')]);
    expect(baris.map((b) => b.batch_id)).toEqual(['B-S', 'B-S']);
  });
});

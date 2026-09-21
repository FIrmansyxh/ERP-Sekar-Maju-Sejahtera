import { describe, expect, it } from 'vitest';
import { alasanBatchBelumFinal, isBatchDraft, statusKeServer, statusSetelahSinkron } from './statusBatchSample';

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
  it('Draft dikirim ke server sebagai sample, status lain apa adanya', () => {
    expect(statusKeServer('draft')).toBe('sample');
    expect(statusKeServer('diproses')).toBe('diproses');
  });

  it('Draft lokal bertahan bila server membalas sample, tetapi tunduk pada tahap yang lebih lanjut', () => {
    expect(statusSetelahSinkron('draft', 'sample')).toBe('draft');
    expect(statusSetelahSinkron('draft', undefined)).toBe('draft');
    expect(statusSetelahSinkron('draft', 'diproses')).toBe('diproses');
    expect(statusSetelahSinkron('draft', 'dibatalkan')).toBe('dibatalkan');
  });

  it('batch final mengikuti server seperti sebelumnya', () => {
    expect(statusSetelahSinkron('sample', 'diproses')).toBe('diproses');
    expect(statusSetelahSinkron('sample', undefined)).toBe('sample');
    expect(statusSetelahSinkron(undefined, undefined)).toBe('sample');
  });
});

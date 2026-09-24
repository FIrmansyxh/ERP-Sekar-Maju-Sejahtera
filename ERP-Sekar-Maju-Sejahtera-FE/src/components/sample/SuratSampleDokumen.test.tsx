import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SuratSampleDokumen } from './SuratSampleDokumen';
import { buatBatch, buatItemSample } from '../../test/fixtures';

describe('Surat Pengiriman Sample', () => {
  const batch = buatBatch('1', 'sample', {
    items: [
      buatItemSample('B1', { kode_harga_jual: 'HJ-45', harga_tawaran_kg: 45000, harga_deal_kg: 46000, status_item: 'disetujui' }),
      buatItemSample('B2', { kode_harga_jual: 'HJ-50', harga_tawaran_kg: 50000 }),
    ],
  });

  it('menampilkan kode harga jual, bukan nilai rupiahnya', () => {
    const { container } = render(<SuratSampleDokumen batch={batch} />);
    const teks = container.textContent || '';

    expect(teks).toContain('Kode Harga Jual');
    expect(teks).toContain('HJ-45');
    expect(teks).toContain('HJ-50');
    expect(teks).not.toMatch(/Rp\s?\d/);
    expect(teks).not.toMatch(/45\.000|46\.000|50\.000/);
    expect(teks).not.toMatch(/Tawar|Subtotal|Total Nilai/i);
  });
});

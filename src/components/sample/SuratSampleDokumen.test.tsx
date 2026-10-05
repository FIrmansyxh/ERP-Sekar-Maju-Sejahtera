import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SuratSampleDokumen } from './SuratSampleDokumen';
import { buatBatch, buatItemSample } from '../../test/fixtures';

describe('Surat Pengiriman Sample', () => {
  const batch = buatBatch('1', 'sample', {
    items: [
      buatItemSample('B1', { kode_bal_pembeli: 'J-01', kode_harga_jual: 'HJ-45', harga_tawaran_kg: 45000, harga_deal_kg: 46000, status_item: 'disetujui' }),
      buatItemSample('B2', { kode_bal_pembeli: '', kode_harga_jual: 'HJ-50', harga_tawaran_kg: 50000 }),
    ],
  });
  const judulKolom = (container: HTMLElement) => Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent);

  it('bawaan: No Asal & No Jadi, bruto, dan kode harga jual tanpa nilai rupiah', () => {
    const { container } = render(<SuratSampleDokumen batch={batch} />);
    const teks = container.textContent || '';
    expect(judulKolom(container)).toEqual(['No', 'No Asal', 'No Jadi', 'Bruto (kg)', 'Kode Harga Jual']);
    expect(teks).toContain('J-01');
    expect(teks).toContain('HJ-45');
    expect(teks).not.toMatch(/Rp\s?\d/);
    expect(teks).not.toMatch(/Tawar|Subtotal|Total Nilai/i);
  });

  it('No Jadi saja dan nilai harga jual saja; bruto selalu tampil', () => {
    const { container } = render(<SuratSampleDokumen batch={batch} opsi={{ noBal: 'jadi', harga: 'nilai' }} />);
    const teks = container.textContent || '';
    expect(judulKolom(container)).toEqual(['No', 'No Bal', 'Bruto (kg)', 'Harga Jual (Rp/kg)']);
    expect(teks).toMatch(/46\.000/);
    expect(teks).toMatch(/50\.000/);
    expect(teks).not.toContain('HJ-45');
  });

  it('kode dan nilai harga jual sekaligus', () => {
    const { container } = render(<SuratSampleDokumen batch={batch} opsi={{ noBal: 'asal_jadi', harga: 'keduanya' }} />);
    expect(judulKolom(container)).toEqual(['No', 'No Asal', 'No Jadi', 'Bruto (kg)', 'Kode Harga Jual', 'Harga Jual (Rp/kg)']);
  });
});

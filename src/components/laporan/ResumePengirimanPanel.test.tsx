import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ResumePengirimanPanel } from './ResumePengirimanPanel';
import { hitungResumePengiriman } from '../../utils/resumePengiriman';
import { buatBal, buatSuratJalan } from '../../test/fixtures';

const bal = [buatBal('B1'), buatBal('B2')];

describe('ResumePengirimanPanel', () => {
  it('tanpa Surat Jalan hanya menampilkan pesan kosong', () => {
    render(<ResumePengirimanPanel resume={hitungResumePengiriman([], [], [])} />);
    expect(screen.getByText('Belum ada Surat Jalan pada filter yang dipilih.')).toBeInTheDocument();
    expect(screen.queryByTestId('resume-pengiriman')).not.toBeInTheDocument();
  });

  it('menampilkan narasi, status, pabrik, dan bagian perlu perhatian', () => {
    const resume = hitungResumePengiriman(
      [
        buatSuratJalan('1', 'selesai', { tujuan: 'Pabrik A' }),
        buatSuratJalan('2', 'dikirim', { tujuan: 'Pabrik B', tanggal_kirim: '2026-09-18' }),
      ],
      bal,
      [],
      new Date('2026-09-21T09:00:00')
    );
    render(<ResumePengirimanPanel resume={resume} />);

    const panel = screen.getByTestId('resume-pengiriman');
    expect(within(panel).getByText(/tercatat 2 Surat Jalan ke 2 pabrik tujuan/)).toBeInTheDocument();
    expect(within(panel).getByText('Status Surat Jalan')).toBeInTheDocument();
    expect(within(panel).getByText('Pabrik A')).toBeInTheDocument();
    expect(within(panel).getByText('Pabrik B')).toBeInTheDocument();
    expect(within(panel).getByText(/1 Surat Jalan belum Selesai/)).toBeInTheDocument();
    expect(within(panel).getByText(/SJ-2 \(3 hari\)/)).toBeInTheDocument();
    expect(within(panel).getByText('Tidak ada pengiriman sample pada filter ini.')).toBeInTheDocument();
  });

  it('semua DO selesai dan lengkap menampilkan penanda aman', () => {
    const resume = hitungResumePengiriman([buatSuratJalan('1', 'selesai')], bal, []);
    render(<ResumePengirimanPanel resume={resume} />);
    expect(screen.getByText('Semua Surat Jalan pada filter ini sudah Selesai dan lengkap datanya.')).toBeInTheDocument();
  });
});

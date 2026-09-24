import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary, isGalatMuatPotongan } from './ErrorBoundary';

function Rusak({ pesan }: { pesan: string }): never {
  throw new Error(pesan);
}

function Bisa() {
  const [rusak, setRusak] = useState(false);
  if (rusak) throw new Error('meledak');
  return <button onClick={() => setRusak(true)}>Picu galat</button>;
}

describe('ErrorBoundary', () => {
  it('menampilkan pesan yang jelas, bukan layar putih, saat komponen gagal', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary area="Kasir">
        <Rusak pesan="data tidak valid" />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Halaman tidak dapat ditampilkan');
    expect(screen.getByText('data tidak valid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba Lagi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Muat Ulang Halaman/ })).toBeInTheDocument();
  });

  it('galat unduh potongan kode (setelah aplikasi diperbarui) diarahkan ke muat ulang', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Rusak pesan="Failed to fetch dynamically imported module: /assets/Kasir-abc.js" />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Versi baru aplikasi tersedia');
    expect(screen.queryByRole('button', { name: 'Coba Lagi' })).not.toBeInTheDocument();
  });

  it('Coba Lagi memulihkan tampilan bila penyebabnya sudah hilang', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let gagal = true;
    function Sesekali() {
      if (gagal) throw new Error('sementara');
      return <p>Pulih</p>;
    }
    render(
      <ErrorBoundary>
        <Sesekali />
      </ErrorBoundary>
    );
    gagal = false;
    await userEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(screen.getByText('Pulih')).toBeInTheDocument();
  });

  it('tanpa galat, isi ditampilkan apa adanya', async () => {
    render(
      <ErrorBoundary>
        <Bisa />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: 'Picu galat' })).toBeInTheDocument();
  });
});

describe('isGalatMuatPotongan', () => {
  it('mengenali pesan dari Chrome, Firefox, dan Safari', () => {
    expect(isGalatMuatPotongan(new Error('Failed to fetch dynamically imported module: x'))).toBe(true);
    expect(isGalatMuatPotongan(new Error('error loading dynamically imported module'))).toBe(true);
    expect(isGalatMuatPotongan(new Error('Importing a module script failed.'))).toBe(true);
    expect(isGalatMuatPotongan(new Error('Cannot read properties of undefined'))).toBe(false);
  });
});

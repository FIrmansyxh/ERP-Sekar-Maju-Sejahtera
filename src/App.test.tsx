import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { DialogHost } from './components/common/DialogHost';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { INITIAL_USER_DATA } from './data/initialUserData';
import { saveCurrentUser } from './utils/storage';

/** Nama tombol di Sidebar (awal teks tombol) untuk tiap menu yang dapat dibuka. */
const MENU = [
  'Dashboard Analytic',
  'Laporan Bal',
  'Laporan Harga',
  'Laporan Pembelian',
  'Laporan Petani',
  'Laporan Pengiriman',
  'Master Petani',
  'Master Harga Beli',
  'Master Harga Jual',
  'Sortir',
  'Timbangan',
  'Kasir',
  'Pengiriman Sample',
  'Status & Detail Batch',
  'Pengiriman Reguler (DO)',
  'Manajemen Pengguna',
];

/**
 * Uji asap seluruh aplikasi: masuk sebagai Super Admin lokal (server tidak terjangkau), lalu buka setiap menu.
 * Menangkap ekspor menu yang salah nama, potongan kode (React.lazy) yang gagal dimuat, dan galat saat pertama tampil.
 */
describe('Aplikasi: setiap menu dapat dibuka', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('server tidak terjangkau')));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    saveCurrentUser({ ...INITIAL_USER_DATA[0] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('halaman login tampil bila belum ada sesi', () => {
    saveCurrentUser(null);
    render(<App />);
    expect(screen.getByRole('button', { name: /masuk/i })).toBeInTheDocument();
  });

  it.each(MENU)(
    'menu %s tampil tanpa galat',
    async (judul) => {
      render(
        <ErrorBoundary>
          <App />
          <DialogHost />
        </ErrorBoundary>
      );

      // Sidebar siap ditandai tombol Home; sesi lokal dibaca dulu sebelum menu muncul
      await screen.findByRole('button', { name: /^Home/ });
      const tombol = within(document.body).getAllByRole('button').filter((b) => (b.textContent || '').startsWith(judul));
      expect(tombol.length).toBeGreaterThan(0);

      await userEvent.click(tombol[0]);

      // Potongan kode menu selesai diunduh (tampilan "Memuat halaman" hilang), lalu tidak ada galat tampilan
      await vi.waitFor(() => expect(screen.queryByText(/Memuat halaman/)).not.toBeInTheDocument(), { timeout: 8000 });
      expect(screen.queryByText('Halaman tidak dapat ditampilkan')).not.toBeInTheDocument();
      expect(screen.queryByText('Versi baru aplikasi tersedia')).not.toBeInTheDocument();
    },
    20000
  );
});

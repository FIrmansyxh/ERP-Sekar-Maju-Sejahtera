import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { DialogHost } from './components/common/DialogHost';
import { INITIAL_USER_DATA } from './data/initialUserData';
import { saveCurrentUser } from './utils/storage';
import { setAuthToken } from './services/apiClient';
import { antrianKupon } from './services/antrianKupon';

/**
 * Uji tampilan terhadap server tiruan: layar mengikuti server (data komputer lain muncul / hilang sendiri), perubahan
 * yang ditolak server tidak mengubah layar, dan sesi yang ditolak server kembali ke halaman login.
 */

type Json = Record<string, unknown>;

function serverTiruan() {
  let detik = 0;
  const jam = () => new Date(Date.UTC(2026, 8, 24, 5, 0, 0) + ++detik * 1000).toISOString();
  const db = {
    petani: [
      { petani_id: 'PTN-1', nama_petani: 'Petani Satu', status_aktif: true, updated_at: jam() },
      { petani_id: 'PTN-2', nama_petani: 'Petani Dua', status_aktif: true, updated_at: jam() },
    ] as Json[],
    users: [
      { ...INITIAL_USER_DATA[0], password: undefined, role_code: 'superadmin', updated_at: jam() },
      { user_id: 'USR-777', username: 'kasir.uji', nama_lengkap: 'Kasir Uji', role: 'admin_kasir', role_code: 'admin_kasir', status_aktif: true, unit_penugasan: '', dibuat_pada: '2026-09-01', updated_at: jam() },
    ] as Json[],
    dihapus: [] as string[],
    tolakStatus: '' as string,
    sesiDicabut: false,
  };
  const jawab = (status: number, body: unknown) => ({
    ok: status < 400,
    status,
    statusText: '',
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  const fetchPalsu = vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    const jalur = u.pathname.replace(/^\/api\/v1/, '');
    const metode = init?.method || 'GET';
    if (db.sesiDicabut && jalur !== '/auth/login') return jawab(401, { message: 'Unauthenticated.' });
    if (jalur === '/sync/perubahan') {
      const sejak = u.searchParams.get('sejak');
      return jawab(200, {
        status: 'success',
        penuh: !sejak,
        server_time: jam(),
        data: { petani: db.petani, users: db.users, transaksi: [], barang: [], harga_beli: [], harga_jual: [], batch_sample: [], pengiriman: [] },
        dihapus: sejak && db.dihapus.length ? { petani: db.dihapus } : {},
      });
    }
    const statusUser = jalur.match(/^\/users\/([^/]+)\/status$/);
    if (metode === 'PUT' && statusUser) {
      if (db.tolakStatus) return jawab(422, { status: 'error', message: db.tolakStatus });
      const user = db.users.find((x) => x.user_id === statusUser[1])!;
      user.status_aktif = JSON.parse(String(init?.body)).status_aktif;
      user.updated_at = jam();
      return jawab(200, { status: 'success', data: { ...user } });
    }
    if (jalur === '/auth/logout') return jawab(200, { status: 'success' });
    return jawab(404, { message: `The route ${jalur} could not be found.` });
  });
  return { db, fetchPalsu, jam };
}

async function bukaMenu(judul: string) {
  await screen.findByRole('button', { name: /^Home/ });
  const tombol = within(document.body).getAllByRole('button').filter((b) => (b.textContent || '').startsWith(judul));
  await userEvent.click(tombol[0]);
  await vi.waitFor(() => expect(screen.queryByText(/Memuat halaman/)).not.toBeInTheDocument(), { timeout: 8000 });
}

/** Memicu sinkron seketika (sama seperti jendela kembali difokuskan). */
async function sinkronSekarang() {
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
    await new Promise((r) => setTimeout(r, 50));
  });
}

describe('Aplikasi mengikuti server lintas komputer', () => {
  let server: ReturnType<typeof serverTiruan>;

  beforeEach(() => {
    server = serverTiruan();
    vi.stubGlobal('fetch', server.fetchPalsu);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    saveCurrentUser({ ...INITIAL_USER_DATA[0] });
    setAuthToken('token-uji');
  });

  afterEach(() => {
    antrianKupon.reset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('petani baru dari komputer lain muncul dan petani yang dihapus di sana hilang, tanpa muat ulang', async () => {
    render(
      <>
        <App />
        <DialogHost />
      </>
    );
    await bukaMenu('Master Petani');
    expect(await screen.findByText('Petani Dua')).toBeInTheDocument();

    // Komputer lain: tambah satu petani, hapus Petani Dua
    server.db.petani = [server.db.petani[0], { petani_id: 'PTN-3', nama_petani: 'Petani Tiga Baru', status_aktif: true, updated_at: server.jam() }];
    server.db.dihapus = ['PTN-2'];
    await sinkronSekarang();

    expect(await screen.findByText('Petani Tiga Baru')).toBeInTheDocument();
    expect(screen.queryByText('Petani Dua')).not.toBeInTheDocument();

    // Sinkron berikutnya tidak menghidupkannya lagi
    await sinkronSekarang();
    await sinkronSekarang();
    expect(screen.queryByText('Petani Dua')).not.toBeInTheDocument();
  }, 20000);

  it('perubahan yang ditolak server: pesan tampil dan layar TIDAK berubah; setelah diterima layar mengikuti server', async () => {
    render(
      <>
        <App />
        <DialogHost />
      </>
    );
    await bukaMenu('Manajemen Pengguna');
    const baris = (await screen.findByText('@kasir.uji')).closest('tr') as HTMLElement;
    const tombolStatus = within(baris).getByTitle('Klik untuk mengubah status aktif/nonaktif');
    expect(tombolStatus).toHaveTextContent('Aktif');

    server.db.tolakStatus = 'Status akun tidak boleh diubah saat ini (uji).';
    await userEvent.click(tombolStatus);
    expect(await screen.findByText(/tidak tersimpan: Status akun tidak boleh diubah saat ini \(uji\)/)).toBeInTheDocument();
    expect(within(baris).getByTitle('Klik untuk mengubah status aktif/nonaktif')).toHaveTextContent(/^Aktif$/);

    server.db.tolakStatus = '';
    await userEvent.click(within(baris).getByTitle('Klik untuk mengubah status aktif/nonaktif'));
    await vi.waitFor(() => expect(within(baris).getByTitle('Klik untuk mengubah status aktif/nonaktif')).toHaveTextContent('Nonaktif'));
    expect(server.db.users.find((u) => u.user_id === 'USR-777')!.status_aktif).toBe(false);
  }, 20000);

  it('token dicabut di server (401): kembali ke halaman login dengan pemberitahuan', async () => {
    render(
      <>
        <App />
        <DialogHost />
      </>
    );
    await screen.findByRole('button', { name: /^Home/ });
    server.db.sesiDicabut = true;
    await sinkronSekarang();
    expect(await screen.findByRole('button', { name: /masuk/i })).toBeInTheDocument();
    expect(screen.getByText(/Sesi login di server sudah berakhir/)).toBeInTheDocument();
  }, 20000);
});

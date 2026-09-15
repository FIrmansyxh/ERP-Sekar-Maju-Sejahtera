import { test, expect, USERS, MENU, TITLE, KEYS } from './helpers/app';

/**
 * Modul: Dashboard/Home (TC-HOME-01 .. 10) - HomeDashboardView, Sidebar, Header
 * Catatan desain: Home tidak memiliki form input; skenario template dipetakan ke navigasi, preferensi UI,
 * dan konsistensi counter.
 */
const HOME_MENU_IDS = [
  'modul-home', 'modul-6-dashboard-analytic', 'modul-6-laporan-bal', 'modul-6-laporan-kode-bal', 'modul-6-laporan-grade',
  'modul-6-laporan-pembelian', 'modul-6-laporan-petani', 'modul-6-laporan-pengiriman', 'modul-1-petani', 'modul-3-harga',
  'modul-3-harga-jual', 'modul-2-barang', 'modul-0-sortir', 'modul-0-timbangan', 'modul-0-kasir', 'modul-5-pengiriman',
  'modul-4-sample', 'modul-status-batch', 'modul-users',
];
const ALLOWED: Record<string, string[]> = {
  superadmin: HOME_MENU_IDS,
  admin_sortir: ['modul-home', 'modul-0-sortir', 'modul-1-petani', 'modul-3-harga', 'modul-3-harga-jual', 'modul-2-barang', 'modul-6-dashboard-analytic', 'modul-6-laporan-bal', 'modul-6-laporan-kode-bal', 'modul-6-laporan-grade', 'modul-6-laporan-pembelian', 'modul-6-laporan-petani', 'modul-6-laporan-pengiriman'],
  admin_timbang: ['modul-home', 'modul-0-timbangan'],
  admin_kasir: ['modul-home', 'modul-0-kasir', 'modul-0-transaksi', 'modul-0-timbangan', 'modul-0-sortir', 'modul-6-dashboard-analytic', 'modul-6-laporan-bal', 'modul-6-laporan-kode-bal', 'modul-6-laporan-grade', 'modul-6-laporan-pembelian', 'modul-6-laporan-petani', 'modul-6-laporan-pengiriman'],
  admin_pengiriman: ['modul-home', 'modul-5-pengiriman', 'modul-4-sample', 'modul-status-batch', 'modul-3-harga-jual', 'modul-6-laporan-pengiriman'],
  kepala_gudang: ['modul-home', 'modul-status-batch', 'modul-6-dashboard-analytic', 'modul-6-laporan-bal', 'modul-6-laporan-kode-bal', 'modul-6-laporan-grade', 'modul-6-laporan-pembelian', 'modul-6-laporan-petani', 'modul-6-laporan-pengiriman'],
};
const expectedRows = (role: string) => HOME_MENU_IDS.filter((id) => ALLOWED[role].includes(id)).length;

test.describe('HOME - Dasbor Menu Utama', () => {
  test('TC-HOME-01 | Setiap role masuk ke Home dengan sambutan, badge role, dan Menu Akses sesuai wewenang', async ({ app, page }) => {
    for (const key of ['superadmin', 'admintimbang', 'kepalagudang'] as const) {
      const u = USERS[key];
      await app.loginAs(key);
      await expect(app.headerTitle).toHaveText(TITLE.home);
      await expect(app.welcome(u.nama)).toBeVisible();
      await expect(page.getByText(`Menu Akses Anda (${u.roleLabel})`)).toBeVisible();
      await expect(page.locator('tbody tr')).toHaveCount(expectedRows(u.role));
      await expect(page.getByText(`Menampilkan ${expectedRows(u.role)} modul aktif`)).toBeVisible();
      await app.logout();
    }
  });

  test('TC-HOME-02 | Home & sidebar tetap stabil saat seluruh data transaksi/bal/pengiriman kosong', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await app.setStore(KEYS.transaksi, []);
    await app.setStore(KEYS.barang, []);
    await app.setStore(KEYS.pengiriman, []);
    await app.reload();
    await expect(app.headerTitle).toHaveText(TITLE.home);
    await expect(app.sidebar.getByRole('button', { name: MENU.kasir })).toContainText(/Kasir\s*0$/);
    await expect(app.sidebar.getByRole('button', { name: MENU.pengiriman })).toContainText('0');
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.gotoModule(MENU.home, TITLE.home);
    expect(errors).toEqual([]);
    // Tidak boleh ada data demo yang disuntik ulang oleh aplikasi
    expect((await app.store<any[]>(KEYS.transaksi)) || []).toEqual([]);
    expect((await app.store<any[]>(KEYS.barang)) || []).toEqual([]);
  });

  test('TC-HOME-03 | Navigasi dari tabel Menu Akses (klik baris & tombol Buka) membuka modul yang benar', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await page.locator('tbody tr').filter({ hasText: 'Master Petani' }).getByRole('button', { name: 'Buka' }).click();
    await expect(app.headerTitle).toHaveText(TITLE.petani);
    await app.gotoModule(MENU.home, TITLE.home);
    await page.locator('tbody tr').filter({ hasText: 'Kasir' }).first().click();
    await expect(app.headerTitle).toHaveText(TITLE.kasir);
    await app.gotoModule(MENU.home, TITLE.home);
    await page.getByRole('button', { name: /Kelola \d+ Pengguna \(RBAC\)/ }).click();
    await expect(app.headerTitle).toHaveText(TITLE.users);
  });

  test('TC-HOME-04 | Parameter URL tidak valid (?cetak=...) tidak merusak aplikasi', async ({ app, page }) => {
    await app.openLoginPage();
    await page.goto('/?cetak=invalid&id=123');
    await expect(app.loginButton).toBeVisible();
    await page.goto('/?cetak=nota');
    await expect(app.loginButton).toBeVisible();
    // Tanpa login, rute cetak pun harus menampilkan halaman login (bukan konten dokumen)
    await page.goto('/?cetak=nota&id=TIDAK-ADA');
    await expect(app.loginButton).toBeVisible();
    await expect(page.getByText('Data Dokumen Tidak Ditemukan')).toHaveCount(0);
    await page.goto('/?foo=bar');
    await expect(app.loginButton).toBeVisible();
  });

  test('TC-HOME-05 | Preferensi sidebar (sembunyikan/tampilkan) tersimpan & bertahan setelah refresh', async ({ app, page }) => {
    await app.loginAs('adminsortir');
    await expect(app.sidebar).toBeVisible();
    await page.getByTitle('Sembunyikan Menu (Sidebar)').click();
    await expect(app.sidebar).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('sms_sidebar_hidden'))).toBe('true');
    await app.reload();
    await expect(app.sidebar).toHaveCount(0);
    await page.getByTitle('Buka Menu (Sidebar)').click();
    await expect(app.sidebar).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('sms_sidebar_hidden'))).toBe('false');
  });

  test('TC-HOME-06 | Notifikasi toast hilang otomatis & modal konfirmasi dapat ditutup dengan Esc/Batal', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await expect(app.toast).toContainText('Login berhasil');
    await expect(app.toast).toHaveCount(0, { timeout: 6000 });
    await app.gotoModule(MENU.hargaBeli, TITLE.hargaBeli);
    await page.locator('tbody tr').first().getByTitle('Hapus Master Harga Beli').click();
    await expect(page.getByRole('heading', { name: 'Hapus Master Harga Beli' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Hapus Master Harga Beli' })).toHaveCount(0);
    expect(((await app.store<any[]>(KEYS.harga)) || []).length).toBe(41);
  });

  test('TC-HOME-07 | Menu Akses Anda difilter sesuai role (Admin Sortir, Admin Kasir, Admin Pengiriman)', async ({ app, page }) => {
    for (const key of ['adminsortir', 'adminkasir', 'adminpengiriman'] as const) {
      const u = USERS[key];
      await app.loginAs(key);
      await expect(page.locator('tbody tr')).toHaveCount(expectedRows(u.role));
      const names = (await page.locator('tbody tr td:nth-child(2)').allInnerTexts()).map((t) => t.trim());
      if (key === 'adminsortir') expect(names).toContain('Sortir');
      if (key === 'adminsortir') expect(names).not.toContain('Kasir');
      if (key === 'adminkasir') expect(names).toContain('Kasir');
      if (key === 'adminpengiriman') expect(names).toContain('Pengiriman Reguler (DO Luar)');
      if (key === 'adminpengiriman') expect(names).not.toContain('Master Petani');
      expect(names).not.toContain('Manajemen Pengguna (RBAC)');
      await app.logout();
    }
  });

  test('TC-HOME-08 | Judul header & breadcrumb berubah sesuai modul; badge counter sidebar berformat angka', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.hargaBeli, TITLE.hargaBeli);
    await app.gotoModule(MENU.sortir, TITLE.sortir);
    await app.gotoModule(MENU.statusBatch, TITLE.statusBatch);
    await app.gotoModule(MENU.home, TITLE.home);
    const petani = (await app.store<any[]>(KEYS.petani)) || [];
    await expect(app.sidebar.getByRole('button', { name: MENU.petani })).toContainText(String(petani.length));
    await expect(app.sidebar.getByRole('button', { name: MENU.users })).toContainText('7 User');
    await expect(page.getByText('Desktop Standalone', { exact: false })).toHaveCount(0);
  });

  test('TC-HOME-09 | Counter sidebar tersinkron: bertambah setelah tambah petani, harga beli, dan transaksi', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const petani = (await app.store<any[]>(KEYS.petani)) || [];
    const txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    await app.gotoModule(MENU.petani, TITLE.petani);
    await page.getByRole('button', { name: 'Tambah Petani Baru' }).click();
    await page.getByPlaceholder('Contoh: H. Achmad Zaini / Mat Rokim').fill('Petani Counter QA');
    await page.getByPlaceholder('Contoh: 081234567890 / 087855667788').fill('081234567899');
    await page.getByPlaceholder(/Contoh: Dusun Sumber Bening/).fill('Ds. Counter');
    await page.getByRole('button', { name: 'Simpan Petani' }).click();
    await page.getByRole('button', { name: 'Ya, Daftarkan Petani' }).click();
    await expect(app.sidebar.getByRole('button', { name: MENU.petani })).toContainText(String(petani.length + 1));
    await app.sortirCreate({ kupon: 'KUPHOME09', bals: [{ noBal: 'HOME0901', grade: '45' }] });
    await expect(app.sidebar.getByRole('button', { name: MENU.kasir })).toContainText(String(txs.length + 1));
    await app.gotoModule(MENU.hargaBeli, TITLE.hargaBeli);
    await page.getByRole('button', { name: 'Tambah Master' }).click();
    await page.getByPlaceholder('Misal: A, B, C, A-SUPER...').fill('HM9');
    await page.getByPlaceholder('Contoh: 140000').fill('41000');
    await page.getByRole('button', { name: 'Simpan Data' }).click();
    await expect(app.sidebar.getByRole('button', { name: MENU.hargaBeli })).toContainText('42 Kode');
  });

  test('TC-HOME-10 | Tanpa login Home tidak dapat diakses; role terbatas tidak melihat tombol Kelola Pengguna', async ({ app, page }) => {
    await app.openLoginPage();
    await expect(page.getByText(/Menu Akses Anda/)).toHaveCount(0);
    await page.evaluate((k) => localStorage.setItem(k, 'modul-home'), KEYS.activeModule);
    await app.reload();
    await expect(app.loginButton).toBeVisible();
    await app.loginAs('adminkasir');
    await expect(page.getByRole('button', { name: /Kelola \d+ Pengguna \(RBAC\)/ })).toHaveCount(0);
    await expect(page.locator('tbody tr').filter({ hasText: 'Manajemen Pengguna' })).toHaveCount(0);
  });
});

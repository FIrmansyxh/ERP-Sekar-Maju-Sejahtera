import { test, expect, MENU, TITLE, KEYS } from './helpers/app';
import { buildTransaksi } from './helpers/factory';

/**
 * Modul: Master Harga Jual (TC-HARGA_JUAL-01 .. 10) - HargaJualManagement
 */
test.describe('HARGA_JUAL - Master Harga Jual', () => {
  async function openAdd(app: any, page: any) {
    await app.gotoModule(MENU.hargaJual, TITLE.hargaJual);
    await page.getByRole('button', { name: 'Tambah Master' }).click();
    await expect(page.getByText('Tambah Master Harga Jual Baru')).toBeVisible();
  }
  const kodeInput = (page: any) => page.getByPlaceholder('Misal: HJ-45, HJ-43, HJ-SUPER-150...');
  const hargaInput = (page: any) => page.getByPlaceholder('Contoh: 45000 atau 43000');
  const simpan = (page: any) => page.getByRole('button', { name: 'Simpan Data' }).click();

  test('TC-HARGA_JUAL-01 | Master Harga Jual dapat dibuka oleh sortir & pengiriman: 41 kode, tabel, pencarian', async ({ app, page }) => {
    await app.loginAs('adminpengiriman');
    await app.gotoModule(MENU.hargaJual, TITLE.hargaJual);
    const hj = (await app.store<any[]>(KEYS.hargaJual)) || [];
    expect(hj.length).toBe(41);
    await expect(app.sidebar.getByRole('button', { name: MENU.hargaJual })).toContainText('41 Kode');
    await expect(page.getByPlaceholder(/Cari master harga jual/)).toBeVisible();
    await expect(page.locator('tbody tr').first()).toContainText(/Rp/);
  });

  test('TC-HARGA_JUAL-02 | Validasi wajib: kode kosong, harga 0, tanggal berlaku kosong', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAdd(app, page);
    await kodeInput(page).fill('   ');
    await hargaInput(page).fill('50000');
    await simpan(page);
    await expect(page.getByText('Kode harga jual wajib diisi!')).toBeVisible();
    await kodeInput(page).fill('HJ-QA');
    await hargaInput(page).fill('0');
    await simpan(page);
    await expect(page.getByText('Harga jual harus lebih dari 0!')).toBeVisible();
    await hargaInput(page).fill('50000');
    await page.locator('input[type="date"]').fill('');
    await simpan(page);
    expect(await page.locator('input[type="date"]').evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  });

  test('TC-HARGA_JUAL-03 | Tambah kode harga jual baru tersimpan & persisten', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAdd(app, page);
    await kodeInput(page).fill('HJ-A');
    await hargaInput(page).fill('55000');
    await simpan(page);
    await expect(app.toast).toContainText('Harga jual "HJ-A" berhasil disimpan.');
    const hj = (await app.store<any[]>(KEYS.hargaJual)) || [];
    const created = hj.find((h) => h.kode === 'HJ-A');
    expect(created?.harga_jual).toBe(55000);
    expect(created?.status_aktif).toBe(true);
    await app.reload();
    await app.gotoModule(MENU.hargaJual, TITLE.hargaJual);
    await page.getByPlaceholder(/Cari master harga jual/).fill('HJ-A');
    await expect(page.locator('tbody tr').filter({ hasText: 'HJ-A' })).toHaveCount(1);
    await expect(app.sidebar.getByRole('button', { name: MENU.hargaJual })).toContainText('42 Kode');
  });

  test('TC-HARGA_JUAL-04 | Kode duplikat & harga negatif ditolak', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAdd(app, page);
    await kodeInput(page).fill('40');
    await hargaInput(page).fill('41000');
    await simpan(page);
    await expect(page.getByText('Kode harga jual "40" sudah terdaftar! Gunakan kode lain.')).toBeVisible();
    await kodeInput(page).fill('HJ-NEG');
    await hargaInput(page).fill('-5000');
    await simpan(page);
    await expect(page.getByText('Tambah Master Harga Jual Baru')).toBeVisible();
    const hj = (await app.store<any[]>(KEYS.hargaJual)) || [];
    expect(hj.some((h) => h.kode === 'HJ-NEG')).toBe(false);
  });

  test('TC-HARGA_JUAL-05 | Edit harga jual tersimpan & tampil di tabel', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.hargaJual, TITLE.hargaJual);
    await page.getByPlaceholder(/Cari master harga jual/).fill('80');
    const row = page.locator('tbody tr').filter({ hasText: /^\s*\d+\s*80\s*Rp/ }).first();
    await row.getByTitle('Edit Master Harga Jual').click();
    await hargaInput(page).fill('81000');
    await simpan(page);
    await expect(app.toast).toContainText('Harga jual "80" berhasil disimpan.');
    await expect(row).toContainText('Rp 81.000');
    const hj = (await app.store<any[]>(KEYS.hargaJual)) || [];
    expect(hj.find((h) => h.kode === '80').harga_jual).toBe(81000);
  });

  test('TC-HARGA_JUAL-06 | Hapus kode harga jual dengan konfirmasi', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.hargaJual, TITLE.hargaJual);
    await page.getByPlaceholder(/Cari master harga jual/).fill('79');
    const row = page.locator('tbody tr').filter({ hasText: /^\s*\d+\s*79\s*Rp/ }).first();
    await row.getByTitle('Hapus Master Harga Jual').click();
    await expect(page.getByText('Hapus Master Harga Jual', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Hapus Data' }).click();
    await expect(app.toast).toContainText('Harga jual berhasil dihapus.');
    expect(((await app.store<any[]>(KEYS.hargaJual)) || []).some((h) => h.kode === '79')).toBe(false);
    await expect(app.sidebar.getByRole('button', { name: MENU.hargaJual })).toContainText('40 Kode');
  });

  test('TC-HARGA_JUAL-07 | Pencarian kode & filter nonaktif', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.hargaJual, TITLE.hargaJual);
    await page.getByPlaceholder(/Cari master harga jual/).fill('45');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByPlaceholder(/Cari master harga jual/).fill('78');
    await page.locator('tbody tr').first().getByTitle('Edit Master Harga Jual').click();
    await page.locator('#chk-status-aktif').uncheck();
    await simpan(page);
    await page.getByPlaceholder(/Cari master harga jual/).fill('');
    await page.locator('select').filter({ hasText: /Nonaktif/ }).first().selectOption('inactive');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr').first()).toContainText('78');
  });

  test('TC-HARGA_JUAL-08 | Batas format: harga jual di bawah harga beli diterima (kebijakan bisnis: kesepakatan khusus / cuci stok) & nilai besar', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAdd(app, page);
    await kodeInput(page).fill('HJ-LOW');
    await hargaInput(page).fill('1000'); // jauh di bawah harga beli terendah (Rp 30.000)
    await simpan(page);
    await expect(app.toast).toContainText('HJ-LOW');
    const hj = (await app.store<any[]>(KEYS.hargaJual)) || [];
    const low = hj.find((h) => h.kode === 'HJ-LOW');
    // Keputusan Product Owner (15-09-2026): harga jual boleh lebih rendah dari harga beli (kesepakatan khusus / menghabiskan stok)
    test.info().annotations.push({ type: 'keputusan', description: `Harga jual Rp 1.000 (< harga beli minimum) ${low ? 'diterima' : 'ditolak'} - sesuai kebijakan bisnis, tidak ada validasi margin` });
    expect(low?.harga_jual).toBe(1000);
    await openAdd(app, page);
    await kodeInput(page).fill('HJ-BIG');
    await hargaInput(page).fill('999999999');
    await simpan(page);
    await expect(app.toast).toContainText('HJ-BIG');
    await page.getByPlaceholder(/Cari master harga jual/).fill('HJ-BIG');
    await expect(page.locator('tbody tr').first()).toContainText('Rp 999.999.999');
  });

  test('TC-HARGA_JUAL-09 | Kode harga jual tersinkron ke dropdown Pengiriman DO & Laporan Harga (tab Jual)', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAdd(app, page);
    await kodeInput(page).fill('HJ-QA9');
    await hargaInput(page).fill('57000');
    await simpan(page);
    // Seed 1 bal di gudang agar tabel muatan DO tampil
    const petani = ((await app.store<any[]>(KEYS.petani)) || [])[0];
    const { tx, barangs } = buildTransaksi({ txId: 'TRX-01012026-901', kupon: 'KUPHJ09', petani, bals: [{ no_bal: 'HJ0901', grade: '45', harga: 45000, bruto: 50 }], lunas: true });
    await app.setStore(KEYS.transaksi, [...(((await app.store<any[]>(KEYS.transaksi)) || [])), tx]);
    await app.setStore(KEYS.barang, [...(((await app.store<any[]>(KEYS.barang)) || [])), ...barangs]);
    await app.reload();
    await app.gotoModule(MENU.pengiriman, TITLE.pengiriman);
    await page.getByRole('button', { name: /Pilih Bebas dari Stok Gudang \(Reguler\)/ }).click();
    const scan = page.getByPlaceholder('Scan Barcode / ketik No Bal / ID Batch...');
    await scan.fill('HJ0901');
    await scan.press('Enter');
    const kodeSelect = page.getByPlaceholder('-- Pilih Kode --').first();
    await kodeSelect.click();
    await kodeSelect.fill('HJ-QA9');
    await expect(page.locator('div.absolute.z-50 div.cursor-pointer').filter({ hasText: 'HJ-QA9 (Rp 57.000/kg)' })).toHaveCount(1);
    await page.keyboard.press('Escape');
    await app.gotoModule(MENU.laporanHarga, TITLE.laporanHarga);
    await page.locator('#tab-harga-jual').click();
    await page.getByPlaceholder(/Cari Kode Jual/).fill('HJ-QA9');
    await expect(page.locator('tbody tr').filter({ hasText: 'HJ-QA9' }).first()).toBeVisible();
  });

  test('TC-HARGA_JUAL-10 | Role timbang/kasir/kepala gudang tidak dapat mengakses Master Harga Jual', async ({ app, page }) => {
    for (const key of ['admintimbang', 'adminkasir', 'kepalagudang'] as const) {
      await app.loginAs(key);
      expect(await app.hasMenu(MENU.hargaJual), `menu harga jual untuk ${key}`).toBe(false);
      await app.logout();
    }
    await app.loginAs('adminkasir');
    await page.evaluate((k) => localStorage.setItem(k, 'modul-3-harga-jual'), KEYS.activeModule);
    await app.reload();
    const shown = await page.getByRole('button', { name: 'Tambah Master' }).isVisible().catch(() => false);
    test.info().annotations.push({ type: 'observasi', description: `Bypass modul-3-harga-jual via localStorage oleh admin_kasir: ${shown ? 'BERHASIL (celah RBAC)' : 'ditolak'}` });
    expect(shown).toBe(false);
  });
});

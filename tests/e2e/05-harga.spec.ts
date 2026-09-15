import { test, expect, MENU, TITLE, KEYS, rupiah } from './helpers/app';

/**
 * Modul: Master Harga Beli (TC-HARGA-01 .. 10) - HargaManagement (form modal inline)
 */
test.describe('HARGA - Master Harga Beli', () => {
  async function openAdd(app: any, page: any) {
    await app.gotoModule(MENU.hargaBeli, TITLE.hargaBeli);
    await page.getByRole('button', { name: 'Tambah Master' }).click();
    await expect(page.getByText('Tambah Master Harga Beli Baru')).toBeVisible();
  }
  const kodeInput = (page: any) => page.getByPlaceholder('Misal: A, B, C, A-SUPER...');
  const hargaInput = (page: any) => page.getByPlaceholder('Contoh: 140000');
  const simpan = (page: any) => page.getByRole('button', { name: 'Simpan Data' }).click();

  test('TC-HARGA-01 | Master Harga Beli dapat dibuka: 41 kode demo, tabel, pencarian & tombol tambah', async ({ app, page }) => {
    await app.loginAs('adminsortir');
    await app.gotoModule(MENU.hargaBeli, TITLE.hargaBeli);
    const harga = (await app.store<any[]>(KEYS.harga)) || [];
    expect(harga.length).toBe(41);
    await expect(app.sidebar.getByRole('button', { name: MENU.hargaBeli })).toContainText('41 Kode');
    await expect(page.getByPlaceholder(/Cari master harga beli/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tambah Master' })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toContainText(/Rp/);
  });

  test('TC-HARGA-02 | Validasi wajib: kode kosong/spasi, harga kosong, harga 0', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAdd(app, page);
    await simpan(page);
    expect(await kodeInput(page).evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    await kodeInput(page).fill('   ');
    await hargaInput(page).fill('45000');
    await simpan(page);
    await expect(page.getByText('Kode harga beli wajib diisi.')).toBeVisible();
    await kodeInput(page).fill('QA0');
    await hargaInput(page).fill('0');
    await simpan(page);
    await expect(page.getByText('Harga beli tidak valid.')).toBeVisible();
    await hargaInput(page).fill('');
    await simpan(page);
    expect(await hargaInput(page).evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  });

  test('TC-HARGA-03 | Tambah kode harga beli baru tersimpan, tampil di tabel, persisten setelah refresh', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAdd(app, page);
    await kodeInput(page).fill('A');
    await hargaInput(page).fill('45000');
    await simpan(page);
    await expect(app.toast).toContainText('Tarif baru Grade A');
    const harga = (await app.store<any[]>(KEYS.harga)) || [];
    const a = harga.find((h) => h.kode_grade === 'A');
    expect(a).toBeTruthy();
    expect(a.harga_per_kg).toBe(45000);
    expect(a.status).toBe('aktif');
    await page.getByPlaceholder(/Cari master harga beli/).fill('A');
    await expect(page.locator('tbody tr').filter({ hasText: /^\s*\d+\s*A\s*Rp 45\.000/ }).first()).toBeVisible();
    await app.reload();
    await app.gotoModule(MENU.hargaBeli, TITLE.hargaBeli);
    await expect(app.sidebar.getByRole('button', { name: MENU.hargaBeli })).toContainText('42 Kode');
  });

  test('TC-HARGA-04 | Kode duplikat (beda kapitalisasi) & harga negatif ditolak', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAdd(app, page);
    await kodeInput(page).fill('30');
    await hargaInput(page).fill('31000');
    await simpan(page);
    await expect(page.getByText('Kode "30" sudah terdaftar.')).toBeVisible();
    await kodeInput(page).fill('QA4');
    await hargaInput(page).fill('-5000');
    await simpan(page);
    const stillOpen = await page.getByText('Tambah Master Harga Beli Baru').isVisible();
    expect(stillOpen).toBe(true);
    const harga = (await app.store<any[]>(KEYS.harga)) || [];
    expect(harga.some((h) => h.kode_grade === 'QA4')).toBe(false);
    expect(harga.filter((h) => h.kode_grade === '30').length).toBe(1);
  });

  test('TC-HARGA-05 | Edit harga tersimpan; transaksi lama tetap memakai harga snapshot (tidak retroaktif)', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPHRG05', bals: [{ noBal: 'HRG0501', grade: '30' }] });
    await app.timbangBal({ noBal: 'HRG0501', bruto: 48 }); // netto 45 x 30.000
    await app.gotoModule(MENU.hargaBeli, TITLE.hargaBeli);
    await page.getByPlaceholder(/Cari master harga beli/).fill('30');
    const row = page.locator('tbody tr').filter({ hasText: /^\s*\d+\s*30\s*Rp/ }).first();
    await row.getByTitle('Edit Master Harga Beli').click();
    await expect(page.getByText('Edit Master Harga Beli')).toBeVisible();
    await hargaInput(page).fill('33000');
    await simpan(page);
    await expect(app.toast).toContainText('Rp 33.000');
    const harga = (await app.store<any[]>(KEYS.harga)) || [];
    expect(harga.find((h) => h.kode_grade === '30').harga_per_kg).toBe(33000);
    const txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    const tx = txs.find((t) => t.no_kupon === 'KUPHRG05');
    expect(tx.items[0].harga_per_kg).toBe(30000);
    expect(tx.total_harga_beli).toBe(45 * 30000);
    // Sortir baru memakai harga baru
    await app.gotoModule(MENU.sortir, TITLE.sortir);
    await page.locator('#grade-input').fill('30');
    await expect(page.locator('#harga-input')).toHaveValue('33000');
  });

  test('TC-HARGA-06 | Hapus kode harga dengan konfirmasi; batal tidak menghapus', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.hargaBeli, TITLE.hargaBeli);
    await page.getByPlaceholder(/Cari master harga beli/).fill('70');
    const row = page.locator('tbody tr').filter({ hasText: /^\s*\d+\s*70\s*Rp/ }).first();
    await row.getByTitle('Hapus Master Harga Beli').click();
    await expect(page.getByText('Hapus Master Harga Beli', { exact: true })).toBeVisible();
    await app.modal().getByRole('button', { name: 'Batal', exact: true }).click();
    expect(((await app.store<any[]>(KEYS.harga)) || []).some((h) => h.kode_grade === '70')).toBe(true);
    await row.getByTitle('Hapus Master Harga Beli').click();
    await page.getByRole('button', { name: 'Hapus Data' }).click();
    await expect(app.toast).toContainText('berhasil dihapus');
    expect(((await app.store<any[]>(KEYS.harga)) || []).some((h) => h.kode_grade === '70')).toBe(false);
    await expect(app.sidebar.getByRole('button', { name: MENU.hargaBeli })).toContainText('40 Kode');
  });

  test('TC-HARGA-07 | Pencarian kode & filter status aktif/nonaktif', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.hargaBeli, TITLE.hargaBeli);
    await page.getByPlaceholder(/Cari master harga beli/).fill('45');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByPlaceholder(/Cari master harga beli/).fill('ZZZ');
    await expect(page.getByText('Tidak ada data Master Harga Beli')).toBeVisible();
    await page.getByPlaceholder(/Cari master harga beli/).fill('');
    // nonaktifkan kode 69 via edit lalu filter nonaktif
    await page.getByPlaceholder(/Cari master harga beli/).fill('69');
    await page.locator('tbody tr').first().getByTitle('Edit Master Harga Beli').click();
    await page.locator('#chk-status-aktif-beli').uncheck();
    await simpan(page);
    await page.getByPlaceholder(/Cari master harga beli/).fill('');
    await page.locator('select').filter({ hasText: /Nonaktif/ }).first().selectOption('inactive');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr').first()).toContainText('69');
  });

  test('TC-HARGA-08 | Format angka: desimal, nilai sangat besar, tanggal berlaku wajib', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAdd(app, page);
    await kodeInput(page).fill('BIG');
    await hargaInput(page).fill('999999999');
    await expect(page.getByText('Terbaca: Rp 999.999.999 per kilogram')).toBeVisible();
    await simpan(page);
    await expect(app.toast).toContainText('Rp 999.999.999');
    await openAdd(app, page);
    await kodeInput(page).fill('DEC');
    await hargaInput(page).fill('45000.5');
    await simpan(page);
    const harga = (await app.store<any[]>(KEYS.harga)) || [];
    const dec = harga.find((h) => h.kode_grade === 'DEC');
    test.info().annotations.push({ type: 'observasi', description: `Harga desimal 45000.5 -> ${dec ? `tersimpan sebagai ${dec.harga_per_kg}` : 'ditolak (form tetap terbuka)'}` });
    if (!dec) await app.modal().getByRole('button', { name: 'Batal', exact: true }).click();
    await openAdd(app, page);
    await kodeInput(page).fill('TGL');
    await hargaInput(page).fill('45000');
    await page.locator('input[type="date"]').fill('');
    await simpan(page);
    expect(await page.locator('input[type="date"]').evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  });

  test('TC-HARGA-09 | Kode harga beli baru tersinkron ke dropdown Sortir, Laporan Harga (tab Beli) & badge sidebar', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAdd(app, page);
    await kodeInput(page).fill('QA9');
    await hargaInput(page).fill('47500');
    await simpan(page);
    await expect(app.sidebar.getByRole('button', { name: MENU.hargaBeli })).toContainText('42 Kode');
    await app.gotoModule(MENU.sortir, TITLE.sortir);
    await page.locator('#grade-input').fill('QA9');
    await expect(page.locator('div.absolute.z-50 div.cursor-pointer').filter({ hasText: 'Grade QA9 — Rp 47.500/kg' })).toHaveCount(1);
    await expect(page.locator('#harga-input')).toHaveValue('47500');
    await app.gotoModule(MENU.laporanHarga, TITLE.laporanHarga);
    await page.getByPlaceholder(/Cari Kode Beli/).fill('QA9');
    await expect(page.locator('tbody tr').filter({ hasText: 'QA9' }).first()).toBeVisible();
    void rupiah;
  });

  test('TC-HARGA-10 | Role timbang/kasir/pengiriman/kepala gudang tidak dapat mengelola harga beli', async ({ app, page }) => {
    for (const key of ['admintimbang', 'adminkasir', 'adminpengiriman', 'kepalagudang'] as const) {
      await app.loginAs(key);
      expect(await app.hasMenu(MENU.hargaBeli), `menu harga beli untuk ${key}`).toBe(false);
      await app.logout();
    }
    await app.loginAs('adminkasir');
    await page.evaluate((k) => localStorage.setItem(k, 'modul-3-harga'), KEYS.activeModule);
    await app.reload();
    const shown = await page.getByRole('button', { name: 'Tambah Master' }).isVisible().catch(() => false);
    test.info().annotations.push({ type: 'observasi', description: `Bypass modul-3-harga via localStorage oleh admin_kasir: ${shown ? 'BERHASIL (celah RBAC)' : 'ditolak'}` });
    expect(shown).toBe(false);
  });
});

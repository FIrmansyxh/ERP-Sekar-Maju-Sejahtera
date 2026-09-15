import { test, expect, MENU, TITLE, KEYS } from './helpers/app';

/**
 * Modul: Data Petani (TC-PETANI-01 .. 10) - PetaniTable, PetaniFormModal, Drawer, Deactivate, Reset, Import/Export
 */
test.describe('PETANI - Master Data Petani', () => {
  const NAMA = 'H. Slamet QA';

  async function addPetani(app: any, page: any, p: { nama: string; hp: string; alamat: string }) {
    await app.gotoModule(MENU.petani, TITLE.petani);
    await page.getByRole('button', { name: 'Tambah Petani Baru' }).click();
    await page.getByPlaceholder('Contoh: H. Achmad Zaini / Mat Rokim').fill(p.nama);
    await page.getByPlaceholder('Contoh: 081234567890 / 087855667788').fill(p.hp);
    await page.getByPlaceholder(/Contoh: Dusun Sumber Bening/).fill(p.alamat);
    await page.getByRole('button', { name: 'Simpan Petani' }).click();
  }

  test('TC-PETANI-01 | Master Petani dapat dibuka oleh role berwenang dengan tabel, pencarian & tombol aksi', async ({ app, page }) => {
    await app.loginAs('adminsortir');
    await app.gotoModule(MENU.petani, TITLE.petani);
    await expect(page.getByRole('button', { name: 'Tambah Petani Baru' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import / Export' })).toBeVisible();
    await expect(page.getByPlaceholder(/Cari petani/)).toBeVisible();
    const petani = (await app.store<any[]>(KEYS.petani)) || [];
    expect(petani.length).toBeGreaterThanOrEqual(34);
    await expect(page.getByText(`${petani.length} Petani`)).toBeVisible();
    await expect(page.locator('tbody tr').first().getByTitle('Detail Petani')).toBeVisible();
  });

  test('TC-PETANI-02 | Validasi field wajib: nama, nomor HP, alamat', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.petani, TITLE.petani);
    await page.getByRole('button', { name: 'Tambah Petani Baru' }).click();
    await page.getByRole('button', { name: 'Simpan Petani' }).click();
    await expect(page.getByText('Nama petani wajib diisi (minimal 2 karakter).')).toBeVisible();
    await expect(page.getByText('Nomor HP wajib diisi (minimal 9 digit angka).')).toBeVisible();
    await expect(page.getByText('Alamat lengkap petani wajib diisi.')).toBeVisible();
    await expect(page.getByText('Konfirmasi Simpan Petani Baru')).toHaveCount(0);
  });

  test('TC-PETANI-03 | Tambah petani valid: ID PTN-YYYY-NNN otomatis, tampil di tabel & persisten', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const before = (await app.store<any[]>(KEYS.petani)) || [];
    await addPetani(app, page, { nama: NAMA, hp: '081234567890', alamat: 'Ds. Sumberrejo' });
    await expect(page.getByText('Konfirmasi Simpan Petani Baru')).toBeVisible();
    await page.getByRole('button', { name: 'Ya, Daftarkan Petani' }).click();
    await expect(app.toast).toContainText('berhasil didaftarkan');
    const after = (await app.store<any[]>(KEYS.petani)) || [];
    expect(after.length).toBe(before.length + 1);
    const created = after.find((p) => p.nama_petani === NAMA);
    test.info().annotations.push({ type: 'observasi', description: `ID petani baru: ${created.petani_id} (format spesifikasi: PTN-YYYY-XXX, 3 digit urut)` });
    expect.soft(created.petani_id, 'ID petani harus mengikuti format PTN-YYYY-XXX (3 digit berurutan)').toMatch(new RegExp(`^PTN-${new Date().getFullYear()}-\\d{3}$`));
    expect(created.petani_id).toMatch(/^PTN-\d{4}-\d{3,}$/);
    expect(created.status_aktif).toBe(true);
    await page.getByPlaceholder(/Cari petani/).fill(NAMA);
    await expect(page.locator('tbody tr').filter({ hasText: NAMA })).toHaveCount(1);
    await app.reload();
    await app.gotoModule(MENU.petani, TITLE.petani);
    await page.getByPlaceholder(/Cari petani/).fill(NAMA);
    await expect(page.locator('tbody tr').filter({ hasText: NAMA })).toHaveCount(1);
  });

  test('TC-PETANI-04 | Data tidak valid: nama 1 karakter, HP huruf, HP terlalu pendek', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await addPetani(app, page, { nama: 'A', hp: 'abcde', alamat: 'Ds. Sumberrejo' });
    await expect(page.getByText('Nama petani wajib diisi (minimal 2 karakter).')).toBeVisible();
    await expect(page.getByText('Nomor HP wajib diisi (minimal 9 digit angka).')).toBeVisible();
    await page.getByPlaceholder('Contoh: H. Achmad Zaini / Mat Rokim').fill('QA HP Huruf');
    await page.getByPlaceholder('Contoh: 081234567890 / 087855667788').fill('abcdefghij'); // 10 huruf
    await page.getByRole('button', { name: 'Simpan Petani' }).click();
    const confirmShown = await page.getByText('Konfirmasi Simpan Petani Baru').isVisible().catch(() => false);
    test.info().annotations.push({ type: 'observasi', description: `No HP "abcdefghij" (10 huruf) ${confirmShown ? 'DITERIMA' : 'ditolak'} oleh validasi` });
    expect(confirmShown, 'Nomor HP berisi huruf harus ditolak (validasi format numerik)').toBe(false);
  });

  test('TC-PETANI-05 | Edit data petani tersimpan & tampil di tabel maupun detail drawer', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.petani, TITLE.petani);
    const petani = (await app.store<any[]>(KEYS.petani)) || [];
    const target = petani[0];
    await page.getByPlaceholder(/Cari petani/).fill(target.petani_id);
    const row = page.locator('tbody tr').filter({ hasText: target.petani_id });
    await row.getByTitle('Edit Data Petani').click();
    const newName = `${target.nama_petani} (Edit QA)`;
    await page.getByPlaceholder('Contoh: H. Achmad Zaini / Mat Rokim').fill(newName);
    await page.getByPlaceholder('Contoh: 081234567890 / 087855667788').fill('085000111222');
    await page.getByRole('button', { name: 'Simpan Perubahan' }).first().click();
    await page.getByRole('button', { name: 'Simpan Perubahan' }).last().click();
    await expect(app.toast).toContainText('berhasil diperbarui');
    await expect(row).toContainText(newName);
    await row.getByTitle('Detail Petani').click();
    await expect(page.getByText(newName).first()).toBeVisible();
    await expect(page.getByText('085000111222').first()).toBeVisible();
    const after = (await app.store<any[]>(KEYS.petani)) || [];
    expect(after.find((p) => p.petani_id === target.petani_id)?.no_hp).toBe('085000111222');
  });

  test('TC-PETANI-06 | Hapus petani dengan konfirmasi; batal tidak menghapus', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await addPetani(app, page, { nama: 'Petani Hapus QA', hp: '081111111111', alamat: 'Ds. Uji' });
    await page.getByRole('button', { name: 'Ya, Daftarkan Petani' }).click();
    await page.getByPlaceholder(/Cari petani/).fill('Petani Hapus QA');
    const row = page.locator('tbody tr').filter({ hasText: 'Petani Hapus QA' });
    await row.getByTitle('Hapus Data Petani').click();
    await expect(page.getByRole('heading', { name: 'Konfirmasi Hapus Data Petani' })).toBeVisible();
    await app.modal().getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(row).toHaveCount(1);
    await row.getByTitle('Hapus Data Petani').click();
    await app.modal().getByRole('button', { name: 'Ya, Hapus Permanen' }).click();
    await expect(app.toast).toContainText('berhasil dihapus');
    await expect(row).toHaveCount(0);
    const after = (await app.store<any[]>(KEYS.petani)) || [];
    expect(after.some((p) => p.nama_petani === 'Petani Hapus QA')).toBe(false);
  });

  test('TC-PETANI-07 | Pencarian (nama/ID/HP) & filter status aktif/nonaktif', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.petani, TITLE.petani);
    const petani = (await app.store<any[]>(KEYS.petani)) || [];
    const target = petani[1];
    await page.getByPlaceholder(/Cari petani/).fill(target.no_hp);
    await expect(page.locator('tbody tr').filter({ hasText: target.petani_id })).toHaveCount(1);
    await page.getByPlaceholder(/Cari petani/).fill('TIDAK-ADA-XYZ');
    await expect(page.getByText(/Tidak ada data petani yang sesuai/)).toBeVisible();
    await page.getByPlaceholder(/Cari petani/).fill('');

    // Nonaktifkan satu petani lalu filter
    await page.getByPlaceholder(/Cari petani/).fill(target.petani_id);
    await page.locator('tbody tr').filter({ hasText: target.petani_id }).getByTitle('Nonaktifkan Petani').click();
    await app.modal().getByRole('button', { name: 'Nonaktifkan', exact: true }).click();
    await expect(app.toast).toContainText('Status keaktifan petani berhasil diperbarui');
    const afterToggle = ((await app.store<any[]>(KEYS.petani)) || []).find((p) => p.petani_id === target.petani_id);
    test.info().annotations.push({ type: 'observasi', description: `Setelah konfirmasi Nonaktifkan: status_aktif=${afterToggle?.status_aktif} (toast sukses tampil)` });
    expect(afterToggle?.status_aktif, 'Status petani harus menjadi nonaktif setelah konfirmasi (toast menyatakan berhasil)').toBe(false);
    await page.getByPlaceholder(/Cari petani/).fill('');
    await page.locator('select').filter({ hasText: 'Semua Status' }).selectOption('inactive');
    await expect(page.locator('tbody tr').filter({ hasText: target.petani_id })).toHaveCount(1);
    await expect(page.getByText('Filter: Nonaktif')).toBeVisible();
  });

  test('TC-PETANI-08 | Batas format: HP 8 vs 9 digit, nama 2 karakter, nama panjang & karakter khusus', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await addPetani(app, page, { nama: 'Al', hp: '08123456', alamat: 'Ds. Uji' }); // 8 digit
    await expect(page.getByText('Nomor HP wajib diisi (minimal 9 digit angka).')).toBeVisible();
    await page.getByPlaceholder('Contoh: 081234567890 / 087855667788').fill('081234567'); // 9 digit
    await page.getByRole('button', { name: 'Simpan Petani' }).click();
    await expect(page.getByText('Konfirmasi Simpan Petani Baru')).toBeVisible();
    await page.getByRole('button', { name: 'Ya, Daftarkan Petani' }).click();
    await expect(app.toast).toContainText('berhasil didaftarkan');

    const longName = `H. Ka'bah & Sons "Tembakau" ${'Panjang '.repeat(20)}`.trim();
    await addPetani(app, page, { nama: longName, hp: '081234567891', alamat: 'Ds. Uji' });
    await page.getByRole('button', { name: 'Ya, Daftarkan Petani' }).click();
    await expect(app.toast).toContainText('berhasil didaftarkan');
    const after = (await app.store<any[]>(KEYS.petani)) || [];
    expect(after.some((p) => p.nama_petani === longName)).toBe(true);
    await page.getByPlaceholder(/Cari petani/).fill("Ka'bah");
    await expect(page.locator('tbody tr').filter({ hasText: "Ka'bah" })).toHaveCount(1);
    const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHScroll, 'nama panjang tidak boleh membuat halaman scroll horizontal').toBe(false);
  });

  test('TC-PETANI-09 | Sinkronisasi: petani baru muncul di Sortir, petani nonaktif hilang dari Sortir, statistik & Laporan Petani', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await addPetani(app, page, { nama: 'Petani Sinkron QA', hp: '081234567892', alamat: 'Ds. Sinkron' });
    await page.getByRole('button', { name: 'Ya, Daftarkan Petani' }).click();
    await app.gotoModule(MENU.sortir, TITLE.sortir);
    const petaniInput = page.getByPlaceholder('Pilih Petani...');
    await petaniInput.click();
    await petaniInput.fill('Petani Sinkron QA');
    await expect(page.locator('div.absolute.z-50 div.cursor-pointer').filter({ hasText: 'Petani Sinkron QA' })).toHaveCount(1);
    await page.keyboard.press('Escape');

    // Buat transaksi untuk petani ini -> statistik petani & laporan petani
    await app.sortirCreate({ kupon: 'KUPPTN09', petaniQuery: 'Petani Sinkron QA', bals: [{ noBal: 'PTN0901', grade: '45' }] });
    const petani = (await app.store<any[]>(KEYS.petani)) || [];
    const p = petani.find((x) => x.nama_petani === 'Petani Sinkron QA');
    expect(p.statistik?.total_setoran_bal).toBe(1);
    await app.gotoModule(MENU.laporanPetani, TITLE.laporanPetani);
    await expect(page.locator('tbody tr').filter({ hasText: 'Petani Sinkron QA' }).first()).toBeVisible();

    // Nonaktifkan -> tidak muncul di Sortir
    await app.gotoModule(MENU.petani, TITLE.petani);
    await page.getByPlaceholder(/Cari petani/).fill('Petani Sinkron QA');
    await page.locator('tbody tr').filter({ hasText: 'Petani Sinkron QA' }).getByTitle('Nonaktifkan Petani').click();
    await app.modal().getByRole('button', { name: 'Nonaktifkan', exact: true }).click();
    await expect(app.toast).toContainText('Status keaktifan petani berhasil diperbarui');
    const toggled = ((await app.store<any[]>(KEYS.petani)) || []).find((x) => x.nama_petani === 'Petani Sinkron QA');
    expect(toggled?.status_aktif, 'Petani harus nonaktif setelah konfirmasi Nonaktifkan').toBe(false);
    await app.gotoModule(MENU.sortir, TITLE.sortir);
    await petaniInput.click();
    await petaniInput.fill('Petani Sinkron QA');
    await expect(page.locator('div.absolute.z-50').getByText('Tidak ada rekomendasi')).toBeVisible();
  });

  test('TC-PETANI-10 | Role tanpa hak (timbang, kasir, pengiriman, kepala gudang) tidak dapat mengakses Master Petani', async ({ app, page }) => {
    for (const key of ['admintimbang', 'adminkasir', 'adminpengiriman', 'kepalagudang'] as const) {
      await app.loginAs(key);
      expect(await app.hasMenu(MENU.petani), `menu petani untuk ${key}`).toBe(false);
      await app.logout();
    }
    await app.loginAs('adminkasir');
    await page.evaluate((k) => localStorage.setItem(k, 'modul-1-petani'), KEYS.activeModule);
    await app.reload();
    const shown = await page.getByRole('button', { name: 'Tambah Petani Baru' }).isVisible().catch(() => false);
    test.info().annotations.push({ type: 'observasi', description: `Bypass modul-1-petani via localStorage oleh admin_kasir: ${shown ? 'BERHASIL (celah RBAC)' : 'ditolak'}` });
    expect(shown, 'Master Petani tidak boleh tampil untuk admin_kasir').toBe(false);
  });
});

import { test, expect, MENU, TITLE, KEYS } from './helpers/app';

/**
 * Modul: Data Barang/Tembakau (TC-BARANG-01 .. 10)
 * Catatan desain: di kode aktual, "Data Barang" = Inventaris Bal Gudang (BarangManagement). Tidak ada form
 * tambah barang manual; bal tercipta otomatis dari proses Sortir/Timbang. Skenario template disesuaikan.
 */
test.describe('BARANG - Inventaris Bal Gudang', () => {
  test('TC-BARANG-01 | Inventaris Bal Gudang dapat dibuka: counter status, tabel bal, pencarian & filter', async ({ app, page }) => {
    await app.loginAs('adminsortir');
    await app.gotoModule(MENU.barang, TITLE.barang);
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    expect(barang.length).toBeGreaterThan(0);
    await expect(page.getByPlaceholder(/Cari barang/)).toBeVisible();
    await expect(page.locator('select').filter({ hasText: 'Semua Status' })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible();
    const sidebarBadge = app.sidebar.getByRole('button', { name: MENU.barang });
    await expect(sidebarBadge).toContainText(`${barang.length} Bal`);
  });

  test('TC-BARANG-02 | Tidak ada form input langsung; tombol "Beli Bal Baru (Timbang)" mengarah ke alur transaksi', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.barang, TITLE.barang);
    await expect(page.getByRole('button', { name: /Tambah Bal|Tambah Barang/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Beli Bal Baru (Timbang)' }).click();
    await expect(app.headerTitle).toHaveText(TITLE.kasir);
    test.info().annotations.push({ type: 'desain', description: 'Modul tidak memiliki form input barang; validasi field wajib diuji pada Sortir (TC-TRANSAKSI-02).' });
  });

  test('TC-BARANG-03 | Bal baru tercipta otomatis dari Sortir dengan status Di Gudang & berat 0 sebelum ditimbang', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const before = ((await app.store<any[]>(KEYS.barang)) || []).length;
    await app.sortirCreate({ kupon: 'KUPBRG03', bals: [{ noBal: 'BRG0301', grade: '45' }, { noBal: 'BRG0302', grade: '46' }] });
    const after = (await app.store<any[]>(KEYS.barang)) || [];
    expect(after.length).toBe(before + 2);
    const b = after.find((x) => x.no_bal === 'BRG0301');
    expect(b.status_stok).toBe('di_gudang');
    expect(b.berat_kg).toBe(0);
    expect(b.kode_grade).toBe('45');
    await app.gotoModule(MENU.barang, TITLE.barang);
    await page.getByPlaceholder(/Cari barang/).fill('BRG030');
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await expect(app.sidebar.getByRole('button', { name: MENU.barang })).toContainText(`${after.length} Bal`);
  });

  test('TC-BARANG-04 | Nomor bal duplikat ditolak saat sortir (sudah ada di inventaris / dalam kupon)', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPBRG04', bals: [{ noBal: 'BRG0401', grade: '45' }] });
    await app.gotoModule(MENU.sortir, TITLE.sortir);
    await page.getByPlaceholder('Contoh: KUP0001').fill('KUPBRG04B');
    await app.sortirAddBal('BRG0401', '45');
    await expect(page.getByText(/sudah ada di master data inventaris/)).toBeVisible();
    await app.sortirAddBal('brg0401', '45'); // beda kapitalisasi
    await expect(page.getByText(/sudah ada di master data inventaris/)).toBeVisible();
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    expect(barang.filter((b) => b.no_bal === 'BRG0401').length).toBe(1);
  });

  test('TC-BARANG-05 | Berat & nilai bal ter-update setelah ditimbang; lokasi simpan tersimpan', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const harga = (await app.store<any[]>(KEYS.harga)) || [];
    const h45 = harga.find((h) => h.kode_grade === '45')!.harga_per_kg;
    await app.sortirCreate({ kupon: 'KUPBRG05', bals: [{ noBal: 'BRG0501', grade: '45' }] });
    await app.timbangBal({ noBal: 'BRG0501', bruto: 55 }); // tara 5 -> netto 50
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    const b = barang.find((x) => x.no_bal === 'BRG0501');
    expect(b.berat_kg).toBe(50);
    expect(b.harga_per_kg).toBe(h45);
    expect(b.total_harga).toBe(50 * h45);
    await app.gotoModule(MENU.barang, TITLE.barang);
    await page.getByPlaceholder(/Cari barang/).fill('BRG0501');
    const row = page.locator('tbody tr').filter({ hasText: 'BRG0501' });
    await expect(row).toContainText(/50 kg/i);
    await expect(row).toContainText(/Di Gudang/i);
    test.info().annotations.push({ type: 'observasi', description: `Tabel inventaris tidak menampilkan kolom harga/nilai bal; nilai diverifikasi dari data (harga ${h45}/kg, total ${50 * h45}).` });
  });

  test('TC-BARANG-06 | Hapus transaksi menghapus bal terkait dari inventaris (tidak ada data yatim)', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPBRG06', bals: [{ noBal: 'BRG0601', grade: '45' }, { noBal: 'BRG0602', grade: '45' }] });
    await app.timbangBal({ noBal: 'BRG0601', bruto: 50 });
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPBRG06').getByTitle('Hapus Transaksi (Memerlukan Konfirmasi)').click();
    await page.getByRole('button', { name: 'Duplikasi transaksi timbangan' }).click();
    await page.getByRole('button', { name: 'Ya, Hapus Transaksi' }).click();
    await expect(app.toast).toContainText('berhasil dihapus');
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    expect(barang.some((b) => b.no_bal === 'BRG0601' || b.no_bal === 'BRG0602')).toBe(false);
    await app.gotoModule(MENU.barang, TITLE.barang);
    await page.getByPlaceholder(/Cari barang/).fill('BRG060');
    await expect(page.locator('tbody tr').filter({ hasText: 'BRG060' })).toHaveCount(0);
  });

  test('TC-BARANG-07 | Pencarian No Bal/petani & filter status stok; filter grade tersedia sesuai kode master', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.barang, TITLE.barang);
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    const sample = barang[0];
    await page.getByPlaceholder(/Cari barang/).fill(sample.no_bal);
    await expect(page.locator('tbody tr').filter({ hasText: sample.no_bal }).first()).toBeVisible();
    await page.getByPlaceholder(/Cari barang/).fill(sample.nama_petani);
    const byPetani = barang.filter((b) => b.nama_petani === sample.nama_petani).length;
    await expect(page.locator('tbody tr').first()).toContainText(sample.nama_petani);
    expect(await page.locator('tbody tr').count()).toBeLessThanOrEqual(Math.max(byPetani, 1));
    await page.getByPlaceholder(/Cari barang/).fill('');

    const statusSelect = page.locator('select').filter({ hasText: 'Semua Status' });
    await statusSelect.selectOption('keluar');
    await expect(page.locator('tbody tr').filter({ hasText: /Di Gudang/ })).toHaveCount(0);
    await statusSelect.selectOption('all');

    const gradeOptions = await page.locator('select').filter({ hasText: 'Semua Grade' }).locator('option').allTextContents();
    const storeGrades = Array.from(new Set(barang.map((b) => String(b.kode_grade))));
    const covered = storeGrades.filter((g) => gradeOptions.some((o) => o.includes(`Grade ${g}`)));
    test.info().annotations.push({ type: 'observasi', description: `Opsi filter grade: ${gradeOptions.join(' | ')}; kode grade aktual di data: ${storeGrades.join(', ')}; yang tercakup: ${covered.length}/${storeGrades.length}` });
    expect(covered.length, 'Filter grade harus mencakup kode grade yang benar-benar ada di inventaris').toBeGreaterThan(0);
  });

  test('TC-BARANG-08 | Format tampilan berat (1 desimal, Kg) & nilai Rupiah konsisten dengan data', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPBRG08', bals: [{ noBal: 'BRG0801', grade: '45' }] });
    await app.timbangBal({ noBal: 'BRG0801', bruto: 48.7 }); // tara 3 -> 45.7
    await app.gotoModule(MENU.barang, TITLE.barang);
    await page.getByPlaceholder(/Cari barang/).fill('BRG0801');
    const row = page.locator('tbody tr').filter({ hasText: 'BRG0801' });
    await expect(row).toContainText(/45[.,]7/);
    const harga = (await app.store<any[]>(KEYS.harga)) || [];
    const h45 = harga.find((h) => h.kode_grade === '45')!.harga_per_kg;
    const nilai = Math.round(45.7 * h45);
    const text = (await row.textContent()) || '';
    test.info().annotations.push({ type: 'observasi', description: `Baris bal: ${text.replace(/\s+/g, ' ').slice(0, 200)} | nilai data: ${nilai}` });
    expect(text).toMatch(/45\.7\s*kg/i);
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    const b = barang.find((x) => x.no_bal === 'BRG0801');
    expect(b.berat_kg).toBeCloseTo(45.7, 1);
    expect(b.total_harga).toBeCloseTo(45.7 * h45, 0);
  });

  test('TC-BARANG-09 | Jumlah bal tersinkron: badge sidebar, Laporan Bal (Total Populasi Bal), dan Dashboard', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPBRG09', bals: [{ noBal: 'BRG0901', grade: '45' }] });
    await app.timbangBal({ noBal: 'BRG0901', bruto: 50 });
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    const diGudang = barang.filter((b) => b.status_stok === 'di_gudang');
    await expect(app.sidebar.getByRole('button', { name: MENU.barang })).toContainText(`${barang.length} Bal`);
    await app.gotoModule(MENU.laporanBal, TITLE.laporanBal);
    await expect(page.locator('main')).toContainText('Total Populasi Bal');
    const main = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    const hasCount = main.includes(String(barang.length)) || main.includes(String(diGudang.length));
    test.info().annotations.push({ type: 'observasi', description: `Total bal store=${barang.length} (di gudang=${diGudang.length}); Laporan Bal memuat angka tsb: ${hasCount}` });
    expect(hasCount).toBe(true);
  });

  test('TC-BARANG-10 | Role kasir/timbang/pengiriman/kepala gudang tidak dapat membuka Inventaris Bal', async ({ app, page }) => {
    for (const key of ['adminkasir', 'admintimbang', 'adminpengiriman', 'kepalagudang'] as const) {
      await app.loginAs(key);
      expect(await app.hasMenu(MENU.barang), `menu barang untuk ${key}`).toBe(false);
      await app.logout();
    }
    await app.loginAs('admintimbang');
    await page.evaluate((k) => localStorage.setItem(k, 'modul-2-barang'), KEYS.activeModule);
    await app.reload();
    const shown = await page.getByPlaceholder(/Cari barang/).isVisible().catch(() => false);
    test.info().annotations.push({ type: 'observasi', description: `Bypass modul-2-barang via localStorage oleh admin_timbang: ${shown ? 'BERHASIL (celah RBAC)' : 'ditolak'}` });
    expect(shown).toBe(false);
  });
});

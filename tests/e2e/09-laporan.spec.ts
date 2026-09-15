import { test, expect, MENU, TITLE, KEYS, rupiah, type App } from './helpers/app';
import type { Page } from '@playwright/test';
import { buildTransaksi, buildPengiriman } from './helpers/factory';

/**
 * Modul: Laporan & Rekap (TC-LAPORAN-01 .. 10)
 * Data uji deterministik disuntik ke localStorage lewat factory (ID non-TRX agar tidak dinormalisasi aplikasi).
 */
test.describe('LAPORAN - Dashboard Analytic & Laporan', () => {
  async function seedReports(app: App) {
    const petani = (await app.store<any[]>(KEYS.petani)) || [];
    const p1 = petani[0];
    const p2 = petani[1];
    const a = buildTransaksi({ txId: 'QA-TX-0901', kupon: 'KUPLAP01', petani: p1, tanggal: '2026-09-01', bals: [{ no_bal: 'LAP0101', grade: '45', harga: 45000, bruto: 53 }, { no_bal: 'LAP0102', grade: '50', harga: 50000, bruto: 63 }], lunas: true });
    const b = buildTransaksi({ txId: 'QA-TX-0910', kupon: 'KUPLAP10', petani: p2, tanggal: '2026-09-10', bals: [{ no_bal: 'LAP1001', grade: '40', harga: 40000, bruto: 48, gantiTikar: true }], lunas: true });
    const c = buildTransaksi({ txId: 'QA-TX-0914', kupon: 'KUPLAP14', petani: p1, tanggal: '2026-09-14', bals: [{ no_bal: 'LAP1401', grade: '45', harga: 45000, bruto: 50 }], lunas: false });
    const txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    await app.setStore(KEYS.transaksi, [a.tx, b.tx, c.tx, ...txs]);
    await app.setStore(KEYS.barang, [...a.barangs, ...b.barangs, ...c.barangs, ...barang]);
    await app.reload();
    return { a, b, c, p1, p2 };
  }

  test('TC-LAPORAN-01 | Kepala Gudang dapat membuka Dashboard Analytic & 7 laporan tanpa error', async ({ app, page }) => {
    await app.loginAs('kepalagudang');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const menus: Array<[RegExp, string]> = [
      [MENU.dashboard, TITLE.dashboard],
      [MENU.laporanBal, TITLE.laporanBal],
      [MENU.laporanKodeBal, TITLE.laporanKodeBal],
      [MENU.laporanHarga, TITLE.laporanHarga],
      [MENU.laporanPembelian, TITLE.laporanPembelian],
      [MENU.laporanPetani, TITLE.laporanPetani],
      [MENU.laporanPengiriman, TITLE.laporanPengiriman],
    ];
    for (const [m, t] of menus) {
      await app.gotoModule(m, t);
      await expect(page.locator('main')).not.toBeEmpty();
    }
    await app.gotoModule(MENU.dashboard, TITLE.dashboard);
    await expect(page.getByText('Total Pembelian (Modal)')).toBeVisible();
    await expect(page.getByText('Total Penjualan', { exact: true })).toBeVisible();
    await expect(page.getByText('Valuasi (Stok Gudang)')).toBeVisible();
    await expect(page.getByText('Keuntungan Bersih', { exact: true })).toBeVisible();
    expect(errors, 'tidak boleh ada error JavaScript saat membuka laporan').toEqual([]);
  });

  test('TC-LAPORAN-02 | Validasi filter: tanggal akhir lebih awal dari tanggal awal harus ditolak / diberi pesan', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await seedReports(app);
    await app.gotoModule(MENU.laporanPembelian, TITLE.laporanPembelian);
    const dates = page.locator('input[type="date"]');
    await dates.nth(0).fill('2026-09-15');
    await dates.nth(1).fill('2026-09-01');
    await page.getByRole('button', { name: 'Cari Data' }).click();
    const bodyText = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    const hasValidation = /tanggal (akhir|sampai).*(tidak boleh|harus|lebih)/i.test(bodyText) || /rentang tanggal tidak valid/i.test(bodyText);
    const emptyState = /Tidak ada data transaksi yang cocok/.test(bodyText);
    test.info().annotations.push({ type: 'observasi', description: `Rentang tanggal terbalik -> pesan validasi: ${hasValidation}; tabel kosong: ${emptyState}` });
    expect(hasValidation, 'Rentang tanggal terbalik (akhir < awal) seharusnya memunculkan pesan validasi, bukan sekadar tabel kosong').toBe(true);
  });

  test('TC-LAPORAN-03 | Transaksi baru (lunas) langsung muncul di Laporan Pembelian & Laporan Bal', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const { a } = await seedReports(app);
    await app.gotoModule(MENU.laporanPembelian, TITLE.laporanPembelian);
    await page.getByPlaceholder('Ketik/Pilih Kupon...').fill('KUPLAP01');
    await page.getByRole('button', { name: 'Cari Data' }).click();
    const rows = page.locator('tbody tr').filter({ hasText: 'KUPLAP01' });
    await expect(rows.first()).toBeVisible();
    await expect(page.locator('tfoot').first()).toContainText(a.totals.totalKotor.toLocaleString('id-ID'));
    await app.gotoModule(MENU.laporanBal, TITLE.laporanBal);
    await page.getByPlaceholder(/Cari/).first().fill('LAP0101');
    await expect(page.locator('tbody tr').filter({ hasText: 'LAP0101' }).first()).toBeVisible();
  });

  test('TC-LAPORAN-04 | Filter tidak valid / data kosong menampilkan state kosong tanpa error (termasuk grafik distribusi)', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await app.gotoModule(MENU.laporanPembelian, TITLE.laporanPembelian);
    await page.getByPlaceholder('Ketik/Pilih Kode Beli...').fill('ZZZ-TIDAK-ADA');
    await page.getByRole('button', { name: 'Cari Data' }).click();
    await expect(page.getByText(/Tidak ada data transaksi yang cocok/)).toBeVisible();
    // Kosongkan seluruh data bal & transaksi lalu buka dashboard + grafik distribusi
    await app.setStore(KEYS.barang, []);
    await app.setStore(KEYS.transaksi, []);
    await app.reload();
    await app.gotoModule(MENU.dashboard, TITLE.dashboard);
    await expect(app.dashboardCard('Total Pembelian (Modal)')).toContainText('Rp 0');
    const main = await page.locator('main').innerText();
    expect(main).toMatch(/Belum ada data transaksi|Tidak ada data bal tembakau/);
    await app.gotoModule(MENU.laporanHarga, TITLE.laporanHarga);
    await app.gotoModule(MENU.laporanBal, TITLE.laporanBal);
    expect(errors).toEqual([]);
  });

  test('TC-LAPORAN-05 | Perubahan data (koreksi transaksi & status DO) tercermin di laporan', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const { a } = await seedReports(app);
    // Koreksi status pembayaran transaksi c (belum lunas -> lunas) melalui Kasir
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPLAP14').getByRole('button', { name: 'Bayar' }).click();
    const cash = page.getByPlaceholder(/^Ketik ulang /);
    const nominal = Number(((await cash.getAttribute('placeholder')) || '').replace(/\D/g, ''));
    await cash.fill(String(nominal));
    await page.locator('#check-cetak-nota').uncheck();
    await page.getByRole('button', { name: 'Proses Pembayaran Tunai (Cash)' }).click();
    await app.gotoModule(MENU.dashboard, TITLE.dashboard);
    const txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    const modal = txs.filter((t) => t.status_pembayaran === 'lunas').reduce((s, t) => s + (t.items || []).reduce((x: number, i: any) => x + i.berat_kg * i.harga_per_kg, 0), 0);
    await expect(app.dashboardCard('Total Pembelian (Modal)')).toContainText(rupiah(modal));
    // Status DO diubah -> Laporan Pengiriman menampilkan status baru
    const doc = buildPengiriman({ id: '1', noSuratJalan: 'SJ-QA-0001', tujuan: 'PT Laporan QA', barangs: a.barangs.map((b) => ({ barang_id: b.barang_id, berat_kg: b.berat_kg })), hargaJualPerKg: 60000, kodeHargaJual: '60', status: 'dikirim' });
    await app.setStore(KEYS.pengiriman, [doc]);
    await app.reload();
    await app.gotoStatusBatchDO();
    await page.locator('tbody tr').filter({ hasText: 'SJ-QA-0001' }).getByRole('button', { name: 'Berangkat' }).click();
    await app.gotoModule(MENU.laporanPengiriman, TITLE.laporanPengiriman);
    await expect(page.locator('tbody tr').filter({ hasText: 'SJ-QA-0001' }).first()).toContainText(/Dalam Perjalanan|Sedang Dikirim/i);
  });

  test('TC-LAPORAN-06 | Transaksi yang dihapus hilang dari Laporan Pembelian & total berkurang', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const { a, b } = await seedReports(app);
    await app.gotoModule(MENU.laporanPembelian, TITLE.laporanPembelian);
    await page.getByPlaceholder('Ketik/Pilih Kupon...').fill('KUPLAP10');
    await page.getByRole('button', { name: 'Cari Data' }).click();
    await expect(page.locator('tbody tr').filter({ hasText: 'KUPLAP10' }).first()).toBeVisible();
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPLAP10').getByTitle('Hapus Transaksi (Memerlukan Konfirmasi)').click();
    await page.getByRole('button', { name: 'Koreksi administratif kasir' }).click();
    await page.getByRole('button', { name: 'Ya, Hapus Transaksi' }).click();
    await app.gotoModule(MENU.laporanPembelian, TITLE.laporanPembelian);
    await page.getByPlaceholder('Ketik/Pilih Kupon...').fill('KUPLAP10');
    await page.getByRole('button', { name: 'Cari Data' }).click();
    await expect(page.getByText(/Tidak ada data transaksi yang cocok/)).toBeVisible();
    await page.getByRole('button', { name: 'Reset Filter' }).click();
    const foot = await page.locator('tfoot').first().innerText();
    expect(foot).not.toContain(b.totals.totalKotor.toLocaleString('id-ID'));
    void a;
  });

  test('TC-LAPORAN-07 | Filter rentang tanggal & kupon pada Laporan Pembelian menghasilkan baris dan total yang tepat', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const { a, b } = await seedReports(app);
    await app.gotoModule(MENU.laporanPembelian, TITLE.laporanPembelian);
    const dates = page.locator('input[type="date"]');
    await dates.nth(0).fill('2026-09-01');
    await dates.nth(1).fill('2026-09-05');
    await page.getByRole('button', { name: 'Cari Data' }).click();
    await expect(page.locator('tbody tr').filter({ hasText: 'KUPLAP01' }).first()).toBeVisible();
    await expect(page.locator('tbody tr').filter({ hasText: 'KUPLAP10' })).toHaveCount(0);
    await expect(page.locator('tfoot').first()).toContainText(a.totals.totalKotor.toLocaleString('id-ID'));
    await dates.nth(0).fill('2026-09-10');
    await dates.nth(1).fill('2026-09-10');
    await page.getByRole('button', { name: 'Cari Data' }).click();
    await expect(page.locator('tbody tr').filter({ hasText: 'KUPLAP10' }).first()).toBeVisible();
    await expect(page.locator('tbody tr').filter({ hasText: 'KUPLAP01' })).toHaveCount(0);
    await expect(page.locator('tfoot').first()).toContainText(b.totals.totalKotor.toLocaleString('id-ID'));
    await page.getByRole('button', { name: 'Reset Filter' }).click();
    await expect(page.locator('tbody tr').filter({ hasText: 'KUPLAP01' }).first()).toBeVisible();
    await expect(page.locator('tbody tr').filter({ hasText: 'KUPLAP10' }).first()).toBeVisible();
  });

  test('TC-LAPORAN-08 | Format angka Rupiah (id-ID), berat 1 desimal, dan potongan tikar tampil benar', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const { b } = await seedReports(app);
    await app.gotoModule(MENU.laporanPembelian, TITLE.laporanPembelian);
    await page.getByPlaceholder('Ketik/Pilih Kupon...').fill('KUPLAP10');
    await page.getByRole('button', { name: 'Cari Data' }).click();
    const row = page.locator('tbody tr').filter({ hasText: 'KUPLAP10' }).first();
    const text = (await row.innerText()).replace(/\s+/g, ' ');
    test.info().annotations.push({ type: 'observasi', description: `Baris laporan: ${text.slice(0, 220)}` });
    expect(text).toMatch(/Rp\s?[\d.]+|[\d]{1,3}(\.\d{3})+/);
    expect(text).toContain(b.totals.totalKotor.toLocaleString('id-ID'));
    // Netto 45 kg (48 - 3) harus tampil
    expect(text).toMatch(/45([.,]0)?\b/);
    // Potongan tikar 75.000 terlihat pada baris/kolom potongan
    expect(text).toMatch(/75\.000|85\.000/);
  });

  test('TC-LAPORAN-09 | Dashboard: Total Pembelian, Valuasi Stok, Total Penjualan & Keuntungan sesuai data mentah', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const { a, b } = await seedReports(app);
    const doc = buildPengiriman({ id: '1', noSuratJalan: 'SJ-QA-0009', tujuan: 'PT Dashboard QA', barangs: b.barangs.map((x) => ({ barang_id: x.barang_id, berat_kg: x.berat_kg })), hargaJualPerKg: 60000, kodeHargaJual: '60', status: 'dikirim' });
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    await app.setStore(KEYS.barang, barang.map((x) => (doc.barang_ids.includes(x.barang_id) ? { ...x, status_stok: 'keluar' } : x)));
    await app.setStore(KEYS.pengiriman, [doc]);
    await app.reload();
    const txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    const modalLunas = txs.filter((t) => t.status_pembayaran === 'lunas').reduce((s, t) => s + (t.items || []).reduce((x: number, i: any) => x + i.berat_kg * i.harga_per_kg, 0), 0);
    const penjualan = doc.total_nilai_deal;
    const modalTerkirim = b.barangs.reduce((s, x) => s + x.berat_kg * x.harga_per_kg, 0);
    await app.gotoModule(MENU.dashboard, TITLE.dashboard);
    await expect(app.dashboardCard('Total Pembelian (Modal)')).toContainText(rupiah(modalLunas));
    await expect(app.dashboardCard('Total Penjualan')).toContainText(rupiah(penjualan));
    await expect(app.dashboardCard('Keuntungan Bersih')).toContainText(rupiah(penjualan - modalTerkirim));
    const valuasiText = await app.dashboardCard('Valuasi (Stok Gudang)').innerText();
    const allBarang = (await app.store<any[]>(KEYS.barang)) || [];
    const valuasiSemua = allBarang.filter((x) => ['di_gudang', 'siap_kirim', 'terkirim_sample'].includes(x.status_stok)).reduce((s, x) => s + (x.berat_kg || 0) * (x.harga_per_kg || 0), 0);
    const lunasIds = new Set(txs.filter((t) => t.status_pembayaran === 'lunas').flatMap((t) => t.barang_ids || []));
    const valuasiLunas = allBarang.filter((x) => ['di_gudang', 'siap_kirim', 'terkirim_sample'].includes(x.status_stok) && (!x.transaksi_pembelian_id || lunasIds.has(x.barang_id))).reduce((s, x) => s + (x.berat_kg || 0) * (x.harga_per_kg || 0), 0);
    test.info().annotations.push({ type: 'observasi', description: `Valuasi tampil: ${valuasiText.replace(/\s+/g, ' ').slice(0, 80)} | hitung semua stok: ${rupiah(valuasiSemua)} | hanya bal dari transaksi lunas: ${rupiah(valuasiLunas)}` });
    expect(valuasiText.includes(rupiah(valuasiLunas)) || valuasiText.includes(rupiah(valuasiSemua))).toBe(true);
    void a;
  });

  test('TC-LAPORAN-10 | Admin Timbang & Admin Pengiriman tidak dapat membuka Dashboard Analytic; bypass storage ditolak', async ({ app, page }) => {
    await app.loginAs('admintimbang');
    expect(await app.hasMenu(MENU.dashboard)).toBe(false);
    expect(await app.hasMenu(MENU.laporanPembelian)).toBe(false);
    await app.logout();
    await app.loginAs('adminpengiriman');
    expect(await app.hasMenu(MENU.dashboard)).toBe(false);
    expect(await app.hasMenu(MENU.laporanPengiriman)).toBe(true);
    await page.evaluate((k) => localStorage.setItem(k, 'modul-6-dashboard-analytic'), KEYS.activeModule);
    await app.reload();
    const shown = await page.getByText('Total Pembelian (Modal)').isVisible().catch(() => false);
    test.info().annotations.push({ type: 'observasi', description: `Bypass dashboard via localStorage oleh admin_pengiriman: ${shown ? 'BERHASIL (celah RBAC)' : 'ditolak'}` });
    expect(shown).toBe(false);
  });
});

import { test, expect, MENU, TITLE, KEYS, rupiah, type App } from './helpers/app';
import type { Page } from '@playwright/test';

/**
 * Modul: Pengiriman/Distribusi (TC-PENGIRIMAN-01 .. 10)
 * Komponen: PengirimanManagement (DO reguler), StatusBatchPengirimanManagement (tab "Status Pengiriman Barang"),
 * LaporanPengirimanView. Catatan: aplikasi memberi nomor surat jalan berupa urutan sederhana ("1", "2", ...).
 */
test.describe('PENGIRIMAN - Surat Jalan / Delivery Order', () => {
  /** Pilih n bal 'di_gudang' dari data seed aplikasi. */
  async function pickBals(app: App, n = 2) {
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    const avail = barang.filter((b) => b.status_stok === 'di_gudang' && (b.berat_kg || 0) > 0);
    expect(avail.length).toBeGreaterThanOrEqual(n);
    return avail.slice(0, n);
  }

  async function openRegulerMode(app: App, page: Page) {
    await app.gotoModule(MENU.pengiriman, TITLE.pengiriman);
    await page.getByRole('button', { name: /Pilih Bebas dari Stok Gudang \(Reguler\)/ }).click();
  }

  async function scanBal(page: Page, noBal: string) {
    const scan = page.getByPlaceholder('Scan Barcode / ketik No Bal / ID Batch...');
    await scan.fill(noBal);
    await scan.press('Enter');
  }

  const tujuanInput = (page: Page) => page.getByPlaceholder('Ketik tujuan gudang / pabrik buyer...');
  const driverInput = (page: Page) => page.locator('label:has-text("Nama Supir") + input');
  const platInput = (page: Page) => page.locator('label:has-text("Nomor Polisi") + input');

  async function fillHeader(page: Page, opts: { tujuan?: string; driver?: string; plat?: string }) {
    if (opts.tujuan !== undefined) {
      await tujuanInput(page).fill(opts.tujuan);
      await expect(tujuanInput(page)).toHaveValue(opts.tujuan);
    }
    if (opts.driver !== undefined) await driverInput(page).fill(opts.driver);
    if (opts.plat !== undefined) await platInput(page).fill(opts.plat);
  }

  /** Buat DO reguler lengkap; kembalikan objek pengiriman terbaru dari store. */
  async function createDO(app: App, page: Page, bals: any[], opts: { tujuan: string; driver: string; plat: string; kode?: string }) {
    await openRegulerMode(app, page);
    await fillHeader(page, opts);
    for (const b of bals) {
      await scanBal(page, b.no_bal);
      await expect(page.getByText(new RegExp(`Bal #${b.no_bal}.*berhasil`)).last()).toBeVisible();
    }
    if (opts.kode) {
      const selects = page.getByPlaceholder('-- Pilih Kode --');
      const count = await selects.count();
      for (let i = 0; i < count; i++) {
        await app.selectSearchable(selects.nth(i), opts.kode, new RegExp(`^${opts.kode} \\(`));
      }
    }
    const submit = page.getByRole('button', { name: /Terbitkan Surat Jalan & Kirim/ });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByRole('heading', { name: 'Konfirmasi Penerbitan Surat Jalan DO' })).toBeVisible();
    await app.modal().getByRole('button', { name: 'Ya, Terbitkan Surat Jalan' }).click();
    await expect(app.toast).toContainText('diterbitkan');
    // Modal cetak surat jalan terbuka otomatis -> tutup
    const tutup = page.getByRole('button', { name: 'Tutup', exact: true }).first();
    if (await tutup.isVisible().catch(() => false)) await tutup.click();
    const list = (await app.store<any[]>(KEYS.pengiriman)) || [];
    return list.find((p) => p.tujuan === opts.tujuan) || list[0];
  }

  const doRow = (page: Page, doc: any) => page.locator('tbody tr').filter({ hasText: doc.tujuan });

  test('TC-PENGIRIMAN-01 | Admin Pengiriman dapat membuka DO Reguler & Status Batch; form, mode sumber & scanner tampil', async ({ app, page }) => {
    await app.loginAs('adminpengiriman');
    expect(await app.hasMenu(MENU.pengiriman)).toBe(true);
    expect(await app.hasMenu(MENU.statusBatch)).toBe(true);
    await app.gotoModule(MENU.pengiriman, TITLE.pengiriman);
    await expect(page.getByText('Pilih Sumber Pengiriman Bal:')).toBeVisible();
    await expect(page.getByRole('button', { name: /Tarik dari Batch Sample/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Pilih Bebas dari Stok Gudang \(Reguler\)/ })).toBeVisible();
    await expect(tujuanInput(page)).toBeVisible();
    await expect(page.getByPlaceholder('Scan Barcode / ketik No Bal / ID Batch...')).toBeVisible();
    await app.gotoModule(MENU.statusBatch, TITLE.statusBatch);
    await expect(page.getByRole('button', { name: /Detail Batch Sample & Sortir Pembeli/ })).toBeVisible();
    await page.getByRole('button', { name: /Status Pengiriman Barang/ }).click();
    await expect(page.getByPlaceholder(/Cari No. Surat Jalan/)).toBeVisible();
  });

  test('TC-PENGIRIMAN-02 | Validasi wajib: muatan kosong, tujuan, nama supir, plat nomor', async ({ app, page }) => {
    await app.loginAs('adminpengiriman');
    const [b1] = await pickBals(app, 1);
    await openRegulerMode(app, page);
    const submit = page.getByRole('button', { name: /Terbitkan Surat Jalan & Kirim/ });
    await expect(submit).toBeDisabled();
    await fillHeader(page, { tujuan: 'PT Gudang QA' });
    await expect(submit).toBeDisabled(); // belum ada bal
    await scanBal(page, b1.no_bal);
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByText('Nama supir / driver wajib diisi.')).toBeVisible();
    await fillHeader(page, { driver: 'Sopir QA' });
    await submit.click();
    await expect(page.getByText('Nomor polisi / plat kendaraan wajib diisi.')).toBeVisible();
    await fillHeader(page, { tujuan: '' });
    await expect(submit).toBeDisabled();
    await expect(page.getByText(/Wajib diisi, ketik tujuan gudang/)).toBeVisible();
  });

  test('TC-PENGIRIMAN-03 | Terbitkan Surat Jalan DO reguler: tersimpan, bal berubah status keluar, tampil di Status Batch', async ({ app, page }) => {
    await app.loginAs('adminpengiriman');
    const bals = await pickBals(app, 2);
    const doc = await createDO(app, page, bals, { tujuan: 'PT Pabrik QA Kudus', driver: 'Sopir QA', plat: 'm 1234 qa' });
    expect(doc).toBeTruthy();
    test.info().annotations.push({ type: 'observasi', description: `No surat jalan yang dihasilkan: "${doc.no_surat_jalan}" (pengiriman_id ${doc.pengiriman_id}); status awal: ${doc.status}` });
    expect(doc.no_surat_jalan).toBeTruthy();
    expect(doc.tujuan).toBe('PT Pabrik QA Kudus');
    expect(doc.plat_nomor).toBe('M 1234 QA');
    expect(doc.total_bal).toBe(2);
    expect(doc.total_berat_kg).toBeCloseTo(bals[0].berat_kg + bals[1].berat_kg, 1);
    expect([...doc.barang_ids].sort()).toEqual(bals.map((b) => b.barang_id).sort());
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    for (const b of bals) {
      expect(barang.find((x) => x.barang_id === b.barang_id)?.status_stok).toBe('keluar');
    }
    await app.gotoStatusBatchDO();
    await expect(doRow(page, doc)).toHaveCount(1);
    await expect(app.sidebar.getByRole('button', { name: MENU.pengiriman })).toContainText('1');
  });

  test('TC-PENGIRIMAN-04 | Data tidak valid: bal sudah keluar, bal ganda, nomor bal tidak dikenal', async ({ app, page }) => {
    await app.loginAs('adminpengiriman');
    const bals = await pickBals(app, 3);
    await createDO(app, page, [bals[0]], { tujuan: 'PT Pabrik QA', driver: 'Sopir QA', plat: 'M 1 QA' });
    await openRegulerMode(app, page);
    await scanBal(page, bals[0].no_bal);
    await expect(page.getByText(/sudah berstatus KELUAR/)).toBeVisible();
    await scanBal(page, bals[1].no_bal);
    await expect(page.getByText(/berhasil di-scan|berhasil dicentang/).last()).toBeVisible();
    await scanBal(page, bals[1].no_bal);
    await expect(page.getByText(/sudah dicentang dalam tabel muatan/)).toBeVisible();
    await scanBal(page, 'BAL-TIDAK-ADA-999');
    const alertText = await page.locator('div').filter({ hasText: /PERINGATAN|tidak ditemukan|tidak dikenal/i }).last().textContent();
    test.info().annotations.push({ type: 'observasi', description: `Scan bal tidak dikenal -> ${alertText?.trim().slice(0, 160)}` });
    await expect(page.locator('tbody tr').filter({ hasText: 'BAL-TIDAK-ADA-999' })).toHaveCount(0);
  });

  test('TC-PENGIRIMAN-05 | Update status DO: Berangkat -> Tiba -> Selesai tersimpan (Status & Detail Batch)', async ({ app, page }) => {
    await app.loginAs('adminpengiriman');
    const bals = await pickBals(app, 1);
    const doc = await createDO(app, page, bals, { tujuan: 'PT Status QA', driver: 'Sopir QA', plat: 'M 2 QA' });
    await app.gotoStatusBatchDO();
    const row = doRow(page, doc);
    const current = async () => (((await app.store<any[]>(KEYS.pengiriman)) || []).find((p) => p.pengiriman_id === doc.pengiriman_id) || {}).status;
    await row.getByRole('button', { name: 'Berangkat' }).click();
    await expect(app.toast).toContainText('dalam_perjalanan');
    expect(await current()).toBe('dalam_perjalanan');
    await row.getByRole('button', { name: 'Tiba' }).click();
    await expect(app.toast).toContainText('diterima');
    expect(await current()).toBe('diterima');
    await row.getByRole('button', { name: 'Selesai' }).click();
    await expect(app.toast).toContainText('selesai');
    expect(await current()).toBe('selesai');
    await expect(row).toContainText(/Selesai/);
    // Ubah mundur via dropdown (observasi: tidak ada pembatasan transisi)
    await row.locator('select').selectOption('dimuat');
    const back = await current();
    test.info().annotations.push({ type: 'observasi', description: `Status DO 'selesai' diubah mundur ke 'dimuat' via dropdown -> tersimpan sebagai: ${back}` });
  });

  test('TC-PENGIRIMAN-06 | Hapus Surat Jalan dengan konfirmasi; bal kembali ke stok gudang', async ({ app, page }) => {
    await app.loginAs('adminpengiriman');
    const bals = await pickBals(app, 1);
    const doc = await createDO(app, page, bals, { tujuan: 'PT Hapus QA', driver: 'Sopir QA', plat: 'M 3 QA' });
    await app.gotoStatusBatchDO();
    const row = doRow(page, doc);
    await row.getByTitle('Hapus Surat Jalan Pengiriman (Bal kembali ke stok gudang)').click();
    await app.modal().getByRole('button', { name: 'Ya, Hapus' }).click();
    await expect(app.toast).toContainText('berhasil dihapus');
    await expect(row).toHaveCount(0);
    expect(((await app.store<any[]>(KEYS.pengiriman)) || []).length).toBe(0);
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    expect(barang.find((x) => x.barang_id === bals[0].barang_id)?.status_stok).toBe('di_gudang');
  });

  test('TC-PENGIRIMAN-07 | Pencarian & filter: Status Batch (tujuan/supir) dan Laporan Pengiriman (tanggal)', async ({ app, page }) => {
    await app.loginAs('adminpengiriman');
    const bals = await pickBals(app, 2);
    const d1 = await createDO(app, page, [bals[0]], { tujuan: 'PT Alpha QA', driver: 'Sopir Alpha', plat: 'M 11 QA' });
    const d2 = await createDO(app, page, [bals[1]], { tujuan: 'PT Beta QA', driver: 'Sopir Beta', plat: 'M 22 QA' });
    await app.gotoStatusBatchDO();
    const search = page.getByPlaceholder(/Cari No. Surat Jalan/);
    await search.fill('Beta');
    await expect(doRow(page, d2)).toHaveCount(1);
    await expect(doRow(page, d1)).toHaveCount(0);
    await search.fill('Sopir Alpha');
    await expect(doRow(page, d1)).toHaveCount(1);
    await search.fill('TIDAK-ADA');
    await expect(page.getByText('Tidak ada data pengiriman')).toBeVisible();

    await app.gotoModule(MENU.laporanPengiriman, TITLE.laporanPengiriman);
    await expect(page.locator('tbody tr').filter({ hasText: 'PT Alpha QA' }).first()).toBeVisible();
    const dates = page.locator('input[type="date"]');
    await dates.nth(0).fill('2000-01-01');
    await dates.nth(1).fill('2000-01-31');
    await page.getByRole('button', { name: 'Terapkan Filter' }).click();
    await expect(page.getByText(/Tidak ada data pengiriman surat jalan yang cocok/)).toBeVisible();
  });

  test('TC-PENGIRIMAN-08 | Format: tanggal default hari ini, plat huruf besar, total bal/berat & nilai (kode harga jual) terhitung', async ({ app, page }) => {
    await app.loginAs('adminpengiriman');
    const bals = await pickBals(app, 2);
    await openRegulerMode(app, page);
    const today = new Date().toISOString().split('T')[0];
    await expect(page.locator('input[type="date"]').first()).toHaveValue(today);
    const hj = (await app.store<any[]>(KEYS.hargaJual)) || [];
    const kode = hj.find((h) => h.kode === '50')!;
    const doc = await createDO(app, page, bals, { tujuan: 'PT Format QA', driver: 'sopir qa', plat: 'ab 9999 cd', kode: '50' });
    const berat = Number((bals[0].berat_kg + bals[1].berat_kg).toFixed(1));
    expect(doc.plat_nomor).toBe('AB 9999 CD');
    expect(doc.total_berat_kg).toBeCloseTo(berat, 1);
    expect(doc.total_bal).toBe(2);
    expect(doc.total_nilai_deal).toBe(Math.round(bals[0].berat_kg * kode.harga_jual + bals[1].berat_kg * kode.harga_jual));
    expect(Object.values(doc.harga_deal_map || {})).toEqual([kode.harga_jual, kode.harga_jual]);
    await app.gotoStatusBatchDO();
    const row = doRow(page, doc);
    await expect(row).toContainText(rupiah(doc.total_nilai_deal));
    await expect(row).toContainText(new RegExp(String(Math.floor(berat))));
  });

  test('TC-PENGIRIMAN-09 | DO tersinkron ke Laporan Pengiriman, Dashboard (Total Penjualan & Keuntungan) dan Inventaris (Keluar)', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const bals = await pickBals(app, 2);
    const doc = await createDO(app, page, bals, { tujuan: 'PT Sinkron QA', driver: 'Sopir QA', plat: 'M 9 QA', kode: '60' });
    const hj = (await app.store<any[]>(KEYS.hargaJual)) || [];
    const hargaJual = hj.find((h) => h.kode === '60')!.harga_jual;
    const penjualan = Math.round(bals.reduce((s, b) => s + b.berat_kg * hargaJual, 0));
    const modal = Math.round(bals.reduce((s, b) => s + b.berat_kg * b.harga_per_kg, 0));
    expect(doc.total_nilai_deal).toBe(penjualan);

    await app.gotoModule(MENU.laporanPengiriman, TITLE.laporanPengiriman);
    await expect(page.locator('tbody tr').filter({ hasText: 'PT Sinkron QA' }).first()).toBeVisible();

    await app.gotoModule(MENU.dashboard, TITLE.dashboard);
    await expect(app.dashboardCard('Total Penjualan')).toContainText(rupiah(penjualan));
    await expect(app.dashboardCard('Keuntungan Bersih')).toContainText(rupiah(penjualan - modal));

    await app.gotoModule(MENU.barang, TITLE.barang);
    await page.locator('select').filter({ hasText: 'Semua Status' }).selectOption('keluar');
    await expect(page.locator('tbody tr').filter({ hasText: bals[0].no_bal })).toHaveCount(1);
  });

  test('TC-PENGIRIMAN-10 | Role sortir/timbang/kasir tidak melihat modul pengiriman; kepala gudang hanya monitoring; bypass storage ditolak', async ({ app, page }) => {
    for (const key of ['adminsortir', 'admintimbang', 'adminkasir'] as const) {
      await app.loginAs(key);
      expect(await app.hasMenu(MENU.pengiriman), `menu DO untuk ${key}`).toBe(false);
      expect(await app.hasMenu(MENU.statusBatch), `menu status batch untuk ${key}`).toBe(false);
      await app.logout();
    }
    await app.loginAs('kepalagudang');
    expect(await app.hasMenu(MENU.pengiriman)).toBe(false);
    expect(await app.hasMenu(MENU.statusBatch)).toBe(true);
    await page.evaluate((k) => localStorage.setItem(k, 'modul-5-pengiriman'), KEYS.activeModule);
    await app.reload();
    const shown = await page.getByPlaceholder('Scan Barcode / ketik No Bal / ID Batch...').isVisible().catch(() => false);
    test.info().annotations.push({ type: 'observasi', description: `Bypass modul-5-pengiriman via localStorage oleh kepala_gudang: ${shown ? 'BERHASIL (celah RBAC)' : 'ditolak'}` });
    expect(shown).toBe(false);
  });
});

import { test, expect, MENU, TITLE, KEYS, rupiah, type App } from './helpers/app';
import type { Page } from '@playwright/test';
import { buildTransaksi, buildPengiriman } from './helpers/factory';

/**
 * Modul: Cetak Dokumen (TC-PRINT-01 .. 10) - DedicatedPrintView (nota & surat jalan), PetaniCardPrintModal,
 * SuratJalanPrintModal. Cetak fisik diverifikasi sampai pemanggilan window.print (di-stub) / unduhan PDF.
 */
test.describe('PRINT - Cetak Dokumen', () => {
  async function seedLunas(app: App, kupon = 'KUPPRT01') {
    const petani = ((await app.store<any[]>(KEYS.petani)) || [])[0];
    const built = buildTransaksi({ txId: `QA-TX-${kupon}`, kupon, petani, bals: [{ no_bal: `${kupon}A`, grade: '45', harga: 45000, bruto: 53 }, { no_bal: `${kupon}B`, grade: '50', harga: 50000, bruto: 48, gantiTikar: true }], lunas: true });
    await app.setStore(KEYS.transaksi, [built.tx, ...(((await app.store<any[]>(KEYS.transaksi)) || []))]);
    await app.setStore(KEYS.barang, [...built.barangs, ...(((await app.store<any[]>(KEYS.barang)) || []))]);
    await app.reload();
    return built;
  }

  test('TC-PRINT-01 | Pratinjau cetak Nota, Kartu Petani, dan Surat Jalan dapat dibuka dari modul terkait', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const built = await seedLunas(app);
    // Nota dari Kasir
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPPRT01').getByRole('button', { name: 'Cetak' }).click();
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible();
    await expect(page.getByText(built.tx.transaksi_id).first()).toBeVisible();
    await page.getByRole('button', { name: /Tutup/ }).first().click();
    await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
    // Kartu petani
    await app.gotoModule(MENU.petani, TITLE.petani);
    await page.locator('tbody tr').first().getByTitle('Cetak ID Card Petani').click();
    await expect(page.getByRole('button', { name: 'Cetak Sekarang' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Unduh PDF/ })).toBeVisible();
    // Cetak kartu memakai iframe tersembunyi + contentWindow.print() (printDownload.ts); pantau iframe & pemanggilan print
    await page.evaluate(() => {
      (window as any).__iframeAdded = 0;
      new MutationObserver((muts) =>
        muts.forEach((m) => m.addedNodes.forEach((n) => { if ((n as HTMLElement).tagName === 'IFRAME') (window as any).__iframeAdded++; })),
      ).observe(document.body, { childList: true });
    });
    await page.getByRole('button', { name: 'Cetak Sekarang' }).click();
    await expect
      .poll(async () => (await app.printCalls()) + (await page.evaluate(() => (window as any).__iframeAdded || 0)), { timeout: 8000 })
      .toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Tutup' }).first().click();
    // Surat jalan dari Status Batch
    const doc = buildPengiriman({ id: '1', noSuratJalan: 'SJ-QA-PRT', tujuan: 'PT Cetak QA', barangs: built.barangs.map((b) => ({ barang_id: b.barang_id, berat_kg: b.berat_kg })), hargaJualPerKg: 60000, kodeHargaJual: '60' });
    await app.setStore(KEYS.pengiriman, [doc]);
    await app.reload();
    await app.gotoStatusBatchDO();
    await page.locator('tbody tr').filter({ hasText: 'SJ-QA-PRT' }).getByTitle(/Buka Halaman Cetak Surat Jalan/).click();
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible();
    await expect(page.getByText('SJ-QA-PRT').first()).toBeVisible();
  });

  test('TC-PRINT-02 | Nota resmi ditolak jika bal belum lengkap ditimbang atau belum lunas', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPPRT02', bals: [{ noBal: 'PRT0201', grade: '45' }] });
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPPRT02').getByRole('button', { name: 'Cetak' }).click();
    await expect(page.getByRole('heading', { name: 'Nota Belum Dapat Dicetak' })).toBeVisible();
    await app.modal().getByRole('button', { name: 'Tutup', exact: true }).click();
    await app.timbangBal({ noBal: 'PRT0201', bruto: 50 });
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPPRT02').getByRole('button', { name: 'Cetak' }).click();
    await expect(page.getByRole('heading', { name: 'Nota Belum Lunas' })).toBeVisible();
    await app.modal().getByRole('button', { name: 'Buka Pembayaran Kasir' }).click();
    await expect(page.getByRole('heading', { name: 'Pencairan Kas & Pembayaran Tunai' })).toBeVisible();
  });

  test('TC-PRINT-03 | Setelah pembayaran dengan opsi cetak otomatis, pratinjau nota terbuka & PDF dapat diunduh', async ({ app, page }) => {
    test.setTimeout(180_000);
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPPRT03', bals: [{ noBal: 'PRT0301', grade: '45' }] });
    await app.timbangBal({ noBal: 'PRT0301', bruto: 50 });
    await app.kasirBayar('KUPPRT03', { cetakLangsung: true });
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible();
    const txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    const tx = txs.find((t) => t.no_kupon === 'KUPPRT03');
    expect(tx.status_nota).toBe('sudah_cetak');
    const downloadPromise = page.waitForEvent('download', { timeout: 90_000 });
    await page.getByRole('button', { name: 'Download PDF' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^NOTA_TIMBANG_.*\.pdf$/);
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('TC-PRINT-04 | ID dokumen tidak valid menampilkan pesan "Data Dokumen Tidak Ditemukan" tanpa crash', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?cetak=nota&id=TIDAK-ADA-123');
    await expect(page.getByText('Data Dokumen Tidak Ditemukan')).toBeVisible();
    await page.goto('/?cetak=surat_jalan&id=SJ-TIDAK-ADA');
    await expect(page.getByText('Data Dokumen Tidak Ditemukan')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('TC-PRINT-05 | Nota mencerminkan data terbaru setelah koreksi transaksi (cetak ulang konsisten)', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const built = await seedLunas(app, 'KUPPRT05');
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPPRT05').getByRole('button', { name: 'Cetak' }).click();
    await expect(page.locator('.print-canvas-paper')).toContainText(built.totals.hargaFinal.toLocaleString('id-ID'));
    await page.getByRole('button', { name: /Tutup/ }).first().click();
    await app.kasirRow('KUPPRT05').getByTitle('Koreksi Transaksi').click();
    await page.getByPlaceholder(/Contoh: Koreksi grade dari B ke A/).fill('Koreksi berat timbangan netto');
    await page.locator('input[type="number"]').first().fill('40');
    await page.getByRole('button', { name: /Simpan Perubahan & Rekam Audit Log/ }).click();
    const txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    const tx = txs.find((t) => t.no_kupon === 'KUPPRT05');
    expect(tx.harga_final).not.toBe(built.totals.hargaFinal);
    await app.kasirRow('KUPPRT05').getByRole('button', { name: 'Cetak' }).click();
    await expect(page.locator('.print-canvas-paper')).toContainText(tx.harga_final.toLocaleString('id-ID'));
    await expect(page.locator('.print-canvas-paper')).not.toContainText(built.totals.hargaFinal.toLocaleString('id-ID'));
    void rupiah;
  });

  test('TC-PRINT-06 | Pratinjau ditutup dengan Esc/Tutup; dokumen transaksi terhapus tidak dapat dicetak lagi', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const built = await seedLunas(app, 'KUPPRT06');
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPPRT06').getByRole('button', { name: 'Cetak' }).click();
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
    await app.kasirRow('KUPPRT06').getByTitle('Hapus Transaksi (Memerlukan Konfirmasi)').click();
    await page.getByRole('button', { name: 'Koreksi administratif kasir' }).click();
    await page.getByRole('button', { name: 'Ya, Hapus Transaksi' }).click();
    await page.goto(`/?cetak=nota&id=${built.tx.transaksi_id}`);
    await expect(page.getByText('Data Dokumen Tidak Ditemukan')).toBeVisible();
  });

  test('TC-PRINT-07 | Kontrol pratinjau: zoom in/out/reset berfungsi', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await seedLunas(app, 'KUPPRT07');
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPPRT07').getByRole('button', { name: 'Cetak' }).click();
    await expect(page.getByText('100%')).toBeVisible();
    await page.getByTitle('Zoom In (+10%)').click();
    await expect(page.getByText('110%')).toBeVisible();
    await page.getByTitle('Reset Zoom (100%)').click();
    await expect(page.getByText('100%')).toBeVisible();
    const paper = page.locator('.print-canvas-paper');
    await page.getByTitle(/Zoom Out/).click();
    await expect(page.getByText('90%')).toBeVisible();
    expect(await paper.evaluate((el) => (el as HTMLElement).style.transform)).toContain('scale(0.9)');
  });

  test('TC-PRINT-08 | Angka pada nota identik dengan data tersimpan (total kotor, potongan, total bersih, terbilang)', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const built = await seedLunas(app, 'KUPPRT08');
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPPRT08').getByRole('button', { name: 'Cetak' }).click();
    const paper = page.locator('.print-canvas-paper');
    const text = (await paper.innerText()).replace(/\s+/g, ' ');
    expect(text).toContain(built.tx.no_kupon);
    expect(text).toContain(built.tx.nama_petani);
    expect(text).toContain(built.totals.totalKotor.toLocaleString('id-ID'));
    expect(text).toContain(built.totals.totalPotongan.toLocaleString('id-ID'));
    expect(text).toContain(built.totals.hargaFinal.toLocaleString('id-ID'));
    expect(text).toMatch(/Terbilang:/);
    expect(text).toMatch(/75\.000/); // potongan tikar
  });

  test('TC-PRINT-09 | Status nota tersinkron: setelah cetak, nota bertanda sudah dicetak di data & daftar Kasir', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPPRT09', bals: [{ noBal: 'PRT0901', grade: '45' }] });
    await app.timbangBal({ noBal: 'PRT0901', bruto: 50 });
    await app.kasirBayar('KUPPRT09', { cetakLangsung: false });
    let tx = ((await app.store<any[]>(KEYS.transaksi)) || []).find((t) => t.no_kupon === 'KUPPRT09');
    const before = { status_nota: tx.status_nota, count: tx.unduh_nota_count };
    await app.kasirRow('KUPPRT09').getByRole('button', { name: 'Cetak' }).click();
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible();
    await page.keyboard.press('Escape');
    tx = ((await app.store<any[]>(KEYS.transaksi)) || []).find((t) => t.no_kupon === 'KUPPRT09');
    test.info().annotations.push({ type: 'observasi', description: `status_nota sebelum cetak=${before.status_nota}, sesudah=${tx.status_nota}; unduh_nota_count sebelum=${before.count}, sesudah=${tx.unduh_nota_count}; dicetak_pada=${tx.dicetak_pada}` });
    expect(tx.status_nota).toBe('sudah_cetak');
    expect(tx.dicetak_pada || tx.dibayar_pada).toBeTruthy();
  });

  test('TC-PRINT-10 | Halaman cetak (?cetak=nota&id=...) tidak boleh dapat diakses tanpa login', async ({ app, page }) => {
    await app.openLoginPage();
    const built = await seedLunas(app, 'KUPPRT10');
    await expect(app.loginButton).toBeVisible();
    await page.goto(`/?cetak=nota&id=${built.tx.transaksi_id}`);
    const printShown = await page.getByRole('button', { name: 'Download PDF' }).isVisible().catch(() => false);
    const dataShown = await page.getByText(built.tx.nama_petani).first().isVisible().catch(() => false);
    test.info().annotations.push({ type: 'observasi', description: `Tanpa login: pratinjau nota ${printShown ? 'TAMPIL' : 'tidak tampil'}; data petani ${dataShown ? 'TERLIHAT' : 'tidak terlihat'}` });
    expect(printShown || dataShown, 'Dokumen nota tidak boleh dapat dibuka tanpa autentikasi').toBe(false);
  });
});

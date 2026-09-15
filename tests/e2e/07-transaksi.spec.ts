import { test, expect, USERS, MENU, TITLE, KEYS, rupiah } from './helpers/app';
import { hitungTara, POT_KULI, POT_TALI, POT_TIKAR } from './helpers/factory';

/**
 * Modul: Transaksi Pembelian & Penjualan (TC-TRANSAKSI-01 .. 10)
 * Alur nyata di kode: Sortir (SortirPageView) -> Timbangan (TimbanganPageView) -> Kasir (KasirPageView)
 */
test.describe('TRANSAKSI - Sortir, Timbangan, Kasir', () => {
  test('TC-TRANSAKSI-01 | Menu Pembelian tampil sesuai role (Sortir / Timbangan / Kasir)', async ({ app, page }) => {
    await app.loginAs('adminsortir');
    expect(await app.hasMenu(MENU.sortir)).toBe(true);
    expect(await app.hasMenu(MENU.timbangan)).toBe(false);
    expect(await app.hasMenu(MENU.kasir)).toBe(false);
    await app.gotoModule(MENU.sortir, TITLE.sortir);
    await expect(page.getByText('Formulir Input Data Sortir')).toBeVisible();
    await app.logout();

    await app.loginAs('admintimbang');
    expect(await app.hasMenu(MENU.sortir)).toBe(false);
    expect(await app.hasMenu(MENU.timbangan)).toBe(true);
    expect(await app.hasMenu(MENU.kasir)).toBe(false);
    await app.gotoModule(MENU.timbangan, TITLE.timbangan);
    await expect(page.getByText('Pilih Kupon Antrian')).toBeVisible();
    await app.logout();

    await app.loginAs('adminkasir');
    expect(await app.hasMenu(MENU.sortir)).toBe(true);
    expect(await app.hasMenu(MENU.timbangan)).toBe(true);
    expect(await app.hasMenu(MENU.kasir)).toBe(true);
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await expect(page.getByPlaceholder(/Cari transaksi/)).toBeVisible();
  });

  test('TC-TRANSAKSI-02 | Validasi wajib: grade kosong, grade tidak terdaftar, tanpa bal, bruto 0, nominal kas tidak pas', async ({ app, page, dialogs }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.sortir, TITLE.sortir);
    await page.getByPlaceholder('Contoh: KUP0001').fill('KUPQA02');

    // Tombol simpan nonaktif selama belum ada bal
    await expect(page.getByRole('button', { name: 'Simpan Data Sortir' })).toBeDisabled();

    // Tambah bal tanpa grade
    await app.sortirNoBalInput.fill('QA0201');
    await page.locator('#btn-tambah-bal').click();
    await expect(page.getByText('Silakan pilih Mutu Barang terlebih dahulu.')).toBeVisible();

    // Grade tidak terdaftar di Master Harga Beli
    await page.locator('#grade-input').fill('ZZ');
    await page.locator('#btn-tambah-bal').click();
    await expect(page.getByText(/tidak terdaftar di Master Harga Beli/)).toBeVisible();

    // Bal valid -> simpan -> timbang bruto 0 harus ditolak
    await page.locator('#grade-input').fill('45');
    await page.locator('#btn-tambah-bal').click();
    await expect(page.getByText(/berhasil ditambahkan/)).toBeVisible();
    await page.getByRole('button', { name: 'Simpan Data Sortir' }).click();
    await expect(page.locator('div.bg-emerald-50').filter({ hasText: 'berhasil disimpan' })).toBeVisible();

    await app.timbangOpenBal('QA0201');
    await app.brutoInput.fill('0');
    await expect(app.simpanTimbanganButton).toBeDisabled();
    await app.brutoInput.fill('-5');
    await expect(app.simpanTimbanganButton).toBeDisabled();
    // Huruf pada input berat dicegat (tidak masuk ke nilai)
    await app.brutoInput.fill('');
    await app.brutoInput.pressSequentially('abc', { delay: 80 });
    await expect(app.brutoInput).toHaveValue('');

    // Timbang normal supaya bisa ke kasir, lalu nominal kas tidak pas
    await app.brutoInput.fill('48');
    await page.getByRole('button', { name: 'Simpan Timbangan' }).click();
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPQA02').getByRole('button', { name: 'Bayar' }).click();
    const cashInput = page.getByPlaceholder(/^Ketik ulang /);
    await cashInput.fill('1000');
    await expect(page.getByRole('button', { name: /Proses Pembayaran Tunai/ })).toBeDisabled();
    await expect(page.getByText(/Nominal belum pas/)).toBeVisible();
  });

  test('TC-TRANSAKSI-03 | Alur lengkap Sortir -> Timbang (2 bal, tara & tikar) -> Kasir lunas dengan kalkulasi finansial benar', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const harga = (await app.store<any[]>(KEYS.harga)) || [];
    const h45 = harga.find((h) => h.kode_grade === '45')!.harga_per_kg; // 45.000
    const h55 = harga.find((h) => h.kode_grade === '55')!.harga_per_kg; // 55.000

    // 1. Sortir: 2 bal (A grade 45, SB grade 55)
    const msg = await app.sortirCreate({ kupon: 'KUPQA03', bals: [{ noBal: 'QA0301', grade: '45' }, { noBal: 'SB0301', grade: '55' }] });
    expect(msg).toContain('KUPQA03');
    let txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    let tx = txs.find((t) => t.no_kupon === 'KUPQA03');
    expect(tx).toBeTruthy();
    expect(tx.status_tahap).toBe('menunggu_timbang');
    expect(tx.total_bal).toBe(2);
    expect(tx.transaksi_id).toMatch(/^TRX-\d{8}-\d{3}$/);

    // 2. Timbang bal 1: bruto 52.5 -> tara 5 -> netto 47.5
    await app.timbangBal({ noBal: 'QA0301', bruto: 52.5 });
    await expect(app.nettoBadge('47.5')).toBeVisible();
    // 3. Timbang bal 2 (SB): bruto 48 -> tara 2 -> netto 46, ganti tikar Rp75.000
    await app.timbangBal({ noBal: 'SB0301', bruto: 48, gantiTikar: true });
    await expect(app.nettoBadge('46')).toBeVisible();
    await expect(page.getByText(/Kupon KUPQA03 Tuntas Ditimbang/)).toBeVisible();

    txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    tx = txs.find((t) => t.no_kupon === 'KUPQA03');
    const expKotor = Math.round(47.5 * h45) + Math.round(46 * h55);
    const expPotongan = 2 * (POT_KULI + POT_TALI) + POT_TIKAR;
    expect(tx.status_tahap).toBe('lengkap');
    expect(tx.berat_kg).toBeCloseTo(93.5, 1);
    expect(tx.total_harga_beli).toBe(expKotor);
    expect(tx.total_potongan).toBe(expPotongan);
    expect(tx.harga_final).toBe(expKotor - expPotongan);
    const itemSB = tx.items.find((i: any) => i.no_bal === 'SB0301');
    expect(itemSB.potongan_tara_kg).toBe(2);
    expect(itemSB.potongan_tikar).toBe(POT_TIKAR);
    expect(itemSB.potongan).toBe(POT_KULI + POT_TALI + POT_TIKAR);
    expect(itemSB.subtotal_bersih).toBe(Math.round(46 * h55) - (POT_KULI + POT_TALI + POT_TIKAR));

    // 4. Kasir: buka via tombol "Buka di Kasir", bayar tunai persis nominal
    await page.getByRole('button', { name: 'Buka di Kasir' }).click();
    await expect(app.headerTitle).toHaveText(TITLE.kasir);
    const nominal = await app.kasirBayar('KUPQA03', { cetakLangsung: false });
    expect(nominal).toBe(expKotor - expPotongan);
    await expect(app.toast).toContainText('berhasil disimpan');
    await expect(app.kasirRow('KUPQA03').getByRole('button', { name: 'Bayar' })).toHaveCount(0);
    await expect(app.kasirRow('KUPQA03')).toContainText((expKotor - expPotongan).toLocaleString('id-ID'));

    txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    tx = txs.find((t) => t.no_kupon === 'KUPQA03');
    expect(tx.status_pembayaran).toBe('lunas');
    expect(tx.metode_pembayaran).toBe('cash');
    expect(tx.dibayar_oleh).toBeTruthy();
    expect(tx.dibayar_pada).toBeTruthy();

    // Inventaris: 2 bal tercatat di gudang dengan netto
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    const b1 = barang.find((b) => b.no_bal === 'QA0301');
    const b2 = barang.find((b) => b.no_bal === 'SB0301');
    expect(b1?.status_stok).toBe('di_gudang');
    expect(b1?.berat_kg).toBeCloseTo(47.5, 1);
    expect(b2?.berat_kg).toBe(46);

    // Audit trail: TAMBAH_TRANSAKSI & TIMBANG tercatat
    const audit = (await app.store<any[]>(KEYS.audit)) || [];
    expect(audit.some((a) => a.aksi === 'TAMBAH_TRANSAKSI' && a.target_id === tx.transaksi_id)).toBe(true);
    const bayarEntry = audit.find((a) => a.target_id === tx.transaksi_id && JSON.stringify(a.rincian_perubahan || []).includes('Status bayar'));
    test.info().annotations.push({ type: 'observasi', description: `Rincian audit pembayaran: ${bayarEntry ? JSON.stringify(bayarEntry.rincian_perubahan) : 'tidak ada entri Status bayar'}` });
    expect.soft(JSON.stringify(bayarEntry?.rincian_perubahan || ''), 'Nilai sebelum pada "Status bayar" tidak boleh "undefined"').not.toContain('undefined');
  });

  test('TC-TRANSAKSI-04 | Data tidak valid/duplikat: kupon ganda, No Bal ganda, bal sudah di inventaris, bayar sebelum lengkap', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPQA04', bals: [{ noBal: 'QA0401', grade: '40' }, { noBal: 'QA0402', grade: '40' }] });

    // Kupon duplikat
    await app.gotoModule(MENU.sortir, TITLE.sortir);
    await page.getByPlaceholder('Contoh: KUP0001').fill('KUPQA04');
    await expect(page.getByText('Duplikat!')).toBeVisible();
    await expect(page.getByText('Kupon Sudah Terdaftar!')).toBeVisible();
    await app.sortirAddBal('QA0403', '40');
    await expect(page.getByRole('button', { name: 'Simpan Data Sortir' })).toBeDisabled();
    await page.getByRole('button', { name: 'Gunakan Kupon Bebas Berikutnya' }).click();
    await expect(page.getByText('Duplikat!')).toHaveCount(0);

    // No Bal duplikat dalam kupon yang sama
    await app.sortirAddBal('QA0403', '40');
    await expect(page.getByText(/sudah ada dalam daftar sortir kupon ini/)).toBeVisible();
    // No Bal sudah ada di inventaris (dari kupon sebelumnya)
    await app.sortirAddBal('QA0401', '40');
    await expect(page.getByText(/sudah ada di master data inventaris/)).toBeVisible();

    // Bayar sebelum semua bal ditimbang: tombol Bayar diganti "Timbang (0/2)"
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    const row = app.kasirRow('KUPQA04');
    await expect(row.getByRole('button', { name: 'Bayar' })).toHaveCount(0);
    await row.getByRole('button', { name: /Timbang \(0\/2\)/ }).click();
    await expect(page.getByText('Tidak Bisa Bayar')).toBeVisible();
    await page.getByRole('button', { name: 'Tutup', exact: true }).click();
    // Cetak nota juga ditolak
    await row.getByRole('button', { name: 'Cetak' }).click();
    await expect(page.getByText('Nota Belum Dapat Dicetak')).toBeVisible();
  });

  test('TC-TRANSAKSI-05 | Koreksi transaksi wajib alasan; perubahan tersimpan & tercatat di audit trail; buka kunci timbang ulang', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPQA05', bals: [{ noBal: 'QA0501', grade: '50' }] });
    await app.timbangBal({ noBal: 'QA0501', bruto: 60 }); // tara 6 -> netto 54

    // Buka kunci & timbang ulang
    await app.timbangOpenBal('QA0501');
    await expect(app.brutoInput).toBeDisabled();
    await page.getByRole('button', { name: /Buka Kunci/ }).click();
    await expect(app.brutoInput).toBeEnabled();
    await app.brutoInput.fill('59'); // tara 5 -> netto 54
    await page.getByRole('button', { name: 'Simpan Timbangan' }).click();
    await expect(app.nettoBadge('54')).toBeVisible();

    // Koreksi transaksi di Kasir
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPQA05').getByTitle('Koreksi Transaksi').click();
    const saveBtn = page.getByRole('button', { name: /Simpan Perubahan & Rekam Audit Log/ });
    await saveBtn.click();
    await expect(page.getByText(/Harap isi alasan pengubahan data/)).toBeVisible();

    const reason = 'Koreksi berat timbangan netto (QA)';
    await page.getByPlaceholder(/Contoh: Koreksi grade dari B ke A/).fill(reason);
    const nettoInputs = page.locator('input[type="number"]');
    // ubah netto bal pertama pada tabel edit
    await nettoInputs.first().fill('50');
    await saveBtn.click();
    await expect(page.getByRole('button', { name: /Simpan Perubahan & Rekam Audit Log/ })).toHaveCount(0);

    const txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    const tx = txs.find((t) => t.no_kupon === 'KUPQA05');
    expect(tx.alasan_perubahan_terakhir).toBe(reason);
    expect(tx.berat_kg).toBe(50);
    const audit = (await app.store<any[]>(KEYS.audit)) || [];
    const entry = audit.find((a) => a.target_id === tx.transaksi_id && /UBAH|KOREKSI|EDIT/i.test(a.aksi));
    expect(entry, 'entri audit koreksi transaksi').toBeTruthy();
    expect(JSON.stringify(entry.rincian_perubahan || [])).toMatch(/54|50/);
  });

  test('TC-TRANSAKSI-06 | Hapus transaksi (superadmin) wajib alasan, menghapus bal terkait & tercatat di audit', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPQA06', bals: [{ noBal: 'QA0601', grade: '45' }] });
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    await app.kasirRow('KUPQA06').getByTitle('Hapus Transaksi (Memerlukan Konfirmasi)').click();
    const delBtn = page.getByRole('button', { name: 'Ya, Hapus Transaksi' });
    await expect(delBtn).toBeDisabled();
    await page.getByRole('button', { name: 'Salah input nomor kupon' }).click();
    await expect(delBtn).toBeEnabled();
    await delBtn.click();
    await expect(app.toast).toContainText('berhasil dihapus');
    await expect(app.kasirRow('KUPQA06')).toHaveCount(0);

    const txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    expect(txs.some((t) => t.no_kupon === 'KUPQA06')).toBe(false);
    const barang = (await app.store<any[]>(KEYS.barang)) || [];
    expect(barang.some((b) => b.no_bal === 'QA0601')).toBe(false);
    const audit = (await app.store<any[]>(KEYS.audit)) || [];
    expect(audit.some((a) => a.aksi === 'HAPUS_TRANSAKSI' && /KUPQA06/.test(a.deskripsi))).toBe(true);
  });

  test('TC-TRANSAKSI-07 | Pencarian & filter Kasir: kupon, status pembayaran, rentang tanggal', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPQA07A', bals: [{ noBal: 'QA0701', grade: '45' }] });
    await app.sortirCreate({ kupon: 'KUPQA07B', bals: [{ noBal: 'QA0702', grade: '45' }] });
    await app.timbangBal({ noBal: 'QA0702', bruto: 45 });
    await app.kasirBayar('KUPQA07B', { cetakLangsung: false });

    await app.gotoModule(MENU.kasir, TITLE.kasir);
    const rows = page.locator('tbody tr').filter({ hasText: /KUPQA07/ });
    await expect(rows).toHaveCount(2);

    await page.getByPlaceholder('Masukkan kupon...').fill('KUPQA07B');
    await expect(rows).toHaveCount(1);
    await expect(page.locator('tbody tr').filter({ hasText: 'KUPQA07B' })).toBeVisible();
    await page.getByPlaceholder('Masukkan kupon...').fill('');

    await page.locator('select').filter({ hasText: 'Siap Bayar' }).selectOption('cash');
    await expect(page.locator('tbody tr').filter({ hasText: 'KUPQA07A' })).toHaveCount(0);
    await expect(page.locator('tbody tr').filter({ hasText: 'KUPQA07B' })).toHaveCount(1);

    await page.locator('select').filter({ hasText: 'Siap Bayar' }).selectOption('belum_lengkap');
    await expect(page.locator('tbody tr').filter({ hasText: 'KUPQA07A' })).toHaveCount(1);
    await expect(page.locator('tbody tr').filter({ hasText: 'KUPQA07B' })).toHaveCount(0);

    await page.locator('select').filter({ hasText: 'Siap Bayar' }).selectOption('all');
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2000-01-01');
    await dateInputs.nth(1).fill('2000-01-31');
    await expect(rows).toHaveCount(0);
  });

  test('TC-TRANSAKSI-08 | Boundary tara (49/50/59/60), aturan SB (2 kg, maks 50 kg), desimal, netto manual', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const harga = (await app.store<any[]>(KEYS.harga)) || [];
    const h45 = harga.find((h) => h.kode_grade === '45')!.harga_per_kg;
    await app.sortirCreate({
      kupon: 'KUPQA08',
      bals: [
        { noBal: 'QA0801', grade: '45' },
        { noBal: 'QA0802', grade: '45' },
        { noBal: 'QA0803', grade: '45' },
        { noBal: 'QA0804', grade: '45' },
        { noBal: 'QA0805', grade: '45' },
        { noBal: 'SB0806', grade: '55' },
      ],
    });
    const cases: Array<{ bal: string; bruto: number; tara: number }> = [
      { bal: 'QA0801', bruto: 49, tara: 3 },
      { bal: 'QA0802', bruto: 50, tara: 5 },
      { bal: 'QA0803', bruto: 59, tara: 5 },
      { bal: 'QA0804', bruto: 60, tara: 6 },
    ];
    for (const c of cases) {
      await app.timbangOpenBal(c.bal);
      await app.brutoInput.fill(String(c.bruto));
      await expect(page.getByText(`${c.tara} KG`, { exact: false }).first()).toBeVisible();
      await page.getByRole('button', { name: 'Simpan Timbangan' }).click();
      await expect(app.nettoBadge(String(c.bruto - c.tara), c.bal)).toBeVisible();
    }
    // Desimal: bruto 15.75 kg -> netto 12.75 kg (x harga) -> pembulatan ke rupiah
    await app.timbangOpenBal('QA0805');
    await app.brutoInput.fill('15.75'); // tara 3 -> netto 12.75
    const nettoShown = await app.nettoInput.inputValue();
    await page.getByRole('button', { name: 'Simpan Timbangan' }).click();
    let txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    let tx = txs.find((t) => t.no_kupon === 'KUPQA08');
    const it805 = tx.items.find((i: any) => i.no_bal === 'QA0805');
    test.info().annotations.push({ type: 'observasi', description: `Bruto 15.75 kg: netto tampil ${nettoShown}, tersimpan berat_kg=${it805.berat_kg}, bruto=${it805.berat_bruto_kg}, total_kotor=${it805.total_kotor} (12.75 x ${h45} = ${12.75 * h45})` });
    // Berat tidak boleh dibulatkan: netto tersimpan persis 12.75 dan nilai dihitung dari berat asli
    expect(nettoShown).toBe('12.75');
    expect(it805.berat_kg).toBe(12.75);
    expect(it805.total_kotor).toBe(Math.round(12.75 * h45));
    expect(it805.berat_bruto_kg).toBe(15.75);
    await expect(app.nettoBadge('12.75', 'QA0805')).toBeVisible();

    // SB: tara tetap 2 kg; bruto > 50 ditolak
    await app.timbangOpenBal('SB0806');
    await app.brutoInput.fill('51');
    await expect(page.getByRole('button', { name: /Bobot Melebihi Toleransi/ })).toBeVisible();
    await app.brutoInput.fill('50');
    await expect(page.getByText('2 KG', { exact: false }).first()).toBeVisible();
    // Netto manual override: netto 47 (tara jadi 3, disesuaikan)
    await app.nettoInput.fill('47');
    await expect(page.getByText(/\(Disesuaikan\)/)).toBeVisible();
    await page.getByRole('button', { name: 'Simpan Timbangan' }).click();
    txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    tx = txs.find((t) => t.no_kupon === 'KUPQA08');
    const itSB = tx.items.find((i: any) => i.no_bal === 'SB0806');
    expect(itSB.is_netto_manual).toBe(true);
    expect(itSB.berat_kg).toBe(47);
    expect(itSB.potongan_tara_kg).toBe(3);
    // Sanity: rumus tara helper sama dengan aplikasi untuk semua kasus di atas
    for (const c of cases) expect(hitungTara(c.bruto, c.bal)).toBe(c.tara);
  });

  test('TC-TRANSAKSI-09 | Transaksi lunas tersinkron ke Dashboard, Laporan Pembelian, Laporan Petani & Inventaris', async ({ app, page }) => {
    await app.loginAs('superadmin');
    const harga = (await app.store<any[]>(KEYS.harga)) || [];
    const h45 = harga.find((h) => h.kode_grade === '45')!.harga_per_kg;
    const petani = (await app.store<any[]>(KEYS.petani)) || [];
    const target = petani.find((p) => p.status_aktif !== false && p.nama_petani !== 'Samsul Ansori')!;
    await app.sortirCreate({ kupon: 'KUPQA09', petaniQuery: target.nama_petani, bals: [{ noBal: 'QA0901', grade: '45' }] });
    await app.timbangBal({ noBal: 'QA0901', bruto: 53 }); // netto 48
    await app.kasirBayar('KUPQA09', { cetakLangsung: false });
    const nilai = Math.round(48 * h45);

    // Dashboard: Total Pembelian (Modal) = jumlah transaksi LUNAS (netto x harga), transaksi belum lunas tidak dihitung
    const txs = (await app.store<any[]>(KEYS.transaksi)) || [];
    const modal = txs
      .filter((t) => t.status_pembayaran === 'lunas')
      .reduce((sum, t) => sum + (t.items || []).reduce((s: number, i: any) => s + (i.berat_kg || 0) * (i.harga_per_kg || 0), 0), 0);
    expect(modal).toBeGreaterThanOrEqual(nilai);
    await app.gotoModule(MENU.dashboard, TITLE.dashboard);
    const modalCard = app.dashboardCard('Total Pembelian (Modal)');
    await expect(modalCard).toContainText(rupiah(modal));

    // Laporan Pembelian: kupon muncul & total footer
    await app.gotoModule(MENU.laporanPembelian, TITLE.laporanPembelian);
    await page.getByPlaceholder('Ketik/Pilih Kupon...').fill('KUPQA09');
    await page.getByRole('button', { name: 'Cari Data' }).click();
    const row = page.locator('tbody tr').filter({ hasText: 'KUPQA09' }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(target.nama_petani);
    await expect(page.locator('tfoot').first()).toContainText(nilai.toLocaleString('id-ID'));

    // Laporan Petani: petani penyetor muncul dengan 1 bal
    await app.gotoModule(MENU.laporanPetani, TITLE.laporanPetani);
    const prow = page.locator('tbody tr').filter({ hasText: target.nama_petani }).first();
    await expect(prow).toBeVisible();

    // Inventaris: bal berstatus Di Gudang dengan netto 48
    await app.gotoModule(MENU.barang, TITLE.barang);
    await page.getByPlaceholder(/Cari barang/).fill('QA0901');
    const brow = page.locator('tbody tr').filter({ hasText: 'QA0901' });
    await expect(brow).toHaveCount(1);
    await expect(brow).toContainText(/48/);
    await expect(brow).toContainText(/Di Gudang/i);
  });

  test('TC-TRANSAKSI-10 | Akses tanpa hak: role non-pembelian tidak melihat menu; tombol hapus/koreksi hanya role berwenang', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.sortirCreate({ kupon: 'KUPQA10', bals: [{ noBal: 'QA1001', grade: '45' }] });
    await app.logout();

    for (const key of ['adminpengiriman', 'kepalagudang'] as const) {
      await app.loginAs(key);
      expect(await app.hasMenu(MENU.sortir)).toBe(false);
      expect(await app.hasMenu(MENU.timbangan)).toBe(false);
      expect(await app.hasMenu(MENU.kasir)).toBe(false);
      await app.logout();
    }

    // admin_kasir: boleh koreksi, tidak boleh hapus
    await app.loginAs('adminkasir');
    await app.gotoModule(MENU.kasir, TITLE.kasir);
    const row = app.kasirRow('KUPQA10');
    await expect(row.getByTitle('Koreksi Transaksi')).toHaveCount(1);
    await expect(row.getByTitle('Hapus Transaksi (Memerlukan Konfirmasi)')).toHaveCount(0);
    await app.logout();

    // admin_timbang mencoba membuka Kasir lewat manipulasi localStorage lalu reload
    await app.loginAs('admintimbang');
    await page.evaluate((k) => localStorage.setItem(k, 'modul-0-kasir'), KEYS.activeModule);
    await app.reload();
    const kasirShown = await page.getByPlaceholder(/Cari transaksi/).isVisible().catch(() => false);
    test.info().annotations.push({ type: 'observasi', description: `Bypass modul Kasir via localStorage oleh admin_timbang: ${kasirShown ? 'BERHASIL (celah RBAC)' : 'ditolak'}` });
    expect(kasirShown, 'Modul Kasir tidak boleh tampil untuk admin_timbang meski activeModule dimanipulasi').toBe(false);
  });
});

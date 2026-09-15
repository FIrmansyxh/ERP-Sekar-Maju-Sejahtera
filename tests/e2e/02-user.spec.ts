import { test, expect, USERS, MENU, TITLE, KEYS } from './helpers/app';

/**
 * Modul: Manajemen User (TC-USER-01 .. 10) - UserManagement, UserFormModal, UserResetPasswordModal, AuditTrailView
 */
test.describe('USER - Manajemen Pengguna (RBAC)', () => {
  async function openAddUser(app: any, page: any) {
    await app.gotoModule(MENU.users, TITLE.users);
    await page.getByRole('button', { name: 'Tambah Pengguna' }).click();
    await expect(page.getByPlaceholder('misal: sitirahayu')).toBeVisible();
  }

  async function fillUserForm(app: any, page: any, u: { username: string; password?: string; nama: string; roleLabel?: string; email?: string; hp?: string }) {
    await page.getByPlaceholder('misal: sitirahayu').fill(u.username);
    if (u.password !== undefined) await page.getByPlaceholder(/Minimal 5 karakter|Kosongkan jika tidak diubah/).fill(u.password);
    await page.getByPlaceholder('misal: Siti Rahayu, S.E.').fill(u.nama);
    if (u.roleLabel) await app.selectSearchable(page.getByPlaceholder('Pilih Role...'), u.roleLabel, u.roleLabel);
    if (u.email !== undefined) await page.getByPlaceholder('nama@sekarmajusejahtera.co.id').fill(u.email);
    if (u.hp !== undefined) await page.getByPlaceholder('0812-xxxx-xxxx').fill(u.hp);
  }

  const submitForm = (page: any) => page.locator('form').getByRole('button', { name: /Simpan|Daftarkan|Perbarui/ }).last().click();

  test('TC-USER-01 | Superadmin dapat membuka Manajemen Pengguna: daftar 7 akun, tab Audit Trail, Matriks Wewenang', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.users, TITLE.users);
    await expect(page.getByRole('button', { name: /Daftar Pengguna \(7\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Audit Trail & Log Aktivitas/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tambah Pengguna' })).toBeVisible();
    for (const u of Object.values(USERS)) {
      await expect(page.locator('tbody tr').filter({ hasText: new RegExp(`@${u.username}(?!_)`) })).toHaveCount(1);
    }
    await page.getByRole('button', { name: 'Matriks Wewenang' }).click();
    await expect(page.getByRole('heading', { name: /Matriks Hak Akses Pengguna/ })).toBeVisible();
    await expect(page.getByText('3. Matriks Wewenang & Kemampuan Tindakan (Capabilities)')).toBeVisible();
  });

  test('TC-USER-02 | Validasi field wajib pada form pengguna baru', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAddUser(app, page);
    // Form pengguna baru terisi otomatis (username staf_N & kata sandi default) -> catat sebagai observasi
    const prefilledUser = await page.getByPlaceholder('misal: sitirahayu').inputValue();
    const prefilledPass = await page.getByPlaceholder(/Minimal 5 karakter/).inputValue();
    test.info().annotations.push({ type: 'observasi', description: `Form pengguna baru terisi otomatis: username="${prefilledUser}", password="${prefilledPass}"` });
    // Kosongkan lalu submit -> HTML5 required menahan submit
    await page.getByPlaceholder('misal: sitirahayu').fill('');
    await page.getByPlaceholder(/Minimal 5 karakter/).fill('');
    await submitForm(page);
    expect(await page.getByPlaceholder('misal: sitirahayu').evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    // Username hanya spasi (lolos required) -> validasi aplikasi
    await fillUserForm(app, page, { username: '   ', password: 'Test@1234', nama: 'QA Spasi' });
    await submitForm(page);
    await expect(page.getByText('Username wajib diisi.')).toBeVisible();
    // Nama hanya spasi
    await fillUserForm(app, page, { username: 'qa_spasi', nama: '   ' });
    await submitForm(page);
    await expect(page.getByText('Nama lengkap pengguna wajib diisi.')).toBeVisible();
    // Password terlalu pendek
    await fillUserForm(app, page, { username: 'qa_spasi', password: '123', nama: 'QA Spasi' });
    await submitForm(page);
    await expect(page.getByText(/Kata sandi awal minimal 6 karakter/)).toBeVisible();
  });

  test('TC-USER-03 | Tambah pengguna baru tersimpan (password di-hash) dan dapat login', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAddUser(app, page);
    await fillUserForm(app, page, { username: 'budi.santoso', password: 'Test@1234', nama: 'Budi Santoso', roleLabel: 'Admin Kasir', email: 'budi@sekarmajusejahtera.co.id', hp: '081234567890' });
    await submitForm(page);
    await expect(app.toast).toContainText('berhasil didaftarkan');
    await expect(page.locator('tbody tr').filter({ hasText: '@budi.santoso' })).toContainText('Budi Santoso');
    const users = (await app.store<any[]>(KEYS.users)) || [];
    const created = users.find((u) => u.username === 'budi.santoso');
    expect(created).toBeTruthy();
    expect(created.role).toBe('admin_kasir');
    expect(created.password).not.toBe('Test@1234');
    expect(created.password).toHaveLength(64); // SHA-256 hex

    await app.logout();
    await app.login('budi.santoso', 'Test@1234');
    await expect(app.welcome('Budi Santoso')).toBeVisible();
    await expect(page.getByText('Menu Akses Anda (Admin Kasir)')).toBeVisible();
  });

  test('TC-USER-04 | Username duplikat (termasuk beda kapitalisasi) & email tidak valid ditolak', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAddUser(app, page);
    await fillUserForm(app, page, { username: 'superadmin', password: 'Test@1234', nama: 'Duplikat' });
    await submitForm(page);
    await expect(page.getByText('Username "superadmin" sudah digunakan oleh pengguna lain.')).toBeVisible();
    await fillUserForm(app, page, { username: 'SuperAdmin', password: 'Test@1234', nama: 'Duplikat' });
    await submitForm(page);
    await expect(page.getByText('Username "superadmin" sudah digunakan oleh pengguna lain.')).toBeVisible();

    await fillUserForm(app, page, { username: 'qa_email', password: 'Test@1234', nama: 'QA Email', email: 'budi@@mail' });
    await submitForm(page);
    const emailInput = page.getByPlaceholder('nama@sekarmajusejahtera.co.id');
    expect(await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
    await expect(page.getByPlaceholder('misal: sitirahayu')).toBeVisible(); // form masih terbuka
    const users = (await app.store<any[]>(KEYS.users)) || [];
    expect(users.some((u) => u.username === 'qa_email')).toBe(false);
  });

  test('TC-USER-05 | Edit pengguna (nama & role) tersimpan; hak akses mengikuti role baru', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.users, TITLE.users);
    const row = page.locator('tbody tr').filter({ hasText: '@admintimbang' });
    await row.getByTitle('Edit Data Pengguna').click();
    await page.getByPlaceholder('misal: Siti Rahayu, S.E.').fill('Siti Rahayu, A.Md.');
    await app.selectSearchable(page.getByPlaceholder('Pilih Role...'), 'Kepala Gudang', 'Kepala Gudang');
    await submitForm(page);
    await expect(app.toast).toContainText('berhasil diperbarui');
    await expect(row).toContainText('Siti Rahayu, A.Md.');
    await expect(row).toContainText('Kepala Gudang');
    await app.logout();
    await app.login('admintimbang', 'timbang123');
    await expect(page.getByText('Menu Akses Anda (Kepala Gudang)')).toBeVisible();
    expect(await app.hasMenu(MENU.timbangan)).toBe(false);
    expect(await app.hasMenu(MENU.dashboard)).toBe(true);
  });

  test('TC-USER-06 | Hapus pengguna dengan konfirmasi; akun sendiri tidak bisa dihapus', async ({ app, page, dialogs }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.users, TITLE.users);
    const row = page.locator('tbody tr').filter({ hasText: '@adminsortir_b' });
    await row.getByTitle('Hapus Pengguna').click();
    await expect(page.getByRole('heading', { name: 'Hapus Akun Pengguna' })).toBeVisible();
    await app.modal().getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(row).toHaveCount(1);
    await row.getByTitle('Hapus Pengguna').click();
    await app.modal().getByRole('button', { name: 'Hapus Pengguna' }).click();
    await expect(app.toast).toContainText('berhasil dihapus');
    await expect(row).toHaveCount(0);
    const users = (await app.store<any[]>(KEYS.users)) || [];
    expect(users.some((u) => u.username === 'adminsortir_b')).toBe(false);

    const self = page.locator('tbody tr').filter({ hasText: '@superadmin' });
    await expect(self.getByTitle('Tidak bisa menghapus akun sendiri')).toBeDisabled();
  });

  test('TC-USER-07 | Pencarian & filter role/status pada daftar pengguna', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.users, TITLE.users);
    const rows = page.locator('tbody tr');
    await page.getByPlaceholder(/Cari pengguna/).fill('Siti');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('@admintimbang');
    await page.getByPlaceholder(/Cari pengguna/).fill('');
    await expect(rows).toHaveCount(7);
    await page.locator('select').filter({ hasText: 'Semua Role Pengguna' }).selectOption('admin_sortir');
    await expect(rows).toHaveCount(2);
    await page.getByRole('button', { name: 'Reset Filter' }).click();
    await expect(rows).toHaveCount(7);
  });

  test('TC-USER-08 | Batas format: password 5 vs 6 karakter, nomor HP huruf', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await openAddUser(app, page);
    await fillUserForm(app, page, { username: 'qa_boundary', password: '12345', nama: 'QA Boundary' });
    await submitForm(page);
    await expect(page.getByText(/minimal 6 karakter/)).toBeVisible();
    await fillUserForm(app, page, { username: 'qa_boundary', password: '123456', nama: 'QA Boundary', hp: 'abcde' });
    await submitForm(page);
    await expect(app.toast).toContainText('berhasil didaftarkan');
    const users = (await app.store<any[]>(KEYS.users)) || [];
    const u = users.find((x) => x.username === 'qa_boundary');
    expect(u).toBeTruthy();
    test.info().annotations.push({ type: 'observasi', description: `No HP huruf "abcde" tersimpan sebagai: ${u?.no_hp} (tidak ada validasi format numerik); placeholder password "Minimal 5 karakter" vs validasi 6 karakter` });
    expect(u?.no_hp, 'Nomor HP berisi huruf seharusnya ditolak').not.toBe('abcde');
  });

  test('TC-USER-09 | Nonaktifkan & reset password tersinkron ke proses login; aksi tercatat di Audit Trail', async ({ app, page }) => {
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.users, TITLE.users);
    const row = page.locator('tbody tr').filter({ hasText: '@adminkasir' });
    await row.getByTitle('Reset Kata Sandi').click();
    await page.getByPlaceholder('Masukkan kata sandi baru...').fill('Baru@2026');
    await page.getByPlaceholder('Ketik ulang kata sandi baru...').fill('Baru@2026');
    await page.locator('form').getByRole('button', { name: /Reset|Simpan/ }).last().click();
    await expect(app.toast).toContainText('berhasil direset');

    const rowKG = page.locator('tbody tr').filter({ hasText: '@kepalagudang' });
    await rowKG.getByTitle('Nonaktifkan Pengguna').click();
    await expect(app.toast).toContainText('NONAKTIF');

    await page.getByRole('button', { name: /Audit Trail & Log Aktivitas/ }).click();
    const auditText = await page.locator('main').textContent();
    const auditStore = (await app.store<any[]>(KEYS.audit)) || [];
    const hasUserAudit = auditStore.some((a) => /kasir|gudang|password|sandi|nonaktif/i.test(`${a.deskripsi} ${a.aksi} ${a.modul}`));
    test.info().annotations.push({ type: 'observasi', description: `Audit entri untuk reset password/nonaktif user: ${hasUserAudit ? 'ADA' : 'TIDAK ADA'}; tampilan audit memuat ${auditStore.length} entri` });

    await app.logout();
    expect(await app.tryLogin('adminkasir', 'kasir123')).toContain('salah');
    await app.login('adminkasir', 'Baru@2026');
    await app.logout();
    expect(await app.tryLogin('kepalagudang', 'gudang123')).toContain('dinonaktifkan');
    expect(hasUserAudit, 'Aksi reset password / nonaktif user harus tercatat di audit trail').toBe(true);
    void auditText;
  });

  test('TC-USER-10 | Role selain superadmin tidak dapat mengakses Manajemen Pengguna (menu, header, dan bypass storage)', async ({ app, page }) => {
    for (const key of ['adminsortir', 'adminkasir', 'adminpengiriman', 'kepalagudang', 'admintimbang'] as const) {
      await app.loginAs(key);
      expect(await app.hasMenu(MENU.users), `menu users untuk ${key}`).toBe(false);
      await app.openProfileMenu();
      await expect(page.getByRole('button', { name: 'Keluar (Logout)' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Kelola Pengguna (RBAC)' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Keluar (Logout)' }).click();
      await expect(app.loginButton).toBeVisible();
    }
    await app.loginAs('adminkasir');
    await page.evaluate((k) => localStorage.setItem(k, 'modul-users'), KEYS.activeModule);
    await app.reload();
    const shown = await page.getByRole('button', { name: 'Tambah Pengguna' }).isVisible().catch(() => false);
    test.info().annotations.push({ type: 'observasi', description: `Bypass modul-users via localStorage oleh admin_kasir: ${shown ? 'BERHASIL (celah RBAC)' : 'ditolak'}` });
    expect(shown, 'Manajemen Pengguna tidak boleh tampil untuk admin_kasir').toBe(false);
  });
});

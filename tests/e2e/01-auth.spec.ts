import { test, expect, USERS, PRODUCTION_ADMIN, MENU, TITLE, KEYS, rawGet, rawSet } from './helpers/app';

/**
 * Modul: Login & Otentikasi (TC-AUTH-01 .. TC-AUTH-10)
 * Sumber: ERP_SekarMajuSejahtera_Test_Report.xlsx (sheet Test_Cases)
 */
test.describe('AUTH - Login & Otentikasi', () => {
  test('TC-AUTH-01 | Halaman login tampil (tanpa akses cepat), akun produksi Sekarmajuadmin & semua akun uji dapat login sesuai role', async ({ app, page }) => {
    await app.openLoginPage();
    await expect(page.getByRole('heading', { name: 'Masuk ke Sistem Gudang' })).toBeVisible();
    await expect(page.getByPlaceholder('misal: admin atau operator')).toBeVisible();
    await expect(page.getByPlaceholder('Masukkan kata sandi...')).toBeVisible();
    // Panel "Akses Cepat Pengujian Role" dan petunjuk kata sandi default tidak boleh ada
    await expect(page.getByText(/AKSES CEPAT/i)).toHaveCount(0);
    await expect(page.getByText(/Default pass/i)).toHaveCount(0);

    // Instalasi bersih (tanpa data uji): hanya akun produksi yang ada dan dapat login
    await app.resetToCleanInstall();
    const cleanUsers = (await app.store<any[]>(KEYS.users)) || [];
    expect(cleanUsers.map((u) => u.username)).toEqual([PRODUCTION_ADMIN.username]);
    expect(cleanUsers[0].password).toHaveLength(64); // tersimpan sebagai hash, bukan teks biasa
    expect((await app.store<any[]>(KEYS.petani)) || []).toEqual([]);
    expect((await app.store<any[]>(KEYS.harga)) || []).toEqual([]);
    expect((await app.store<any[]>(KEYS.hargaJual)) || []).toEqual([]);
    expect((await app.store<any[]>(KEYS.transaksi)) || []).toEqual([]);
    expect((await app.store<any[]>(KEYS.barang)) || []).toEqual([]);
    await app.login(PRODUCTION_ADMIN.username, PRODUCTION_ADMIN.password);
    await expect(app.welcome(PRODUCTION_ADMIN.nama)).toBeVisible();
    expect(await app.hasMenu(MENU.users)).toBe(true);
    await expect(app.sidebar.getByRole('button', { name: MENU.petani })).toContainText('0');
    await app.logout();
    await app.reseedQaData();

    const expectedUserMenu: Record<string, boolean> = {
      superadmin: true,
      adminsortir: false,
      admintimbang: false,
      adminkasir: false,
      adminpengiriman: false,
      kepalagudang: false,
      adminsortir_b: false,
    };
    for (const key of Object.keys(USERS) as Array<keyof typeof USERS>) {
      const u = USERS[key];
      await app.login(u.username, u.password);
      await expect(app.welcome(u.nama)).toBeVisible();
      await expect(page.getByText(`Menu Akses Anda (${u.roleLabel})`)).toBeVisible();
      expect(await app.hasMenu(MENU.users), `menu Manajemen Pengguna untuk ${key}`).toBe(expectedUserMenu[key]);
      await app.logout();
    }
  });

  test('TC-AUTH-02 | Validasi field wajib (username/password kosong atau hanya spasi)', async ({ app, page }) => {
    await app.openLoginPage();
    const username = page.getByPlaceholder('misal: admin atau operator');
    const password = page.getByPlaceholder('Masukkan kata sandi...');

    // Kedua field kosong -> HTML5 required mencegah submit, tetap di halaman login
    await app.loginButton.click();
    await expect(app.loginButton).toBeVisible();
    expect(await username.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);

    // Username hanya spasi (lolos HTML5 required) -> validasi aplikasi
    await username.fill('   ');
    await password.fill('admin123');
    await app.loginButton.click();
    await expect(page.getByText('Masukkan username atau email Anda.')).toBeVisible();

    // Password hanya spasi
    await username.fill('superadmin');
    await password.fill('   ');
    await app.loginButton.click();
    await expect(page.getByText('Masukkan kata sandi Anda.')).toBeVisible();
    await expect(app.loginButton).toBeVisible();
  });

  test('TC-AUTH-03 | Login sukses membuat sesi tersimpan & bertahan setelah refresh', async ({ app, page }) => {
    await app.loginAs('adminkasir');
    expect(await rawGet(page, KEYS.logoutFlag)).toBeNull();
    const session = await app.store<any>(KEYS.currentUser);
    expect(session?.username).toBe('adminkasir');
    expect(session?.role).toBe('admin_kasir');

    await app.reload();
    await expect(app.headerTitle).toHaveText(TITLE.home);
    await expect(app.welcome(USERS.adminkasir.nama)).toBeVisible();
    await expect(app.loginButton).toHaveCount(0);
  });

  test('TC-AUTH-04 | Login ditolak: username tidak terdaftar, password salah, akun nonaktif', async ({ app, page }) => {
    await app.openLoginPage();
    expect(await app.tryLogin('usertidakada', 'apa saja')).toContain('Username atau email tidak terdaftar dalam sistem.');
    expect(await app.tryLogin('superadmin', 'passwordsalah')).toContain('Kata sandi (password) yang Anda masukkan salah.');

    // Nonaktifkan akun kepalagudang langsung di storage, lalu coba login
    const users = (await app.store<any[]>(KEYS.users)) || [];
    await app.setStore(
      KEYS.users,
      users.map((u) => (u.username === 'kepalagudang' ? { ...u, status_aktif: false } : u)),
    );
    await app.reload();
    expect(await app.tryLogin('kepalagudang', 'gudang123')).toContain('Akun ini telah dinonaktifkan');
    await expect(app.loginButton).toBeVisible();
  });

  test('TC-AUTH-05 | Sesi berakhir otomatis (auto-logout) setelah 30 menit tidak ada aktivitas', async ({ app, page }) => {
    await page.clock.install();
    await app.loginAs('admintimbang');
    await expect(app.headerTitle).toHaveText(TITLE.home);
    // Majukan waktu 30 menit + 5 detik tanpa aktivitas pengguna
    await page.clock.fastForward(30 * 60 * 1000 + 5000);
    await expect(app.loginButton).toBeVisible({ timeout: 15_000 });
    expect(await rawGet(page, KEYS.logoutFlag)).toBe('true');
  });

  test('TC-AUTH-06 | Logout menghapus sesi; refresh & tombol back tidak membuka halaman internal', async ({ app, page }) => {
    await app.loginAs('adminsortir');
    await app.gotoModule(MENU.petani, TITLE.petani);
    await app.logout();
    expect(await rawGet(page, KEYS.logoutFlag)).toBe('true');
    expect(await rawGet(page, KEYS.currentUser)).toBeNull();
    expect(await rawGet(page, KEYS.rawAuth)).toBeNull();
    await app.reload();
    await expect(app.loginButton).toBeVisible();
    // Tombol back: SPA tanpa router, history hanya berisi halaman awal; setelah kembali ke app harus tetap login page
    await page.goBack().catch(() => undefined);
    if (!page.url().startsWith('http://localhost:3000')) {
      await page.goForward().catch(() => undefined);
    }
    await expect(app.loginButton).toBeVisible();
    await expect(app.headerTitle).toHaveCount(0);
  });

  test('TC-AUTH-07 | Identifier login: email, kapitalisasi, dan spasi berlebih diterima', async ({ app, page }) => {
    await app.openLoginPage();
    await app.login('dewi.kasir@sekarmajusejahtera.co.id', 'kasir123');
    await expect(app.welcome(USERS.adminkasir.nama)).toBeVisible();
    await app.logout();

    await app.login('  SUPERADMIN  ', 'admin123');
    await expect(app.welcome(USERS.superadmin.nama)).toBeVisible();
    await app.logout();

    // Password bersifat case-sensitive
    expect(await app.tryLogin('superadmin', 'ADMIN123')).toContain('Kata sandi (password) yang Anda masukkan salah.');
  });

  test('TC-AUTH-08 | Format input ekstrem: payload XSS & username sangat panjang tidak merusak aplikasi', async ({ app, page, dialogs }) => {
    await app.openLoginPage();
    const xss = '<img src=x onerror="window.__xss=1"><script>alert(1)</script>';
    const err = await app.tryLogin(xss, 'admin123');
    expect(err).toContain('tidak terdaftar');
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
    expect(dialogs.filter((d) => d === '1')).toHaveLength(0);
    // Payload harus dirender sebagai teks (escape), bukan elemen
    expect(await page.locator('img[src="x"]').count()).toBe(0);

    const longName = 'a'.repeat(600);
    const err2 = await app.tryLogin(longName, 'admin123');
    expect(err2).toContain('tidak terdaftar');
    await expect(app.loginButton).toBeVisible();
  });

  test('TC-AUTH-09 | Identitas sesi tersinkron ke Header, Home, dan kolom Terakhir Login di Manajemen Pengguna', async ({ app, page }) => {
    const before = (await (async () => {
      await app.open();
      return app.store<any[]>(KEYS.users);
    })()) || [];
    const prevLogin = before.find((u) => u.username === 'adminpengiriman')?.terakhir_login;

    await app.login('adminpengiriman', 'kirim123');
    await expect(page.locator('header')).toContainText(USERS.adminpengiriman.nama);
    await expect(app.welcome(USERS.adminpengiriman.nama)).toBeVisible();
    await expect(page.getByText('Menu Akses Anda (Admin Pengiriman)')).toBeVisible();

    const after = (await app.store<any[]>(KEYS.users)) || [];
    const newLogin = after.find((u) => u.username === 'adminpengiriman')?.terakhir_login;
    expect(newLogin).toBeTruthy();
    expect(newLogin).not.toBe(prevLogin);
    expect(new Date(newLogin).getFullYear()).toBe(new Date().getFullYear());

    await app.logout();
    await app.loginAs('superadmin');
    await app.gotoModule(MENU.users, TITLE.users);
    const row = page.locator('tbody tr').filter({ hasText: '@adminpengiriman' });
    await expect(row).toContainText(String(new Date().getFullYear()));
  });

  test('TC-AUTH-10 | Akses tanpa hak: tanpa login harus ke halaman login; sesi palsu di storage & "Ganti Akun Cepat" diuji', async ({ app, page }) => {
    // (a) Pengunjung baru (localStorage kosong) tidak boleh auto-login
    await app.openLoginPage();
    await expect(app.headerTitle).toHaveCount(0);

    // (b) Sesi palsu: user_id yang tidak ada di daftar pengguna dengan role superadmin
    const fake = { user_id: 'USR-HACK', username: 'hacker', nama_lengkap: 'Penyusup QA', role: 'superadmin', status_aktif: true, unit_penugasan: '-', dibuat_pada: new Date().toISOString() };
    await rawSet(page, KEYS.rawAuth, JSON.stringify(fake));
    await page.evaluate((k) => localStorage.removeItem(k), KEYS.logoutFlag);
    await app.reload();
    const fakeAccepted = await app.headerTitle.isVisible().catch(() => false);
    const bodyText = (await page.locator('body').innerText()).slice(0, 160).replace(/\s+/g, ' ');
    test.info().annotations.push({ type: 'observasi', description: `Sesi palsu (user_id tidak terdaftar) ${fakeAccepted ? 'DITERIMA sebagai login' : 'ditolak'}; tampilan: ${bodyText}` });
    expect(fakeAccepted, 'Sesi dengan user_id tidak terdaftar seharusnya ditolak dan diarahkan ke halaman login').toBe(false);
  });

  test('TC-AUTH-10b | "Ganti Akun Cepat" di header: role terendah tidak boleh beralih ke Super Admin tanpa kata sandi', async ({ app, page }) => {
    await app.loginAs('admintimbang');
    await app.openProfileMenu();
    const switchBtn = page.getByRole('button', { name: 'Ganti Akun Cepat' });
    const visible = await switchBtn.isVisible().catch(() => false);
    test.info().annotations.push({ type: 'observasi', description: `Tombol Ganti Akun Cepat untuk admin_timbang: ${visible ? 'TAMPIL' : 'tidak tampil'}` });
    if (visible) {
      await switchBtn.click();
      await page.getByRole('button', { name: /@superadmin/ }).click();
      const becameSuper = await app.hasMenu(MENU.users);
      expect(becameSuper, 'admin_timbang dapat beralih menjadi Super Admin tanpa memasukkan kata sandi').toBe(false);
    }
  });
});

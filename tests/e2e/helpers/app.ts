import { test as base, expect, type Page, type Locator } from '@playwright/test';
import LZString from 'lz-string';
import { KEYS, readStore, writeStore, rawSet, rawGet } from './store';
import { QA_USERS, QA_PETANI, QA_HARGA, QA_HARGA_JUAL } from '../fixtures';
import { buildTransaksi } from './factory';

/**
 * Akun produksi bawaan aplikasi (src/data/initialUserData.ts) - satu-satunya akun pada instalasi bersih.
 */
export const PRODUCTION_ADMIN = { username: 'Sekarmajuadmin', password: 'Supersekar25', nama: 'Super Admin Sekar Maju', role: 'superadmin', roleLabel: 'Super Admin' } as const;

/** Akun uji QA (fixture tests/e2e/fixtures/initialUserData.ts) yang disuntik ke localStorage sebelum tiap test. */
export const USERS = {
  superadmin: { username: 'superadmin', password: 'admin123', nama: 'Bpk. H. Rahmat Sulistyo', role: 'superadmin', roleLabel: 'Super Admin' },
  adminsortir: { username: 'adminsortir', password: 'sortir123', nama: 'Ahmad Fauzi, S.P. (Sortir A)', role: 'admin_sortir', roleLabel: 'Admin Sortir' },
  adminsortir_b: { username: 'adminsortir_b', password: 'sortir123', nama: 'Bayu Pratama (Sortir B)', role: 'admin_sortir', roleLabel: 'Admin Sortir' },
  admintimbang: { username: 'admintimbang', password: 'timbang123', nama: 'Siti Rahayu', role: 'admin_timbang', roleLabel: 'Admin Timbang' },
  adminkasir: { username: 'adminkasir', password: 'kasir123', nama: 'Dewi Lestari, S.E.', role: 'admin_kasir', roleLabel: 'Admin Kasir' },
  adminpengiriman: { username: 'adminpengiriman', password: 'kirim123', nama: 'Dedi Setiawan', role: 'admin_pengiriman', roleLabel: 'Admin Pengiriman' },
  kepalagudang: { username: 'kepalagudang', password: 'gudang123', nama: 'Bambang Sutrisno, S.T.', role: 'kepala_gudang', roleLabel: 'Kepala Gudang' },
} as const;
export type UserKey = keyof typeof USERS;

/** Label tombol sidebar (nama aksesibel diawali teks ini). */
export const MENU = {
  home: /^Home$/,
  dashboard: /^Dashboard Analytic$/,
  laporanBal: /^Laporan Bal$/,
  laporanKodeBal: /^Laporan Kode Bal$/,
  laporanHarga: /^Laporan Harga$/,
  laporanPembelian: /^Laporan Pembelian$/,
  laporanPetani: /^Laporan Petani$/,
  laporanPengiriman: /^Laporan Pengiriman$/,
  petani: /^Master Petani/,
  hargaBeli: /^Master Harga Beli/,
  hargaJual: /^Master Harga Jual/,
  barang: /^Inventaris Bal Gudang/,
  sortir: /^Sortir/,
  timbangan: /^Timbangan/,
  kasir: /^Kasir/,
  sample: /^Pengiriman Sample/,
  pengiriman: /^Pengiriman Reguler/,
  statusBatch: /^Status & Detail Batch/,
  users: /^Manajemen Pengguna/,
} as const;

/** Judul header (pageTitle di App.tsx) per modul. */
export const TITLE = {
  home: 'Dasbor Menu Utama',
  dashboard: 'Dashboard Laporan & Analytic ERP',
  laporanBal: 'Laporan Bal Tembakau',
  laporanKodeBal: 'Laporan Kode Bal',
  laporanHarga: 'Laporan Harga',
  laporanPembelian: 'Laporan Pembelian Barang',
  laporanPetani: 'Laporan Petani & Rekapitulasi Setoran',
  laporanPengiriman: 'Laporan Pengiriman & Distribusi Tembakau',
  petani: 'Master Data Petani',
  hargaBeli: 'Master Harga Beli',
  hargaJual: 'Master Harga Jual Pabrik',
  barang: 'Inventaris Bal Gudang',
  sortir: 'Sortir Mutu Grade & Sample Bal',
  timbangan: 'Meja Timbangan Bal & Alokasi Gudang',
  kasir: 'Data Pembelian Barang (Kasir & Cetak Nota)',
  pengiriman: 'Pengiriman Reguler (DO Luar)',
  sample: 'Pengiriman Sample',
  statusBatch: 'Status & Detail Batch Sample',
  users: 'Manajemen Pengguna (RBAC)',
} as const;

export function rupiah(n: number): string {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

export class App {
  constructor(public page: Page, public dialogs: string[]) {}

  get loginButton(): Locator {
    return this.page.getByRole('button', { name: 'Masuk ke Sistem ERP' });
  }
  get headerTitle(): Locator {
    return this.page.locator('header h1');
  }
  get sidebar(): Locator {
    return this.page.locator('aside');
  }
  get toast(): Locator {
    return this.page.locator('div.fixed.bottom-5.right-5');
  }

  /** Buka aplikasi (context baru = localStorage kosong, app melakukan seed demo). */
  async open(): Promise<void> {
    await this.page.goto('/');
    await expect(this.page.locator('#root')).not.toBeEmpty();
  }

  async openLoginPage(): Promise<void> {
    await this.open();
    await expect(this.loginButton).toBeVisible();
  }

  async login(username: string, password: string): Promise<void> {
    if (!(await this.loginButton.isVisible().catch(() => false))) {
      await this.openLoginPage();
    }
    await this.page.getByPlaceholder('misal: admin atau operator').fill(username);
    await this.page.getByPlaceholder('Masukkan kata sandi...').fill(password);
    await this.loginButton.click();
    await expect(this.headerTitle).toHaveText(TITLE.home, { timeout: 15_000 });
  }

  async loginAs(key: UserKey): Promise<void> {
    const u = USERS[key];
    await this.login(u.username, u.password);
  }

  /** Kosongkan localStorage tanpa seeding ulang (simulasi instalasi produksi bersih) lalu muat ulang. */
  async resetToCleanInstall(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.setItem('qa_seeded', '1');
    });
    await this.reload();
  }

  /** Suntik ulang dataset QA (setelah resetToCleanInstall) dan muat ulang. */
  async reseedQaData(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.removeItem('qa_seeded');
    });
    await this.reload();
  }

  /** Coba login dan kembalikan pesan error (jika ada) tanpa menunggu dashboard. */
  async tryLogin(username: string, password: string): Promise<string | null> {
    await this.page.getByPlaceholder('misal: admin atau operator').fill(username);
    await this.page.getByPlaceholder('Masukkan kata sandi...').fill(password);
    await this.loginButton.click();
    const errorBox = this.page.locator('div.bg-red-50.border-red-200');
    const ok = await Promise.race([
      errorBox.first().waitFor({ state: 'visible', timeout: 5000 }).then(() => 'error'),
      this.headerTitle.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'success'),
    ]).catch(() => 'none');
    if (ok === 'error') return (await errorBox.first().textContent())?.trim() || '';
    return null;
  }

  async openProfileMenu(): Promise<void> {
    await this.page.getByTitle('Informasi Akun Staf & Hak Akses').click();
  }

  async logout(): Promise<void> {
    await this.openProfileMenu();
    await this.page.getByRole('button', { name: 'Keluar (Logout)' }).click();
    await expect(this.loginButton).toBeVisible();
  }

  async gotoModule(label: RegExp, expectedTitle?: string): Promise<void> {
    await this.sidebar.getByRole('button', { name: label }).first().click();
    if (expectedTitle) {
      await expect(this.headerTitle).toHaveText(expectedTitle);
    }
  }

  async hasMenu(label: RegExp): Promise<boolean> {
    return (await this.sidebar.getByRole('button', { name: label }).count()) > 0;
  }

  /** Daftar teks tombol modul yang tampil di sidebar (tanpa header seksi). */
  async visibleMenus(): Promise<string[]> {
    const names = await this.sidebar.getByRole('button').allTextContents();
    return names.map((n) => n.trim());
  }

  /** Pilih opsi pada komponen SearchableSelect berdasarkan input placeholder. */
  async selectSearchable(input: Locator, query: string, optionText?: string | RegExp): Promise<void> {
    await input.click();
    await input.fill(query);
    const dropdown = this.page.locator('div.absolute.z-50.w-full');
    const option = optionText
      ? dropdown.locator('div.cursor-pointer').filter({ hasText: optionText }).first()
      : dropdown.locator('div.cursor-pointer').first();
    await option.click();
  }

  /** Klik tombol konfirmasi pada ConfirmModal (mis. "Ya, Hapus Permanen"). */
  async confirmModal(buttonText: string | RegExp): Promise<void> {
    await this.page.getByRole('button', { name: buttonText }).click();
  }

  async store<T = any>(key: string): Promise<T | null> {
    return readStore<T>(this.page, key);
  }
  async setStore(key: string, data: unknown): Promise<void> {
    await writeStore(this.page, key, data);
  }
  async reload(): Promise<void> {
    await this.page.reload();
    await expect(this.page.locator('#root')).not.toBeEmpty();
  }

  /** Jumlah pemanggilan window.print pada halaman utama + seluruh iframe (stub di-inject via addInitScript). */
  async printCalls(): Promise<number> {
    let total = 0;
    for (const frame of this.page.frames()) {
      total += await frame.evaluate(() => (window as any).__printCalls || 0).catch(() => 0);
    }
    return total;
  }

  /** Buka modul Status & Detail Batch lalu tab "Status Pengiriman Barang" (tabel DO). */
  async gotoStatusBatchDO(): Promise<void> {
    await this.gotoModule(MENU.statusBatch, TITLE.statusBatch);
    await this.page.getByRole('button', { name: /Status Pengiriman Barang/ }).click();
    await expect(this.page.getByPlaceholder(/Cari No. Surat Jalan/)).toBeVisible();
  }

  /** Banner sambutan di Home (teks persis, membedakan dari toast login). */
  welcome(nama: string): Locator {
    return this.page.getByText(`Selamat Datang, ${nama}`, { exact: true });
  }

  /** Badge "<netto> Kg Netto" pada daftar bal di Meja Timbangan (opsional dibatasi ke satu nomor bal). */
  nettoBadge(netto: string, noBal?: string): Locator {
    const badge = new RegExp(`^${netto.replace('.', '\\.')} Kg Netto$`);
    if (noBal) {
      return this.page
        .locator('button')
        .filter({ hasText: noBal })
        .locator('span.font-mono', { hasText: badge });
    }
    return this.page.locator('span.font-mono', { hasText: badge });
  }

  /** Kartu metrik pada Dashboard Analytic berdasarkan judulnya (mengembalikan elemen kartu terluar terdekat). */
  dashboardCard(title: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText(title, { exact: true }) })
      .filter({ hasText: /Rp\s?[\d.]{3,}|[\d.,]+\s?(Kg|Bal)/ })
      .last();
  }

  // ------------------------------------------------------------------
  // Alur transaksi pembelian (Sortir -> Timbangan -> Kasir)
  // ------------------------------------------------------------------

  /** Isi formulir Sortir dan simpan. Mengembalikan pesan sukses. */
  async sortirCreate(opts: { kupon: string; petaniQuery?: string; bals: Array<{ noBal: string; grade: string }> }): Promise<string> {
    await this.gotoModule(MENU.sortir, TITLE.sortir);
    await this.page.getByPlaceholder('Contoh: KUP0001').fill(opts.kupon);
    if (opts.petaniQuery) {
      await this.selectSearchable(this.page.getByPlaceholder('Pilih Petani...'), opts.petaniQuery, opts.petaniQuery);
    }
    for (const b of opts.bals) {
      await this.sortirAddBal(b.noBal, b.grade);
      await expect(this.page.getByText(`berhasil ditambahkan`).last()).toBeVisible();
    }
    await this.page.getByRole('button', { name: 'Simpan Data Sortir' }).click();
    const msg = this.page.locator('div.bg-emerald-50').filter({ hasText: 'berhasil disimpan' }).first();
    await expect(msg).toBeVisible();
    return (await msg.textContent()) || '';
  }

  get sortirNoBalInput(): Locator {
    return this.page.getByPlaceholder(/^Contoh: A\d{4}$/);
  }

  async sortirAddBal(noBal: string, grade: string): Promise<void> {
    // Aplikasi memindahkan fokus ke input No Bal ~100ms setelah bal ditambahkan; tunggu agar ketikan tidak salah sasaran.
    await this.page.waitForTimeout(250);
    await this.sortirNoBalInput.fill(noBal);
    const gradeInput = this.page.locator('#grade-input');
    await gradeInput.fill(grade);
    await expect(gradeInput).toHaveValue(grade);
    await this.page.locator('#btn-tambah-bal').click();
  }

  /** Overlay modal paling atas (ConfirmModal / form modal). */
  modal(): Locator {
    return this.page.locator('div.fixed.inset-0').last();
  }

  /** Teks umpan balik terakhir pada toolbar Sortir/Timbangan. */
  get feedback(): Locator {
    return this.page.locator('div.text-xs.px-3.py-1\\.5.rounded-sm.font-medium').last();
  }

  /** Buka bal tertentu di Meja Timbangan lewat input pencarian. */
  async timbangOpenBal(noBal: string): Promise<void> {
    await this.gotoModule(MENU.timbangan, TITLE.timbangan);
    const search = this.page.getByPlaceholder('Ketik nomor bal, kupon, atau scan barcode...');
    await search.fill(noBal);
    await this.page.getByRole('button', { name: 'Cari' }).click();
    await expect(this.page.getByText(new RegExp(`Bal "${noBal}"`)).first()).toBeVisible();
  }

  get brutoInput(): Locator {
    return this.page.getByPlaceholder('0.0').first();
  }
  get nettoInput(): Locator {
    return this.page.getByPlaceholder('0.0').nth(1);
  }
  get simpanTimbanganButton(): Locator {
    return this.page.getByRole('button', { name: /Simpan Timbangan|Bobot Melebihi Toleransi/ });
  }

  /** Timbang satu bal: isi bruto (opsional ganti tikar / netto manual) lalu simpan. */
  async timbangBal(opts: { noBal: string; bruto: number; gantiTikar?: boolean; nettoManual?: number }): Promise<void> {
    await this.timbangOpenBal(opts.noBal);
    await this.brutoInput.fill(String(opts.bruto));
    if (opts.gantiTikar) {
      const cb = this.page.getByLabel('Ada Ganti Tikar?');
      if (!(await cb.isChecked())) await cb.check();
    }
    if (opts.nettoManual !== undefined) {
      await this.nettoInput.fill(String(opts.nettoManual));
    }
    await this.page.getByRole('button', { name: 'Simpan Timbangan' }).click();
    await expect(this.toast).toContainText('diperbarui');
  }

  /** Baris tabel Kasir untuk kupon tertentu. */
  kasirRow(kupon: string): Locator {
    return this.page.locator('tbody tr').filter({ hasText: kupon }).first();
  }

  /** Proses pembayaran tunai di Kasir; kembalikan nominal yang dibayar. */
  async kasirBayar(kupon: string, opts: { cetakLangsung?: boolean } = {}): Promise<number> {
    await this.gotoModule(MENU.kasir, TITLE.kasir);
    const row = this.kasirRow(kupon);
    await row.getByRole('button', { name: 'Bayar' }).click();
    const cashInput = this.page.getByPlaceholder(/^Ketik ulang /);
    await expect(cashInput).toBeVisible();
    const placeholder = (await cashInput.getAttribute('placeholder')) || '';
    const nominal = Number(placeholder.replace(/\D/g, ''));
    await cashInput.fill(String(nominal));
    const cetak = this.page.locator('#check-cetak-nota');
    if (opts.cetakLangsung === false && (await cetak.isChecked())) await cetak.uncheck();
    await this.page.getByRole('button', { name: 'Proses Pembayaran Tunai (Cash)' }).click();
    return nominal;
  }
}

/**
 * Dataset QA yang disuntik ke localStorage sebelum aplikasi dimuat (aplikasi produksi tidak lagi membawa data demo):
 * 7 akun uji, 34 petani, 41 kode harga beli, 41 kode harga jual, dan 1 transaksi lunas 6 bal (stok gudang).
 */
export const QA_SEED_TX = buildTransaksi({
  txId: 'QA-TX-SEED-001',
  kupon: 'KUPSEED01',
  petani: QA_PETANI[0],
  bals: [
    { no_bal: 'SEED0001', grade: '45', harga: 45000, bruto: 52 },
    { no_bal: 'SEED0002', grade: '45', harga: 45000, bruto: 48 },
    { no_bal: 'SEED0003', grade: '50', harga: 50000, bruto: 61 },
    { no_bal: 'SEED0004', grade: '50', harga: 50000, bruto: 55 },
    { no_bal: 'SB-SEED05', grade: '55', harga: 55000, bruto: 47 },
    { no_bal: 'SEED0006', grade: '40', harga: 40000, bruto: 49 },
  ],
  lunas: true,
});
const compress = (data: unknown) => LZString.compressToUTF16(JSON.stringify(data));
export const QA_SEED: Record<string, string> = {
  [KEYS.users]: compress(QA_USERS),
  [KEYS.petani]: compress(QA_PETANI),
  [KEYS.harga]: compress(QA_HARGA),
  [KEYS.hargaJual]: compress(QA_HARGA_JUAL),
  [KEYS.transaksi]: compress([QA_SEED_TX.tx]),
  [KEYS.barang]: compress(QA_SEED_TX.barangs),
};

type Fixtures = {
  dialogs: string[];
  app: App;
};

export const test = base.extend<Fixtures>({
  dialogs: async ({ page }, use) => {
    const messages: string[] = [];
    page.on('dialog', async (d) => {
      messages.push(d.message());
      await d.accept();
    });
    await use(messages);
  },
  app: async ({ page, dialogs }, use) => {
    await page.addInitScript(() => {
      (window as any).__printCalls = 0;
      window.print = () => {
        (window as any).__printCalls = ((window as any).__printCalls || 0) + 1;
      };
    });
    // Seed dataset QA sekali per context (flag di sessionStorage agar localStorage.clear() di test tetap bisa dipakai)
    await page.addInitScript((seed: Record<string, string>) => {
      try {
        if (!sessionStorage.getItem('qa_seeded')) {
          Object.entries(seed).forEach(([k, v]) => localStorage.setItem(k, v));
          sessionStorage.setItem('qa_seeded', '1');
        }
      } catch {
        // abaikan (mode privat / kuota)
      }
    }, QA_SEED);
    await use(new App(page, dialogs));
  },
});

export { expect, KEYS, readStore, writeStore, rawSet, rawGet };

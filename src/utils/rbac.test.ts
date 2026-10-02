import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MODUL_LAPORAN, ROLE_DEFINITIONS, aturAksesLaporan, hasModuleAccess, laporanTerbuka } from './rbac';
import { DATA_MENU } from './dataMenu';

const idMenu = (berkas: string, pola: RegExp) =>
  [...readFileSync(resolve(__dirname, berkas), 'utf8').matchAll(pola)].map((m) => m[1]);

const SIDEBAR = idMenu('../components/Sidebar.tsx', /\{ id: '(modul-[a-z0-9-]+)'/g);
const HOME = idMenu('../components/home/HomeDashboardView.tsx', /modId: '(modul-[a-z0-9-]+)'/g);

describe('menu samping, Home, hak akses, dan data per menu selaras', () => {
  it('Home memuat menu yang sama dengan menu samping, dengan urutan yang sama', () => {
    expect(HOME).toEqual(SIDEBAR);
  });

  it('setiap menu bisa dibuka Super Admin dan punya daftar data', () => {
    for (const id of SIDEBAR) {
      expect(hasModuleAccess('superadmin', id), id).toBe(true);
      expect(DATA_MENU[id], id).toBeDefined();
    }
  });

  it('Status Batch & Reclass dan Status Pengiriman Reguler (DO) menjadi dua menu dengan peran yang sama', () => {
    for (const role of ['superadmin', 'admin_pengiriman', 'kepala_gudang']) {
      expect(hasModuleAccess(role, 'modul-status-batch'), role).toBe(true);
      expect(hasModuleAccess(role, 'modul-status-pengiriman'), role).toBe(true);
    }
    for (const role of ['admin_sortir', 'admin_timbang', 'admin_kasir']) {
      expect(hasModuleAccess(role, 'modul-status-pengiriman'), role).toBe(false);
    }
  });

  it('Audit Trail hanya untuk Super Admin', () => {
    const pemilik = Object.values(ROLE_DEFINITIONS).filter((r) => r.allowedModules.includes('modul-audit-trail'));
    expect(pemilik.map((r) => r.role)).toEqual(['superadmin']);
  });
});

describe('akses laporan Admin Sortir dipilih Super Admin', () => {
  const SEMUA = MODUL_LAPORAN.map((m) => m.id);
  afterEach(() => aturAksesLaporan({ admin_sortir: SEMUA }));

  it('bawaan: semua laporan terbuka', () => {
    for (const id of SEMUA) expect(hasModuleAccess('admin_sortir', id), id).toBe(true);
  });

  it('laporan yang ditutup hilang hanya untuk Admin Sortir; menu kerja dan peran lain tidak terpengaruh', () => {
    aturAksesLaporan({ admin_sortir: ['modul-6-laporan-pembelian'] });
    expect(hasModuleAccess('admin_sortir', 'modul-6-laporan-pembelian')).toBe(true);
    expect(hasModuleAccess('admin_sortir', 'modul-6-laporan-bal')).toBe(false);
    expect(hasModuleAccess('admin_sortir', 'modul-6-dashboard-analytic')).toBe(false);
    expect(hasModuleAccess('admin_sortir', 'modul-0-sortir')).toBe(true);
    expect(hasModuleAccess('admin_kasir', 'modul-6-laporan-bal')).toBe(true);
    expect(hasModuleAccess('superadmin', 'modul-6-laporan-bal')).toBe(true);
  });

  it('pengaturan disimpan di peramban supaya tetap berlaku saat offline', () => {
    aturAksesLaporan({ admin_sortir: [] });
    expect(laporanTerbuka('admin_sortir')).toEqual([]);
    expect(JSON.parse(localStorage.getItem('sms_akses_laporan_v1') || '{}')).toEqual({ admin_sortir: [] });
  });
});

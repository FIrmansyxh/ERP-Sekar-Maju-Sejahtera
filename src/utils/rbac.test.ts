import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROLE_DEFINITIONS, hasModuleAccess } from './rbac';
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

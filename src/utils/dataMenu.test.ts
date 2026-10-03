import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATA_MENU, dataUntukMenu, menuLaporan } from './dataMenu';

const sumber = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');

/** Daftar state yang dipakai blok satu menu di App.tsx, dipetakan ke jenis data yang memuatnya. */
const STATE_KE_DATA: Record<string, string> = {
  petaniList: 'petani',
  transaksiList: 'kupon',
  barangList: 'bal',
  barangLunasList: 'bal',
  hargaList: 'hargaBeli',
  hargaJualList: 'hargaJual',
  userList: 'pengguna',
  batchSampleList: 'batchSample',
  sampleRows: 'batchSample',
  pengirimanList: 'suratJalan',
  riwayatNoBalList: 'riwayatNoBal',
};

describe('data per menu (perangkat hanya memuat data menu yang dibuka)', () => {
  const menu = [...sumber.matchAll(/activeModuleId === '([a-z0-9-]+)'/g)].map((m) => m[1]);

  it('setiap menu di App punya daftar data', () => {
    expect(menu.length).toBeGreaterThan(15);
    for (const id of menu) expect(DATA_MENU[id], id).toBeDefined();
  });

  it('setiap daftar yang dipakai komponen menu ikut dimuat (perangkat baru tidak melihat daftar kosong)', () => {
    for (const id of new Set(menu)) {
      const mulai = sumber.indexOf(`activeModuleId === '${id}'`);
      const blok = sumber.slice(mulai, sumber.indexOf('/>', mulai));
      const dipakai = Object.keys(STATE_KE_DATA).filter((s) => new RegExp(`\\b${s}\\b`).test(blok));
      // Home hanya memakai jumlah pengguna, diambil dari ringkasan
      const wajib = id === 'modul-home' ? [] : dipakai.map((s) => STATE_KE_DATA[s]);
      for (const jenis of wajib) expect(dataUntukMenu(id), `${id} memakai ${jenis}`).toContain(jenis);
    }
  });

  it('ringkasan jumlah selalu ikut; laporan tidak disegarkan berkala', () => {
    expect(dataUntukMenu('modul-home')).toEqual(['ringkasan']);
    expect(dataUntukMenu('modul-3-harga')).toEqual(['hargaBeli', 'ringkasan']);
    expect(menuLaporan('modul-6-laporan-bal')).toBe(true);
    expect(menuLaporan('modul-0-sortir')).toBe(false);
  });
});

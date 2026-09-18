import { User } from '../types';

/**
 * Akun bawaan instalasi produksi.
 *
 * Hanya berisi satu akun Super Admin. Seluruh akun operasional lain
 * (sortir, timbang, kasir, pengiriman, kepala gudang) dibuat manual
 * melalui modul Manajemen Pengguna setelah login pertama.
 *
 * Kata sandi disimpan sebagai hash SHA-256, bukan teks biasa.
 * Hash di bawah adalah SHA-256 dari kata sandi awal Super Admin dan
 * WAJIB diganti melalui menu Reset Kata Sandi setelah serah terima sistem.
 */
export const INITIAL_USER_DATA: User[] = [
  {
    user_id: 'USR-001',
    username: 'Sekarmajuadmin',
    password: '2491dba7874d5ad4c5543c4b0b6f09b36ad6430e159448e05387be71e7750a84',
    nama_lengkap: 'Sekarmajuadmin',
    role: 'superadmin',
    unit_penugasan: '',
    status_aktif: true,
    dibuat_pada: '2026-09-16T00:00:00.000Z',
    terakhir_login: undefined,
  },
];

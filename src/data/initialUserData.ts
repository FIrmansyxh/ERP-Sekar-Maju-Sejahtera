import { User } from '../types';

/**
 * Akun awal lingkungan produksi: hanya satu Super Admin.
 * Kata sandi disimpan sebagai hash SHA-256 (lihat utils/crypto.ts), bukan teks biasa.
 * Akun lain dibuat melalui modul Manajemen Pengguna oleh Super Admin.
 */
export const INITIAL_USER_DATA: User[] = [
  {
    user_id: 'USR-001',
    username: 'Sekarmajuadmin',
    // SHA-256("Supersekar25")
    password: '2491dba7874d5ad4c5543c4b0b6f09b36ad6430e159448e05387be71e7750a84',
    nama_lengkap: 'Super Admin Sekar Maju',
    role: 'superadmin',
    email: 'admin@sekarmajusejahtera.co.id',
    no_hp: '',
    unit_penugasan: 'Pusat Manajemen Pamekasan (Semua Unit)',
    status_aktif: true,
    dibuat_pada: '2026-09-15T00:00:00.000Z',
  },
];

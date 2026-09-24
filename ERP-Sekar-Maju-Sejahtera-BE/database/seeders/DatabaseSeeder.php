<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Eksekusi seed SQL untuk roles, modules, gudang, dan master harga
        $seedSqlPath = database_path('schema/seed.sql');
        if (file_exists($seedSqlPath)) {
            $sql = file_get_contents($seedSqlPath);
            DB::unprepared($sql);
            $this->command->info('Berhasil menjalankan seed.sql (roles, modules, gudang, grades)');
        }

        // 2. Seed akun pengguna awal dengan password ter-hash bcrypt
        $defaultUsers = [
            [
                'user_id' => 'USR-001',
                'username' => 'Sekarmajuadmin',
                'password_hash' => Hash::make('admin123'),
                'nama_lengkap' => 'Bambang Sutrisno, S.T.',
                'role_code' => 'superadmin',
                'email' => 'admin@sekarmaju.com',
                'no_hp' => '081234567800',
                'unit_penugasan' => 'Gudang Pusat Induk - Pamekasan',
                'status_aktif' => true,
                'dibuat_pada' => now(),
            ]
        ];

        foreach ($defaultUsers as $u) {
            User::updateOrCreate(
                ['user_id' => $u['user_id']],
                $u
            );
        }

        $this->command->info('Berhasil membuat akun default resmi dengan password ter-hash bcrypt');
    }
}

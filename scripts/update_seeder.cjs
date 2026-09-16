const fs = require('fs');
const path = require('path');

const seederPath = path.resolve(__dirname, '../../ERP-Sekar-Maju-Sejahtera-BE/database/seeders/DatabaseSeeder.php');

const seederContent = `<?php

namespace Database\\Seeders;

use Illuminate\\Database\\Seeder;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Hash;
use App\\Models\\User;

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
                'username' => 'superadmin',
                'password_hash' => Hash::make('admin123'),
                'nama_lengkap' => 'Bambang Sutrisno, S.T.',
                'role_code' => 'superadmin',
                'email' => 'admin@sekarmaju.com',
                'no_hp' => '081234567800',
                'unit_penugasan' => 'Gudang Pusat Induk - Pamekasan',
                'status_aktif' => true,
                'dibuat_pada' => now(),
            ],
            [
                'user_id' => 'USR-002',
                'username' => 'sortir',
                'password_hash' => Hash::make('sortir123'),
                'nama_lengkap' => "Achmad Rifa'i",
                'role_code' => 'admin_sortir',
                'email' => 'sortir@sekarmaju.com',
                'no_hp' => '081234567802',
                'unit_penugasan' => 'Pos Sortir Lapangan',
                'status_aktif' => true,
                'dibuat_pada' => now(),
            ],
            [
                'user_id' => 'USR-003',
                'username' => 'timbang',
                'password_hash' => Hash::make('timbang123'),
                'nama_lengkap' => 'Slamet Riyadi',
                'role_code' => 'admin_timbang',
                'email' => 'timbang@sekarmaju.com',
                'no_hp' => '081234567803',
                'unit_penugasan' => 'Loket Timbangan Utama',
                'status_aktif' => true,
                'dibuat_pada' => now(),
            ],
            [
                'user_id' => 'USR-004',
                'username' => 'kasir',
                'password_hash' => Hash::make('kasir123'),
                'nama_lengkap' => 'Dewi Anggraini, S.Ak.',
                'role_code' => 'admin_kasir',
                'email' => 'kasir@sekarmaju.com',
                'no_hp' => '081234567804',
                'unit_penugasan' => 'Kasir Pembayaran Gudang',
                'status_aktif' => true,
                'dibuat_pada' => now(),
            ],
            [
                'user_id' => 'USR-005',
                'username' => 'pengiriman',
                'password_hash' => Hash::make('kirim123'),
                'nama_lengkap' => 'Hendra Kurniawan',
                'role_code' => 'admin_pengiriman',
                'email' => 'pengiriman@sekarmaju.com',
                'no_hp' => '081234567805',
                'unit_penugasan' => 'Divisi Logistik & DO',
                'status_aktif' => true,
                'dibuat_pada' => now(),
            ],
            [
                'user_id' => 'USR-006',
                'username' => 'kepala_gudang',
                'password_hash' => Hash::make('gudang123'),
                'nama_lengkap' => 'H. Masykur',
                'role_code' => 'kepala_gudang',
                'email' => 'kepala@sekarmaju.com',
                'no_hp' => '081234567806',
                'unit_penugasan' => 'Pimpinan Gudang Pamekasan',
                'status_aktif' => true,
                'dibuat_pada' => now(),
            ],
        ];

        foreach ($defaultUsers as $u) {
            User::updateOrCreate(
                ['user_id' => $u['user_id']],
                $u
            );
        }

        $this->command->info('Berhasil membuat 6 akun default resmi dengan password ter-hash bcrypt');
    }
}
`;

fs.writeFileSync(seederPath, seederContent);
console.log('DatabaseSeeder.php successfully updated');

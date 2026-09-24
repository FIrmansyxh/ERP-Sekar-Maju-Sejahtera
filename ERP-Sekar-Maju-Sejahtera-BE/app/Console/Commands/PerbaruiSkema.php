<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Menerapkan database/schema/schema.sql ke database yang sedang dipakai.
 *
 * Skema ini tidak memakai migrasi Laravel (tabel `migrations` tidak ada; tabel dibuat dari schema.sql). Seluruh
 * isi schema.sql aman dijalankan ulang (CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE,
 * DROP TRIGGER IF EXISTS), jadi perintah ini dijalankan di setiap deploy supaya kolom, trigger, dan tabel baru
 * (mis. sinkron lintas perangkat) pasti ada di server. Tanpa itu endpoint baru gagal dengan galat 500.
 */
class PerbaruiSkema extends Command
{
    protected $signature = 'erp:perbarui-skema';

    protected $description = 'Terapkan database/schema/schema.sql (aman diulang) ke database aktif';

    public function handle(): int
    {
        $berkas = database_path('schema/schema.sql');
        if (!is_file($berkas)) {
            $this->error("Berkas skema tidak ditemukan: {$berkas}");
            return self::FAILURE;
        }

        try {
            DB::unprepared(file_get_contents($berkas));
        } catch (\Throwable $e) {
            $this->error('Skema gagal diterapkan: ' . $e->getMessage());
            return self::FAILURE;
        }

        $this->info('Skema database sudah diperbarui.');
        return self::SUCCESS;
    }
}

<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Catatan data yang sudah dihapus (disimpan di audit_log, action DELETE).
 *
 * Tanpa ini, perangkat lain yang masih menyimpan perubahan menunggu (antrean kirim ulang, atau permintaan yang
 * sedang berjalan saat data dihapus) membuat ulang data yang sudah dihapus: kupon, batch sample, atau Surat Jalan
 * "muncul lagi". Pembuatan / perubahan untuk ID yang tercatat di sini dijawab 410 Gone, dan frontend membuang
 * perubahan menunggu itu.
 */
class CatatanHapus
{
    public static function catat(string $tabel, string $id, array $info = []): void
    {
        DB::table('audit_log')->insert([
            'table_name' => $tabel,
            'record_id' => mb_substr($id, 0, 50),
            'action' => 'DELETE',
            'changed_by' => optional(auth('sanctum')->user())->user_id,
            'changed_at' => now(),
            'old_values' => json_encode($info),
            'new_values' => null,
        ]);
    }

    /** Info penghapusan terakhir untuk ID ini, atau null bila tidak pernah dihapus. */
    public static function cari(string $tabel, ?string $id): ?array
    {
        if ($id === null || $id === '') {
            return null;
        }
        $baris = DB::table('audit_log')
            ->where('table_name', $tabel)
            ->where('record_id', mb_substr($id, 0, 50))
            ->where('action', 'DELETE')
            ->orderByDesc('audit_id')
            ->first();
        if (!$baris) {
            return null;
        }
        $info = json_decode((string) ($baris->old_values ?? ''), true);
        return is_array($info) ? $info : [];
    }

    public static function sudahDihapus(string $tabel, ?string $id): bool
    {
        return self::cari($tabel, $id) !== null;
    }

    public static function jawaban(string $pesan, array $tambahan = [])
    {
        return response()->json(array_merge([
            'status' => 'error',
            'message' => $pesan,
            'dihapus' => true,
        ], $tambahan), 410);
    }
}

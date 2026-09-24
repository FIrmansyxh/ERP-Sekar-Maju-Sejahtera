<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Tanda "sudah dikirim DO" pada isi batch sample dihitung dari Surat Jalan yang benar-benar ada di server.
 *
 * Dulu frontend yang menandai lalu mengirim batch secara terpisah setelah menyimpan Surat Jalan. Bila salah satu
 * dari dua kiriman itu gagal (atau dikirim dari komputer yang datanya basi), batch dan Surat Jalan tidak cocok lagi:
 * bal tampil "belum dikirim" padahal sudah di Surat Jalan, atau sebaliknya setelah Surat Jalan dibatalkan. Sekarang
 * setiap perubahan Surat Jalan (buat, ubah, batal) dan isi batch langsung menyamakan tanda ini di transaksi yang sama.
 */
class RelasiBatchSample
{
    /**
     * @param iterable $barangId bal yang baru masuk / keluar Surat Jalan atau batch
     * @param bool $ubahStatus batch ditutup (selesai) bila semua bal yang tidak ditolak sudah punya Surat Jalan, dan
     *                         dibuka lagi (diproses) bila tidak lagi begitu
     */
    public static function sesuaikan(iterable $barangId, bool $ubahStatus = true): void
    {
        $id = collect($barangId)->map(fn ($v) => (string) $v)->filter()->unique()->values();
        if ($id->isEmpty()) {
            return;
        }
        $batchIds = DB::table('sample_batch_item')->whereIn('barang_id', $id)->distinct()->pluck('batch_id');
        foreach ($batchIds as $batchId) {
            DB::update(
                "UPDATE sample_batch_item i
                    SET sudah_dikirim_do = EXISTS (SELECT 1 FROM pengiriman_barang_item p WHERE p.barang_id = i.barang_id)
                  WHERE i.batch_id = ?
                    AND i.sudah_dikirim_do IS DISTINCT FROM EXISTS (SELECT 1 FROM pengiriman_barang_item p WHERE p.barang_id = i.barang_id)",
                [$batchId]
            );
            if (!$ubahStatus) {
                continue;
            }
            $items = DB::table('sample_batch_item')->where('batch_id', $batchId)->get(['status_item', 'sudah_dikirim_do']);
            $semuaTerkirim = $items->isNotEmpty()
                && $items->every(fn ($i) => $i->sudah_dikirim_do || $i->status_item === 'ditolak')
                && $items->contains(fn ($i) => $i->sudah_dikirim_do);
            $status = DB::table('sample_batch')->where('batch_id', $batchId)->value('status');
            if ($semuaTerkirim && !in_array($status, ['selesai', 'dibatalkan'], true)) {
                DB::table('sample_batch')->where('batch_id', $batchId)->update(['status' => 'selesai']);
            } elseif (!$semuaTerkirim && $status === 'selesai') {
                DB::table('sample_batch')->where('batch_id', $batchId)->update(['status' => 'diproses']);
            }
        }
    }
}

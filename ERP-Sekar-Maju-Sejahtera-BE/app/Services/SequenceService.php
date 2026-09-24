<?php

namespace App\Services;

use App\Support\CatatanHapus;
use Illuminate\Support\Facades\DB;

class SequenceService
{
    /**
     * Memanggil atomic PostgreSQL function next_seq('prefix')
     */
    public static function nextSeq(string $key): int
    {
        $result = DB::selectOne("SELECT next_seq(?) AS seq", [$key]);
        return (int) ($result->seq ?? 1);
    }

    public static function generatePetaniId(): string
    {
        $year = date('Y');
        $key = 'PTN-' . $year;
        // ID dari frontend (mis. petani yang dibuat offline) boleh mendahului penghitung: lewati nomor terpakai
        do {
            $id = sprintf('PTN-%s-%03d', $year, self::nextSeq($key));
        } while (\App\Models\Petani::where('petani_id', $id)->exists() || CatatanHapus::sudahDihapus('petani', $id));
        return $id;
    }

    public static function generateTransaksiId(): string
    {
        $dateStr = date('dmY');
        $key = 'TRX-' . $dateStr;
        do {
            $id = sprintf('TRX-%s-%03d', $dateStr, self::nextSeq($key));
        } while (\App\Models\TransaksiPembelian::where('transaksi_id', $id)->exists() || CatatanHapus::sudahDihapus('transaksi_pembelian', $id));
        return $id;
    }

    /** ID Surat Jalan berurutan per hari (SJ-YYYYMMDD-001); dulu 3 karakter uniqid yang bisa kembar. */
    public static function generatePengirimanId(): string
    {
        $date = date('Ymd');
        do {
            $id = sprintf('SJ-%s-%03d', $date, self::nextSeq('SJ-' . $date));
        } while (\App\Models\PengirimanBarang::where('pengiriman_id', $id)->exists() || CatatanHapus::sudahDihapus('pengiriman_barang', $id));
        return $id;
    }

    /** ID batch sample berurutan (SPL0001); dulu angka acak 4 digit yang bisa kembar dengan batch lain. */
    public static function generateBatchSampleId(): string
    {
        do {
            $id = sprintf('SPL%04d', self::nextSeq('SPL'));
        } while (\App\Models\SampleBatch::where('batch_id', $id)->exists() || CatatanHapus::sudahDihapus('sample_batch', $id));
        return $id;
    }

    public static function generateBalId(string $transaksiId, int $noBal): string
    {
        // e.g. BAL-16092026-001-01
        $suffix = substr($transaksiId, 4); // strip 'TRX-'
        return sprintf('BAL-%s-%02d', $suffix, $noBal);
    }

    public static function generateUserId(): string
    {
        // Akun awal dari seeder (USR-001) tidak lewat penghitung: lewati nomor yang sudah terpakai
        do {
            $id = sprintf('USR-%03d', self::nextSeq('USR'));
        } while (\App\Models\User::where('user_id', $id)->exists());
        return $id;
    }

    public static function generateHargaBeliId(): string
    {
        $allIds = \App\Models\TabelHarga::where('harga_id', 'like', 'HB-%')->pluck('harga_id');
        $maxNum = 0;
        foreach ($allIds as $id) {
            $numPart = substr($id, 3);
            if (is_numeric($numPart)) {
                $val = (int) $numPart;
                if ($val < 1000000 && $val > $maxNum) {
                    $maxNum = $val;
                }
            }
        }

        $nextNum = ($maxNum > 0 ? $maxNum : 70) + 1;
        return 'HB-' . $nextNum;
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use App\Models\MasterHargaJual;
use App\Models\PengirimanBarang;
use App\Models\Petani;
use App\Models\SampleBatch;
use App\Models\TabelHarga;
use App\Models\TransaksiPembelian;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Sinkron lintas perangkat.
 *
 * Setiap komputer bertanya "apa yang berubah sejak <server_time sebelumnya>" beberapa detik sekali, lalu
 * menerapkan baris yang berubah dan membuang baris yang dihapus. Server adalah satu-satunya sumber data: tidak ada
 * lagi daftar lokal yang "menang" atas data server, jadi data yang dihapus di satu komputer tidak bisa muncul lagi
 * di komputer lain, dan perubahan dari komputer lain terlihat dalam hitungan detik tanpa login ulang.
 *
 * Kelengkapan dijamin oleh trigger di schema.sql: updated_at setiap tabel ikut berubah saat baris anaknya berubah
 * (bal -> kupon & stok bal, isi batch -> batch, isi Surat Jalan -> Surat Jalan) dan setiap penghapusan tercatat di
 * sync_hapus. Jendela tumpang 30 detik menutup transaksi yang dimulai sebelum pertanyaan terakhir tetapi baru
 * selesai sesudahnya; baris yang terkirim dua kali tidak masalah karena frontend menimpa per ID.
 */
class SyncController extends Controller
{
    private const TUMPANG_DETIK = 30;

    /** entitas di jawaban => [tabel, kolom ID] */
    private const ENTITAS = [
        'petani' => ['petani', 'petani_id'],
        'transaksi' => ['transaksi_pembelian', 'transaksi_id'],
        'barang' => ['barang', 'barang_id'],
        'harga_beli' => ['tabel_harga', 'harga_id'],
        'harga_jual' => ['master_harga_jual', 'harga_jual_id'],
        'batch_sample' => ['sample_batch', 'batch_id'],
        'pengiriman' => ['pengiriman_barang', 'pengiriman_id'],
        'users' => ['users', 'user_id'],
    ];

    public function perubahan(Request $request)
    {
        // Waktu server diambil SEBELUM membaca data: perubahan yang terjadi selama pembacaan ikut terambil lagi nanti
        $waktuServer = DB::selectOne("SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS t")->t;

        $sejak = trim((string) $request->query('sejak', ''));
        if ($sejak !== '' && strtotime($sejak) === false) {
            return response()->json(['status' => 'error', 'message' => 'Parameter sejak tidak valid'], 422);
        }
        $penuh = $sejak === '';

        $saring = function (Builder $q, string $tabel) use ($penuh, $sejak): Builder {
            if (!$penuh) {
                $q->whereRaw("{$tabel}.updated_at >= (?::timestamptz - interval '" . self::TUMPANG_DETIK . " seconds')", [$sejak]);
            }
            return $q;
        };

        $data = [
            'petani' => $saring(Petani::query(), 'petani')->orderBy('nama_petani')->get(),
            'transaksi' => $saring(TransaksiPembelian::with(['petani', 'items.grade']), 'transaksi_pembelian')
                ->orderBy('created_at', 'desc')->get(),
            'barang' => $saring(Barang::with(['item', 'petani', 'gudang', 'grade']), 'barang')
                ->orderBy('created_at', 'desc')->get(),
            'harga_beli' => $saring(TabelHarga::with('grade'), 'tabel_harga')->orderBy('kode_grade')->get(),
            'harga_jual' => $saring(MasterHargaJual::query(), 'master_harga_jual')->orderBy('kode')->get(),
            'batch_sample' => $saring(SampleBatch::with(['items.barang.item', 'gudang']), 'sample_batch')
                ->orderBy('created_at', 'desc')->get(),
            'pengiriman' => $saring(PengirimanBarang::with(['items.barang.item']), 'pengiriman_barang')
                ->orderBy('tanggal_kirim', 'desc')->get(),
            'users' => $saring(User::query(), 'users')->orderBy('user_id')->get()->map(function ($u) {
                $baris = $u->toArray();
                $baris['role'] = $u->role_code;
                return $baris;
            }),
        ];

        $dihapus = [];
        if (!$penuh) {
            $baris = DB::table('sync_hapus')
                ->whereRaw("dihapus_pada >= (?::timestamptz - interval '" . self::TUMPANG_DETIK . " seconds')", [$sejak])
                ->get(['entitas', 'record_id']);
            foreach (self::ENTITAS as $nama => [$tabel, $kolom]) {
                $id = $baris->where('entitas', $tabel)->pluck('record_id')->map(fn ($v) => (string) $v)->values();
                if ($id->isEmpty()) {
                    continue;
                }
                // ID yang ternyata ada lagi (mis. kode harga jual diganti lewat baris sementara) bukan penghapusan
                $masihAda = DB::table($tabel)->whereIn($kolom, $id)->pluck($kolom)->map(fn ($v) => (string) $v);
                $hapus = $id->diff($masihAda)->values();
                if ($hapus->isNotEmpty()) {
                    $dihapus[$nama] = $hapus;
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'penuh' => $penuh,
            'server_time' => $waktuServer,
            'data' => $data,
            'dihapus' => (object) $dihapus,
        ]);
    }
}

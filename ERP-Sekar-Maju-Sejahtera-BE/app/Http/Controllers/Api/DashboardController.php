<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Ringkasan dashboard — rumus diselaraskan dengan FE:
     * - Pembelian: hanya kupon lunas/cash, modal murni = SUM(berat_kg * harga_per_kg)
     * - Pengiriman: semua DO (nilai deal); FE kartu penjualan tetap filter status terkirim
     */
    public function stats()
    {
        try {
            $transaksiSummary = DB::selectOne("
                SELECT
                    COUNT(DISTINCT t.transaksi_id) AS total_transaksi,
                    COUNT(i.item_id) AS total_bal,
                    COALESCE(SUM(i.berat_kg), 0) AS total_berat_kg,
                    COALESCE(SUM(COALESCE(i.berat_kg, 0) * COALESCE(i.harga_per_kg, 0)), 0) AS total_pembelian
                FROM transaksi_pembelian t
                LEFT JOIN transaksi_item_bal i ON i.transaksi_id = t.transaksi_id
                WHERE COALESCE(t.status_pembayaran::text, '') = 'lunas'
                   OR COALESCE(t.metode_pembayaran::text, '') = 'cash'
            ");

            $stokValuasi = DB::select("
                SELECT
                    b.gudang_id,
                    b.kode_grade,
                    COUNT(*) FILTER (WHERE b.status_stok IN ('di_gudang', 'siap_kirim', 'terkirim_sample')) AS bal_di_gudang,
                    COALESCE(SUM(i.berat_kg) FILTER (WHERE b.status_stok IN ('di_gudang', 'siap_kirim', 'terkirim_sample')), 0) AS kg_di_gudang,
                    COALESCE(SUM(COALESCE(i.berat_kg, 0) * COALESCE(i.harga_per_kg, 0))
                        FILTER (WHERE b.status_stok IN ('di_gudang', 'siap_kirim', 'terkirim_sample')), 0) AS valuasi_beli
                FROM barang b
                LEFT JOIN transaksi_item_bal i ON i.item_id = b.transaksi_item_id
                GROUP BY b.gudang_id, b.kode_grade
            ");

            // Nilai semua DO (termasuk dimuat) — untuk transparansi vs kartu FE yang hanya status terkirim
            $pengirimanSummary = DB::selectOne("
                SELECT
                    COUNT(DISTINCT pb.pengiriman_id) AS total_pengiriman,
                    COUNT(pbi.barang_id) AS total_bal_terkirim,
                    COALESCE(SUM(i.berat_kg), 0) AS total_berat_terkirim,
                    COALESCE(SUM(COALESCE(pbi.harga_deal_per_kg, 0) * COALESCE(i.berat_kg, 0)), 0) AS total_nilai_deal
                FROM pengiriman_barang pb
                LEFT JOIN pengiriman_barang_item pbi ON pbi.pengiriman_id = pb.pengiriman_id
                LEFT JOIN barang b ON b.barang_id = pbi.barang_id
                LEFT JOIN transaksi_item_bal i ON i.item_id = b.transaksi_item_id
            ");

            $pengirimanTerkirim = DB::selectOne("
                SELECT
                    COUNT(DISTINCT pb.pengiriman_id) AS total_pengiriman,
                    COUNT(pbi.barang_id) AS total_bal_terkirim,
                    COALESCE(SUM(i.berat_kg), 0) AS total_berat_terkirim,
                    COALESCE(SUM(COALESCE(pbi.harga_deal_per_kg, 0) * COALESCE(i.berat_kg, 0)), 0) AS total_nilai_deal
                FROM pengiriman_barang pb
                LEFT JOIN pengiriman_barang_item pbi ON pbi.pengiriman_id = pb.pengiriman_id
                LEFT JOIN barang b ON b.barang_id = pbi.barang_id
                LEFT JOIN transaksi_item_bal i ON i.item_id = b.transaksi_item_id
                WHERE pb.status IN ('dikirim', 'dalam_perjalanan', 'diterima', 'selesai')
            ");

            return response()->json([
                'status' => 'success',
                'data' => [
                    'transaksi' => $transaksiSummary,
                    'stok_valuasi' => $stokValuasi,
                    'pengiriman' => $pengirimanSummary,
                    'pengiriman_terkirim' => $pengirimanTerkirim,
                ],
                'source' => 'aligned_fe_rules',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'warning',
                'message' => 'Dashboard stats belum tersedia: ' . $e->getMessage(),
                'data' => null,
            ]);
        }
    }
}

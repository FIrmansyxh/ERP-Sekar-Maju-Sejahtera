<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Alur CRUD lintas perangkat terhadap PostgreSQL sungguhan (database uji, lihat phpunit.xml). Setiap tes
 * dijalankan di dalam transaksi yang dibatalkan di akhir, jadi datanya tidak tertinggal.
 */
class SinkronRelasiTest extends TestCase
{
    use DatabaseTransactions;

    private const API = '/api/v1';

    protected function setUp(): void
    {
        parent::setUp();
        $user = User::updateOrCreate(['user_id' => 'USR-UJI'], [
            'username' => 'penguji_sinkron',
            'password_hash' => Hash::make('rahasia123'),
            'nama_lengkap' => 'Penguji Sinkron',
            'role_code' => 'superadmin',
            'unit_penugasan' => 'Gudang Uji',
            'status_aktif' => true,
            'dibuat_pada' => now(),
        ]);
        Sanctum::actingAs($user);
    }

    private function buatPetani(string $nama = 'Petani Uji'): string
    {
        $res = $this->postJson(self::API . '/petani', ['nama_petani' => $nama]);
        $res->assertStatus(201);
        return $res->json('data.petani_id');
    }

    private function buatKupon(string $petaniId, string $trxId, string $noKupon, array $noBal): array
    {
        $res = $this->postJson(self::API . '/transaksi/sortir', [
            'transaksi_id' => $trxId,
            'no_kupon' => $noKupon,
            'petani_id' => $petaniId,
            'items' => array_map(fn ($n) => ['no_bal' => $n, 'barcode' => $n, 'kode_grade' => '40', 'harga_per_kg' => 40000], $noBal),
        ]);
        $res->assertStatus(201);
        return $res->json('data');
    }

    private function timbang(string $trxId, string $noBal, float $bruto, float $netto, int $cap): \Illuminate\Testing\TestResponse
    {
        return $this->patchJson(self::API . "/transaksi/{$trxId}/bal/{$noBal}", [
            'perubahan' => ['berat_bruto_kg' => $bruto, 'potongan_tara_kg' => $bruto - $netto, 'berat_kg' => $netto],
            'timbang_diubah_pada' => $cap,
        ]);
    }

    private function balDiKupon(array $kupon): array
    {
        return collect($kupon['items'])->mapWithKeys(fn ($i) => [$i['no_bal'] => $i])->all();
    }

    public function test_perubahan_per_bal_tidak_menimpa_bal_lain_dan_hapus_tidak_bangkit(): void
    {
        $petani = $this->buatPetani();
        $this->buatKupon($petani, 'TRX-UJI-001-AAAA', 'KUPUJI1', ['UJA1', 'UJA2']);

        // Komputer A menambah bal, komputer B menimbang bal lain: keduanya tersimpan
        $this->postJson(self::API . '/transaksi/TRX-UJI-001-AAAA/bal', [
            'items' => [['no_bal' => 'UJA3', 'barcode' => 'UJA3', 'kode_grade' => '45', 'harga_per_kg' => 45000]],
        ])->assertOk();
        $this->timbang('TRX-UJI-001-AAAA', 'UJA1', 52, 47, 1000)->assertOk();

        // Ganti tikar bal 2 dari komputer lain
        $res = $this->patchJson(self::API . '/transaksi/TRX-UJI-001-AAAA/bal/UJA2', [
            'perubahan' => ['ganti_tikar' => true],
            'ganti_tikar_diubah_pada' => 2000,
        ])->assertOk();
        $bal = $this->balDiKupon($res->json('data'));
        $this->assertCount(3, $bal);
        $this->assertEquals(47, (float) $bal['UJA1']['berat_kg']);
        $this->assertTrue((bool) $bal['UJA2']['ganti_tikar']);
        $this->assertEquals(75000, (float) $bal['UJA2']['potongan_tikar']);
        $this->assertEquals('45', $bal['UJA3']['kode_grade']);

        // Timbangan lama (cap waktu lebih tua) dari komputer yang sempat offline tidak menimpa timbangan baru
        $res = $this->timbang('TRX-UJI-001-AAAA', 'UJA1', 60, 55, 500)->assertOk();
        $this->assertEquals(47, (float) $this->balDiKupon($res->json('data'))['UJA1']['berat_kg']);

        // Hapus bal: hilang, dan hapus ulang (dikirim ulang) tetap berhasil
        $this->deleteJson(self::API . '/transaksi/TRX-UJI-001-AAAA/bal/UJA3')->assertOk();
        $res = $this->deleteJson(self::API . '/transaksi/TRX-UJI-001-AAAA/bal/UJA3')->assertOk();
        $this->assertArrayNotHasKey('UJA3', $this->balDiKupon($res->json('data')));

        // Perubahan untuk bal yang sudah dihapus ditolak, bal TIDAK dibuat ulang
        $this->timbang('TRX-UJI-001-AAAA', 'UJA3', 50, 45, 3000)->assertStatus(404);
        $res = $this->getJson(self::API . '/transaksi/TRX-UJI-001-AAAA')->assertOk();
        $this->assertArrayNotHasKey('UJA3', $this->balDiKupon($res->json('data')));
    }

    public function test_no_bal_unik_di_seluruh_gudang(): void
    {
        $petani = $this->buatPetani();
        $this->buatKupon($petani, 'TRX-UJI-002-AAAA', 'KUPUJI2', ['UJB1']);
        $this->buatKupon($petani, 'TRX-UJI-003-AAAA', 'KUPUJI3', ['UJC1']);
        $this->postJson(self::API . '/transaksi/TRX-UJI-003-AAAA/bal', [
            'items' => [['no_bal' => 'ujb1', 'kode_grade' => '40', 'harga_per_kg' => 40000]],
        ])->assertStatus(422);
        $this->patchJson(self::API . '/transaksi/TRX-UJI-003-AAAA/bal/UJC1', [
            'perubahan' => ['no_bal' => 'UJB1'],
        ])->assertStatus(422);
    }

    public function test_tahap_bayar_dan_kunci_setelah_lunas(): void
    {
        $petani = $this->buatPetani();
        $this->buatKupon($petani, 'TRX-UJI-004-AAAA', 'KUPUJI4', ['UJD1', 'UJD2']);

        // Sortir belum ditutup: belum boleh dibayar
        $this->putJson(self::API . '/transaksi/TRX-UJI-004-AAAA/bayar', ['metode_pembayaran' => 'cash'])->assertStatus(422);

        $res = $this->patchJson(self::API . '/transaksi/TRX-UJI-004-AAAA', ['status_tahap' => 'menunggu_timbang'])->assertOk();
        $this->assertEquals('menunggu_timbang', $res->json('data.status_tahap'));

        // Masih ada bal belum ditimbang
        $this->timbang('TRX-UJI-004-AAAA', 'UJD1', 40, 36, 1000)->assertOk();
        $this->putJson(self::API . '/transaksi/TRX-UJI-004-AAAA/bayar', ['metode_pembayaran' => 'cash'])->assertStatus(422);

        $res = $this->timbang('TRX-UJI-004-AAAA', 'UJD2', 41, 37, 1000)->assertOk();
        $this->assertEquals('lengkap', $res->json('data.status_tahap'));

        $res = $this->putJson(self::API . '/transaksi/TRX-UJI-004-AAAA/bayar', ['metode_pembayaran' => 'cash'])->assertOk();
        $this->assertEquals('lunas', $res->json('data.status_pembayaran'));
        $this->assertEquals(2, DB::table('barang')->where('transaksi_id', 'TRX-UJI-004-AAAA')->count());

        // Pelunasan dikirim ulang: tetap berhasil, stok tidak dobel
        $this->putJson(self::API . '/transaksi/TRX-UJI-004-AAAA/bayar', ['metode_pembayaran' => 'cash'])->assertOk();
        $this->assertEquals(2, DB::table('barang')->where('transaksi_id', 'TRX-UJI-004-AAAA')->count());

        // Kupon lunas terkunci
        $this->postJson(self::API . '/transaksi/TRX-UJI-004-AAAA/bal', [
            'items' => [['no_bal' => 'UJD3', 'kode_grade' => '40', 'harga_per_kg' => 40000]],
        ])->assertStatus(422);
        $this->deleteJson(self::API . '/transaksi/TRX-UJI-004-AAAA/bal/UJD1')->assertStatus(422);
    }

    public function test_bal_susulan_membuka_lagi_tahap_timbang(): void
    {
        $petani = $this->buatPetani();
        $this->buatKupon($petani, 'TRX-UJI-005-AAAA', 'KUPUJI5', ['UJE1']);
        $this->patchJson(self::API . '/transaksi/TRX-UJI-005-AAAA', ['status_tahap' => 'menunggu_timbang'])->assertOk();
        $res = $this->timbang('TRX-UJI-005-AAAA', 'UJE1', 40, 36, 1000)->assertOk();
        $this->assertEquals('lengkap', $res->json('data.status_tahap'));

        $res = $this->postJson(self::API . '/transaksi/TRX-UJI-005-AAAA/bal', [
            'items' => [['no_bal' => 'UJE2', 'kode_grade' => '40', 'harga_per_kg' => 40000]],
        ])->assertOk();
        $this->assertEquals('menunggu_timbang', $res->json('data.status_tahap'));

        // Tambah bal yang sama dikirim ulang: tidak dobel
        $res = $this->postJson(self::API . '/transaksi/TRX-UJI-005-AAAA/bal', [
            'items' => [['no_bal' => 'UJE2', 'kode_grade' => '40', 'harga_per_kg' => 40000]],
        ])->assertOk();
        $this->assertCount(2, $res->json('data.items'));
    }

    public function test_membuka_lagi_kupon_lengkap_yang_nomornya_dipakai_kupon_aktif_lain_ditolak_jelas(): void
    {
        $petani = $this->buatPetani();
        $this->buatKupon($petani, 'TRX-UJI-010-AAAA', 'KUPUJI10', ['UJJ1']);
        $this->patchJson(self::API . '/transaksi/TRX-UJI-010-AAAA', ['status_tahap' => 'menunggu_timbang'])->assertOk();
        $this->timbang('TRX-UJI-010-AAAA', 'UJJ1', 40, 36, 1000)->assertOk();
        // Nomor kupon yang sama dipakai lagi untuk kupon baru (boleh, kupon pertama sudah lengkap)
        $this->buatKupon($petani, 'TRX-UJI-011-AAAA', 'KUPUJI10', ['UJK1']);

        $this->postJson(self::API . '/transaksi/TRX-UJI-010-AAAA/bal', [
            'items' => [['no_bal' => 'UJJ2', 'kode_grade' => '40', 'harga_per_kg' => 40000]],
        ])->assertStatus(422)->assertJsonFragment(['message' => 'No. kupon KUPUJI10 sedang dipakai kupon lain yang belum selesai; kupon ini tidak bisa dibuka lagi.']);
        $this->assertFalse(DB::table('transaksi_item_bal')->where('no_bal', 'UJJ2')->exists());
    }

    public function test_kupon_terhapus_tidak_bisa_dibuat_ulang_perangkat_lain(): void
    {
        $petani = $this->buatPetani();
        $this->buatKupon($petani, 'TRX-UJI-006-AAAA', 'KUPUJI6', ['UJF1']);
        $this->deleteJson(self::API . '/transaksi/TRX-UJI-006-AAAA?alasan=salah+input')->assertOk();

        $this->postJson(self::API . '/transaksi/TRX-UJI-006-AAAA/bal', [
            'items' => [['no_bal' => 'UJF2', 'kode_grade' => '40', 'harga_per_kg' => 40000]],
        ])->assertStatus(410);
        $this->timbang('TRX-UJI-006-AAAA', 'UJF1', 40, 36, 1000)->assertStatus(410);
        $this->postJson(self::API . '/transaksi/sortir', [
            'transaksi_id' => 'TRX-UJI-006-AAAA',
            'no_kupon' => 'KUPUJI6',
            'petani_id' => $petani,
            'items' => [['no_bal' => 'UJF1', 'kode_grade' => '40', 'harga_per_kg' => 40000]],
        ])->assertStatus(410);
        $this->assertFalse(DB::table('transaksi_pembelian')->where('transaksi_id', 'TRX-UJI-006-AAAA')->exists());
    }

    public function test_sinkron_inkremental_memuat_perubahan_dan_penghapusan(): void
    {
        $petani = $this->buatPetani('Petani Sinkron');
        $this->buatKupon($petani, 'TRX-UJI-007-AAAA', 'KUPUJI7', ['UJG1']);
        $this->buatKupon($petani, 'TRX-UJI-008-AAAA', 'KUPUJI8', ['UJH1']);

        $penuh = $this->getJson(self::API . '/sync/perubahan')->assertOk();
        $this->assertTrue($penuh->json('penuh'));
        $idKupon = collect($penuh->json('data.transaksi'))->pluck('transaksi_id');
        $this->assertTrue($idKupon->contains('TRX-UJI-007-AAAA'));
        $this->assertTrue(collect($penuh->json('data.petani'))->pluck('petani_id')->contains($petani));
        $kursor = $penuh->json('server_time');
        $this->assertNotEmpty($kursor);

        $this->timbang('TRX-UJI-007-AAAA', 'UJG1', 40, 36, 1000)->assertOk();
        $this->deleteJson(self::API . '/transaksi/TRX-UJI-008-AAAA')->assertOk();

        $res = $this->getJson(self::API . '/sync/perubahan?sejak=' . urlencode($kursor))->assertOk();
        $this->assertFalse($res->json('penuh'));
        $kupon = collect($res->json('data.transaksi'))->firstWhere('transaksi_id', 'TRX-UJI-007-AAAA');
        $this->assertNotNull($kupon, 'kupon yang balnya ditimbang harus ikut di perubahan');
        $this->assertEquals(36, (float) $kupon['items'][0]['berat_kg']);
        $this->assertContains('TRX-UJI-008-AAAA', $res->json('dihapus.transaksi'));

        // Baris lama yang tidak berubah tidak dikirim ulang (trigger waktu dimatikan sementara agar bisa ditanam
        // baris "kemarin"; dibatalkan bersama transaksi tes)
        DB::statement('ALTER TABLE petani DISABLE TRIGGER trg_petani_waktu_buat');
        DB::table('petani')->insert([
            'petani_id' => 'PTN-LAMA-01', 'nama_petani' => 'Petani Lama', 'alamat' => '', 'status_aktif' => true,
            'tanggal_daftar' => '2020-01-01', 'created_at' => now()->subDay(), 'updated_at' => now()->subDay(),
        ]);
        $res = $this->getJson(self::API . '/sync/perubahan?sejak=' . urlencode($kursor))->assertOk();
        $this->assertNotContains('PTN-LAMA-01', collect($res->json('data.petani'))->pluck('petani_id')->all());

        $this->getJson(self::API . '/sync/perubahan?sejak=bukan-tanggal')->assertStatus(422);
    }

    public function test_surat_jalan_menyamakan_batch_sample_di_server(): void
    {
        $petani = $this->buatPetani();
        $this->buatKupon($petani, 'TRX-UJI-009-AAAA', 'KUPUJI9', ['UJI1', 'UJI2']);
        $this->patchJson(self::API . '/transaksi/TRX-UJI-009-AAAA', ['status_tahap' => 'menunggu_timbang'])->assertOk();
        $this->timbang('TRX-UJI-009-AAAA', 'UJI1', 40, 36, 1000)->assertOk();
        $this->timbang('TRX-UJI-009-AAAA', 'UJI2', 42, 38, 1000)->assertOk();
        $this->putJson(self::API . '/transaksi/TRX-UJI-009-AAAA/bayar', ['metode_pembayaran' => 'cash'])->assertOk();
        $barang = DB::table('barang')->where('transaksi_id', 'TRX-UJI-009-AAAA')->orderBy('barang_id')->pluck('barang_id')->all();
        $this->assertCount(2, $barang);

        $batch = $this->postJson(self::API . '/sample-batch', [
            'batch_id' => 'SPLUJI01',
            'kode_batch' => 'SMPUJI01',
            'tujuan_buyer' => 'Pabrik Uji',
            'tanggal_kirim' => '2026-09-24',
            'status' => 'sample',
            'items' => array_map(fn ($b) => ['barang_id' => $b, 'harga_tawaran_kg' => 50000], $barang),
        ])->assertStatus(201);
        $this->assertEquals('SPLUJI01', $batch->json('data.batch_id'));

        $sj = $this->postJson(self::API . '/pengiriman', [
            'pengiriman_id' => 'SJUJI01',
            'no_surat_jalan' => 'SJ-UJI-01',
            'tujuan' => 'Pabrik Uji',
            'driver_nama' => 'Sopir',
            'plat_nomor' => 'M 1 UJ',
            'tanggal_kirim' => '2026-09-24',
            'batch_sample_id_ref' => 'SPLUJI01',
            'items' => array_map(fn ($b) => ['barang_id' => $b, 'harga_deal_per_kg' => 50000], $barang),
        ])->assertStatus(201);
        $this->assertEquals('SJUJI01', $sj->json('data.pengiriman_id'));

        $flag = DB::table('sample_batch_item')->where('batch_id', 'SPLUJI01')->pluck('sudah_dikirim_do')->all();
        $this->assertEquals([true, true], array_map('boolval', $flag));
        $this->assertEquals('selesai', DB::table('sample_batch')->where('batch_id', 'SPLUJI01')->value('status'));

        // Satu bal dikeluarkan dari muatan: tandanya ikut hilang, batch terbuka lagi
        $this->putJson(self::API . '/pengiriman/SJUJI01', [
            'no_surat_jalan' => 'SJ-UJI-01',
            'tujuan' => 'Pabrik Uji',
            'driver_nama' => 'Sopir',
            'plat_nomor' => 'M 1 UJ',
            'tanggal_kirim' => '2026-09-24',
            'items' => [['barang_id' => $barang[0], 'harga_deal_per_kg' => 50000]],
        ])->assertOk();
        $this->assertFalse((bool) DB::table('sample_batch_item')->where('barang_id', $barang[1])->value('sudah_dikirim_do'));
        $this->assertEquals('diproses', DB::table('sample_batch')->where('batch_id', 'SPLUJI01')->value('status'));

        // Surat Jalan dibatalkan: semua tanda hilang, penghapusan tercatat untuk komputer lain, tidak bisa dibuat ulang
        $this->deleteJson(self::API . '/pengiriman/SJUJI01')->assertOk();
        $this->assertEquals(0, DB::table('sample_batch_item')->where('batch_id', 'SPLUJI01')->where('sudah_dikirim_do', true)->count());
        $this->assertTrue(DB::table('sync_hapus')->where('entitas', 'pengiriman_barang')->where('record_id', 'SJUJI01')->exists());
        $this->putJson(self::API . '/pengiriman/SJUJI01', [
            'no_surat_jalan' => 'SJ-UJI-01', 'tujuan' => 'x', 'driver_nama' => 'x', 'plat_nomor' => 'x', 'tanggal_kirim' => '2026-09-24',
            'items' => [['barang_id' => $barang[0]]],
        ])->assertStatus(410);

        // Batch dihapus: tidak bisa diubah lagi dari komputer lain
        $this->deleteJson(self::API . '/sample-batch/SPLUJI01')->assertOk();
        $this->putJson(self::API . '/sample-batch/SPLUJI01', ['tujuan_buyer' => 'x'])->assertStatus(410);
    }

    public function test_simpanan_dari_versi_lama_ditolak_409(): void
    {
        $petani = $this->buatPetani();
        $this->buatKupon($petani, 'TRX-UJI-013-AAAA', 'KUPUJI13', ['UJM1', 'UJM2']);
        $this->patchJson(self::API . '/transaksi/TRX-UJI-013-AAAA', ['status_tahap' => 'menunggu_timbang'])->assertOk();
        $this->timbang('TRX-UJI-013-AAAA', 'UJM1', 40, 36, 1000)->assertOk();
        $this->timbang('TRX-UJI-013-AAAA', 'UJM2', 42, 38, 1000)->assertOk();
        $this->putJson(self::API . '/transaksi/TRX-UJI-013-AAAA/bayar', ['metode_pembayaran' => 'cash'])->assertOk();
        $barang = DB::table('barang')->where('transaksi_id', 'TRX-UJI-013-AAAA')->orderBy('barang_id')->pluck('barang_id')->all();

        $versi = $this->postJson(self::API . '/sample-batch', [
            'batch_id' => 'SPLUJI02', 'kode_batch' => 'SMPUJI02', 'tujuan_buyer' => 'Pabrik Uji', 'tanggal_kirim' => '2026-09-24',
            'items' => [['barang_id' => $barang[0], 'harga_tawaran_kg' => 50000]],
        ])->assertStatus(201)->json('data.versi');

        // Komputer B menyimpan lebih dulu (versi naik); komputer A masih memegang versi lama: ditolak, simpanan B utuh
        $versiB = $this->putJson(self::API . '/sample-batch/SPLUJI02', ['versi' => $versi, 'catatan' => 'dari B'])->assertOk()->json('data.versi');
        $this->assertGreaterThan($versi, $versiB);
        $this->putJson(self::API . '/sample-batch/SPLUJI02', ['versi' => $versi, 'catatan' => 'dari A'])->assertStatus(409);
        $this->assertEquals('dari B', DB::table('sample_batch')->where('batch_id', 'SPLUJI02')->value('catatan'));

        // Surat Jalan dari komputer lain mengubah isi batch (tanda DO): versi batch ikut naik
        $sj = ['no_surat_jalan' => 'SJ-UJI-02', 'tujuan' => 'Pabrik Uji', 'driver_nama' => 'Sopir', 'plat_nomor' => 'M 1 UJ',
            'tanggal_kirim' => '2026-09-24', 'items' => [['barang_id' => $barang[0], 'harga_deal_per_kg' => 50000]]];
        $versiSj = $this->postJson(self::API . '/pengiriman', $sj + ['pengiriman_id' => 'SJUJI02', 'batch_sample_id_ref' => 'SPLUJI02'])
            ->assertStatus(201)->json('data.versi');
        $this->putJson(self::API . '/sample-batch/SPLUJI02', ['versi' => $versiB, 'catatan' => 'basi'])->assertStatus(409);

        // Surat Jalan: sama; tanpa versi (klien lama) tetap diterima
        $this->putJson(self::API . '/pengiriman/SJUJI02', $sj + ['versi' => $versiSj, 'catatan' => 'dari B'])->assertOk();
        $this->putJson(self::API . '/pengiriman/SJUJI02', $sj + ['versi' => $versiSj, 'catatan' => 'dari A'])->assertStatus(409);
        $this->assertEquals('dari B', DB::table('pengiriman_barang')->where('pengiriman_id', 'SJUJI02')->value('catatan'));
        $this->putJson(self::API . '/pengiriman/SJUJI02', $sj + ['catatan' => 'klien lama'])->assertOk();
    }

    public function test_akun_nonaktif_kehilangan_token(): void
    {
        $lain = User::updateOrCreate(['user_id' => 'USR-UJI2'], [
            'username' => 'penguji_dua',
            'password_hash' => Hash::make('rahasia123'),
            'nama_lengkap' => 'Penguji Dua',
            'role_code' => 'admin_sortir',
            'unit_penugasan' => 'Gudang Uji',
            'status_aktif' => true,
            'dibuat_pada' => now(),
        ]);
        $lain->createToken('uji');
        $this->assertEquals(1, $lain->tokens()->count());
        $this->putJson(self::API . '/users/USR-UJI2/status', ['status_aktif' => false])->assertOk();
        $this->assertEquals(0, $lain->tokens()->count());
    }
}

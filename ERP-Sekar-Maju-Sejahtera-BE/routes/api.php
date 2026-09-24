<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PetaniController;
use App\Http\Controllers\Api\MasterDataController;
use App\Http\Controllers\Api\TransaksiController;
use App\Http\Controllers\Api\BarangController;
use App\Http\Controllers\Api\SampleController;
use App\Http\Controllers\Api\PengirimanController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SyncController;

Route::prefix('v1')->group(function () {

    // Health check
    Route::get('/health', function () {
        return response()->json([
            'status' => 'ok',
            'system' => 'ERP Sekar Maju Sejahtera Backend API',
            'version' => '1.0.0',
            'time' => now()->toIso8601String()
        ]);
    });

    // Login: satu-satunya jalan mendapatkan token, jadi harus publik.
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

    // Semua endpoint lain (data petani, kupon, harga, bal, pengguna, pengiriman, dashboard) wajib token
    // Sanctum yang sah. Sebelumnya hanya /auth/me dan /auth/logout yang terlindungi.
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Master Data
        Route::get('/master/grades', [MasterDataController::class, 'grades']);
        Route::get('/master/harga-beli', [MasterDataController::class, 'tabelHarga']);
        Route::get('/master/harga-jual', [MasterDataController::class, 'hargaJual']);
        Route::get('/master/gudang', [MasterDataController::class, 'gudang']);
        Route::get('/master/roles', [MasterDataController::class, 'roles']);
        Route::get('/master/modules', [MasterDataController::class, 'modules']);
        Route::post('/master/harga-beli', [MasterDataController::class, 'storeHarga']);
        Route::post('/master/harga-jual', [MasterDataController::class, 'storeHargaJual']);

        // Petani CRUD
        Route::apiResource('petani', PetaniController::class);
        Route::put('/petani/{id}/ganti-id', [PetaniController::class, 'gantiId']);

        // Users Management
        Route::apiResource('users', UserController::class);
        Route::put('/users/{id}/status', [UserController::class, 'toggleStatus']);
        Route::put('/users/{id}/reset-password', [UserController::class, 'resetPassword']);

        // Transaksi Pembelian Alur: Sortir -> Timbang -> Kasir
        Route::get('/transaksi', [TransaksiController::class, 'index']);
        Route::get('/transaksi/{id}', [TransaksiController::class, 'show']);
        Route::post('/transaksi/sortir', [TransaksiController::class, 'storeSortir']);
        Route::put('/transaksi/{id}/sortir-items', [TransaksiController::class, 'updateSortirItems']);
        Route::put('/transaksi/{id}/timbang', [TransaksiController::class, 'updateTimbang']);
        Route::put('/transaksi/{id}/bayar', [TransaksiController::class, 'bayar']);
        Route::put('/transaksi/{id}/koreksi', [TransaksiController::class, 'koreksi']);
        Route::delete('/transaksi/{id}', [TransaksiController::class, 'destroy']);
        // Perubahan per bal: hanya bal yang diubah yang dikirim, bal lain di kupon tidak pernah ditimpa
        Route::patch('/transaksi/{id}', [TransaksiController::class, 'ubahKupon']);
        Route::post('/transaksi/{id}/bal', [TransaksiController::class, 'tambahBal']);
        Route::patch('/transaksi/{id}/bal/{noBal}', [TransaksiController::class, 'ubahBal']);
        Route::delete('/transaksi/{id}/bal/{noBal}', [TransaksiController::class, 'hapusBal']);

        // Inventaris Gudang / Bal
        Route::get('/barang', [BarangController::class, 'index']);
        Route::put('/barang/{id}/status', [BarangController::class, 'updateStatus']);

        // Sample Management
        Route::get('/sample-batch', [SampleController::class, 'indexBatch']);
        Route::post('/sample-batch', [SampleController::class, 'storeBatch']);
        Route::put('/sample-batch/{id}', [SampleController::class, 'updateBatch']);
        Route::delete('/sample-batch/{id}', [SampleController::class, 'destroyBatch']);

        // Pengiriman / DO
        Route::get('/pengiriman', [PengirimanController::class, 'index']);
        Route::post('/pengiriman', [PengirimanController::class, 'store']);
        Route::put('/pengiriman/{id}', [PengirimanController::class, 'update']);
        Route::delete('/pengiriman/{id}', [PengirimanController::class, 'destroy']);
        Route::put('/pengiriman/{id}/status', [PengirimanController::class, 'updateStatus']);

        // Sinkron lintas perangkat: perubahan & penghapusan sejak waktu tertentu (tanpa `sejak` = semua data)
        Route::get('/sync/perubahan', [SyncController::class, 'perubahan']);

        // Dashboard & Analytic Views
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    });
});

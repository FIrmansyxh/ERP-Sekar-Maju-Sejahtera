const fs = require('fs');
const path = require('path');

const beRoot = path.resolve(__dirname, '../../ERP-Sekar-Maju-Sejahtera-BE');
const controllersDir = path.join(beRoot, 'app/Http/Controllers/Api');
const routesDir = path.join(beRoot, 'routes');

fs.mkdirSync(controllersDir, { recursive: true });

// -------------------------------------------------------------
// CONTROLLERS
// -------------------------------------------------------------

// AuthController.php
fs.writeFileSync(path.join(controllersDir, 'AuthController.php'), `<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\User;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::with(['role.capabilities', 'role.modules'])
            ->where('username', $request->username)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Username atau password tidak sesuai.'
            ], 401);
        }

        if (!$user->status_aktif) {
            return response()->json([
                'status' => 'error',
                'message' => 'Akun pengguna ini nonaktif. Hubungi Super Admin.'
            ], 403);
        }

        $user->terakhir_login = now();
        $user->save();

        $token = $user->createToken('erp-auth-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login berhasil',
            'data' => [
                'token' => $token,
                'user' => [
                    'user_id' => $user->user_id,
                    'username' => $user->username,
                    'nama_lengkap' => $user->nama_lengkap,
                    'role' => $user->role_code,
                    'email' => $user->email,
                    'no_hp' => $user->no_hp,
                    'unit_penugasan' => $user->unit_penugasan,
                    'status_aktif' => $user->status_aktif,
                    'terakhir_login' => $user->terakhir_login,
                    'dibuat_pada' => $user->dibuat_pada,
                    'capabilities' => $user->role->capabilities ?? null,
                    'modules' => $user->role->modules->pluck('module_id') ?? [],
                ]
            ]
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load(['role.capabilities', 'role.modules']);

        return response()->json([
            'status' => 'success',
            'data' => [
                'user_id' => $user->user_id,
                'username' => $user->username,
                'nama_lengkap' => $user->nama_lengkap,
                'role' => $user->role_code,
                'email' => $user->email,
                'no_hp' => $user->no_hp,
                'unit_penugasan' => $user->unit_penugasan,
                'status_aktif' => $user->status_aktif,
                'terakhir_login' => $user->terakhir_login,
                'dibuat_pada' => $user->dibuat_pada,
                'capabilities' => $user->role->capabilities ?? null,
                'modules' => $user->role->modules->pluck('module_id') ?? [],
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Berhasil logout'
        ]);
    }
}
`);

// PetaniController.php
fs.writeFileSync(path.join(controllersDir, 'PetaniController.php'), `<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\Petani;
use App\\Services\\SequenceService;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;

class PetaniController extends Controller
{
    public function index(Request $request)
    {
        $query = Petani::query();

        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nama_petani', 'ILIKE', "%{$search}%")
                  ->orWhere('petani_id', 'ILIKE', "%{$search}%")
                  ->orWhere('no_hp', 'ILIKE', "%{$search}%")
                  ->orWhere('desa_kecamatan', 'ILIKE', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $status = filter_var($request->status, FILTER_VALIDATE_BOOLEAN);
            $query->where('status_aktif', $status);
        }

        $petani = $query->orderBy('nama_petani', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $petani
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama_petani' => 'required|string|max:120',
            'alamat' => 'required|string',
            'no_hp' => 'nullable|string|max:20',
            'desa_kecamatan' => 'nullable|string|max:120',
            'catatan' => 'nullable|string',
        ]);

        $petaniId = SequenceService::generatePetaniId();

        $petani = Petani::create([
            'petani_id' => $petaniId,
            'nama_petani' => $request->nama_petani,
            'alamat' => $request->alamat,
            'no_hp' => $request->no_hp,
            'desa_kecamatan' => $request->desa_kecamatan,
            'status_aktif' => true,
            'tanggal_daftar' => $request->tanggal_daftar ?? date('Y-m-d'),
            'catatan' => $request->catatan,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Petani berhasil didaftarkan',
            'data' => $petani
        ], 201);
    }

    public function show($id)
    {
        $petani = Petani::with(['transaksi', 'barang'])->where('petani_id', $id)->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $petani
        ]);
    }

    public function update(Request $request, $id)
    {
        $petani = Petani::where('petani_id', $id)->firstOrFail();

        $request->validate([
            'nama_petani' => 'sometimes|required|string|max:120',
            'alamat' => 'sometimes|required|string',
            'no_hp' => 'nullable|string|max:20',
            'desa_kecamatan' => 'nullable|string|max:120',
            'status_aktif' => 'sometimes|boolean',
            'alasan_nonaktif' => 'nullable|string',
            'catatan' => 'nullable|string',
        ]);

        $petani->update($request->only([
            'nama_petani',
            'alamat',
            'no_hp',
            'desa_kecamatan',
            'status_aktif',
            'alasan_nonaktif',
            'catatan',
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Data petani berhasil diperbarui',
            'data' => $petani
        ]);
    }

    public function destroy($id)
    {
        $petani = Petani::where('petani_id', $id)->firstOrFail();
        $petani->status_aktif = false;
        $petani->alasan_nonaktif = 'Dinonaktifkan oleh pengguna';
        $petani->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Petani dinonaktifkan'
        ]);
    }
}
`);

// MasterDataController.php
fs.writeFileSync(path.join(controllersDir, 'MasterDataController.php'), `<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\GradeMaster;
use App\\Models\\TabelHarga;
use App\\Models\\MasterHargaJual;
use App\\Models\\Gudang;
use App\\Models\\Role;
use App\\Models\\Module;
use Illuminate\\Http\\Request;

class MasterDataController extends Controller
{
    public function grades()
    {
        $grades = GradeMaster::orderBy('kode_grade', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $grades]);
    }

    public function tabelHarga()
    {
        $harga = TabelHarga::with('grade')->orderBy('kode_grade', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $harga]);
    }

    public function storeHarga(Request $request)
    {
        $request->validate([
            'kode_grade' => 'required|string',
            'harga_per_kg' => 'required|numeric|min:0',
            'rate_potongan_per_bal' => 'nullable|numeric|min:0',
        ]);

        $hargaId = 'HRG-' . date('Y') . '-' . $request->kode_grade . '-' . substr(uniqid(), -4);

        // Deactivate previous active price for this grade
        TabelHarga::where('kode_grade', $request->kode_grade)->where('status', 'aktif')->update(['status' => 'nonaktif']);

        $harga = TabelHarga::create([
            'harga_id' => $hargaId,
            'kode_grade' => $request->kode_grade,
            'harga_per_kg' => $request->harga_per_kg,
            'rate_potongan_per_bal' => $request->rate_potongan_per_bal ?? 0,
            'berat_standar_kg' => $request->berat_standar_kg ?? null,
            'tanggal_berlaku' => $request->tanggal_berlaku ?? date('Y-m-d'),
            'status' => 'aktif',
            'dibuat_oleh' => auth()->user()->user_id ?? null,
            'deskripsi' => $request->deskripsi ?? 'Update harga baru',
        ]);

        return response()->json(['status' => 'success', 'data' => $harga], 201);
    }

    public function hargaJual()
    {
        $hargaJual = MasterHargaJual::orderBy('kode', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $hargaJual]);
    }

    public function storeHargaJual(Request $request)
    {
        $request->validate([
            'kode' => 'required|string',
            'harga_jual' => 'required|numeric|min:0',
        ]);

        $id = 'HJ-' . substr(uniqid(), -4);

        $hj = MasterHargaJual::create([
            'harga_jual_id' => $id,
            'kode' => $request->kode,
            'harga_jual' => $request->harga_jual,
            'tanggal_berlaku' => $request->tanggal_berlaku ?? date('Y-m-d'),
            'status_aktif' => true,
        ]);

        return response()->json(['status' => 'success', 'data' => $hj], 201);
    }

    public function gudang()
    {
        $gudang = Gudang::orderBy('kode_gudang', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $gudang]);
    }

    public function roles()
    {
        $roles = Role::with(['capabilities', 'modules'])->get();
        return response()->json(['status' => 'success', 'data' => $roles]);
    }

    public function modules()
    {
        $modules = Module::orderBy('sort_order', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $modules]);
    }
}
`);

// TransaksiController.php
fs.writeFileSync(path.join(controllersDir, 'TransaksiController.php'), `<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\TransaksiPembelian;
use App\\Models\\TransaksiItemBal;
use App\\Models\\Barang;
use App\\Services\\SequenceService;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;

class TransaksiController extends Controller
{
    public function index(Request $request)
    {
        $query = TransaksiPembelian::with(['petani', 'items.grade']);

        if ($request->has('tahap')) {
            $query->where('status_tahap', $request->tahap);
        }

        if ($request->has('pembayaran')) {
            $query->where('status_pembayaran', $request->pembayaran);
        }

        if ($request->has('tanggal')) {
            $query->where('tanggal_transaksi', $request->tanggal);
        }

        $transaksi = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $transaksi
        ]);
    }

    public function show($id)
    {
        $transaksi = TransaksiPembelian::with(['petani', 'items.grade'])
            ->where('transaksi_id', $id)
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $transaksi
        ]);
    }

    public function storeSortir(Request $request)
    {
        $request->validate([
            'petani_id' => 'required|string',
            'no_kupon' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.kode_grade' => 'required|string',
            'items.*.harga_per_kg' => 'required|numeric|min:0',
            'items.*.no_bal' => 'required',
        ]);

        return DB::transaction(function() use ($request) {
            $transaksiId = SequenceService::generateTransaksiId();

            $transaksi = TransaksiPembelian::create([
                'transaksi_id' => $transaksiId,
                'no_kupon' => $request->no_kupon,
                'petani_id' => $request->petani_id,
                'tanggal_transaksi' => $request->tanggal_transaksi ?? date('Y-m-d'),
                'jenis_timbang' => $request->jenis_timbang ?? 'netto',
                'status_transaksi' => 'menunggu',
                'status_tahap' => 'proses_sortir',
                'status_pembayaran' => 'belum_lunas',
                'status_nota' => 'belum_cetak',
                'petugas_sortir_user_id' => auth()->user()->user_id ?? null,
                'catatan' => $request->catatan,
            ]);

            foreach ($request->items as $idx => $itemData) {
                $itemNo = $idx + 1;
                $itemId = sprintf('%s-BAL-%02d', $transaksiId, $itemNo);

                TransaksiItemBal::create([
                    'item_id' => $itemId,
                    'transaksi_id' => $transaksiId,
                    'no_bal' => (string) $itemData['no_bal'],
                    'kode_bal_pembeli' => $itemData['kode_bal_pembeli'] ?? null,
                    'kode_grade' => $itemData['kode_grade'],
                    'harga_per_kg' => $itemData['harga_per_kg'],
                    'ganti_tikar' => $itemData['ganti_tikar'] ?? false,
                    'berat_bruto_kg' => $itemData['berat_bruto_kg'] ?? 0,
                    'potongan_tara_kg' => $itemData['potongan_tara_kg'] ?? 0,
                    'berat_kg' => $itemData['berat_kg'] ?? 0,
                    'potongan_kuli' => $itemData['potongan_kuli'] ?? 7000,
                    'potongan_tali' => $itemData['potongan_tali'] ?? 3000,
                    'potongan_tikar' => (!empty($itemData['ganti_tikar'])) ? 75000 : 0,
                    'status_timbang' => 'menunggu_timbang',
                    'lokasi_simpan' => $itemData['lokasi_simpan'] ?? 'Blok A',
                    'sample_label_code' => $itemData['sample_label_code'] ?? null,
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Kupon sortir berhasil dibuat',
                'data' => $transaksi->load('items')
            ], 201);
        });
    }

    public function updateTimbang(Request $request, $id)
    {
        $transaksi = TransaksiPembelian::with('items')->where('transaksi_id', $id)->firstOrFail();

        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|string',
            'items.*.berat_bruto_kg' => 'required|numeric|min:0',
            'items.*.potongan_tara_kg' => 'required|numeric|min:0',
            'items.*.berat_kg' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function() use ($request, $transaksi) {
            foreach ($request->items as $itemData) {
                $item = TransaksiItemBal::where('item_id', $itemData['item_id'])->first();
                if ($item) {
                    $item->update([
                        'berat_bruto_kg' => $itemData['berat_bruto_kg'],
                        'potongan_tara_kg' => $itemData['potongan_tara_kg'],
                        'berat_kg' => $itemData['berat_kg'],
                        'is_netto_manual' => $itemData['is_netto_manual'] ?? false,
                        'status_timbang' => 'selesai_timbang',
                        'lokasi_simpan' => $itemData['lokasi_simpan'] ?? $item->lokasi_simpan,
                    ]);
                }
            }

            $transaksi->status_tahap = 'menunggu_timbang';
            $transaksi->petugas_timbang_user_id = auth()->user()->user_id ?? null;
            $transaksi->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Data timbangan berhasil diperbarui',
                'data' => $transaksi->load('items')
            ]);
        });
    }

    public function bayar(Request $request, $id)
    {
        $transaksi = TransaksiPembelian::with('items')->where('transaksi_id', $id)->firstOrFail();

        $request->validate([
            'metode_pembayaran' => 'required|in:cash,kredit',
            'gudang_id' => 'nullable|string',
        ]);

        return DB::transaction(function() use ($request, $transaksi) {
            $gudangId = $request->gudang_id ?? 'PMK-01';

            $transaksi->update([
                'status_pembayaran' => 'lunas',
                'status_tahap' => 'lengkap',
                'status_transaksi' => 'lengkap',
                'status_nota' => 'sudah_cetak',
                'metode_pembayaran' => $request->metode_pembayaran,
                'dibayar_pada' => now(),
                'dibayar_oleh' => auth()->user()->user_id ?? null,
                'catatan_kasir' => $request->catatan_kasir ?? null,
            ]);

            // Create inventory records for each bal
            foreach ($transaksi->items as $item) {
                $balId = SequenceService::generateBalId($transaksi->transaksi_id, (int) $item->no_bal);

                Barang::updateOrCreate(
                    ['transaksi_item_id' => $item->item_id],
                    [
                        'barang_id' => $balId,
                        'transaksi_id' => $transaksi->transaksi_id,
                        'petani_id' => $transaksi->petani_id,
                        'kode_grade' => $item->kode_grade,
                        'no_bal' => $item->no_bal,
                        'status_stok' => 'di_gudang',
                        'gudang_id' => $gudangId,
                        'lokasi_blok' => $item->lokasi_simpan ?? 'Blok A',
                        'tanggal_masuk' => $transaksi->tanggal_transaksi,
                    ]
                );
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Transaksi berhasil dilunasi dan stok bal masuk ke gudang',
                'data' => $transaksi->load('items')
            ]);
        });
    }
}
`);

// BarangController.php
fs.writeFileSync(path.join(controllersDir, 'BarangController.php'), `<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\Barang;
use Illuminate\\Http\\Request;

class BarangController extends Controller
{
    public function index(Request $request)
    {
        $query = Barang::with(['item', 'petani', 'gudang', 'grade']);

        if ($request->has('status_stok')) {
            $query->where('status_stok', $request->status_stok);
        }

        if ($request->has('gudang_id')) {
            $query->where('gudang_id', $request->gudang_id);
        }

        if ($request->has('kode_grade')) {
            $query->where('kode_grade', $request->kode_grade);
        }

        $barang = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $barang
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $barang = Barang::where('barang_id', $id)->firstOrFail();

        $request->validate([
            'status_stok' => 'required|in:di_gudang,siap_kirim,keluar,terkirim_sample',
        ]);

        $barang->status_stok = $request->status_stok;
        $barang->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Status stok barang berhasil diperbarui',
            'data' => $barang
        ]);
    }
}
`);

// SampleController.php
fs.writeFileSync(path.join(controllersDir, 'SampleController.php'), `<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\SampleBatch;
use App\\Models\\SampleBatchItem;
use App\\Models\\Barang;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;

class SampleController extends Controller
{
    public function indexBatch()
    {
        $batches = SampleBatch::with(['items.barang.item', 'gudang'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $batches]);
    }

    public function storeBatch(Request $request)
    {
        $request->validate([
            'tujuan_buyer' => 'required|string|max:120',
            'tanggal_kirim' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.barang_id' => 'required|string',
        ]);

        return DB::transaction(function() use ($request) {
            $batchId = 'SPL' . rand(1000, 9999);
            $kodeBatch = 'BATCH-' . date('Ymd') . '-' . substr(uniqid(), -4);

            $batch = SampleBatch::create([
                'batch_id' => $batchId,
                'kode_batch' => $kodeBatch,
                'tujuan_buyer' => $request->tujuan_buyer,
                'permintaan_buyer' => $request->permintaan_buyer ?? null,
                'sumber_gudang_id' => $request->sumber_gudang_id ?? 'PMK-01',
                'tanggal_kirim' => $request->tanggal_kirim,
                'status' => 'sample',
                'dikirim_oleh' => auth()->user()->user_id ?? null,
            ]);

            foreach ($request->items as $itemData) {
                $sampleItemId = 'SMP-' . rand(1000, 9999);

                SampleBatchItem::create([
                    'sample_item_id' => $sampleItemId,
                    'batch_id' => $batchId,
                    'barang_id' => $itemData['barang_id'],
                    'kode_harga_jual' => $itemData['kode_harga_jual'] ?? null,
                    'berat_sample_gram' => $itemData['berat_sample_gram'] ?? 200,
                    'harga_tawaran_kg' => $itemData['harga_tawaran_kg'] ?? null,
                    'harga_deal_kg' => $itemData['harga_deal_kg'] ?? null,
                    'status_item' => 'sample',
                ]);

                // Update barang status
                Barang::where('barang_id', $itemData['barang_id'])->update(['status_stok' => 'terkirim_sample']);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Batch sample berhasil dibuat',
                'data' => $batch->load('items')
            ], 201);
        });
    }
}
`);

// PengirimanController.php
fs.writeFileSync(path.join(controllersDir, 'PengirimanController.php'), `<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\PengirimanBarang;
use App\\Models\\PengirimanBarangItem;
use App\\Models\\Barang;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;

class PengirimanController extends Controller
{
    public function index()
    {
        $pengiriman = PengirimanBarang::with(['items.barang.item'])
            ->orderBy('tanggal_kirim', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $pengiriman]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'no_surat_jalan' => 'required|string|unique:pengiriman_barang,no_surat_jalan',
            'tujuan' => 'required|string',
            'driver_nama' => 'required|string',
            'plat_nomor' => 'required|string',
            'tanggal_kirim' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.barang_id' => 'required|string',
        ]);

        return DB::transaction(function() use ($request) {
            $pengirimanId = 'SJ-' . date('Ymd') . '-' . substr(uniqid(), -3);

            $pengiriman = PengirimanBarang::create([
                'pengiriman_id' => $pengirimanId,
                'no_surat_jalan' => $request->no_surat_jalan,
                'tujuan' => $request->tujuan,
                'jenis_pengeluaran' => $request->jenis_pengeluaran ?? 'Pabrik Rokok',
                'driver_nama' => $request->driver_nama,
                'plat_nomor' => $request->plat_nomor,
                'tanggal_kirim' => $request->tanggal_kirim,
                'status' => 'dimuat',
                'batch_sample_id_ref' => $request->batch_sample_id_ref ?? null,
                'nomor_kontrak' => $request->nomor_kontrak ?? null,
                'catatan' => $request->catatan ?? null,
                'dibuat_oleh' => auth()->user()->user_id ?? null,
            ]);

            foreach ($request->items as $itemData) {
                PengirimanBarangItem::create([
                    'pengiriman_id' => $pengirimanId,
                    'barang_id' => $itemData['barang_id'],
                    'kode_harga_jual' => $itemData['kode_harga_jual'] ?? null,
                    'harga_deal_per_kg' => $itemData['harga_deal_per_kg'] ?? 0,
                ]);

                Barang::where('barang_id', $itemData['barang_id'])->update([
                    'status_stok' => 'siap_kirim',
                    'tanggal_keluar' => $request->tanggal_kirim,
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Surat jalan berhasil dibuat',
                'data' => $pengiriman->load('items')
            ], 201);
        });
    }
}
`);

// DashboardController.php
fs.writeFileSync(path.join(controllersDir, 'DashboardController.php'), `<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use Illuminate\\Support\\Facades\\DB;

class DashboardController extends Controller
{
    public function stats()
    {
        try {
            $transaksiSummary = DB::selectOne("
                SELECT 
                    COUNT(*) as total_transaksi,
                    COALESCE(SUM(total_bal), 0) as total_bal,
                    COALESCE(SUM(berat_kg), 0) as total_berat_kg,
                    COALESCE(SUM(harga_final), 0) as total_pembelian
                FROM v_transaksi_summary
            ");

            $stokValuasi = DB::select("SELECT * FROM v_stok_valuasi_grade");

            $pengirimanSummary = DB::selectOne("
                SELECT 
                    COUNT(*) as total_pengiriman,
                    COALESCE(SUM(total_bal), 0) as total_bal_terkirim,
                    COALESCE(SUM(total_berat_kg), 0) as total_berat_terkirim,
                    COALESCE(SUM(total_nilai_deal), 0) as total_nilai_deal
                FROM v_pengiriman_summary
            ");

            return response()->json([
                'status' => 'success',
                'data' => [
                    'transaksi' => $transaksiSummary,
                    'stok_valuasi' => $stokValuasi,
                    'pengiriman' => $pengirimanSummary,
                ]
            ]);
        } catch (\\Exception $e) {
            return response()->json([
                'status' => 'warning',
                'message' => 'Database views belum aktif atau koneksi DB belum tersedia: ' . $e->getMessage(),
                'data' => null
            ]);
        }
    }
}
`);

// -------------------------------------------------------------
// ROUTES / API.PHP
// -------------------------------------------------------------
fs.writeFileSync(path.join(routesDir, 'api.php'), `<?php

use Illuminate\\Support\\Facades\\Route;
use App\\Http\\Controllers\\Api\\AuthController;
use App\\Http\\Controllers\\Api\\PetaniController;
use App\\Http\\Controllers\\Api\\MasterDataController;
use App\\Http\\Controllers\\Api\\TransaksiController;
use App\\Http\\Controllers\\Api\\BarangController;
use App\\Http\\Controllers\\Api\\SampleController;
use App\\Http\\Controllers\\Api\\PengirimanController;
use App\\Http\\Controllers\\Api\\DashboardController;

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

    // Public Auth
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Master data publik (atau fallback)
    Route::get('/master/grades', [MasterDataController::class, 'grades']);
    Route::get('/master/harga-beli', [MasterDataController::class, 'tabelHarga']);
    Route::get('/master/harga-jual', [MasterDataController::class, 'hargaJual']);
    Route::get('/master/gudang', [MasterDataController::class, 'gudang']);
    Route::get('/master/roles', [MasterDataController::class, 'roles']);
    Route::get('/master/modules', [MasterDataController::class, 'modules']);

    // Protected Routes (Sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Petani CRUD
        Route::apiResource('petani', PetaniController::class);

        // Master Data Management
        Route::post('/master/harga-beli', [MasterDataController::class, 'storeHarga']);
        Route::post('/master/harga-jual', [MasterDataController::class, 'storeHargaJual']);

        // Transaksi Pembelian Alur: Sortir -> Timbang -> Kasir
        Route::get('/transaksi', [TransaksiController::class, 'index']);
        Route::get('/transaksi/{id}', [TransaksiController::class, 'show']);
        Route::post('/transaksi/sortir', [TransaksiController::class, 'storeSortir']);
        Route::put('/transaksi/{id}/timbang', [TransaksiController::class, 'updateTimbang']);
        Route::put('/transaksi/{id}/bayar', [TransaksiController::class, 'bayar']);

        // Inventaris Gudang / Bal
        Route::get('/barang', [BarangController::class, 'index']);
        Route::put('/barang/{id}/status', [BarangController::class, 'updateStatus']);

        // Sample Management
        Route::get('/sample-batch', [SampleController::class, 'indexBatch']);
        Route::post('/sample-batch', [SampleController::class, 'storeBatch']);

        // Pengiriman / DO
        Route::get('/pengiriman', [PengirimanController::class, 'index']);
        Route::post('/pengiriman', [PengirimanController::class, 'store']);

        // Dashboard & Analytic Views
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    });
});
`);

console.log('Successfully generated all API Controllers and routes/api.php');

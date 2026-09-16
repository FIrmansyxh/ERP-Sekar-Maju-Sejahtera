const fs = require('fs');
const path = require('path');

const beRoot = path.resolve(__dirname, '../../ERP-Sekar-Maju-Sejahtera-BE');
const modelsDir = path.join(beRoot, 'app/Models');
const controllersDir = path.join(beRoot, 'app/Http/Controllers/Api');
const servicesDir = path.join(beRoot, 'app/Services');

fs.mkdirSync(modelsDir, { recursive: true });
fs.mkdirSync(controllersDir, { recursive: true });
fs.mkdirSync(servicesDir, { recursive: true });

// -------------------------------------------------------------
// MODELS
// -------------------------------------------------------------

// User.php
fs.writeFileSync(path.join(modelsDir, 'User.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Foundation\\Auth\\User as Authenticatable;
use Illuminate\\Notifications\\Notifiable;
use Laravel\\Sanctum\\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';
    protected $primaryKey = 'user_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'username',
        'password_hash',
        'nama_lengkap',
        'role_code',
        'email',
        'no_hp',
        'unit_penugasan',
        'status_aktif',
        'terakhir_login',
        'dibuat_pada',
    ];

    protected $hidden = [
        'password_hash',
    ];

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_code', 'role_code');
    }
}
`);

// Role.php
fs.writeFileSync(path.join(modelsDir, 'Role.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class Role extends Model
{
    protected $table = 'roles';
    protected $primaryKey = 'role_code';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'role_code',
        'label',
        'deskripsi',
        'badge_bg',
        'badge_text',
        'badge_border',
    ];

    public function modules()
    {
        return $this->belongsToMany(Module::class, 'role_module_access', 'role_code', 'module_id');
    }

    public function capabilities()
    {
        return $this->hasOne(RoleCapability::class, 'role_code', 'role_code');
    }
}
`);

// Module.php
fs.writeFileSync(path.join(modelsDir, 'Module.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class Module extends Model
{
    protected $table = 'modules';
    protected $primaryKey = 'module_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'module_id',
        'group_name',
        'title',
        'subtitle',
        'icon',
        'sort_order',
    ];
}
`);

// RoleCapability.php
fs.writeFileSync(path.join(modelsDir, 'RoleCapability.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class RoleCapability extends Model
{
    protected $table = 'role_capabilities';
    protected $primaryKey = 'role_code';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $casts = [
        'can_manage_users' => 'boolean',
        'can_view_audit_log' => 'boolean',
        'can_manage_master_data' => 'boolean',
        'can_create_petani' => 'boolean',
        'can_input_transaksi' => 'boolean',
        'can_manage_stok' => 'boolean',
        'can_manage_qc' => 'boolean',
        'can_manage_pengiriman' => 'boolean',
        'can_view_analytics' => 'boolean',
    ];

    protected $fillable = [
        'role_code',
        'can_manage_users',
        'can_view_audit_log',
        'can_manage_master_data',
        'can_create_petani',
        'can_input_transaksi',
        'can_manage_stok',
        'can_manage_qc',
        'can_manage_pengiriman',
        'can_view_analytics',
    ];
}
`);

// Petani.php
fs.writeFileSync(path.join(modelsDir, 'Petani.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class Petani extends Model
{
    protected $table = 'petani';
    protected $primaryKey = 'petani_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $casts = [
        'status_aktif' => 'boolean',
        'tanggal_daftar' => 'date:Y-m-d',
    ];

    protected $fillable = [
        'petani_id',
        'nama_petani',
        'no_hp',
        'alamat',
        'desa_kecamatan',
        'status_aktif',
        'alasan_nonaktif',
        'tanggal_daftar',
        'catatan',
    ];

    public function transaksi()
    {
        return $this->hasMany(TransaksiPembelian::class, 'petani_id', 'petani_id');
    }

    public function barang()
    {
        return $this->hasMany(Barang::class, 'petani_id', 'petani_id');
    }
}
`);

// GradeMaster.php
fs.writeFileSync(path.join(modelsDir, 'GradeMaster.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class GradeMaster extends Model
{
    protected $table = 'grade_master';
    protected $primaryKey = 'kode_grade';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'kode_grade',
        'nama_grade',
        'warna_badge',
    ];
}
`);

// TabelHarga.php
fs.writeFileSync(path.join(modelsDir, 'TabelHarga.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class TabelHarga extends Model
{
    protected $table = 'tabel_harga';
    protected $primaryKey = 'harga_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $casts = [
        'harga_per_kg' => 'float',
        'rate_potongan_per_bal' => 'float',
        'berat_standar_kg' => 'float',
        'tanggal_berlaku' => 'date:Y-m-d',
        'tanggal_berakhir' => 'date:Y-m-d',
    ];

    protected $fillable = [
        'harga_id',
        'kode_grade',
        'harga_per_kg',
        'rate_potongan_per_bal',
        'berat_standar_kg',
        'tanggal_berlaku',
        'tanggal_berakhir',
        'status',
        'dibuat_oleh',
        'deskripsi',
    ];

    public function grade()
    {
        return $this->belongsTo(GradeMaster::class, 'kode_grade', 'kode_grade');
    }
}
`);

// MasterHargaJual.php
fs.writeFileSync(path.join(modelsDir, 'MasterHargaJual.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class MasterHargaJual extends Model
{
    protected $table = 'master_harga_jual';
    protected $primaryKey = 'harga_jual_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $casts = [
        'harga_jual' => 'float',
        'status_aktif' => 'boolean',
        'tanggal_berlaku' => 'date:Y-m-d',
    ];

    protected $fillable = [
        'harga_jual_id',
        'kode',
        'harga_jual',
        'tanggal_berlaku',
        'status_aktif',
    ];
}
`);

// Gudang.php
fs.writeFileSync(path.join(modelsDir, 'Gudang.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class Gudang extends Model
{
    protected $table = 'gudang';
    protected $primaryKey = 'gudang_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $casts = [
        'kapasitas_bal' => 'integer',
        'status_aktif' => 'boolean',
    ];

    protected $fillable = [
        'gudang_id',
        'kode_gudang',
        'nama_gudang',
        'alamat',
        'kapasitas_bal',
        'kepala_gudang',
        'kontak',
        'status_aktif',
        'deskripsi',
    ];
}
`);

// TransaksiPembelian.php
fs.writeFileSync(path.join(modelsDir, 'TransaksiPembelian.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class TransaksiPembelian extends Model
{
    protected $table = 'transaksi_pembelian';
    protected $primaryKey = 'transaksi_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $casts = [
        'tanggal_transaksi' => 'date:Y-m-d',
        'dicetak_pada' => 'datetime',
        'dibayar_pada' => 'datetime',
        'terakhir_diubah_pada' => 'datetime',
        'unduh_nota_count' => 'integer',
    ];

    protected $fillable = [
        'transaksi_id',
        'no_kupon',
        'petani_id',
        'tanggal_transaksi',
        'jenis_timbang',
        'status_transaksi',
        'status_tahap',
        'status_pembayaran',
        'metode_pembayaran',
        'status_nota',
        'dicetak_pada',
        'dicetak_oleh',
        'unduh_nota_count',
        'dibayar_pada',
        'dibayar_oleh',
        'operator_user_id',
        'petugas_sortir_user_id',
        'petugas_timbang_user_id',
        'catatan_kasir',
        'catatan_qc',
        'catatan',
        'terakhir_diubah_oleh',
        'terakhir_diubah_pada',
        'alasan_perubahan_terakhir',
    ];

    public function petani()
    {
        return $this->belongsTo(Petani::class, 'petani_id', 'petani_id');
    }

    public function items()
    {
        return $this->hasMany(TransaksiItemBal::class, 'transaksi_id', 'transaksi_id');
    }

    public function barang()
    {
        return $this->hasMany(Barang::class, 'transaksi_id', 'transaksi_id');
    }
}
`);

// TransaksiItemBal.php
fs.writeFileSync(path.join(modelsDir, 'TransaksiItemBal.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class TransaksiItemBal extends Model
{
    protected $table = 'transaksi_item_bal';
    protected $primaryKey = 'item_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $casts = [
        'harga_per_kg' => 'float',
        'ganti_tikar' => 'boolean',
        'berat_bruto_kg' => 'float',
        'potongan_tara_kg' => 'float',
        'is_netto_manual' => 'boolean',
        'berat_kg' => 'float',
        'potongan_kuli' => 'float',
        'potongan_tali' => 'float',
        'potongan_tikar' => 'float',
        'potongan' => 'float',
        'total_kotor' => 'float',
        'subtotal_bersih' => 'float',
        'sample_label_printed' => 'boolean',
    ];

    protected $fillable = [
        'item_id',
        'transaksi_id',
        'no_bal',
        'kode_bal_pembeli',
        'barcode',
        'kode_grade',
        'harga_per_kg',
        'ganti_tikar',
        'berat_bruto_kg',
        'potongan_tara_kg',
        'is_netto_manual',
        'berat_kg',
        'potongan_kuli',
        'potongan_tali',
        'potongan_tikar',
        'status_timbang',
        'lokasi_simpan',
        'sample_label_code',
        'sample_label_printed',
        'catatan',
    ];

    public function transaksi()
    {
        return $this->belongsTo(TransaksiPembelian::class, 'transaksi_id', 'transaksi_id');
    }

    public function grade()
    {
        return $this->belongsTo(GradeMaster::class, 'kode_grade', 'kode_grade');
    }

    public function barang()
    {
        return $this->hasOne(Barang::class, 'transaksi_item_id', 'item_id');
    }
}
`);

// Barang.php
fs.writeFileSync(path.join(modelsDir, 'Barang.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class Barang extends Model
{
    protected $table = 'barang';
    protected $primaryKey = 'barang_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $casts = [
        'tanggal_masuk' => 'date:Y-m-d',
        'tanggal_keluar' => 'date:Y-m-d',
    ];

    protected $fillable = [
        'barang_id',
        'transaksi_item_id',
        'transaksi_id',
        'petani_id',
        'kode_grade',
        'no_bal',
        'status_stok',
        'gudang_id',
        'lokasi_blok',
        'tanggal_masuk',
        'tanggal_keluar',
        'catatan',
    ];

    public function item()
    {
        return $this->belongsTo(TransaksiItemBal::class, 'transaksi_item_id', 'item_id');
    }

    public function transaksi()
    {
        return $this->belongsTo(TransaksiPembelian::class, 'transaksi_id', 'transaksi_id');
    }

    public function petani()
    {
        return $this->belongsTo(Petani::class, 'petani_id', 'petani_id');
    }

    public function gudang()
    {
        return $this->belongsTo(Gudang::class, 'gudang_id', 'gudang_id');
    }

    public function grade()
    {
        return $this->belongsTo(GradeMaster::class, 'kode_grade', 'kode_grade');
    }
}
`);

// SampleBatch.php
fs.writeFileSync(path.join(modelsDir, 'SampleBatch.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class SampleBatch extends Model
{
    protected $table = 'sample_batch';
    protected $primaryKey = 'batch_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $casts = [
        'is_locked' => 'boolean',
        'tanggal_kirim' => 'date:Y-m-d',
        'tanggal_respon' => 'date:Y-m-d',
    ];

    protected $fillable = [
        'batch_id',
        'kode_batch',
        'tujuan_buyer',
        'is_locked',
        'permintaan_buyer',
        'sumber_gudang_id',
        'tanggal_kirim',
        'tanggal_respon',
        'status',
        'dikirim_oleh',
        'petugas_qc_pabrik',
        'catatan',
    ];

    public function items()
    {
        return $this->hasMany(SampleBatchItem::class, 'batch_id', 'batch_id');
    }

    public function gudang()
    {
        return $this->belongsTo(Gudang::class, 'sumber_gudang_id', 'gudang_id');
    }
}
`);

// SampleBatchItem.php
fs.writeFileSync(path.join(modelsDir, 'SampleBatchItem.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class SampleBatchItem extends Model
{
    protected $table = 'sample_batch_item';
    protected $primaryKey = 'sample_item_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $casts = [
        'berat_sample_gram' => 'float',
        'harga_tawaran_kg' => 'float',
        'harga_deal_kg' => 'float',
        'sudah_dikirim_do' => 'boolean',
        'tanggal_evaluasi' => 'date:Y-m-d',
    ];

    protected $fillable = [
        'sample_item_id',
        'batch_id',
        'barang_id',
        'kode_harga_jual',
        'berat_sample_gram',
        'harga_tawaran_kg',
        'harga_deal_kg',
        'status_item',
        'alasan_tolak',
        'catatan_nego',
        'tanggal_evaluasi',
        'sudah_dikirim_do',
    ];

    public function batch()
    {
        return $this->belongsTo(SampleBatch::class, 'batch_id', 'batch_id');
    }

    public function barang()
    {
        return $this->belongsTo(Barang::class, 'barang_id', 'barang_id');
    }
}
`);

// PengirimanBarang.php
fs.writeFileSync(path.join(modelsDir, 'PengirimanBarang.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class PengirimanBarang extends Model
{
    protected $table = 'pengiriman_barang';
    protected $primaryKey = 'pengiriman_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $casts = [
        'tanggal_kirim' => 'date:Y-m-d',
        'tanggal_diterima' => 'date:Y-m-d',
    ];

    protected $fillable = [
        'pengiriman_id',
        'no_surat_jalan',
        'tujuan',
        'jenis_pengeluaran',
        'unit_produksi',
        'mandor_produksi',
        'driver_nama',
        'plat_nomor',
        'tanggal_kirim',
        'tanggal_diterima',
        'status',
        'batch_sample_id_ref',
        'nomor_kontrak',
        'catatan',
        'petugas',
        'dibuat_oleh',
    ];

    public function items()
    {
        return $this->hasMany(PengirimanBarangItem::class, 'pengiriman_id', 'pengiriman_id');
    }
}
`);

// PengirimanBarangItem.php
fs.writeFileSync(path.join(modelsDir, 'PengirimanBarangItem.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class PengirimanBarangItem extends Model
{
    protected $table = 'pengiriman_barang_item';
    public $incrementing = false;
    public $timestamps = false;

    protected $casts = [
        'harga_deal_per_kg' => 'float',
    ];

    protected $fillable = [
        'pengiriman_id',
        'barang_id',
        'kode_harga_jual',
        'harga_deal_per_kg',
    ];

    public function pengiriman()
    {
        return $this->belongsTo(PengirimanBarang::class, 'pengiriman_id', 'pengiriman_id');
    }

    public function barang()
    {
        return $this->belongsTo(Barang::class, 'barang_id', 'barang_id');
    }
}
`);

// AuditLog.php
fs.writeFileSync(path.join(modelsDir, 'AuditLog.php'), `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class AuditLog extends Model
{
    protected $table = 'audit_log';
    protected $primaryKey = 'audit_id';
    public $timestamps = false;

    protected $casts = [
        'changed_at' => 'datetime',
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    protected $fillable = [
        'table_name',
        'record_id',
        'action',
        'changed_by',
        'changed_at',
        'old_values',
        'new_values',
    ];
}
`);

// -------------------------------------------------------------
// SERVICES
// -------------------------------------------------------------

// SequenceService.php
fs.writeFileSync(path.join(servicesDir, 'SequenceService.php'), `<?php

namespace App\\Services;

use Illuminate\\Support\\Facades\\DB;

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
        $seq = self::nextSeq($key);
        return sprintf('PTN-%s-%03d', $year, $seq);
    }

    public static function generateTransaksiId(): string
    {
        $dateStr = date('dmY');
        $key = 'TRX-' . $dateStr;
        $seq = self::nextSeq($key);
        return sprintf('TRX-%s-%03d', $dateStr, $seq);
    }

    public static function generateBalId(string $transaksiId, int $noBal): string
    {
        // e.g. BAL-16092026-001-01
        $suffix = substr($transaksiId, 4); // strip 'TRX-'
        return sprintf('BAL-%s-%02d', $suffix, $noBal);
    }
}
`);

console.log('Successfully generated all Eloquent Models & SequenceService');

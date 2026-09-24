<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
        'aturan_netto' => 'array',
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
        'aturan_netto',
        'catatan',
        'petugas',
        'dibuat_oleh',
    ];

    public function items()
    {
        return $this->hasMany(PengirimanBarangItem::class, 'pengiriman_id', 'pengiriman_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PengirimanBarangItem extends Model
{
    protected $table = 'pengiriman_barang_item';
    public $incrementing = false;
    public $timestamps = false;

    protected $casts = [
        'harga_deal_per_kg' => 'float',
        'berat_kirim_kg' => 'float',
        'netto_jual_kg' => 'float',
    ];

    protected $fillable = [
        'pengiriman_id',
        'barang_id',
        'kode_harga_jual',
        'harga_deal_per_kg',
        'berat_kirim_kg',
        'netto_jual_kg',
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

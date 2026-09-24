<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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

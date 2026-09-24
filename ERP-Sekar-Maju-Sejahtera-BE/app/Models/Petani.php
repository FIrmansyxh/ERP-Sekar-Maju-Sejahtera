<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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

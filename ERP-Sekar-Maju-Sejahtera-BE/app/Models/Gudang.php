<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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

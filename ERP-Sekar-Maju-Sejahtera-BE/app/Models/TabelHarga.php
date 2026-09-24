<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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

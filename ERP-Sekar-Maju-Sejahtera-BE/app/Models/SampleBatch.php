<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
        'dikirim_oleh_nama',
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

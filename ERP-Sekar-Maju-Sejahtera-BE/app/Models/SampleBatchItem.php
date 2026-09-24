<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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

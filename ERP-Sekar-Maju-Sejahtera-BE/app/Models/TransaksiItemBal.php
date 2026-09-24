<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
        'ganti_tikar_diubah_pada' => 'integer',
        'timbang_diubah_pada' => 'integer',
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
        'ganti_tikar_diubah_pada',
        'timbang_diubah_pada',
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

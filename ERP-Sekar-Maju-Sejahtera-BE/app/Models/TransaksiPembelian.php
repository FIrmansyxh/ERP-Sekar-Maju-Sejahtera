<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransaksiPembelian extends Model
{
    protected $table = 'transaksi_pembelian';
    protected $primaryKey = 'transaksi_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $casts = [
        'tanggal_transaksi' => 'date:Y-m-d',
        'dicetak_pada' => 'datetime',
        'dibayar_pada' => 'datetime',
        'terakhir_diubah_pada' => 'datetime',
        'unduh_nota_count' => 'integer',
    ];

    protected $fillable = [
        'transaksi_id',
        'no_kupon',
        'petani_id',
        'tanggal_transaksi',
        'jenis_timbang',
        'status_transaksi',
        'status_tahap',
        'status_pembayaran',
        'metode_pembayaran',
        'status_nota',
        'dicetak_pada',
        'dicetak_oleh',
        'unduh_nota_count',
        'dibayar_pada',
        'dibayar_oleh',
        'operator_user_id',
        'petugas_sortir_user_id',
        'petugas_timbang_user_id',
        'catatan_kasir',
        'catatan_qc',
        'catatan',
        'terakhir_diubah_oleh',
        'terakhir_diubah_pada',
        'alasan_perubahan_terakhir',
    ];

    public function petani()
    {
        return $this->belongsTo(Petani::class, 'petani_id', 'petani_id');
    }

    public function items()
    {
        return $this->hasMany(TransaksiItemBal::class, 'transaksi_id', 'transaksi_id')
            ->orderBy('item_id');
    }

    public function barang()
    {
        return $this->hasMany(Barang::class, 'transaksi_id', 'transaksi_id');
    }
}

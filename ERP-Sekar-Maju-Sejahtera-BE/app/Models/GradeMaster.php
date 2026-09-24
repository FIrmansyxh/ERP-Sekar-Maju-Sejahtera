<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GradeMaster extends Model
{
    protected $table = 'grade_master';
    protected $primaryKey = 'kode_grade';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'kode_grade',
        'nama_grade',
        'warna_badge',
    ];
}

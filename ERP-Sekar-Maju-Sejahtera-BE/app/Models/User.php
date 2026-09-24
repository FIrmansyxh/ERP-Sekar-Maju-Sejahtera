<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';
    protected $primaryKey = 'user_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'username',
        'password_hash',
        'nama_lengkap',
        'role_code',
        'email',
        'no_hp',
        'unit_penugasan',
        'status_aktif',
        'terakhir_login',
        'dibuat_pada',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $casts = [
        'status_aktif' => 'boolean',
    ];

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_code', 'role_code');
    }
}

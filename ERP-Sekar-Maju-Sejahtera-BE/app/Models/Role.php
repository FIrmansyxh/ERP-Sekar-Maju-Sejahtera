<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $table = 'roles';
    protected $primaryKey = 'role_code';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'role_code',
        'label',
        'deskripsi',
        'badge_bg',
        'badge_text',
        'badge_border',
    ];

    public function modules()
    {
        return $this->belongsToMany(Module::class, 'role_module_access', 'role_code', 'module_id');
    }

    public function capabilities()
    {
        return $this->hasOne(RoleCapability::class, 'role_code', 'role_code');
    }
}

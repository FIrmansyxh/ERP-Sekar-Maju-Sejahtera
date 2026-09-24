<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoleCapability extends Model
{
    protected $table = 'role_capabilities';
    protected $primaryKey = 'role_code';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $casts = [
        'can_manage_users' => 'boolean',
        'can_view_audit_log' => 'boolean',
        'can_manage_master_data' => 'boolean',
        'can_create_petani' => 'boolean',
        'can_input_transaksi' => 'boolean',
        'can_manage_stok' => 'boolean',
        'can_manage_qc' => 'boolean',
        'can_manage_pengiriman' => 'boolean',
        'can_view_analytics' => 'boolean',
    ];

    protected $fillable = [
        'role_code',
        'can_manage_users',
        'can_view_audit_log',
        'can_manage_master_data',
        'can_create_petani',
        'can_input_transaksi',
        'can_manage_stok',
        'can_manage_qc',
        'can_manage_pengiriman',
        'can_view_analytics',
    ];
}

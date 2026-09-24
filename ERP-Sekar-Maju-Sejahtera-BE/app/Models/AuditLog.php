<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $table = 'audit_log';
    protected $primaryKey = 'audit_id';
    public $timestamps = false;

    protected $casts = [
        'changed_at' => 'datetime',
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    protected $fillable = [
        'table_name',
        'record_id',
        'action',
        'changed_by',
        'changed_at',
        'old_values',
        'new_values',
    ];
}

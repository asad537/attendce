<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    protected $fillable = ['user_id', 'payroll_month', 'base_salary', 'allowances', 'incentives', 'deductions', 'overtime_rate', 'status', 'paid_at', 'updated_by'];
    protected $casts = ['payroll_month' => 'date', 'paid_at' => 'datetime', 'base_salary' => 'decimal:2', 'allowances' => 'decimal:2', 'incentives' => 'decimal:2', 'deductions' => 'decimal:2', 'overtime_rate' => 'decimal:2'];
    public function user() { return $this->belongsTo(User::class); }
}

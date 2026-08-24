<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'date',
        'end_date',
        'description',
        'type',
        'is_recurring',
    ];

    protected $casts = [
        'date'         => 'date',
        'end_date'     => 'date',
        'is_recurring' => 'boolean',
    ];

    public function scopeUpcoming($query)
    {
        return $query->whereDate('date', '>=', today())->orderBy('date');
    }

    public function scopeForYear($query, int $year)
    {
        return $query->whereYear('date', $year);
    }

    /**
     * Check if a given date falls within this holiday
     */
    public static function isHoliday(\Carbon\Carbon $date): bool
    {
        return self::where('date', '<=', $date->toDateString())
            ->where(function ($q) use ($date) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', $date->toDateString());
            })
            ->exists();
    }
}

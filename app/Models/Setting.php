<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function map(): array
    {
        return static::pluck('value', 'key')->toArray();
    }
}

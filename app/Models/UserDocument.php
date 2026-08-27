<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'name',
        'file_path',
    ];

    const TYPE_RESUME = 'resume';
    const TYPE_CERTIFICATE = 'certificate';
    const TYPE_ID_DOCUMENT = 'id_document';
    const TYPE_SALARY_DOCUMENT = 'salary_document';
    const TYPE_BANK_DETAILS = 'bank_details';
    const TYPE_DISCIPLINARY = 'disciplinary_document';

    public static function getTypes()
    {
        return [
            self::TYPE_RESUME,
            self::TYPE_CERTIFICATE,
            self::TYPE_ID_DOCUMENT,
            self::TYPE_SALARY_DOCUMENT,
            self::TYPE_BANK_DETAILS,
            self::TYPE_DISCIPLINARY,
        ];
    }

    public static function getEmployeeUploadableTypes()
    {
        return [
            self::TYPE_RESUME,
            self::TYPE_CERTIFICATE,
            self::TYPE_ID_DOCUMENT,
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

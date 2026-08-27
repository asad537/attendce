<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'sender_id', 'recipient_id', 'parent_id', 'subject', 'body', 'label', 'is_draft',
        'attachment_path', 'attachment_name', 'attachment_mime', 'attachment_size',
    ];

    protected $casts = [
        'is_draft' => 'boolean', 'read_at' => 'datetime', 'starred_by_sender_at' => 'datetime',
        'starred_by_recipient_at' => 'datetime', 'archived_at' => 'datetime', 'spam_at' => 'datetime',
        'deleted_by_sender_at' => 'datetime', 'deleted_by_recipient_at' => 'datetime',
        'deleted_for_everyone_at' => 'datetime',
    ];

    public function sender() { return $this->belongsTo(User::class, 'sender_id'); }
    public function recipient() { return $this->belongsTo(User::class, 'recipient_id'); }
    public function parent() { return $this->belongsTo(self::class, 'parent_id'); }
}

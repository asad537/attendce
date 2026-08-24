<?php
namespace App\Models; use Illuminate\Database\Eloquent\Model;
class TicketSubtask extends Model { protected $fillable=['ticket_id','title','is_completed']; }

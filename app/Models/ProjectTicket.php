<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ProjectTicket extends Model {
    protected $fillable = ['project_id','title','description','status','priority','due_date','attachment_path','attachment_name','assignee_id','created_by'];
    public function assignee() { return $this->belongsTo(User::class, 'assignee_id'); }
    public function project() { return $this->belongsTo(Project::class); }
    public function comments() { return $this->hasMany(TicketComment::class, 'ticket_id'); }
    public function worklogs() { return $this->hasMany(TicketWorklog::class, 'ticket_id'); }
}

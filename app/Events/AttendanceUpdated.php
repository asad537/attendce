<?php

namespace App\Events;

use App\Models\Attendance;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AttendanceUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $user;
    public $attendance;

    public function __construct(User $user, Attendance $attendance)
    {
        $this->user       = $user;
        $this->attendance = $attendance;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('attendance'),
            new PresenceChannel('team.' . ($this->user->department_id ?? 'all')),
        ];
    }

    public function broadcastAs(): string
    {
        return 'attendance.updated';
    }

    public function broadcastWith(): array
    {
        $attendance = $this->attendance;
        return [
            'user_id'        => $this->user->id,
            'user_name'      => $this->user->name,
            'date'           => $attendance->date ? $attendance->date->toDateString() : null,
            'status'         => $attendance->status,
            'check_in'       => $attendance->check_in ? $attendance->check_in->toISOString() : null,
            'check_out'      => $attendance->check_out ? $attendance->check_out->toISOString() : null,
            'current_status' => $this->user->current_status,
        ];
    }
}

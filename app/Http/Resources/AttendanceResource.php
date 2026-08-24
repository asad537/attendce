<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'               => $this->id,
            'user'             => new UserBriefResource($this->whenLoaded('user')),
            'date'             => $this->date ? $this->date->toDateString() : null,
            'check_in'         => $this->check_in ? $this->check_in->toISOString() : null,
            'check_out'        => $this->check_out ? $this->check_out->toISOString() : null,
            'status'           => $this->status,
            'work_mode'        => $this->work_mode,
            'working_minutes'  => $this->working_minutes,
            'working_hours'    => $this->working_hours,
            'break_minutes'    => $this->break_minutes,
            'overtime_minutes' => $this->overtime_minutes,
            'is_late'          => $this->is_late,
            'late_minutes'     => $this->late_minutes,
            'note'             => $this->note,
            'is_active'        => $this->is_active,
            'breaks'           => BreakResource::collection($this->whenLoaded('breaks')),
        ];
    }
}

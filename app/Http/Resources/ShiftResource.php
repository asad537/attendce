<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ShiftResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                 => $this->id,
            'name'               => $this->name,
            'start_time'         => $this->start_time,
            'end_time'           => $this->end_time,
            'grace_minutes'      => $this->grace_minutes,
            'max_overtime_hours' => $this->max_overtime_hours,
            'is_night_shift'     => $this->is_night_shift,
            'duration_hours'     => $this->duration_hours,
            'is_active'          => $this->is_active,
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BreakResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                 => $this->id,
            'break_start'        => $this->break_start ? $this->break_start->toISOString() : null,
            'break_end'          => $this->break_end ? $this->break_end->toISOString() : null,
            'duration_minutes'   => $this->duration_minutes,
            'duration_formatted' => $this->duration_formatted,
            'type'               => $this->type,
            'note'               => $this->note,
            'is_active'          => $this->is_active,
        ];
    }
}

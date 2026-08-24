<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class HolidayResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'date'         => $this->date ? $this->date->toDateString() : null,
            'end_date'     => $this->end_date ? $this->end_date->toDateString() : null,
            'description'  => $this->description,
            'type'         => $this->type,
            'is_recurring' => $this->is_recurring,
        ];
    }
}

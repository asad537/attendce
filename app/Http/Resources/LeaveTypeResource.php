<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class LeaveTypeResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                    => $this->id,
            'name'                  => $this->name,
            'code'                  => $this->code,
            'days_allowed_per_year' => $this->days_allowed_per_year,
            'is_paid'               => $this->is_paid,
            'requires_approval'     => $this->requires_approval,
            'carry_forward'         => $this->carry_forward,
            'allow_half_day'        => $this->allow_half_day,
            'color'                 => $this->color,
            'description'           => $this->description,
            'is_active'             => $this->is_active,
        ];
    }
}

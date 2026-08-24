<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class LeaveBalanceResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'              => $this->id,
            'leave_type'      => new LeaveTypeResource($this->whenLoaded('leaveType')),
            'year'            => $this->year,
            'allocated'       => (float) $this->allocated,
            'used'            => (float) $this->used,
            'carried_forward' => (float) $this->carried_forward,
            'remaining'       => $this->remaining,
        ];
    }
}

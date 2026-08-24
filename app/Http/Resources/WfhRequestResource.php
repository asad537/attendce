<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class WfhRequestResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'start_date' => $this->start_date->format('Y-m-d'),
            'end_date' => $this->end_date->format('Y-m-d'),
            'is_half_day' => $this->is_half_day,
            'half_day_period' => $this->half_day_period,
            'reason' => $this->reason,
            'status' => $this->status,
            'remarks' => $this->remarks,
            'reviewed_at' => $this->reviewed_at,
            'user' => new UserResource($this->whenLoaded('user')),
            'reviewed_by' => new UserResource($this->whenLoaded('reviewedBy')),
        ];
    }
}

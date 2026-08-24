<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserBriefResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'          => $this->id,
            'employee_id' => $this->employee_id,
            'name'        => $this->name,
            'email'       => $this->email,
            'role'        => $this->role,
            'avatar_url'  => $this->avatar_url,
            'department'  => $this->whenLoaded('department', function () {
                return $this->department ? $this->department->name : null;
            }),
            'current_status' => $this->current_status,
        ];
    }
}

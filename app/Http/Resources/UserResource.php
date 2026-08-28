<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'              => $this->id,
            'employee_id'     => $this->employee_id,

            // Structured name fields
            'first_name'      => $this->first_name,
            'last_name'       => $this->last_name,
            'name'            => $this->full_name,   // computed: first + last (falls back to legacy `name`)

            'email'           => $this->email,
            'phone'           => $this->phone,
            'gender'          => $this->gender,
            'birth_date'      => $this->birth_date ? $this->birth_date->toDateString() : null,
            'avatar_url'      => $this->avatar_url,

            'role'            => $this->role,
            'employment_type' => $this->employment_type,
            'work_mode'       => $this->work_mode,
            'status'          => $this->status,
            'current_status'  => $this->current_status,

            'department'      => new DepartmentResource($this->whenLoaded('department')),
            'designation'     => new DesignationResource($this->whenLoaded('designation')),
            'shift'           => new ShiftResource($this->whenLoaded('shift')),
            'manager'         => new UserBriefResource($this->whenLoaded('manager')),

            'join_date'       => $this->join_date ? $this->join_date->toDateString() : null,
            'address'         => $this->address,
            'emergency_contact'     => $this->emergency_contact,
            'education'           => $this->education,
            'annual_leave_balance'  => $this->annual_leave_balance,
            'sick_leave_balance'    => $this->sick_leave_balance,
            'casual_leave_balance'  => $this->casual_leave_balance,
            'created_at'      => $this->created_at ? $this->created_at->toISOString() : null,
        ];
    }
}

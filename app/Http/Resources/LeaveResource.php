<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class LeaveResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'               => $this->id,
            'user'             => new UserBriefResource($this->whenLoaded('user')),
            'leave_type'       => new LeaveTypeResource($this->whenLoaded('leaveType')),
            'start_date'       => $this->start_date ? $this->start_date->toDateString() : null,
            'end_date'         => $this->end_date ? $this->end_date->toDateString() : null,
            'days_requested'   => (float) $this->days_requested,
            'is_half_day'      => $this->is_half_day,
            'half_day_period'  => $this->half_day_period,
            'reason'           => $this->reason,
            'attachment_url'   => $this->attachment ? url("/api/leaves/{$this->id}/attachment") : null,
            'status'           => $this->status,
            'status_label'     => $this->status_label,
            'can_be_cancelled' => $this->can_be_cancelled,
            'manager_remarks'  => $this->manager_remarks,
            'ceo_remarks'      => $this->ceo_remarks,
            'reviewed_by_manager' => new UserBriefResource($this->whenLoaded('reviewedByManager')),
            'reviewed_by_ceo'     => new UserBriefResource($this->whenLoaded('reviewedByCeo')),
            'manager_reviewed_at' => $this->manager_reviewed_at ? $this->manager_reviewed_at->toISOString() : null,
            'ceo_reviewed_at'     => $this->ceo_reviewed_at ? $this->ceo_reviewed_at->toISOString() : null,
            'created_at'          => $this->created_at ? $this->created_at->toISOString() : null,
        ];
    }
}

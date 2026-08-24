<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DesignationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'          => $this->id,
            'title'       => $this->title,
            'description' => $this->description,
            'is_active'   => $this->is_active,
            'department'  => new DepartmentResource($this->whenLoaded('department')),
        ];
    }
}

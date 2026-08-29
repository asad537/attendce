<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckInRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'work_mode'    => 'sometimes|in:office,remote,hybrid,weekend',
            'note'         => 'nullable|string|max:500',
            'check_in_lat' => 'nullable|numeric|between:-90,90',
            'check_in_lng' => 'nullable|numeric|between:-180,180',
        ];
    }
}

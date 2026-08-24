<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreShiftRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'               => 'required|string|max:100',
            'start_time'         => 'required|date_format:H:i',
            'end_time'           => 'required|date_format:H:i',
            'grace_minutes'      => 'sometimes|integer|min:0|max:60',
            'max_overtime_hours' => 'sometimes|integer|min:0|max:12',
            'is_night_shift'     => 'boolean',
        ];
    }
}

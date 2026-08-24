<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHolidayRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'         => 'required|string|max:100',
            'date'         => 'required|date',
            'end_date'     => 'nullable|date|after_or_equal:date',
            'description'  => 'nullable|string|max:500',
            'type'         => 'required|in:public,optional,restricted',
            'is_recurring' => 'boolean',
        ];
    }
}

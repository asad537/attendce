<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeaveRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'leave_type_id'  => 'required|exists:leave_types,id',
            'start_date'     => 'required|date|after_or_equal:today',
            'end_date'       => 'required|date|after_or_equal:start_date',
            'is_half_day'    => 'boolean',
            'half_day_period'=> 'required_if:is_half_day,true|in:morning,afternoon',
            'reason'         => 'required|string|min:10|max:1000',
            'attachment'     => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048',
        ];
    }
}

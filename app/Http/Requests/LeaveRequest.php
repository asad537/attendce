<?php

namespace App\Http\Requests;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

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
            'reason'         => 'required|string|min:10',
            'attachment'     => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:5120',
            'drive_link'     => 'nullable|url',
            'is_confidential'=> 'boolean',
            'signature'      => 'nullable|string',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->hasAny(['start_date', 'end_date'])) return;

            $start = Carbon::parse($this->input('start_date'))->startOfDay();
            $end = Carbon::parse($this->input('end_date'))->startOfDay();

            if ($start->year !== $end->year) {
                $validator->errors()->add('end_date', 'A leave request must stay within one calendar year.');
            }

            if ($start->diffInDays($end) > 366) {
                $validator->errors()->add('end_date', 'The requested leave period is too long.');
            }

            if ($this->boolean('is_half_day') && !$start->equalTo($end)) {
                $validator->errors()->add('end_date', 'A half-day leave must start and end on the same date.');
            }
        });
    }
}

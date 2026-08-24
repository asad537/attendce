<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeaveReviewRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'action'  => 'required|in:approve,reject',
            'remarks' => 'nullable|string|max:500',
        ];
    }
}

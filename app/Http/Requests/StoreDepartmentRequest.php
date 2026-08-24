<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDepartmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'       => 'required|string|max:100',
            'code'       => 'required|string|max:10|unique:departments,code',
            'description'=> 'nullable|string|max:500',
            'manager_id' => 'nullable|exists:users,id',
        ];
    }
}

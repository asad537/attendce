<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        // Route model binding may return a User instance or a raw ID
        $routeUser = $this->route('user');
        $userId    = is_object($routeUser) ? $routeUser->id : $routeUser;

        return [
            // ── Identity ──────────────────────────────────────────
            'first_name'      => 'sometimes|string|min:2|max:100',
            'last_name'       => 'sometimes|string|min:2|max:100',
            'gender'          => 'sometimes|in:male,female,other',
            'birth_date'      => 'sometimes|nullable|date|before:today',

            // ── Contact ───────────────────────────────────────────
            'email'           => "sometimes|email:rfc,dns|unique:users,email,{$userId}",
            'phone'           => 'sometimes|nullable|string|regex:/^\+?[0-9\s\-\(\)]{7,20}$/',

            // ── Password (user changes own password from settings) ─
            'current_password' => 'required_with:new_password|string',
            'new_password'     => 'sometimes|nullable|string|min:8|confirmed',

            // ── Role & Employment ─────────────────────────────────
            'role'            => 'sometimes|in:employee,manager',
            'employment_type' => 'sometimes|in:full_time,part_time,contract,intern',
            'status'          => 'sometimes|in:active,inactive,suspended',

            // ── Org Placement ─────────────────────────────────────
            'department_id'   => 'sometimes|nullable|exists:departments,id',
            'designation_id'  => 'sometimes|nullable|exists:designations,id',
            'shift_id'        => 'sometimes|nullable|exists:shifts,id',
            'manager_id'      => 'sometimes|nullable|exists:users,id',

            // ── Dates ─────────────────────────────────────────────
            'join_date'       => 'sometimes|nullable|date',

            // ── Optional extras ───────────────────────────────────
            'address'           => 'sometimes|nullable|string|max:500',
            'emergency_contact' => 'sometimes|nullable|string|max:100',
            'avatar'            => 'sometimes|nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.min'         => 'First name must be at least 2 characters.',
            'last_name.min'          => 'Last name must be at least 2 characters.',
            'gender.in'              => 'Gender must be male, female, or other.',
            'birth_date.before'      => 'Date of birth must be in the past.',
            'email.email'            => 'Please provide a valid email address.',
            'email.unique'           => 'This email address is already taken.',
            'phone.regex'            => 'Phone number format is invalid.',
            'role.in'                => 'Role must be employee or manager.',
            'new_password.min'       => 'Password must be at least 8 characters.',
            'new_password.confirmed' => 'Password confirmation does not match.',
            'current_password.required_with' => 'Current password is required to set a new password.',
            'avatar.mimes'           => 'Avatar must be a jpg, jpeg, png, or webp image.',
            'avatar.max'             => 'Avatar must not exceed 2 MB.',
        ];
    }
}

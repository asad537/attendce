<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $auth = $this->user();

        // Role options depend on who is creating:
        // CEO     → employee | tl | manager
        // Manager → employee | tl
        // TL      → employee only
        if ($auth && $auth->isManager()) {
            $allowedRoles = 'in:employee,tl';
        } elseif ($auth && $auth->isTl()) {
            $allowedRoles = 'in:employee';
        } else {
            $allowedRoles = 'in:employee,tl,manager';
        }

        return [
            // ── Identity ──────────────────────────────────────────
            'first_name'      => 'required|string|min:2|max:100',
            'last_name'       => 'required|string|min:2|max:100',
            'gender'          => 'required|in:male,female,other',
            'birth_date'      => 'required|date|before:today',

            // ── Contact ───────────────────────────────────────────
            'email'           => 'required|email|unique:users,email',
            'phone'           => 'required|string|regex:/^\+?[0-9\s\-\(\)]{7,20}$/',

            // ── Role & Employment ─────────────────────────────────
            'role'            => "required|{$allowedRoles}",
            'allowed_ip'      => 'nullable|string|ip',
            'employment_type' => 'required|in:full_time,part_time,contract,intern',
            'work_mode'       => 'sometimes|in:office,remote,hybrid',
            'status'          => 'sometimes|in:active,inactive,suspended',

            // ── Org Placement ─────────────────────────────────────
            'department_id'   => 'required|exists:departments,id',
            'designation_id'  => 'required|exists:designations,id',
            'shift_id'        => 'nullable|exists:shifts,id',
            'manager_id'      => 'nullable|exists:users,id',

            // ── Dates ─────────────────────────────────────────────
            'join_date'       => 'nullable|date',

            // ── Optional extras ───────────────────────────────────
            'address'           => 'nullable|string|max:500',
            'emergency_contact' => 'nullable|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.required'    => 'First name is required.',
            'first_name.min'         => 'First name must be at least 2 characters.',
            'last_name.required'     => 'Last name is required.',
            'last_name.min'          => 'Last name must be at least 2 characters.',
            'gender.required'        => 'Gender is required.',
            'gender.in'              => 'Gender must be male, female, or other.',
            'birth_date.required'    => 'Date of birth is required.',
            'birth_date.before'      => 'Date of birth must be in the past.',
            'email.required'         => 'Email address is required.',
            'email.email'            => 'Please provide a valid email address.',
            'email.unique'           => 'This email address is already taken.',
            'phone.required'         => 'Phone number is required.',
            'phone.regex'            => 'Phone number format is invalid.',
            'role.required'          => 'Role is required.',
            'role.in'                => 'Role must be employee, team lead, or manager.',
            'employment_type.required' => 'Employment type is required.',
            'department_id.required' => 'Department is required.',
            'department_id.exists'   => 'Selected department does not exist.',
            'designation_id.required'=> 'Designation (position) is required.',
            'designation_id.exists'  => 'Selected designation does not exist.',
        ];
    }
}

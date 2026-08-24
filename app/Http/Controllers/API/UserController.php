<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /** GET /api/users */
    public function index(Request $request): JsonResponse
    {
        $auth  = $request->user();
        $query = User::with(['department', 'designation', 'shift', 'manager'])
            ->withTrashed(false)
            ->orderBy('first_name')
            ->orderBy('last_name');

        if ($auth->isEmployee()) {
            // Employees can only see themselves
            return response()->json(['users' => [new UserResource($auth->load(['department', 'designation', 'shift']))]]);
        }

        if ($auth->isManager()) {
            $query->where(function ($q) use ($auth) {
                $q->where('manager_id', $auth->id)->orWhere('id', $auth->id);
            });
        }

        if ($request->filled('department_id')) $query->where('department_id', $request->department_id);
        if ($request->filled('role'))          $query->where('role', $request->role);
        if ($request->filled('status'))        $query->where('status', $request->status);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('first_name', 'like', "%$s%")
                  ->orWhere('last_name', 'like', "%$s%")
                  ->orWhere('name', 'like', "%$s%")
                  ->orWhere('email', 'like', "%$s%")
                  ->orWhere('employee_id', 'like', "%$s%");
            });
        }

        $users = $query->paginate((int) $request->get('per_page', 20));

        return response()->json([
            'data' => UserResource::collection($users->items()),
            'meta' => [
                'total'        => $users->total(),
                'per_page'     => $users->perPage(),
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
            ],
        ]);
    }

    /** POST /api/users */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $data = $request->validated();

        // Derive the `name` column from first + last for backward compatibility
        $data['name'] = trim($data['first_name'] . ' ' . $data['last_name']);

        // Auto-generate a secure temporary password
        $plainPassword    = Str::random(10) . rand(10, 99) . '!';
        $data['password'] = Hash::make($plainPassword);

        // Auto-generate employee ID
        $last = User::withTrashed()->orderByDesc('id')->first();
        $data['employee_id'] = 'EMP-' . str_pad(($last ? $last->id : 0) + 1, 4, '0', STR_PAD_LEFT);

        // Default status
        $data['status'] = $data['status'] ?? 'active';

        $user = User::create($data);
        $user->assignRole($data['role']);

        // Initialize leave balances for current year
        $year       = (int) date('Y');
        $leaveTypes = LeaveType::active()->get();
        foreach ($leaveTypes as $lt) {
            LeaveBalance::firstOrCreate(
                ['user_id' => $user->id, 'leave_type_id' => $lt->id, 'year' => $year],
                ['allocated' => $lt->days_allowed_per_year, 'used' => 0, 'carried_forward' => 0]
            );
        }

        AuditService::log(
            'user_created',
            'user',
            "User {$user->full_name} created",
            $request->user()->id,
            User::class,
            $user->id,
            null,
            ['email' => $user->email, 'role' => $user->role]
        );

        return response()->json([
            'message'            => 'Employee created successfully.',
            // Return plain password ONCE so the CEO can share it with the new employee
            'temporary_password' => $plainPassword,
            'user'               => new UserResource($user->load(['department', 'designation', 'shift'])),
        ], 201);
    }

    /** GET /api/users/{id} */
    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorize('view', $user);
        return response()->json([
            'user' => new UserResource($user->load(['department', 'designation', 'shift', 'manager'])),
        ]);
    }

    /** PUT /api/users/{id} */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $data = $request->validated();

        // Rebuild the legacy `name` column when first/last are updated
        $firstName = $data['first_name'] ?? $user->first_name;
        $lastName  = $data['last_name']  ?? $user->last_name;
        if (isset($data['first_name']) || isset($data['last_name'])) {
            $data['name'] = trim($firstName . ' ' . $lastName);
        }

        $oldRole = $user->role;

        // Handle password change (employee changing own password from settings)
        if (isset($data['new_password'])) {
            if (!Hash::check($data['current_password'], $user->password)) {
                return response()->json(['message' => 'Current password is incorrect.'], 422);
            }
            $data['password'] = Hash::make($data['new_password']);
        }
        unset($data['current_password'], $data['new_password'], $data['new_password_confirmation']);

        if ($request->hasFile('avatar')) {
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $user->update($data);

        if (isset($data['role']) && $data['role'] !== $oldRole) {
            $user->syncRoles([$data['role']]);
        }

        AuditService::log('user_updated', 'user', "User {$user->full_name} updated", $request->user()->id, User::class, $user->id);

        return response()->json([
            'message' => 'Employee updated.',
            'user'    => new UserResource($user->fresh(['department', 'designation', 'shift'])),
        ]);
    }

    /** DELETE /api/users/{id} */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorize('delete', $user);
        $name = $user->full_name;
        $user->delete();
        AuditService::log('user_deleted', 'user', "User {$name} deleted", $request->user()->id, User::class, $user->id);
        return response()->json(['message' => 'Employee deleted.']);
    }
}

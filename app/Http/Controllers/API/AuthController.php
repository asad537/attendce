<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        if ($user->status !== 'active') {
            return response()->json(['message' => 'Your account is not active. Please contact HR.'], 403);
        }

        $token = $user->createToken('auth-token', ['*'], now()->addDays(7))->plainTextToken;

        AuditService::log('login', 'auth', "User {$user->name} logged in", $user->id);

        return response()->json([
            'user'  => new UserResource($user->load(['department', 'designation', 'shift', 'manager'])),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        AuditService::log('logout', 'auth', 'User logged out', $request->user()->id);
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['department', 'designation', 'shift', 'manager']);
        return response()->json(['user' => new UserResource($user)]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'             => 'sometimes|string|max:100',
            'phone'            => 'nullable|string|max:20',
            'address'          => 'nullable|string|max:500',
            'emergency_contact'=> 'nullable|string|max:100',
            'avatar'           => 'nullable|image|max:1024',
            'current_password' => 'required_with:new_password',
            'new_password'     => 'nullable|string|min:8|confirmed',
        ]);

        if (isset($validated['current_password'])) {
            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json(['message' => 'Current password is incorrect.'], 422);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        if ($request->hasFile('avatar')) {
            $user->avatar = $request->file('avatar')->store('avatars', 'public');
        }

        $user->fill(\Arr::only($validated, ['name', 'phone', 'address', 'emergency_contact']));
        $user->save();

        return response()->json([
            'message' => 'Profile updated.',
            'user'    => new UserResource($user->fresh(['department', 'designation', 'shift'])),
        ]);
    }
}

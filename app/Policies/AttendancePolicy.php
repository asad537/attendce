<?php

namespace App\Policies;

use App\Models\Attendance;
use App\Models\User;

class AttendancePolicy
{
    /** CEO sees all */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /** Employee sees own; Manager sees team; CEO sees all */
    public function view(User $auth, Attendance $attendance): bool
    {
        if ($auth->isCeo()) return true;
        if ($auth->isManager()) {
            return $attendance->user_id === $auth->id
                || $attendance->user->manager_id === $auth->id;
        }
        return $attendance->user_id === $auth->id;
    }

    /** Only CEO can manually create/edit attendance */
    public function create(User $user): bool
    {
        return $user->isCeo();
    }

    public function update(User $user, Attendance $attendance): bool
    {
        return $user->isCeo();
    }
}

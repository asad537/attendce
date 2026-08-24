<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /** CEO can manage all users */
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $auth, User $target): bool
    {
        if ($auth->isCeo()) return true;
        if ($auth->isManager()) {
            return $target->id === $auth->id || $target->manager_id === $auth->id;
        }
        return $target->id === $auth->id;
    }

    public function create(User $user): bool
    {
        return $user->isCeo();
    }

    public function update(User $auth, User $target): bool
    {
        if ($auth->isCeo()) return true;
        return $target->id === $auth->id;
    }

    public function delete(User $auth, User $target): bool
    {
        return $auth->isCeo() && $target->id !== $auth->id;
    }
}

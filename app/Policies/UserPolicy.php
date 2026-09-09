<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $auth, User $target): bool
    {
        if ($auth->isCeo()) return true;
        // Managers administer every employee/TL profile listed in My Team.
        if ($auth->isManager()) {
            return $target->id === $auth->id || in_array($target->role, ['employee', 'tl'], true);
        }
        // Team leads can view only their own direct reports.
        if ($auth->isTl()) {
            return $target->id === $auth->id || $target->manager_id === $auth->id;
        }
        return $target->id === $auth->id;
    }

    /**
     * Who can create users:
     * - CEO      → anyone (employee / tl / manager)
     * - Manager  → tl or employee
     * - TL       → employee only
     */
    public function create(User $user): bool
    {
        return $user->isCeo() || $user->isManager() || $user->isTl();
    }

    /**
     * Who can update a user:
     * - CEO     → anyone
     * - Manager → any employee / team lead + themselves
     * - TL      → their own direct reports (employee) + themselves
     * - Anyone  → themselves
     */
    public function update(User $auth, User $target): bool
    {
        if ($auth->isCeo()) return true;
        if ($auth->isManager()) {
            return $target->id === $auth->id || in_array($target->role, ['tl', 'employee'], true);
        }
        if ($auth->isTl()) {
            return $target->id === $auth->id || $target->manager_id === $auth->id;
        }
        return $target->id === $auth->id;
    }

    /**
     * Who can delete a user:
     * - CEO     → anyone except themselves
     * - Manager → any employee / team lead, not themselves
     * - TL      → their own direct report employees, not themselves
     */
    public function delete(User $auth, User $target): bool
    {
        if ($target->id === $auth->id) return false; // no self-delete

        if ($auth->isCeo()) return true;

        if ($auth->isManager()) {
            return in_array($target->role, ['tl', 'employee'], true);
        }

        if ($auth->isTl()) {
            // TL can only delete their direct employees
            return $target->manager_id === $auth->id
                && $target->role === 'employee';
        }

        return false;
    }
}

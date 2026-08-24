<?php

namespace App\Policies;

use App\Models\Leave;
use App\Models\User;

class LeavePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $auth, Leave $leave): bool
    {
        if ($auth->isCeo()) return true;

        // Manager or TL can see their direct reports' leaves
        if ($auth->isManager() || $auth->isTl()) {
            return $leave->user_id === $auth->id
                || $leave->user->manager_id === $auth->id;
        }

        return $leave->user_id === $auth->id;
    }

    /**
     * CEO is the company owner — does not submit leave requests.
     * Everyone else (manager, TL, employee) can.
     */
    public function create(User $user): bool
    {
        return !$user->isCeo();
    }

    /**
     * Manager OR TL can do the first-level review for their direct reports.
     * The route is still called "manager-review" but TLs use it for their team.
     */
    public function managerReview(User $auth, Leave $leave): bool
    {
        return ($auth->isManager() || $auth->isTl())
            && $leave->user->manager_id === $auth->id
            && $leave->status === 'pending';
    }

    /** CEO final decision (after manager/TL approval or rejection) */
    public function ceoReview(User $auth, Leave $leave): bool
    {
        return $auth->isCeo()
            && in_array($leave->status, ['pending', 'manager_approved', 'manager_rejected']);
    }

    /** Anyone can cancel their own pending leave */
    public function cancel(User $auth, Leave $leave): bool
    {
        return $leave->user_id === $auth->id
            && in_array($leave->status, ['pending', 'manager_approved'])
            && $leave->start_date->isFuture();
    }
}

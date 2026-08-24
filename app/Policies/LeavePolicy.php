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
        if ($auth->isManager()) {
            return $leave->user_id === $auth->id
                || $leave->user->manager_id === $auth->id;
        }
        return $leave->user_id === $auth->id;
    }

    /**
     * CEO is the company owner and does not request leave.
     * Only managers and employees can submit leave requests.
     */
    public function create(User $user): bool
    {
        return !$user->isCeo();
    }

    /** Manager can review (approve/reject at manager level) */
    public function managerReview(User $auth, Leave $leave): bool
    {
        return $auth->isManager()
            && $leave->user->manager_id === $auth->id
            && $leave->status === 'pending';
    }

    /** CEO final decision */
    public function ceoReview(User $auth, Leave $leave): bool
    {
        return $auth->isCeo()
            && in_array($leave->status, ['pending', 'manager_approved', 'manager_rejected']);
    }

    /** Employee/Manager cancels own pending leave */
    public function cancel(User $auth, Leave $leave): bool
    {
        return $leave->user_id === $auth->id
            && in_array($leave->status, ['pending', 'manager_approved'])
            && $leave->start_date->isFuture();
    }
}

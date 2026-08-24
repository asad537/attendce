<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WfhRequest;

class WfhRequestPolicy
{
    public function viewAny(User $user): bool { return true; }

    public function view(User $auth, WfhRequest $wfhRequest): bool
    {
        if ($auth->isCeo()) return true;
        if ($auth->isManager() || $auth->isTl()) {
            return $wfhRequest->user_id === $auth->id || $wfhRequest->user->manager_id === $auth->id;
        }
        return $wfhRequest->user_id === $auth->id;
    }

    public function create(User $user): bool
    {
        return !$user->isCeo();
    }

    public function review(User $auth, WfhRequest $wfhRequest): bool
    {
        return ($auth->isManager() || $auth->isTl()) 
            && $wfhRequest->user->manager_id === $auth->id 
            && $wfhRequest->status === 'pending';
    }

    public function cancel(User $auth, WfhRequest $wfhRequest): bool
    {
        return $wfhRequest->user_id === $auth->id 
            && $wfhRequest->status === 'pending';
    }
}

<?php

namespace App\Providers;

use App\Models\Attendance;
use App\Models\Leave;
use App\Models\User;
use App\Policies\AttendancePolicy;
use App\Policies\LeavePolicy;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Attendance::class => AttendancePolicy::class,
        Leave::class      => LeavePolicy::class,
        User::class       => UserPolicy::class,
    ];

    public function boot()
    {
        $this->registerPolicies();

        // CEO gate — super admin bypass
        Gate::before(function (User $user, $ability) {
            if ($user->isCeo()) return true;
        });

        Gate::define('manage-organization', fn (User $user): bool => $user->isCeo());
        Gate::define('view-audit-logs', fn (User $user): bool => $user->isCeo());
    }
}

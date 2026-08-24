<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    public function run()
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Permissions (guard: web — default)
        $permissions = [
            'view_own_attendance', 'view_team_attendance', 'view_all_attendance',
            'manage_attendance',
            'request_leave', 'manager_review_leave', 'ceo_review_leave',
            'view_own_leaves', 'view_team_leaves', 'view_all_leaves',
            'view_own_profile', 'view_team_members', 'manage_users',
            'manage_departments',
            'manage_shifts',
            'view_own_reports', 'view_team_reports', 'view_all_reports', 'export_reports',
            'manage_holidays',
            'view_audit_logs',
            'send_notifications',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        $employee = Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'web']);
        $tl       = Role::firstOrCreate(['name' => 'tl',       'guard_name' => 'web']);
        $manager  = Role::firstOrCreate(['name' => 'manager',  'guard_name' => 'web']);
        $ceo      = Role::firstOrCreate(['name' => 'ceo',      'guard_name' => 'web']);

        $employee->syncPermissions([
            'view_own_attendance', 'request_leave', 'view_own_leaves',
            'view_own_profile', 'view_own_reports',
        ]);

        // TL: same as manager — leads their direct-report team
        $tl->syncPermissions([
            'view_own_attendance', 'view_team_attendance',
            'request_leave', 'manager_review_leave',
            'view_own_leaves', 'view_team_leaves',
            'view_own_profile', 'view_team_members',
            'view_own_reports', 'view_team_reports',
        ]);

        $manager->syncPermissions([
            'view_own_attendance', 'view_team_attendance',
            'request_leave', 'manager_review_leave',
            'view_own_leaves', 'view_team_leaves',
            'view_own_profile', 'view_team_members',
            'view_own_reports', 'view_team_reports',
        ]);

        $ceo->syncPermissions($permissions);
    }
}

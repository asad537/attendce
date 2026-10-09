<?php

namespace Database\Seeders;

use App\Models\Designation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AmirPresidentSeeder extends Seeder
{
    /** Create or restore the requested President / CEO account. */
    public function run(): void
    {
        $user = User::withTrashed()->firstOrNew(['email' => '786amir@gmail.com']);

        if ($user->exists && $user->trashed()) {
            $user->restore();
        }

        $user->fill([
            'employee_id'    => 'CEO-AMIR-786',
            'first_name'     => 'Amir',
            'last_name'      => '',
            'name'           => 'Amir',
            'role'           => 'ceo',
            'status'         => 'active',
            'employment_type'=> 'full_time',
            'work_mode'      => 'office',
            'designation_id' => Designation::where('title', 'President')->value('id'),
            'join_date'      => now()->toDateString(),
        ]);
        $user->password = Hash::make('Amir@Pass@786');
        $user->save();

        Role::firstOrCreate(['name' => 'ceo', 'guard_name' => 'web']);
        $user->syncRoles(['ceo']);
    }
}

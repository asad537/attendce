<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function employee(array $overrides = []): User
    {
        return User::create(array_merge([
            'employee_id' => 'EMP-' . random_int(1000, 9999),
            'first_name' => 'Test',
            'last_name' => 'Employee',
            'name' => 'Test Employee',
            'email' => uniqid('employee-', true) . '@example.test',
            'password' => bcrypt('password'),
            'phone' => '+1234567890',
            'gender' => 'other',
            'role' => 'employee',
            'employment_type' => 'full_time',
            'status' => 'active',
            'birth_date' => '1990-01-01',
        ], $overrides));
    }

    public function test_employee_cannot_promote_their_own_account(): void
    {
        $employee = $this->employee();
        Sanctum::actingAs($employee);

        $this->putJson("/api/users/{$employee->id}", ['role' => 'manager'])
            ->assertForbidden();

        $this->assertSame('employee', $employee->fresh()->role);
    }

    public function test_employee_cannot_mutate_organization_configuration(): void
    {
        $employee = $this->employee();
        Sanctum::actingAs($employee);

        $this->postJson('/api/departments', [
            'name' => 'Unauthorized',
            'code' => 'NOPE',
        ])->assertForbidden();
    }

    public function test_inactive_account_cannot_use_an_authenticated_api_route(): void
    {
        $employee = $this->employee(['status' => 'suspended']);
        Sanctum::actingAs($employee);

        $this->getJson('/api/me')->assertForbidden();
    }

    public function test_manager_cannot_assign_a_project_to_someone_outside_their_team(): void
    {
        $manager = $this->employee(['role' => 'manager']);
        $outsideEmployee = $this->employee();
        Sanctum::actingAs($manager);

        $this->postJson('/api/projects', [
            'name' => 'Unauthorized cross-team project',
            'project_lead_id' => $outsideEmployee->id,
        ])->assertForbidden();
    }

    public function test_manager_can_assign_a_project_to_their_direct_report(): void
    {
        $manager = $this->employee(['role' => 'manager']);
        $directReport = $this->employee(['manager_id' => $manager->id]);
        Sanctum::actingAs($manager);

        $this->postJson('/api/projects', [
            'name' => 'Scoped team project',
            'project_lead_id' => $directReport->id,
        ])->assertCreated();
    }
}

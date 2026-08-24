<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\Leave;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    public function test_leave_request_rejects_cross_year_ranges_before_iteration(): void
    {
        $employee = $this->employee();
        $leaveType = LeaveType::create([
            'name' => 'Annual Leave',
            'code' => 'ANNUAL',
            'days_allowed_per_year' => 20,
        ]);
        Sanctum::actingAs($employee);

        $start = now()->addYear()->endOfYear()->subDay();
        $this->postJson('/api/leaves', [
            'leave_type_id' => $leaveType->id,
            'start_date' => $start->toDateString(),
            'end_date' => $start->copy()->addDays(2)->toDateString(),
            'reason' => 'A sufficiently detailed leave request reason.',
        ])->assertUnprocessable()->assertJsonValidationErrors('end_date');

        $this->assertDatabaseCount('leaves', 0);
    }

    public function test_future_year_leave_uses_that_years_balance(): void
    {
        $employee = $this->employee();
        $leaveType = LeaveType::create([
            'name' => 'Annual Leave',
            'code' => 'ANNUAL',
            'days_allowed_per_year' => 20,
        ]);
        Sanctum::actingAs($employee);

        $start = now()->addYear()->startOfMonth()->addDay();
        $this->postJson('/api/leaves', [
            'leave_type_id' => $leaveType->id,
            'start_date' => $start->toDateString(),
            'end_date' => $start->copy()->addDays(2)->toDateString(),
            'reason' => 'A sufficiently detailed leave request reason.',
        ])->assertCreated();

        $this->assertTrue(LeaveBalance::where([
            'user_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'year' => $start->year,
        ])->exists());
    }

    public function test_rejected_cross_team_ticket_assignment_does_not_store_attachment(): void
    {
        Storage::fake('local');
        $manager = $this->employee(['role' => 'manager']);
        $outsideEmployee = $this->employee();
        $project = Project::create(['name' => 'Scoped project', 'created_by' => $manager->id]);
        Sanctum::actingAs($manager);

        $this->postJson("/api/projects/{$project->id}/tickets", [
            'title' => 'Unauthorized assignment',
            'assignee_id' => $outsideEmployee->id,
            'attachment' => UploadedFile::fake()->create('evidence.pdf', 100, 'application/pdf'),
        ])->assertForbidden();

        $this->assertSame([], Storage::disk('local')->allFiles('ticket-attachments'));
        $this->assertDatabaseCount('project_tickets', 0);
    }

    public function test_report_range_is_bounded(): void
    {
        $employee = $this->employee();
        Sanctum::actingAs($employee);

        $this->getJson('/api/reports/attendance-summary?start_date=2020-01-01&end_date=2025-01-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('end_date');
    }

    public function test_employee_cannot_check_in_during_approved_leave(): void
    {
        $employee = $this->employee();
        $leaveType = LeaveType::create([
            'name' => 'Annual Leave',
            'code' => 'ANNUAL',
            'days_allowed_per_year' => 20,
        ]);
        Leave::create([
            'user_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'start_date' => today(),
            'end_date' => today(),
            'days_requested' => 1,
            'reason' => 'Approved leave for conflict regression test.',
            'status' => 'approved',
        ]);
        Sanctum::actingAs($employee);

        $this->postJson('/api/attendance/check-in', ['work_mode' => 'office'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'You cannot check in while you are on approved leave.');

        $this->assertDatabaseCount('attendance', 0);
    }

    public function test_failed_leave_approval_rolls_back_status_and_balance(): void
    {
        $ceo = $this->employee(['role' => 'ceo']);
        $employee = $this->employee();
        $leaveType = LeaveType::create([
            'name' => 'Annual Leave',
            'code' => 'ANNUAL',
            'days_allowed_per_year' => 0,
        ]);
        $leave = Leave::create([
            'user_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'start_date' => today()->addDay(),
            'end_date' => today()->addDay(),
            'days_requested' => 1,
            'reason' => 'Pending leave with no available balance.',
            'status' => 'pending',
        ]);
        LeaveBalance::create([
            'user_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'year' => $leave->start_date->year,
            'allocated' => 0,
            'used' => 0,
        ]);
        Sanctum::actingAs($ceo);

        $this->postJson("/api/leaves/{$leave->id}/ceo-review", ['action' => 'approve'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('action');

        $this->assertSame('pending', $leave->fresh()->status);
        $this->assertSame('0.0', LeaveBalance::first()->used);
    }
}

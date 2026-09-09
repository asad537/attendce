<?php
namespace Tests\Feature;

use App\Models\{User, CallRoom, CallParticipant};
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CallEndTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Isolate call tests from unrelated MySQL-only attendance migrations.
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            foreach (['name', 'email', 'password', 'first_name', 'last_name', 'avatar', 'remember_token'] as $field) $table->string($field)->nullable();
            $table->string('role')->default('employee');
            $table->string('status')->default('active');
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
        foreach (['2026_08_27_140000_create_call_signals_table.php', '2026_09_01_120000_create_call_participants_table.php'] as $file) require_once database_path('migrations/' . $file);
        (new \CreateCallSignalsTable)->up();
        (new \CreateCallParticipantsTable)->up();
        (require database_path('migrations/2026_09_09_150000_create_call_rooms_table.php'))->up();
    }

    public function test_only_creator_can_end_room_and_guests_cannot_rejoin(): void
    {
        $host = User::factory()->create(['role' => 'employee', 'status' => 'active']);
        $member = User::factory()->create(['role' => 'employee', 'status' => 'active']);
        Sanctum::actingAs($host);
        $this->postJson('/api/calls/signal', ['call_id' => 'test-room', 'to_user_id' => $member->id, 'type' => 'invite'])->assertOk();
        $this->assertEquals($host->id, CallRoom::find('test-room')->host_id);
        $token = $this->postJson('/api/guest-call/invite', ['call_id' => 'test-room'])->assertOk()->json('token');
        $guest = $this->postJson('/api/guest-call/join', ['token' => $token, 'name' => 'Test guest'])->assertCreated()->json();
        $this->postJson('/api/guest-call/heartbeat', ['guest_token' => $guest['guest_token'], 'kind' => 'video'])->assertOk();

        Sanctum::actingAs($member);
        $this->postJson('/api/calls/leave', ['call_id' => 'test-room', 'end_for_all' => true])->assertForbidden();
        $this->postJson('/api/calls/leave', ['call_id' => 'test-room'])->assertOk();
        $this->assertNull(CallRoom::find('test-room')->ended_at);

        Sanctum::actingAs($host);
        $this->postJson('/api/calls/leave', ['call_id' => 'test-room', 'end_for_all' => true])->assertOk();
        $this->assertNotNull(CallRoom::find('test-room')->ended_at);
        $this->assertDatabaseHas('call_signals', ['call_id' => 'test-room', 'to_user_id' => $member->id, 'type' => 'call-ended']);
        $this->assertDatabaseHas('call_signals', ['call_id' => 'test-room', 'to_user_id' => $guest['guest']['id'], 'type' => 'call-ended']);
        $this->assertEquals(0, CallParticipant::where('call_id', 'test-room')->count());
        $this->postJson('/api/calls/join', ['call_id' => 'test-room', 'kind' => 'video'])->assertStatus(410);
        $this->postJson('/api/guest-call/heartbeat', ['guest_token' => $guest['guest_token'], 'kind' => 'video'])->assertStatus(410);
        $this->postJson('/api/guest-call/join', ['token' => $token, 'name' => 'Late guest'])->assertStatus(410);
    }
}

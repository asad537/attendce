<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('call_rooms', function (Blueprint $table) {
            $table->string('call_id', 40)->primary();
            $table->unsignedBigInteger('host_id');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
        });
        // Preserve ownership for calls already in progress at deployment.
        $firstInvites = \Illuminate\Support\Facades\DB::table('call_signals')
            ->where('type', 'invite')->selectRaw('MIN(id) as id')->groupBy('call_id');
        foreach (\Illuminate\Support\Facades\DB::table('call_signals')->whereIn('id', $firstInvites)->get() as $invite) {
            \Illuminate\Support\Facades\DB::table('call_rooms')->insertOrIgnore([
                'call_id' => $invite->call_id, 'host_id' => $invite->from_user_id,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }
    public function down(): void { Schema::dropIfExists('call_rooms'); }
};

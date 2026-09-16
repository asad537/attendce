<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddDeviceLockToUsers extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // When on, the account only works from the device(s) the President
            // has approved (the first device to sign in binds automatically).
            $table->boolean('device_lock')->default(false)->after('allowed_ip');
        });

        Schema::create('trusted_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('device_id', 64);          // random id the browser keeps
            $table->string('label', 200)->nullable(); // browser / OS summary
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'device_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trusted_devices');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('device_lock');
        });
    }
}

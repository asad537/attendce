<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAdvancedOptionsToLeaveAndWfh extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('leaves', function (Blueprint $table) {
            $table->string('drive_link')->nullable();
            $table->boolean('is_confidential')->default(false);
            $table->text('signature')->nullable();
        });

        Schema::table('wfh_requests', function (Blueprint $table) {
            $table->string('attachment')->nullable();
            $table->string('drive_link')->nullable();
            $table->boolean('is_confidential')->default(false);
            $table->text('signature')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('leaves', function (Blueprint $table) {
            $table->dropColumn(['drive_link', 'is_confidential', 'signature']);
        });

        Schema::table('wfh_requests', function (Blueprint $table) {
            $table->dropColumn(['attachment', 'drive_link', 'is_confidential', 'signature']);
        });
    }
}

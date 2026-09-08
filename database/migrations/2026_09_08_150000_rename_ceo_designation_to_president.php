<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class RenameCeoDesignationToPresident extends Migration
{
    public function up()
    {
        DB::table('designations')
            ->where('title', 'Chief Executive Officer')
            ->update(['title' => 'President']);
    }

    public function down()
    {
        DB::table('designations')
            ->where('title', 'President')
            ->update(['title' => 'Chief Executive Officer']);
    }
}

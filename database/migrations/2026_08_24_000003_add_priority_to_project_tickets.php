<?php
use Illuminate\Database\Migrations\Migration; use Illuminate\Database\Schema\Blueprint; use Illuminate\Support\Facades\Schema;
class AddPriorityToProjectTickets extends Migration { public function up(){Schema::table('project_tickets',function(Blueprint $t){$t->string('priority')->default('medium');});} public function down(){Schema::table('project_tickets',function(Blueprint $t){$t->dropColumn('priority');});} }

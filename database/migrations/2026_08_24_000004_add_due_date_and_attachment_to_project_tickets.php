<?php
use Illuminate\Database\Migrations\Migration; use Illuminate\Database\Schema\Blueprint; use Illuminate\Support\Facades\Schema;
class AddDueDateAndAttachmentToProjectTickets extends Migration { public function up(){Schema::table('project_tickets',function(Blueprint $t){$t->date('due_date')->nullable();$t->string('attachment_path')->nullable();$t->string('attachment_name')->nullable();});} public function down(){Schema::table('project_tickets',function(Blueprint $t){$t->dropColumn(['due_date','attachment_path','attachment_name']);});} }

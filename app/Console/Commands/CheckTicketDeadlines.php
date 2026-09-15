<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ProjectTicket;
use App\Services\NotificationService;
use Carbon\Carbon;
use App\Models\User;

class CheckTicketDeadlines extends Command
{
    protected $signature = 'tickets:check-deadlines';
    protected $description = 'Check for overdue tickets and notify relevant users';

    public function handle()
    {
        $overdueTickets = ProjectTicket::with(['project.project_lead', 'assignee'])
            ->whereNotNull('deadline')
            ->where('deadline', '<=', Carbon::now())
            ->where('status', '!=', 'done')
            ->where('deadline_notified', false)
            ->get();

        if ($overdueTickets->isEmpty()) {
            return Command::SUCCESS;
        }

        $ceos = User::where('role', 'ceo')->get();
        $managers = User::where('role', 'manager')->get();

        foreach ($overdueTickets as $ticket) {
            $title = "Ticket Overdue: {$ticket->title}";
            $message = "The deadline for ticket #{$ticket->id} has passed.";
            $link = "/projects/{$ticket->project_id}?ticket={$ticket->id}";

            // Notify Assignee
            if ($ticket->assignee) {
                NotificationService::send($ticket->assignee, $title, $message, 'error', $link, $ticket);
            }

            // Notify Project Lead (TL)
            if ($ticket->project && $ticket->project->project_lead) {
                NotificationService::send($ticket->project->project_lead, $title, $message, 'error', $link, $ticket);
            }

            // Notify Managers
            foreach ($managers as $manager) {
                NotificationService::send($manager, $title, $message, 'error', $link, $ticket);
            }

            // Notify CEOs
            foreach ($ceos as $ceo) {
                NotificationService::send($ceo, $title, $message, 'error', $link, $ticket);
            }

            $ticket->update(['deadline_notified' => true]);
        }

        $this->info("Notified for {$overdueTickets->count()} overdue tickets.");
        return Command::SUCCESS;
    }
}

<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class PruneOldNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:prune';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete notifications that are older than 7 days';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $threshold = now()->subDays(7);
        $count = \App\Models\Notification::where('created_at', '<', $threshold)->delete();
        
        $this->info("Pruned {$count} old notifications.");
        return 0;
    }
}

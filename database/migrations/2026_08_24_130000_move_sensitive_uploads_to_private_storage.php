<?php

use App\Models\Leave;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Storage;

class MoveSensitiveUploadsToPrivateStorage extends Migration
{
    public function up()
    {
        $this->moveFiles(Leave::whereNotNull('attachment')->pluck('attachment')->all());
        $this->moveFiles(User::whereNotNull('avatar')->pluck('avatar')->all());
    }

    private function moveFiles(array $paths): void
    {
        foreach (array_unique(array_filter($paths)) as $path) {
            if (Storage::disk('local')->exists($path) || !Storage::disk('public')->exists($path)) {
                continue;
            }

            Storage::disk('local')->put($path, Storage::disk('public')->get($path));
            Storage::disk('public')->delete($path);
        }
    }

    public function down()
    {
        // Security migration is intentionally irreversible: sensitive files stay private.
    }
}

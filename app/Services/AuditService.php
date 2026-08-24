<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditService
{
    public static function log(
        string $action,
        string $module,
        ?string $description = null,
        ?int $userId = null,
        ?string $modelType = null,
        ?int $modelId = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): AuditLog {
        $request = app(Request::class);

        return AuditLog::create([
            'user_id'     => $userId ?? optional(auth('sanctum')->user())->id,
            'action'      => $action,
            'module'      => $module,
            'description' => $description,
            'model_type'  => $modelType,
            'model_id'    => $modelId,
            'old_values'  => $oldValues,
            'new_values'  => $newValues,
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
        ]);
    }
}

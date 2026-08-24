<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /** GET /api/audit-logs (CEO only) */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('user')->orderByDesc('created_at');

        if ($request->filled('module'))  $query->where('module', $request->module);
        if ($request->filled('user_id')) $query->where('user_id', $request->user_id);
        if ($request->filled('action'))  $query->where('action', 'like', '%' . $request->action . '%');
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('created_at', [
                $request->start_date . ' 00:00:00',
                $request->end_date   . ' 23:59:59',
            ]);
        }

        $logs = $query->paginate((int) $request->get('per_page', 25));

        return response()->json([
            'data' => AuditLogResource::collection($logs->items()),
            'meta' => [
                'total'        => $logs->total(),
                'per_page'     => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
            ],
        ]);
    }
}

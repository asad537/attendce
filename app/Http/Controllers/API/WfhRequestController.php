<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\WfhRequestResource;
use App\Models\User;
use App\Models\WfhRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WfhRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = WfhRequest::with(['user', 'reviewedBy'])->orderByDesc('created_at');

        if ($user->isEmployee()) {
            $query->where('user_id', $user->id);
        } elseif ($user->isManager() || $user->isTl()) {
            $teamIds = User::where('manager_id', $user->id)->pluck('id')->push($user->id);
            $query->whereIn('user_id', $teamIds);
        }
        
        if ($request->filled('user_id') && !$user->isEmployee()) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $wfh = $query->paginate(max(1, min((int) $request->get('per_page', 15), 100)));

        return response()->json([
            'data' => WfhRequestResource::collection($wfh->items()),
            'meta' => [
                'total'        => $wfh->total(),
                'per_page'     => $wfh->perPage(),
                'current_page' => $wfh->currentPage(),
                'last_page'    => $wfh->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', WfhRequest::class);
        $data = $request->validate([
            'start_date'      => 'required|date|after_or_equal:today',
            'end_date'        => 'required|date|after_or_equal:start_date',
            'is_half_day'     => 'boolean',
            'half_day_period' => 'required_if:is_half_day,1,true|in:morning,afternoon',
            'reason'          => 'required|string|max:1000',
        ]);

        $data['user_id'] = $request->user()->id;
        $data['is_half_day'] = $request->boolean('is_half_day');

        $wfh = WfhRequest::create($data);

        return response()->json([
            'message' => 'Work From Home request submitted.',
            'wfh'     => new WfhRequestResource($wfh),
        ], 201);
    }

    public function review(Request $request, WfhRequest $wfhRequest): JsonResponse
    {
        $this->authorize('review', $wfhRequest);
        $request->validate([
            'action'  => 'required|in:approve,reject',
            'remarks' => 'required_if:action,reject|string|max:500|nullable'
        ]);

        $wfhRequest->update([
            'status' => $request->action === 'approve' ? 'approved' : 'rejected',
            'reviewed_by_id' => $request->user()->id,
            'remarks' => $request->remarks,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => "WFH request {$request->action}d.",
            'wfh'     => new WfhRequestResource($wfhRequest->fresh()),
        ]);
    }

    public function cancel(Request $request, WfhRequest $wfhRequest): JsonResponse
    {
        $this->authorize('cancel', $wfhRequest);
        $wfhRequest->delete();

        return response()->json(['message' => 'WFH request cancelled.']);
    }

    public function pendingCount(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->isCeo() || $user->isEmployee()) {
            return response()->json(['count' => 0]);
        }

        $teamIds = User::where('manager_id', $user->id)->pluck('id');
        $count = WfhRequest::whereIn('user_id', $teamIds)->where('status', 'pending')->count();

        return response()->json(['count' => $count]);
    }
}

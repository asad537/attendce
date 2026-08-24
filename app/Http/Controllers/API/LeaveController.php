<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\LeaveRequest;
use App\Http\Requests\LeaveReviewRequest;
use App\Http\Resources\LeaveBalanceResource;
use App\Http\Resources\LeaveResource;
use App\Models\Leave;
use App\Models\LeaveBalance;
use App\Models\User;
use App\Services\LeaveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class LeaveController extends Controller
{
    private $service;
    public function __construct(LeaveService $service) { $this->service = $service; }

    /** GET /api/leaves */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = Leave::with(['user.department', 'leaveType', 'reviewedByManager', 'reviewedByCeo'])
            ->orderByDesc('created_at');

        if ($user->isEmployee()) {
            $query->where('user_id', $user->id);
        } elseif ($user->isTeamLead()) {
            $teamIds = User::where('manager_id', $user->id)->pluck('id')->push($user->id);
            $query->whereIn('user_id', $teamIds);
        }

        if ($request->filled('status'))  $query->where('status', $request->status);
        if ($request->filled('user_id') && !$user->isEmployee()) $query->where('user_id', $request->user_id);
        if ($request->filled('year'))    $query->whereYear('start_date', $request->year);

        $leaves = $query->paginate((int) $request->get('per_page', 15));

        return response()->json([
            'data' => LeaveResource::collection($leaves->items()),
            'meta' => [
                'total'        => $leaves->total(),
                'per_page'     => $leaves->perPage(),
                'current_page' => $leaves->currentPage(),
                'last_page'    => $leaves->lastPage(),
            ],
        ]);
    }

    /** POST /api/leaves */
    public function store(LeaveRequest $request): JsonResponse
    {
        // CEO is the company owner and does not submit leave requests
        if ($request->user()->isCeo()) {
            return response()->json(['message' => 'CEO does not require leave requests.'], 403);
        }

        $this->authorize('create', Leave::class);

        try {
            $leave = $this->service->requestLeave(
                $request->user(),
                $request->validated(),
                $request->file('attachment')
            );
            return response()->json([
                'message' => 'Leave request submitted.',
                'leave'   => new LeaveResource($leave),
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** GET /api/leaves/{id} */
    public function show(Request $request, Leave $leave): JsonResponse
    {
        $this->authorize('view', $leave);
        return response()->json([
            'leave' => new LeaveResource($leave->load(['user.department', 'leaveType', 'reviewedByManager', 'reviewedByCeo'])),
        ]);
    }

    public function downloadAttachment(Request $request, Leave $leave)
    {
        $this->authorize('view', $leave);
        abort_unless($leave->attachment, 404);

        if (Storage::disk('local')->exists($leave->attachment)) {
            return Storage::disk('local')->download($leave->attachment);
        }

        // Backward-compatible access for attachments created before private storage.
        abort_unless(Storage::disk('public')->exists($leave->attachment), 404);
        return Storage::disk('public')->download($leave->attachment);
    }

    /** POST /api/leaves/{id}/manager-review */
    public function managerReview(LeaveReviewRequest $request, Leave $leave): JsonResponse
    {
        $this->authorize('managerReview', $leave);

        $leave = $this->service->managerReview(
            $request->user(),
            $leave,
            $request->action,
            $request->remarks
        );

        return response()->json([
            'message' => "Leave {$request->action}d by manager.",
            'leave'   => new LeaveResource($leave),
        ]);
    }

    /** POST /api/leaves/{id}/ceo-review */
    public function ceoReview(LeaveReviewRequest $request, Leave $leave): JsonResponse
    {
        $this->authorize('ceoReview', $leave);

        $leave = $this->service->ceoReview(
            $request->user(),
            $leave,
            $request->action,
            $request->remarks
        );

        return response()->json([
            'message' => "Leave {$request->action}d by CEO.",
            'leave'   => new LeaveResource($leave),
        ]);
    }

    /** POST /api/leaves/{id}/cancel */
    public function cancel(Request $request, Leave $leave): JsonResponse
    {
        $this->authorize('cancel', $leave);

        $leave = $this->service->cancel($leave);

        return response()->json([
            'message' => 'Leave request cancelled.',
            'leave'   => new LeaveResource($leave),
        ]);
    }

    /** GET /api/leaves/balances */
    public function balances(Request $request): JsonResponse
    {
        // CEO has no leave balances
        if ($request->user()->isCeo()) {
            return response()->json(['balances' => [], 'year' => (int) $request->get('year', date('Y'))]);
        }

        $user    = $request->user();
        $year    = (int) $request->get('year', date('Y'));
        $userId  = $request->get('user_id', $user->id);

        // Employees (and TLs/managers checking own) can only see own balances
        if ($user->isEmployee()) {
            $userId = $user->id;
        } elseif ($user->isTeamLead()) {
            $allowedIds = User::where('manager_id', $user->id)->pluck('id')->push($user->id);
            abort_unless($allowedIds->contains((int) $userId), 403);
        }

        $balances = LeaveBalance::with('leaveType')
            ->where('user_id', $userId)
            ->where('year', $year)
            ->get();

        return response()->json([
            'balances' => LeaveBalanceResource::collection($balances),
            'year'     => $year,
        ]);
    }

    /** GET /api/leaves/pending-count - for dashboard badges */
    public function pendingCount(Request $request): JsonResponse
    {
        $user  = $request->user();

        // CEO sees all pending leave requests across the company
        if ($user->isCeo()) {
            $count = Leave::where('status', 'pending')->count();
            return response()->json(['count' => $count]);
        }

        $query = Leave::where('status', 'pending');

        if ($user->isTeamLead()) {
            $teamIds = User::where('manager_id', $user->id)->pluck('id');
            $query->whereIn('user_id', $teamIds);
        } else {
            // Employee sees 0 — they don't approve leaves
            return response()->json(['count' => 0]);
        }

        return response()->json(['count' => $query->count()]);
    }
}

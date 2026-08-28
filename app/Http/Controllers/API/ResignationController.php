<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Resignation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResignationController extends Controller
{
    /** GET /api/resignations — scoped to the viewer's role */
    public function index(Request $request): JsonResponse
    {
        $auth = $request->user();
        $query = Resignation::with(['user:id,name,employee_id,role,department_id', 'user.department:id,name', 'reviewer:id,name'])->latest();

        // Either the employee's manager OR the CEO can approve, so the CEO sees
        // the whole list while a manager/TL sees only their own reports (+ their own).
        if ($auth->role === 'ceo') {
            // all resignations
        } elseif (in_array($auth->role, ['manager', 'tl'])) {
            $ids = User::where('manager_id', $auth->id)->pluck('id')->push($auth->id);
            $query->whereIn('user_id', $ids);
        } else {
            $query->where('user_id', $auth->id);
        }

        return response()->json(['resignations' => $query->get()->map(fn ($r) => $this->format($r))]);
    }

    /** POST /api/resignations — submit a resignation */
    public function store(Request $request): JsonResponse
    {
        $auth = $request->user();
        $data = $request->validate([
            'last_working_day' => 'required|date|after:today',
            'reason' => 'required|string|max:5000',
        ]);

        abort_if(
            Resignation::where('user_id', $auth->id)->where('status', 'pending')->exists(),
            422, 'You already have a pending resignation.'
        );

        $resignation = Resignation::create([
            'user_id' => $auth->id,
            'last_working_day' => $data['last_working_day'],
            'reason' => $data['reason'],
        ]);

        return response()->json(['resignation' => $this->format($resignation->load('user'))], 201);
    }

    /** POST /api/resignations/{resignation}/review — approve or reject */
    public function review(Request $request, Resignation $resignation): JsonResponse
    {
        $auth = $request->user();
        abort_unless($this->canReview($auth, $resignation), 403, 'You are not allowed to review this resignation.');
        abort_unless($resignation->status === 'pending', 422, 'This resignation has already been processed.');

        $data = $request->validate([
            'action' => 'required|in:approve,reject',
            'remarks' => 'nullable|string|max:2000',
        ]);

        $resignation->update([
            'status' => $data['action'] === 'approve' ? 'approved' : 'rejected',
            'reviewed_by' => $auth->id,
            'reviewed_at' => now(),
            'remarks' => $data['remarks'] ?? null,
        ]);

        return response()->json(['resignation' => $this->format($resignation->load(['user', 'reviewer']))]);
    }

    /** POST /api/resignations/{resignation}/withdraw — owner cancels a pending one */
    public function withdraw(Request $request, Resignation $resignation): JsonResponse
    {
        abort_unless($resignation->user_id === $request->user()->id, 403);
        abort_unless($resignation->status === 'pending', 422, 'Only pending resignations can be withdrawn.');

        $resignation->update(['status' => 'withdrawn']);

        return response()->json(['resignation' => $this->format($resignation->load('user'))]);
    }

    private function canReview(User $auth, Resignation $resignation): bool
    {
        if ($resignation->user_id === $auth->id) return false; // cannot review your own
        // Either the CEO (any resignation) or the employee's own manager/lead may approve.
        if ($auth->role === 'ceo') return true;
        if (in_array($auth->role, ['manager', 'tl'])) {
            return User::where('id', $resignation->user_id)->where('manager_id', $auth->id)->exists();
        }
        return false;
    }

    private function format(Resignation $r): array
    {
        return [
            'id' => $r->id,
            'user' => [
                'id' => $r->user->id,
                'name' => $r->user->name,
                'employee_id' => $r->user->employee_id,
                'role' => $r->user->role,
                'department' => optional($r->user->department)->name,
            ],
            'last_working_day' => optional($r->last_working_day)->toDateString(),
            'reason' => $r->reason,
            'status' => $r->status,
            'reviewer' => $r->reviewer ? $r->reviewer->name : null,
            'reviewed_at' => $r->reviewed_at,
            'remarks' => $r->remarks,
            'created_at' => $r->created_at,
        ];
    }
}

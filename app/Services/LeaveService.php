<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Leave;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LeaveService
{
    /**
     * Submit a new leave request
     */
    public function requestLeave(User $user, array $data, $file = null): Leave
    {
        $leaveType = LeaveType::findOrFail($data['leave_type_id']);

        // Calculate business days
        $days = $data['is_half_day'] ?? false
            ? 0.5
            : $this->countBusinessDays($data['start_date'], $data['end_date']);

        $leaveYear = Carbon::parse($data['start_date'])->year;

        // A balance must exist for the year being requested. Future-year
        // requests must never bypass allocation checks because a row is absent.
        $balance = LeaveBalance::firstOrCreate(
            ['user_id' => $user->id, 'leave_type_id' => $leaveType->id, 'year' => $leaveYear],
            ['allocated' => $leaveType->days_allowed_per_year, 'used' => 0, 'carried_forward' => 0]
        );

        if ($balance->remaining < $days) {
            throw new \Exception("Insufficient leave balance. You have {$balance->remaining} days remaining.");
        }

        // Check for overlapping approved leaves
        $overlap = Leave::where('user_id', $user->id)
            ->whereIn('status', ['pending', 'manager_approved', 'approved'])
            ->where(function ($q) use ($data) {
                $q->whereBetween('start_date', [$data['start_date'], $data['end_date']])
                  ->orWhereBetween('end_date', [$data['start_date'], $data['end_date']])
                  ->orWhere(function ($q2) use ($data) {
                      $q2->where('start_date', '<=', $data['start_date'])
                         ->where('end_date', '>=', $data['end_date']);
                  });
            })->exists();

        if ($overlap) {
            throw new \Exception('You already have a leave request for the overlapping dates.');
        }

        $attachment = null;
        if ($file) {
            $attachment = $file->store('leave-attachments');
        }

        $leave = Leave::create([
            'user_id'        => $user->id,
            'leave_type_id'  => $leaveType->id,
            'start_date'     => $data['start_date'],
            'end_date'       => $data['end_date'],
            'days_requested' => $days,
            'is_half_day'    => $data['is_half_day'] ?? false,
            'half_day_period'=> $data['half_day_period'] ?? null,
            'reason'         => $data['reason'],
            'attachment'     => $attachment,
            'status'         => 'pending',
        ]);

        AuditService::log('leave_requested', 'leave', "Leave requested by {$user->name}", $user->id, Leave::class, $leave->id);

        // Notify manager
        if ($user->manager) {
            NotificationService::send(
                $user->manager,
                'New Leave Request',
                "{$user->name} has requested {$days} day(s) of {$leaveType->name}.",
                'info',
                null,
                $leave
            );
        }

        // Also notify CEO
        NotificationService::notifyCeo(
            'New Leave Request',
            "{$user->name} has requested {$days} day(s) of {$leaveType->name}.",
            'info',
            $leave
        );

        return $leave->load(['leaveType', 'user']);
    }

    /**
     * Manager reviews a leave (approve/reject at manager level)
     */
    public function managerReview(User $manager, Leave $leave, string $action, ?string $remarks = null): Leave
    {
        $status = $action === 'approve' ? 'manager_approved' : 'manager_rejected';

        $leave->update([
            'status'               => $status,
            'reviewed_by_manager'  => $manager->id,
            'manager_reviewed_at'  => now(),
            'manager_remarks'      => $remarks,
        ]);

        AuditService::log("manager_{$action}d_leave", 'leave', "Manager {$manager->name} {$action}d leave", $manager->id, Leave::class, $leave->id);

        // Notify employee
        NotificationService::send(
            $leave->user,
            'Leave Request Update',
            "Your leave request has been {$action}d by your manager. " . ($remarks ? "Remarks: {$remarks}" : ''),
            $action === 'approve' ? 'success' : 'warning',
            null,
            $leave
        );

        // Notify CEO if approved by manager (needs final decision)
        if ($action === 'approve') {
            NotificationService::notifyCeo(
                'Leave Awaiting Final Approval',
                "{$leave->user->name}'s leave request has been approved by manager and awaits your final decision.",
                'info',
                $leave
            );
        }

        return $leave->fresh(['user', 'leaveType', 'reviewedByManager']);
    }

    /**
     * CEO gives final decision
     */
    public function ceoReview(User $ceo, Leave $leave, string $action, ?string $remarks = null): Leave
    {
        $status = $action === 'approve' ? 'approved' : 'rejected';

        $leave = DB::transaction(function () use ($ceo, $leave, $status, $remarks) {
            $lockedLeave = Leave::whereKey($leave->id)->lockForUpdate()->firstOrFail();

            if (!in_array($lockedLeave->status, ['pending', 'manager_approved', 'manager_rejected'], true)) {
                throw ValidationException::withMessages(['action' => 'This leave request has already been reviewed.']);
            }

            // Deduct before changing status. The conditional database update is
            // the final balance check and prevents concurrent approvals overspending.
            if ($status === 'approved') {
                $hasWorkedInRange = Attendance::where('user_id', $lockedLeave->user_id)
                    ->whereBetween('date', [$lockedLeave->start_date, $lockedLeave->end_date])
                    ->whereNotNull('check_in')
                    ->exists();
                if ($hasWorkedInRange) {
                    throw ValidationException::withMessages([
                        'action' => 'Leave cannot be approved because attendance is already recorded in this period.',
                    ]);
                }
                $this->deductLeaveBalance($lockedLeave);
            }

            $lockedLeave->update([
                'status'          => $status,
                'reviewed_by_ceo' => $ceo->id,
                'ceo_reviewed_at' => now(),
                'ceo_remarks'     => $remarks,
            ]);

            if ($status === 'approved') {
                $this->markAttendanceOnLeave($lockedLeave);
            }

            return $lockedLeave;
        });

        AuditService::log("ceo_{$action}d_leave", 'leave', "CEO {$ceo->name} {$action}d leave", $ceo->id, Leave::class, $leave->id);

        // Notify employee
        NotificationService::send(
            $leave->user,
            'Leave Request ' . ucfirst($status),
            "Your leave request has been {$status} by the CEO. " . ($remarks ? "Remarks: {$remarks}" : ''),
            $status === 'approved' ? 'success' : 'error',
            null,
            $leave
        );

        // Notify manager
        if ($leave->user->manager) {
            NotificationService::send(
                $leave->user->manager,
                'Leave Request ' . ucfirst($status),
                "{$leave->user->name}'s leave has been {$status} by the CEO.",
                'info',
                null,
                $leave
            );
        }

        return $leave->fresh(['user', 'leaveType', 'reviewedByCeo', 'reviewedByManager']);
    }

    /**
     * Cancel a leave (by employee)
     */
    public function cancel(Leave $leave): Leave
    {
        // If approved, restore balance
        if ($leave->status === 'approved') {
            $this->restoreLeaveBalance($leave);
            $this->unmarkAttendanceOnLeave($leave);
        }

        $leave->update(['status' => 'cancelled']);

        AuditService::log('leave_cancelled', 'leave', "Leave cancelled", $leave->user_id, Leave::class, $leave->id);

        return $leave;
    }

    // ─── Private Helpers ────────────────────────────────────────────────

    private function deductLeaveBalance(Leave $leave): void
    {
        $leaveType = LeaveType::findOrFail($leave->leave_type_id);
        LeaveBalance::firstOrCreate(
            ['user_id' => $leave->user_id, 'leave_type_id' => $leave->leave_type_id, 'year' => $leave->start_date->year],
            ['allocated' => $leaveType->days_allowed_per_year, 'used' => 0, 'carried_forward' => 0]
        );

        $updated = LeaveBalance::where('user_id', $leave->user_id)
            ->where('leave_type_id', $leave->leave_type_id)
            ->where('year', $leave->start_date->year)
            ->whereRaw('(allocated + carried_forward - used) >= ?', [(float) $leave->days_requested])
            ->increment('used', $leave->days_requested);

        if ($updated !== 1) {
            throw ValidationException::withMessages(['action' => 'Insufficient leave balance for this approval.']);
        }
    }

    private function restoreLeaveBalance(Leave $leave): void
    {
        LeaveBalance::where('user_id', $leave->user_id)
            ->where('leave_type_id', $leave->leave_type_id)
            ->where('year', $leave->start_date->year)
            ->decrement('used', $leave->days_requested);
    }

    private function markAttendanceOnLeave(Leave $leave): void
    {
        $period = CarbonPeriod::create($leave->start_date, $leave->end_date);
        foreach ($period as $date) {
            if ($date->isWeekday()) {
                $attendance = Attendance::firstOrNew([
                    'user_id' => $leave->user_id,
                    'date' => $date->toDateString(),
                ]);
                if (!$attendance->check_in) {
                    $attendance->status = 'on_leave';
                    $attendance->save();
                }
            }
        }
    }

    private function unmarkAttendanceOnLeave(Leave $leave): void
    {
        Attendance::where('user_id', $leave->user_id)
            ->whereBetween('date', [$leave->start_date, $leave->end_date])
            ->where('status', 'on_leave')
            ->whereNull('check_in')
            ->delete();
    }

    private function countBusinessDays(string $start, string $end): float
    {
        $period = CarbonPeriod::create($start, $end);
        $count  = 0;
        foreach ($period as $date) {
            if ($date->isWeekday()) $count++;
        }
        return (float) $count;
    }
}

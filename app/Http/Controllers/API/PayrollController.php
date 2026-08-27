<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Payroll;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->isCeo(), 403);
        $month = Carbon::createFromFormat('Y-m', $request->get('month', now()->format('Y-m')))->startOfMonth();
        $users = User::active()->with(['department:id,name', 'designation:id,title'])->orderBy('name')->get();
        $payrolls = Payroll::whereDate('payroll_month', $month)->get()->keyBy('user_id');
        $overtime = Attendance::whereBetween('date', [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()])->selectRaw('user_id, SUM(overtime_minutes) as minutes')->groupBy('user_id')->pluck('minutes', 'user_id');

        $rows = $users->map(function ($user) use ($payrolls, $overtime, $month) {
            $record = $payrolls->get($user->id);
            $hours = round(($overtime->get($user->id, 0) ?: 0) / 60, 2);
            $overtimePay = round($hours * (float) ($record->overtime_rate ?? 0), 2);
            $total = (float) ($record->base_salary ?? 0) + (float) ($record->allowances ?? 0) + (float) ($record->incentives ?? 0) + $overtimePay - (float) ($record->deductions ?? 0);
            return [
                'id' => $record->id ?? null, 'month' => $month->format('Y-m'),
                'user' => ['id' => $user->id, 'name' => $user->name, 'employee_id' => $user->employee_id, 'department' => optional($user->department)->name, 'designation' => optional($user->designation)->title],
                'base_salary' => (float) ($record->base_salary ?? 0), 'allowances' => (float) ($record->allowances ?? 0),
                'incentives' => (float) ($record->incentives ?? 0), 'deductions' => (float) ($record->deductions ?? 0),
                'overtime_rate' => (float) ($record->overtime_rate ?? 0), 'overtime_hours' => $hours, 'overtime_pay' => $overtimePay,
                'total' => round($total, 2), 'status' => $record->status ?? 'draft', 'paid_at' => $record->paid_at ?? null,
            ];
        });

        $summary = ['salary' => $rows->sum('base_salary'), 'allowances' => $rows->sum('allowances'), 'incentives' => $rows->sum('incentives'), 'deductions' => $rows->sum('deductions'), 'overtime' => $rows->sum('overtime_pay'), 'total' => $rows->sum('total')];
        $trend = collect(range(11, 0))->map(function ($offset) {
            $date = now()->startOfMonth()->subMonths($offset);
            $records = Payroll::whereDate('payroll_month', $date)->get();
            return ['month' => $date->format('M'), 'salary' => (float) $records->sum('base_salary'), 'allowances' => (float) $records->sum('allowances'), 'incentives' => (float) $records->sum('incentives')];
        });
        return response()->json(['rows' => $rows, 'summary' => $summary, 'trend' => $trend]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()->isCeo(), 403);
        $data = $request->validate([
            'month' => 'required|date_format:Y-m', 'base_salary' => 'required|numeric|min:0|max:999999999',
            'allowances' => 'required|numeric|min:0|max:999999999', 'incentives' => 'required|numeric|min:0|max:999999999',
            'deductions' => 'required|numeric|min:0|max:999999999', 'overtime_rate' => 'required|numeric|min:0|max:999999',
            'status' => 'required|in:draft,unpaid,paid',
        ]);
        $month = Carbon::createFromFormat('Y-m', $data['month'])->startOfMonth()->toDateString();
        $payroll = Payroll::updateOrCreate(['user_id' => $user->id, 'payroll_month' => $month], array_merge($data, ['payroll_month' => $month, 'updated_by' => $request->user()->id, 'paid_at' => $data['status'] === 'paid' ? now() : null]));
        return response()->json(['message' => 'Payroll updated.', 'payroll' => $payroll]);
    }
}

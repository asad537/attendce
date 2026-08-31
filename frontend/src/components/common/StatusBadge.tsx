import React from 'react';
import { AttendanceStatus, CurrentStatus, LeaveStatus } from '../../types';

const statusConfig: Record<string, { label: string; className: string }> = {
  // Attendance
  present:        { label: 'Present',        className: 'badge-green' },
  absent:         { label: 'Absent',         className: 'badge-red' },
  late:           { label: 'Late',           className: 'badge-yellow' },
  half_day:       { label: 'Half Day',       className: 'badge-yellow' },
  on_leave:       { label: 'On Leave',       className: 'badge-blue' },
  holiday:        { label: 'Holiday',        className: 'badge-emerald' },
  work_from_home: { label: 'WFM',            className: 'badge-purple' },
  weekend:        { label: 'Weekend',        className: 'badge-gray' },
  // Current status
  working:        { label: 'Working',        className: 'badge-green' },
  on_break:       { label: 'On Break',       className: 'badge-yellow' },
  checked_out:    { label: 'Checked Out',    className: 'badge-gray' },
  // Leave
  pending:           { label: 'Pending',            className: 'badge-yellow' },
  manager_approved:  { label: 'Manager Approved',   className: 'badge-blue' },
  manager_rejected:  { label: 'Mgr Rejected',       className: 'badge-red' },
  approved:          { label: 'Approved',            className: 'badge-green' },
  rejected:          { label: 'Rejected',            className: 'badge-red' },
  cancelled:         { label: 'Cancelled',           className: 'badge-gray' },
};

interface Props {
  status: AttendanceStatus | CurrentStatus | LeaveStatus | string;
  pulse?: boolean;
}

export default function StatusBadge({ status, pulse }: Props) {
  const config = statusConfig[status] || { label: status, className: 'badge-gray' };
  return (
    <span className={config.className}>
      {pulse && config.className === 'badge-green' && (
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
      {config.label}
    </span>
  );
}

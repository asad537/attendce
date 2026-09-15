import { useEffect, useState } from 'react';
import { auditService } from '../../services/reportService';
import { AuditLog, PaginatedResponse } from '../../types';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CeoAuditLogs() {
  const [logs, setLogs] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState('all');

  const departmentName = (log: AuditLog) =>
    log.user?.role === 'ceo' ? 'Executive' : (log.user?.department || 'Unassigned');

  useEffect(() => {
    auditService.getList({ per_page: 50 })
      .then(setLogs)
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const grouped = (logs?.data || []).reduce<Record<string, AuditLog[]>>((groups, log) => {
    const name = departmentName(log);
    if (department === 'all') {
      (groups['All departments'] ||= []).push(log);
    } else if (department === name) {
      (groups[name] ||= []).push(log);
    }
    return groups;
  }, {});
  const departments = Array.from(new Set((logs?.data || []).map(departmentName))).sort();

  const table = (items: AuditLog[]) => (
    <div className="card overflow-x-auto p-0">
      <table className="table">
        <thead><tr><th>Time</th><th>User</th><th>Department</th><th>Module</th><th>Action</th><th>Description</th></tr></thead>
        <tbody>{items.map((log) => (
          <tr key={log.id}>
            <td className="whitespace-nowrap">{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</td>
            <td>{log.user?.name || 'System'}</td>
            <td>{departmentName(log)}</td>
            <td>{log.module}</td>
            <td>{log.action}</td>
            <td>{log.description}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">Security and administrative activity</p>
        </div>
        <select value={department} onChange={e => setDepartment(e.target.value)} className="input w-full sm:w-60">
          <option value="all">All departments</option>
          {departments.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>
      {Object.keys(grouped).length ? Object.entries(grouped).map(([name, items]) => (
        <section key={name} className="space-y-2">
          {department !== 'all' && <div className="flex items-center gap-2"><h2 className="text-base font-bold text-gray-900">{name}</h2><span className="badge-gray">{items.length} logs</span></div>}
          {table(items)}
        </section>
      )) : <div className="card py-8 text-center text-gray-400">No audit activity found.</div>}
    </div>
  );
}

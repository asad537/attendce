import { useEffect, useState } from 'react';
import { auditService } from '../../services/reportService';
import { AuditLog, PaginatedResponse } from '../../types';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CeoAuditLogs() {
  const [logs, setLogs] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditService.getList({ per_page: 50 })
      .then(setLogs)
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">Security and administrative activity</p>
      </div>
      <div className="card p-0 overflow-x-auto">
        <table className="table">
          <thead><tr><th>Time</th><th>User</th><th>Module</th><th>Action</th><th>Description</th></tr></thead>
          <tbody>
            {logs?.data.length ? logs.data.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap">{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</td>
                <td>{log.user?.name || 'System'}</td>
                <td>{log.module}</td>
                <td>{log.action}</td>
                <td>{log.description}</td>
              </tr>
            )) : <tr><td colSpan={5} className="text-center py-8 text-gray-400">No audit activity found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

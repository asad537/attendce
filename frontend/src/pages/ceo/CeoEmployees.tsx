import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, departmentService } from '../../services/userService';
import { Department, PaginatedResponse, User } from '../../types';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../services/api';
import { format, parseISO } from 'date-fns';

export default function CeoEmployees() {
  const navigate = useNavigate();
  const [data, setData]           = useState<PaginatedResponse<User> | null>(null);
  const [departments, setDepts]   = useState<Department[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Modals
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, per_page: 15 };
      if (search)     params.search = search;
      if (filterDept) params.department_id = filterDept;
      if (filterRole) params.role = filterRole;

      const [usersRes, deptsRes] = await Promise.all([
        userService.getList(params),
        departmentService.getAll(),
      ]);

      setData(usersRes);
      setDepts(deptsRes);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [search, filterDept, filterRole]);

  useEffect(() => { load(); }, [load]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await userService.delete(deleteUser.id);
      toast.success(`${deleteUser.name} removed.`);
      setDeleteUser(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const roleColors: Record<string, string> = {
    employee: 'bg-emerald-100 text-emerald-700',
    tl:       'bg-cyan-100 text-cyan-700',
    manager:  'bg-blue-100 text-blue-700',
    ceo:      'bg-purple-100 text-purple-700',
  };

  const roleLabel: Record<string, string> = {
    employee: 'Employee',
    tl:       'Team Lead',
    manager:  'Manager',
    ceo:      'CEO',
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your workforce — add managers, team leads and employees</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/users/new')}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            + Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search name, email, ID…"
          className="input max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input w-44" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="input w-36" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          <option value="employee">Employee</option>
          <option value="tl">Team Lead (TL)</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <PageLoader /> : (
        <div className="card p-0">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!data?.data.length ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">No employees found.</td></tr>
                ) : data.data.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" /> : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">{u.name.charAt(0).toUpperCase()}</div>}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.employee_id} · {u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] || ''}`}>
                        {roleLabel[u.role] || u.role}
                      </span>
                    </td>
                    <td className="text-gray-600 text-sm">{u.department?.name || '—'}</td>
                    <td className="text-gray-600 text-sm">{u.designation?.title || '—'}</td>
                    <td className="text-gray-600 text-sm">{u.phone || '—'}</td>
                    <td><StatusBadge status={u.status} /></td>
                    <td className="text-gray-500 text-sm">
                      {u.join_date ? format(parseISO(u.join_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/users/${u.id}/edit`)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteUser(u)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.meta.last_page > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>{data.meta.total} employees total</span>
              <div className="flex gap-1">
                {Array.from({ length: data.meta.last_page }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => load(p)}
                    className={`px-3 py-1 rounded-lg transition-colors ${p === data.meta.current_page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} title="Remove Employee" size="sm">
        <p className="text-gray-600 text-sm">
          Are you sure you want to remove <span className="font-semibold text-gray-900">{deleteUser?.name}</span>?
          This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setDeleteUser(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">
            Remove
          </button>
        </div>
      </Modal>

    </div>
  );
}

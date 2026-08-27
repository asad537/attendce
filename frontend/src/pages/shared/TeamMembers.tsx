import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userService, departmentService } from '../../services/userService';
import { Department, PaginatedResponse, User } from '../../types';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../services/api';
import { format, parseISO } from 'date-fns';

export default function TeamMembers() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const authRole = authUser?.role ?? 'employee';

  const [data, setData]           = useState<PaginatedResponse<User> | null>(null);
  const [departments, setDepts]   = useState<Department[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Modals
  const [deleteUser, setDeleteUser]   = useState<User | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, per_page: 15 };
      if (search)     params.search = search;
      if (filterRole) params.role   = filterRole;

      const [usersRes, deptsRes] = await Promise.all([
        userService.getList(params),
        departmentService.getAll(),
      ]);
      setData(usersRes);
      setDepts(deptsRes);
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [search, filterRole]);

  useEffect(() => { load(); }, [load]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await userService.delete(deleteUser.id);
      toast.success(`${deleteUser.name} removed.`);
      setDeleteUser(null);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const roleColors: Record<string, string> = {
    employee: 'bg-emerald-100 text-emerald-700',
    tl:       'bg-cyan-100 text-cyan-700',
    manager:  'bg-blue-100 text-blue-700',
  };
  const roleLabel: Record<string, string> = {
    employee: 'Employee',
    tl:       'Team Lead',
    manager:  'Manager',
  };

  const pageTitle  = authRole === 'manager' ? 'My Team' : 'My Team Members';
  const pageDesc   = authRole === 'manager'
    ? 'Manage team leads and employees in your team'
    : 'Manage employees in your team';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pageDesc}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/users/new')}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            + Add New Employee
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
        {authRole === 'manager' && (
          <select className="input w-40" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="tl">Team Lead</option>
            <option value="employee">Employee</option>
          </select>
        )}
      </div>

      {loading ? <PageLoader /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {!data?.data.length ? (
              <div className="col-span-full text-center py-10 text-gray-400">No team members yet. Add your first one above.</div>
            ) : data.data.filter(u => u.id !== authUser?.id).map(u => {
              
              // Random-ish pastel background based on first letter
              const charCode = u.name.charCodeAt(0) || 65;
              const gradients = [
                'bg-gradient-to-br from-purple-50/50 to-white',
                'bg-gradient-to-br from-blue-50/50 to-white',
                'bg-gradient-to-br from-green-50/50 to-white',
                'bg-gradient-to-br from-orange-50/50 to-white',
                'bg-gradient-to-br from-pink-50/50 to-white',
                'bg-gradient-to-br from-teal-50/50 to-white'
              ];
              const avatarColors = [
                'bg-purple-100 text-purple-700',
                'bg-blue-100 text-blue-700',
                'bg-green-100 text-green-700',
                'bg-orange-100 text-orange-700',
                'bg-pink-100 text-pink-700',
                'bg-teal-100 text-teal-700'
              ];
              const colorIndex = charCode % gradients.length;
              
              return (
              <div 
                key={u.id} 
                className={`rounded-2xl border border-gray-100/60 shadow-sm p-5 relative flex flex-col hover:shadow-md transition-shadow cursor-pointer ${gradients[colorIndex]}`}
                onClick={() => navigate(`/users/${u.id}/details`)}
              >
                <div className="flex justify-between items-start mb-4">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${avatarColors[colorIndex]}`}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    {u.status === 'active' ? 'Active' : u.status}
                  </div>
                </div>
                
                <h3 className="font-bold text-gray-900 text-lg">{u.name}</h3>
                <div className="mt-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${roleColors[u.role] || ''}`}>
                    {roleLabel[u.role] || u.role}
                  </span>
                </div>
                
                <div className="mt-4 space-y-2 flex-grow text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate">{u.department?.name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="truncate">{u.designation?.title || '—'}</span>
                  </div>
                  {u.phone && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="truncate">{u.phone}</span>
                    </div>
                  )}
                  
                  <div className="pt-2 text-xs text-gray-400">
                    <p>{u.employee_id}</p>
                    <p className="truncate">{u.email}</p>
                  </div>
                </div>
                
                <div className="mt-5 pt-4 border-t border-gray-100/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Joined {u.join_date ? format(parseISO(u.join_date), 'MMM d, yyyy') : '—'}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/users/${u.id}/edit`); }}
                      className="p-1.5 rounded-lg border border-indigo-100 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteUser(u); }}
                      className="p-1.5 rounded-lg border border-red-100 bg-red-50/50 text-red-500 hover:bg-red-100 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {data && data.meta.last_page > 1 && (
            <div className="mt-8 px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>{data.meta.total} members</span>
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
        </>
      )}

      {/* ── Delete Confirm ────────────────────────────────────────────────────── */}
      <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} title="Remove Member" size="sm">
        <p className="text-sm text-gray-600">
          Remove <span className="font-semibold text-gray-900">{deleteUser?.name}</span> from your team?
          This cannot be undone.
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setDeleteUser(null)} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleDelete}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Remove
          </button>
        </div>
      </Modal>

    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { userService, departmentService, designationService } from '../../services/userService';
import {
  CreateEmployeePayload,
  Department,
  Designation,
  PaginatedResponse,
  User,
} from '../../types';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../services/api';
import { format, parseISO } from 'date-fns';

// ─── Role config per auth role ────────────────────────────────────────────────
// manager → can add TL or employee
// tl      → can add employee only
const allowedRolesFor = (authRole: string): Array<{ value: string; label: string }> => {
  if (authRole === 'manager') {
    return [
      { value: 'tl',       label: 'Team Lead (TL)' },
      { value: 'employee', label: 'Employee' },
    ];
  }
  return [{ value: 'employee', label: 'Employee' }];
};

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = (defaultRole: string): CreateEmployeePayload => ({
  first_name: '',
  last_name: '',
  gender: 'male',
  birth_date: '',
  email: '',
  phone: '',
  role: defaultRole as 'employee' | 'tl' | 'manager',
  employment_type: 'full_time',
  department_id: 0,
  designation_id: 0,
  shift_id: null,
  manager_id: null,
  join_date: '',
  address: '',
  emergency_contact: '',
  status: 'active',
});

// ─────────────────────────────────────────────────────────────────────────────
export default function TeamMembers() {
  const { user: authUser } = useAuth();
  const authRole = authUser?.role ?? 'employee';
  const roleOptions = allowedRolesFor(authRole);
  const defaultRole = roleOptions[0].value;

  const [data, setData]           = useState<PaginatedResponse<User> | null>(null);
  const [departments, setDepts]   = useState<Department[]>([]);
  const [designations, setDesigs] = useState<Designation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Modals
  const [addOpen, setAddOpen]         = useState(false);
  const [addRolePreset, setAddPreset] = useState(defaultRole);
  const [editUser, setEditUser]       = useState<User | null>(null);
  const [deleteUser, setDeleteUser]   = useState<User | null>(null);
  const [tempPwd, setTempPwd]         = useState<{ name: string; password: string; email: string } | null>(null);

  // Form
  const [form, setForm]           = useState<CreateEmployeePayload>(emptyForm(defaultRole));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, per_page: 15 };
      if (search)     params.search = search;
      if (filterRole) params.role   = filterRole;

      const [usersRes, deptsRes, desigRes] = await Promise.all([
        userService.getList(params),
        departmentService.getAll(),
        designationService.getAll(),
      ]);
      setData(usersRes);
      setDepts(deptsRes);
      setDesigs(desigRes);
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [search, filterRole]);

  useEffect(() => { load(); }, [load]);

  // Words that mark a designation as belonging to a higher role level.
  // Anything containing these should NOT be assignable to lower roles.
  const seniorityBans: Record<string, RegExp> = {
    // Employee can't hold any lead/managerial/exec title
    employee: /\b(chief|ceo|officer|director|head|vp|vice\s*president|president|manager|lead|team\s*lead|tl)\b/i,
    // TL can't hold managerial or executive titles
    tl:       /\b(chief|ceo|officer|director|head|vp|vice\s*president|president|manager)\b/i,
    // Manager can't hold executive titles
    manager:  /\b(chief|ceo|officer|director|vp|vice\s*president|president)\b/i,
    // CEO can pick anything
    ceo:      /^$a/,
  };

  // designations filtered by selected dept AND by role level of the form
  const filteredDesigs = (deptId: number, role: string) => {
    const byDept = deptId
      ? designations.filter(d => !d.department || d.department.id === deptId)
      : designations;
    const ban = seniorityBans[role];
    return ban ? byDept.filter(d => !ban.test(d.title)) : byDept;
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (f: CreateEmployeePayload): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!f.first_name.trim() || f.first_name.trim().length < 2) e.first_name = 'At least 2 characters.';
    if (!f.last_name.trim()  || f.last_name.trim().length < 2)  e.last_name  = 'At least 2 characters.';
    if (!f.gender)                  e.gender     = 'Required.';
    if (!f.birth_date)              e.birth_date = 'Required.';
    else if (new Date(f.birth_date) >= new Date()) e.birth_date = 'Must be in the past.';
    if (!f.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Valid email required.';
    if (!f.phone.trim() || !/^\+?[\d\s\-()\+]{7,20}$/.test(f.phone))    e.phone = 'Valid phone required.';
    if (!f.role)            e.role            = 'Required.';
    if (!f.employment_type) e.employment_type = 'Required.';
    if (!f.department_id)   e.department_id   = 'Required.';
    if (!f.designation_id)  e.designation_id  = 'Required.';
    return e;
  };

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await userService.createEmployee(form);
      toast.success(`${res.user.name} added!`);
      setTempPwd({ name: res.user.name, password: res.temporary_password, email: res.user.email });
      setAddOpen(false);
      setForm(emptyForm(defaultRole));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setSubmitting(false); }
  };

  // ── Update ──────────────────────────────────────────────────────────────────
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await userService.update(editUser.id, {
        first_name:        form.first_name,
        last_name:         form.last_name,
        gender:            form.gender,
        birth_date:        form.birth_date,
        email:             form.email,
        phone:             form.phone,
        role:              form.role,
        employment_type:   form.employment_type,
        status:            form.status,
        department_id:     form.department_id,
        designation_id:    form.designation_id,
        join_date:         form.join_date,
        address:           form.address,
        emergency_contact: form.emergency_contact,
      });
      toast.success('Member updated.');
      setEditUser(null);
      setForm(emptyForm(defaultRole));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setSubmitting(false); }
  };

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

  // ── Open edit ───────────────────────────────────────────────────────────────
  const openEdit = (u: User) => {
    setEditUser(u);
    setErrors({});
    setForm({
      first_name:        u.first_name || u.name.split(' ')[0] || '',
      last_name:         u.last_name  || u.name.split(' ').slice(1).join(' ') || '',
      gender:            (u.gender as any) || 'male',
      birth_date:        u.birth_date || '',
      email:             u.email,
      phone:             u.phone || '',
      role:              (['employee', 'tl'].includes(u.role) ? u.role : 'employee') as any,
      employment_type:   u.employment_type,
      status:            u.status,
      department_id:     u.department?.id || 0,
      designation_id:    u.designation?.id || 0,
      shift_id:          null,
      manager_id:        null,
      join_date:         u.join_date || '',
      address:           u.address || '',
      emergency_contact: u.emergency_contact || '',
    });
  };

  const F = (field: keyof CreateEmployeePayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(prev => {
        const next = { ...prev, [field]: e.target.value } as CreateEmployeePayload;
        // Role changed → previously chosen designation may now be off-limits.
        // Reset it so the user re-picks from the role-filtered list.
        if (field === 'role') next.designation_id = 0;
        return next;
      });
      setErrors(prev => ({ ...prev, [field]: '' }));
    };

  const Err = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-red-500 mt-1">{errors[field]}</p> : null;

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

  // ─── Add buttons ─────────────────────────────────────────────────────────
  const openAdd = (role: string) => {
    setAddPreset(role);
    setForm(emptyForm(role));
    setErrors({});
    setAddOpen(true);
  };

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
          {authRole === 'manager' && (
            <button
              onClick={() => openAdd('tl')}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
            >
              + Team Lead
            </button>
          )}
          <button
            onClick={() => openAdd('employee')}
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
        {authRole === 'manager' && (
          <select className="input w-40" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="tl">Team Lead</option>
            <option value="employee">Employee</option>
          </select>
        )}
      </div>

      {/* Table */}
      {loading ? <PageLoader /> : (
        <div className="card p-0">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
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
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      No team members yet. Add your first one above.
                    </td>
                  </tr>
                ) : data.data
                  // hide the logged-in user from the list
                  .filter(u => u.id !== authUser?.id)
                  .map(u => (
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
                          onClick={() => openEdit(u)}
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
                          title="Remove"
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

          {data && data.meta.last_page > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
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
        </div>
      )}

      {/* ── Add Modal ─────────────────────────────────────────────────────────── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={addRolePreset === 'tl' ? 'Add Team Lead' : 'Add Employee'}
        size="xl"
      >
        <MemberForm
          form={form} errors={errors}
          departments={departments}
          filteredDesigs={filteredDesigs(form.department_id, form.role)}
          roleOptions={roleOptions}
          submitting={submitting}
          onField={F}
          onDeptChange={e => {
            setForm(prev => ({ ...prev, department_id: Number(e.target.value), designation_id: 0 }));
            setErrors(prev => ({ ...prev, department_id: '' }));
          }}
          onSubmit={handleCreate}
          onCancel={() => setAddOpen(false)}
          mode="create"
        />
      </Modal>

      {/* ── Edit Modal ────────────────────────────────────────────────────────── */}
      <Modal
        open={!!editUser}
        onClose={() => { setEditUser(null); setErrors({}); }}
        title={`Edit — ${editUser?.name}`}
        size="xl"
      >
        <MemberForm
          form={form} errors={errors}
          departments={departments}
          filteredDesigs={filteredDesigs(form.department_id, form.role)}
          roleOptions={roleOptions}
          submitting={submitting}
          onField={F}
          onDeptChange={e => {
            setForm(prev => ({ ...prev, department_id: Number(e.target.value), designation_id: 0 }));
            setErrors(prev => ({ ...prev, department_id: '' }));
          }}
          onSubmit={handleUpdate}
          onCancel={() => { setEditUser(null); setErrors({}); }}
          mode="edit"
        />
      </Modal>

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

      {/* ── Temp Password Modal ───────────────────────────────────────────────── */}
      <Modal open={!!tempPwd} onClose={() => setTempPwd(null)} title="Account Created" size="md">
        {tempPwd && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-medium text-amber-800 mb-1">⚠ Share once</p>
              <p className="text-xs text-amber-700">This password is shown only once. Share it securely.</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Name</span>
                <span className="font-medium text-gray-900">{tempPwd.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-gray-900">{tempPwd.email}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Temporary Password</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded select-all">
                  {tempPwd.password}
                </span>
              </div>
            </div>
            <button onClick={() => setTempPwd(null)} className="btn-primary w-full mt-2">Done</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Member Form ──────────────────────────────────────────────────────────────
interface MemberFormProps {
  form: CreateEmployeePayload;
  errors: Record<string, string>;
  departments: Department[];
  filteredDesigs: Designation[];
  roleOptions: Array<{ value: string; label: string }>;
  submitting: boolean;
  onField: (f: keyof CreateEmployeePayload) => (e: React.ChangeEvent<any>) => void;
  onDeptChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

function MemberForm({
  form, errors, departments, filteredDesigs, roleOptions,
  submitting, onField, onDeptChange, onSubmit, onCancel, mode,
}: MemberFormProps) {
  const Err = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-red-500 mt-1">{errors[field]}</p> : null;

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

      {/* Personal */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name <span className="text-red-500">*</span></label>
            <input className={`input ${errors.first_name ? 'border-red-400' : ''}`} placeholder="Jane"
              value={form.first_name} onChange={onField('first_name')} />
            <Err field="first_name" />
          </div>
          <div>
            <label className="label">Last Name <span className="text-red-500">*</span></label>
            <input className={`input ${errors.last_name ? 'border-red-400' : ''}`} placeholder="Doe"
              value={form.last_name} onChange={onField('last_name')} />
            <Err field="last_name" />
          </div>
          <div>
            <label className="label">Gender <span className="text-red-500">*</span></label>
            <select className={`input ${errors.gender ? 'border-red-400' : ''}`} value={form.gender} onChange={onField('gender')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <Err field="gender" />
          </div>
          <div>
            <label className="label">Date of Birth <span className="text-red-500">*</span></label>
            <input type="date" className={`input ${errors.birth_date ? 'border-red-400' : ''}`}
              value={form.birth_date} max={new Date().toISOString().split('T')[0]} onChange={onField('birth_date')} />
            <Err field="birth_date" />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Email <span className="text-red-500">*</span></label>
            <input type="email" className={`input ${errors.email ? 'border-red-400' : ''}`}
              placeholder="jane@company.com" value={form.email} onChange={onField('email')} />
            <Err field="email" />
          </div>
          <div>
            <label className="label">Phone <span className="text-red-500">*</span></label>
            <input type="tel" className={`input ${errors.phone ? 'border-red-400' : ''}`}
              placeholder="+1 555 000 0000" value={form.phone} onChange={onField('phone')} />
            <Err field="phone" />
          </div>
        </div>
        {mode === 'create' && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            A temporary login password will be auto-generated and shown after saving.
          </p>
        )}
      </div>

      {/* Employment */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Employment</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Role <span className="text-red-500">*</span></label>
            <select className={`input ${errors.role ? 'border-red-400' : ''}`} value={form.role} onChange={onField('role')}>
              {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <Err field="role" />
          </div>
          <div>
            <label className="label">Employment Type <span className="text-red-500">*</span></label>
            <select className={`input ${errors.employment_type ? 'border-red-400' : ''}`}
              value={form.employment_type} onChange={onField('employment_type')}>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </select>
            <Err field="employment_type" />
          </div>
          {mode === 'edit' && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={onField('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          )}
          <div>
            <label className="label">Join Date</label>
            <input type="date" className="input" value={form.join_date || ''} onChange={onField('join_date')} />
          </div>
        </div>
      </div>

      {/* Organisation */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Organisation</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Department <span className="text-red-500">*</span></label>
            <select className={`input ${errors.department_id ? 'border-red-400' : ''}`}
              value={form.department_id || ''} onChange={onDeptChange}>
              <option value="">Select department…</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <Err field="department_id" />
          </div>
          <div>
            <label className="label">Designation <span className="text-red-500">*</span></label>
            <select
              className={`input ${errors.designation_id ? 'border-red-400' : ''}`}
              value={form.designation_id || ''}
              onChange={e => onField('designation_id')({ target: { value: e.target.value } } as any)}
              disabled={!form.department_id}
            >
              <option value="">{form.department_id ? 'Select designation…' : 'Select department first…'}</option>
              {filteredDesigs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
            <Err field="designation_id" />
          </div>
        </div>
      </div>

      {/* Additional */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Additional</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Address</label>
            <textarea className="input resize-none" rows={2} placeholder="Street address, city…"
              value={form.address || ''} onChange={onField('address')} />
          </div>
          <div className="col-span-2">
            <label className="label">Emergency Contact</label>
            <input className="input" placeholder="Name and phone number"
              value={form.emergency_contact || ''} onChange={onField('emergency_contact')} />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" className="btn-primary flex-1" disabled={submitting}>
          {submitting
            ? (mode === 'create' ? 'Adding…' : 'Saving…')
            : (mode === 'create' ? `Add ${form.role === 'tl' ? 'Team Lead' : 'Employee'}` : 'Save Changes')}
        </button>
      </div>
    </form>
  );
}

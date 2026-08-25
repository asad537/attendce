import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import { CreateProjectPayload, projectService } from '../../services/projectService';
import { userService } from '../../services/userService';
import { Project, ProjectStatus, User } from '../../types';

const blank = (status: ProjectStatus = 'planning'): CreateProjectPayload => ({ name: '', description: '', status, start_date: '', due_date: '' });

const statusMeta: Record<ProjectStatus, { label: string; badge: string }> = {
  planning:    { label: 'To Do',       badge: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', badge: 'bg-indigo-100 text-indigo-700' },
  on_hold:     { label: 'In Review',   badge: 'bg-amber-100 text-amber-700' },
  completed:   { label: 'Done',        badge: 'bg-emerald-100 text-emerald-700' },
};
const statusOptions = Object.keys(statusMeta) as ProjectStatus[];

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CeoProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<CreateProjectPayload>(blank());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([projectService.getAll(), userService.getList({ per_page: 200 })]);
      setProjects(p);
      setLeads(u.data);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const edit = (p: Project) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || '', status: p.status, start_date: p.start_date?.slice(0, 10) || '', due_date: p.due_date?.slice(0, 10) || '', project_lead_id: p.project_lead?.id });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Project name is required.');
    setSaving(true);
    try {
      const data = { ...form, name: form.name.trim(), description: form.description || undefined, start_date: form.start_date || undefined, due_date: form.due_date || undefined };
      if (editing) await projectService.update(editing.id, data);
      else await projectService.create(data);
      toast.success(editing ? 'Project updated.' : 'Project created.');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">Track every project from planning to completion.</p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => { setEditing(null); setForm(blank()); setOpen(true); }}>+ New project</button>
      </div>

      <div className="card p-0">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Lead</th>
                <th>Start date</th>
                <th>Due date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!projects.length ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                    No projects yet. Click “New project” to create one.
                  </td>
                </tr>
              ) : projects.map(p => {
                const meta = statusMeta[p.status] || statusMeta.planning;
                return (
                  <tr key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/projects/${p.id}`)}>
                    <td>
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="max-w-md truncate text-xs text-gray-500">{p.description || 'No description'}</p>
                    </td>
                    <td>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}>{meta.label}</span>
                    </td>
                    <td className="text-sm text-gray-600">{p.project_lead?.name || 'Unassigned'}</td>
                    <td className="text-sm text-gray-500">{fmtDate(p.start_date)}</td>
                    <td className="text-sm text-gray-500">{fmtDate(p.due_date)}</td>
                    <td className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => navigate(`/projects/${p.id}`)} className="text-xs font-semibold text-gray-500 hover:text-indigo-600">Open</button>
                        <button onClick={() => edit(p)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Edit</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => !saving && setOpen(false)} title={editing ? 'Edit project' : 'Create project'} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Project name</label>
            <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-24" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                {statusOptions.map(s => <option key={s} value={s}>{statusMeta[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Project lead</label>
              <select className="input" value={form.project_lead_id || ''} onChange={e => setForm({ ...form, project_lead_id: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Assign to me</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Start date</label>
              <input type="date" className="input" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Due date</label>
              <input type="date" className="input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create project'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

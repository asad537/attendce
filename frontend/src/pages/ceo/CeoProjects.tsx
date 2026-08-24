import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import { projectService, CreateProjectPayload } from '../../services/projectService';
import { userService } from '../../services/userService';
import { Project, ProjectStatus, User } from '../../types';

const emptyForm = (): CreateProjectPayload => ({ name: '', description: '', status: 'planning', start_date: '', due_date: '' });
const statusStyle: Record<ProjectStatus, string> = { planning: 'badge-blue', in_progress: 'badge-purple', on_hold: 'badge-yellow', completed: 'badge-green' };

export default function CeoProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateProjectPayload>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, users] = await Promise.all([projectService.getAll(), userService.getList({ per_page: 200 })]);
      setProjects(items);
      setLeads(users.data.filter((user) => ['ceo', 'manager', 'tl'].includes(user.role)));
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) { toast.error('Project name is required.'); return; }
    setSaving(true);
    try {
      await projectService.create({ ...form, name: form.name.trim(), description: form.description?.trim() || undefined, start_date: form.start_date || undefined, due_date: form.due_date || undefined, project_lead_id: form.project_lead_id || undefined });
      toast.success('Project created successfully.');
      setOpen(false); setForm(emptyForm()); load();
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setSaving(false); }
  };

  if (loading) return <PageLoader />;

  return <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-gray-900 tracking-tight">Projects</h1><p className="text-sm text-gray-500 mt-1">Create projects and assign a CEO, manager, or team lead.</p></div>
      <button onClick={() => setOpen(true)} className="btn-primary"><span className="text-lg leading-none">+</span> New Project</button>
    </div>
    {projects.length === 0 ? <div className="card text-center py-14"><h2 className="font-semibold text-gray-900">No projects yet</h2><p className="text-sm text-gray-500 mt-1 mb-5">Create the first project to start organizing your work.</p><button onClick={() => setOpen(true)} className="btn-primary">Create Project</button></div> :
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{projects.map((project) => <div key={project.id} className="card border border-gray-100"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-gray-900">{project.name}</h2><p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description || 'No description added.'}</p></div><span className={statusStyle[project.status]}>{project.status.replace('_', ' ')}</span></div><div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100 text-sm"><div><p className="text-gray-400">Project lead</p><p className="font-medium text-gray-700 mt-0.5">{project.project_lead?.name || 'Not assigned'}</p></div><div><p className="text-gray-400">Due date</p><p className="font-medium text-gray-700 mt-0.5">{project.due_date || 'Not set'}</p></div></div></div>)}</div>}
    <Modal open={open} onClose={() => !saving && setOpen(false)} title="Create New Project" size="lg"><form onSubmit={createProject} className="space-y-4"><div><label className="label">Project name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Attendance mobile app" autoFocus required /></div><div><label className="label">Description</label><textarea className="input min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Briefly describe the project" /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="label">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}><option value="planning">Planning</option><option value="in_progress">In progress</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select></div><div><label className="label">Project lead</label><select className="input" value={form.project_lead_id || ''} onChange={(e) => setForm({ ...form, project_lead_id: e.target.value ? Number(e.target.value) : undefined })}><option value="">Assign to me</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} ({lead.role === 'tl' ? 'Team Lead' : lead.role.toUpperCase()})</option>)}</select></div><div><label className="label">Start date</label><input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div><div><label className="label">Due date</label><input type="date" className="input" min={form.start_date} value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div></div><div className="flex justify-end gap-3 pt-2"><button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</button></div></form></Modal>
  </div>;
}

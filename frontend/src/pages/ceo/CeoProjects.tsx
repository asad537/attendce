import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { getErrorMessage } from '../../services/api';
import { projectService, CreateProjectPayload } from '../../services/projectService';
import { userService } from '../../services/userService';
import { Project, ProjectStatus, User } from '../../types';

const emptyForm = (): CreateProjectPayload => ({ name: '', description: '', status: 'planning', start_date: '', due_date: '' });
const statusStyle: Record<ProjectStatus, string> = { planning: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', in_progress: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200', on_hold: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' };
const field = 'input border-gray-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition';

export default function CeoProjects() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateProjectPayload>(emptyForm());
  const [editing, setEditing] = useState<Project | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, users] = await Promise.all([projectService.getAll(), userService.getList({ per_page: 200 })]);
      setProjects(items);
      setLeads(users.data.filter((u) => {
        if (user?.role === 'ceo') return ['manager', 'tl'].includes(u.role);
        if (user?.role === 'manager') return u.role === 'tl';
        return false;
      }));
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) { toast.error('Project name is required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description?.trim() || undefined, start_date: form.start_date || undefined, due_date: form.due_date || undefined, project_lead_id: form.project_lead_id || undefined };
      if (editing) await projectService.update(editing.id, payload); else await projectService.create(payload);
      toast.success(editing ? 'Project updated successfully.' : 'Project created successfully.');
      setOpen(false); setEditing(null); setForm(emptyForm()); load();
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setSaving(false); }
  };

  if (loading) return <PageLoader />;

  const displayedProjects = projectId 
    ? projects.filter(p => p.id === Number(projectId))
    : projects;

  return <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <section className="card border-0 px-6 py-5 sm:px-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" /></svg></div><div><h1 className="text-2xl font-bold tracking-tight text-gray-900">Projects</h1><p className="mt-1 text-sm text-gray-600">Plan work, assign ownership, and keep delivery on track.</p></div></div>
        <button onClick={() => { setEditing(null); setForm(emptyForm()); setOpen(true); }} className="btn-primary"><span className="text-lg leading-none">+</span> New project</button>
      </div>
    </section>

    {projects.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" /></svg></div><h2 className="mt-5 text-lg font-semibold text-gray-900">Start with your first project</h2><p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">Create a project, add dates, and select the person accountable for delivery.</p><button onClick={() => setOpen(true)} className="mt-6 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">Create project</button></div> :
      displayedProjects.length === 0 ? <div className="text-center py-12 text-gray-500">Project not found.</div> :
      <div className={`grid grid-cols-1 gap-5 ${displayedProjects.length > 1 ? 'xl:grid-cols-2' : ''}`}>{displayedProjects.map((project) => <article key={project.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-base font-semibold text-gray-900">{project.name}</h2><p className="mt-1.5 text-sm leading-6 text-gray-500">{project.description || 'No description added.'}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle[project.status]}`}>{project.status.replace('_', ' ')}</span></div><div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4"><div><p className="text-xs font-medium uppercase tracking-wide text-gray-400">Project lead</p><p className="mt-1 text-sm font-semibold text-gray-700">{project.project_lead?.name || 'Not assigned'}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-gray-400">Due date</p><p className="mt-1 text-sm font-semibold text-gray-700">{project.due_date ? project.due_date.slice(0, 10) : 'Not set'}</p></div></div><div className="mt-4 flex justify-end"><button className="btn-secondary btn-sm" onClick={() => { setEditing(project); setForm({ name: project.name, description: project.description || '', status: project.status, start_date: project.start_date?.slice(0, 10) || '', due_date: project.due_date?.slice(0, 10) || '', project_lead_id: project.project_lead?.id }); setOpen(true); }}>Edit project</button></div></article>)}</div>}

    <Modal open={open} onClose={() => !saving && setOpen(false)} title={editing ? 'Edit project' : 'Create a new project'} size="lg">
      <form onSubmit={createProject} className="space-y-5">
        <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div><div><p className="text-sm font-semibold text-gray-800">Project details</p><p className="text-xs text-gray-500">Fields marked with <span className="font-semibold text-indigo-600">*</span> are required.</p></div></div></div>
        <div className="space-y-5 px-6 py-6"><div><label className="label text-gray-700">Project name <span className="text-indigo-600">*</span></label><input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Attendance mobile app" autoFocus required /><p className="mt-1.5 text-xs text-gray-400">Use a clear, recognizable name for the project.</p></div><div><label className="label text-gray-700">Description <span className="text-gray-400 font-normal">(optional)</span></label><textarea className={`${field} min-h-28 resize-none`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this project about and what is its expected outcome?" /></div><div className="grid grid-cols-1 gap-5 sm:grid-cols-2"><div><label className="label text-gray-700">Project status</label><select className={field} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}><option value="planning">Planning</option><option value="in_progress">In progress</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select></div><div><label className="label text-gray-700">Project lead</label><select className={field} value={form.project_lead_id || ''} onChange={(e) => setForm({ ...form, project_lead_id: e.target.value ? Number(e.target.value) : undefined })}><option value="">Select project lead...</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} ({lead.role === 'tl' ? 'Team Lead' : lead.role.toUpperCase()})</option>)}</select></div><div><label className="label text-gray-700">Start date</label><input type="date" className={field} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div><div><label className="label text-gray-700">Target due date</label><input type="date" className={field} min={form.start_date} value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div></div></div>
        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end"><button type="button" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-200" onClick={() => setOpen(false)} disabled={saving}>Cancel</button><button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create project'}</button></div>
      </form>
    </Modal>
  </div>;
}

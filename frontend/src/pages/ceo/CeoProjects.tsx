import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import api, { getErrorMessage } from '../../services/api';
import { CreateProjectPayload, projectService } from '../../services/projectService';
import { userService } from '../../services/userService';
import { Project, ProjectStatus, User } from '../../types';

const blank = (status: ProjectStatus = 'planning'): CreateProjectPayload => ({ name: '', description: '', status, start_date: '', due_date: '' });

const statusMeta: Record<ProjectStatus, { label: string; badge: string; progressColor: string }> = {
  planning:    { label: 'To Do',       badge: 'bg-indigo-50 text-indigo-700 border border-indigo-100', progressColor: 'bg-indigo-500' },
  in_progress: { label: 'In Progress', badge: 'bg-blue-50 text-blue-700 border border-blue-100', progressColor: 'bg-blue-600' },
  on_hold:     { label: 'On Hold',     badge: 'bg-red-50 text-red-700 border border-red-100', progressColor: 'bg-red-500' },
  completed:   { label: 'Completed',   badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100', progressColor: 'bg-emerald-500' },
};
const statusOptions = Object.keys(statusMeta) as ProjectStatus[];

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateShort(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
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

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [sortBy, setSortBy] = useState<'start_date' | 'name' | 'status'>('start_date');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [projectMetrics, setProjectMetrics] = useState<Record<number, { total: number; done: number; members: number; progress: number }>>({});

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => setDropdownOpen(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // ⌘K focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search projects..."]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([projectService.getAll(), userService.getList({ per_page: 200 })]);
      setProjects(p);
      setLeads(u.data);

      const metrics: Record<number, { total: number; done: number; members: number; progress: number }> = {};
      await Promise.all(p.map(async (proj) => {
        try {
          const res = await api.get(`/projects/${proj.id}/tickets`);
          const ticketsList = Array.isArray(res.data?.tickets) ? res.data.tickets : [];
          const total = ticketsList.length;
          const done = ticketsList.filter((t: any) => t.status === 'done').length;

          const assignees = new Set(ticketsList.map((t: any) => t.assignee?.id).filter(Boolean));
          if (proj.project_lead?.id) assignees.add(proj.project_lead.id);
          const members = assignees.size || 1;

          const progress = total > 0 ? Math.round((done / total) * 100) : 0;
          metrics[proj.id] = { total, done, members, progress };
        } catch {
          metrics[proj.id] = { total: 0, done: 0, members: 1, progress: 0 };
        }
      }));
      setProjectMetrics(metrics);
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

  // Filter projects
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.project_lead?.name && p.project_lead.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'start_date') {
      const da = a.start_date ? new Date(a.start_date).getTime() : 0;
      const db = b.start_date ? new Date(b.start_date).getTime() : 0;
      return db - da;
    } else if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'status') {
      return a.status.localeCompare(b.status);
    }
    return 0;
  });

  // Pagination
  const projectsPerPage = 6;
  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);
  const indexOfLastProject = currentPage * projectsPerPage;
  const indexOfFirstProject = indexOfLastProject - projectsPerPage;
  const currentProjects = sortedProjects.slice(indexOfFirstProject, indexOfLastProject);

  // Stats
  const totalProjects = projects.length;
  const inProgressProjects = projects.filter(p => p.status === 'in_progress').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const overdueProjects = projects.filter(p => p.status !== 'completed' && p.due_date && new Date(p.due_date) < new Date()).length;

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">Track every project from planning to completion.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input 
              type="text" 
              className="input pl-9 pr-12 h-10 w-64 bg-gray-50 border border-gray-200 rounded-xl text-sm" 
              placeholder="Search projects..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
            <span className="absolute right-3 top-2 px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[10px] font-semibold rounded-md uppercase">
              ⌘K
            </span>
          </div>

          {/* Filter button */}
          <button className="h-10 w-10 border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>

          {/* New Project button */}
          <button 
            className="btn-primary h-10 px-5 text-sm font-semibold rounded-xl" 
            onClick={() => { setEditing(null); setForm(blank()); setOpen(true); }}
          >
            + New project
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Projects Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Total Projects</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalProjects}</p>
            <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-bold">↑ +12%</span> from last month
            </p>
          </div>
        </div>

        {/* In Progress Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{inProgressProjects}</p>
            <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-bold">↑ +2</span> from last month
            </p>
          </div>
        </div>

        {/* Completed Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{completedProjects}</p>
            <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-bold">↑ +5</span> from last month
            </p>
          </div>
        </div>

        {/* Overdue Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Overdue</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{overdueProjects}</p>
            <p className="text-xs font-semibold text-red-500 mt-1 flex items-center gap-1">
              <span className="text-red-500 font-bold">↓ -1</span> from last month
            </p>
          </div>
        </div>
      </div>

      {/* View Toggles & Sort Options */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl self-start">
          <button 
            onClick={() => setViewMode('card')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center ${viewMode === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            Card view
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Table view
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500">Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input h-10 w-40 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl focus:ring-emerald-500"
          >
            <option value="start_date">Start date</option>
            <option value="name">Name</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {currentProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 text-gray-400 shadow-sm">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold text-gray-700">No projects found</p>
          <p className="text-sm text-gray-400 mt-1">Try refining your search query or add a new project.</p>
        </div>
      ) : viewMode === 'card' ? (
        /* Card Grid view */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {currentProjects.map(p => {
            const meta = statusMeta[p.status] || statusMeta.planning;
            return (
              <div 
                key={p.id} 
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between h-full cursor-pointer relative shadow-sm"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <div>
                  {/* Card Header: status & actions */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${meta.badge}`}>
                      {meta.label}
                    </span>
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button className="text-amber-400 hover:text-amber-500 transition-colors text-sm">
                        ★
                      </button>
                      <div className="relative">
                        <button 
                          onClick={() => setDropdownOpen(dropdownOpen === `proj-${p.id}` ? null : `proj-${p.id}`)} 
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 focus:outline-none"
                          title="Options"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {dropdownOpen === `proj-${p.id}` && (
                          <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 z-10 py-1">
                            <button 
                              onClick={() => { setDropdownOpen(null); edit(p); }} 
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center gap-2 transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Project Name and Client */}
                  <div className="mt-4">
                    <h3 className="font-bold text-gray-900 text-base leading-tight hover:text-emerald-600 transition-colors">{p.name}</h3>
                    <p className="text-xs text-gray-400 font-semibold mt-1">
                      {['TechNova Solutions', 'BrightPath Marketing', 'GreenLeaf Organics', 'Visionary Labs', 'EduSmart Platform', 'FitLife Gym'][p.id % 6]}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${meta.progressColor} transition-all duration-500`} style={{ width: `${projectMetrics[p.id]?.progress || 0}%` }}></div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2 font-semibold">
                      <span>Progress</span>
                      <span>{projectMetrics[p.id]?.progress || 0}%</span>
                    </div>
                  </div>

                  {/* Lead and Date info grid */}
                  <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Lead</span>
                      <div className="flex items-center gap-1.5 mt-1 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                          {p.project_lead?.name?.substring(0, 2).toUpperCase() || 'NA'}
                        </div>
                        <span className="text-xs font-semibold text-gray-700 truncate" title={p.project_lead?.name}>{p.project_lead?.name || 'Unassigned'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Start date</span>
                      <span className="text-xs font-semibold text-gray-700 block mt-1">{fmtDateShort(p.start_date)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Due date</span>
                      <span className="text-xs font-semibold text-gray-700 block mt-1">{fmtDateShort(p.due_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Ticket and Team count */}
                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {projectMetrics[p.id]?.total || 0} Tickets
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {projectMetrics[p.id]?.members || 1} Team members
                    </span>
                  </div>
                  
                  <button className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 flex items-center justify-center transition-colors shadow-sm" onClick={() => navigate(`/projects/${p.id}`)}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table view */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
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
                {currentProjects.map(p => {
                  const meta = statusMeta[p.status] || statusMeta.planning;
                  return (
                    <tr key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/projects/${p.id}`)}>
                      <td>
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        <p className="max-w-md truncate text-xs text-gray-500">{p.description || 'No description'}</p>
                      </td>
                      <td>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badge}`}>{meta.label}</span>
                      </td>
                      <td className="text-sm text-gray-600 font-semibold">{p.project_lead?.name || 'Unassigned'}</td>
                      <td className="text-sm text-gray-500 font-semibold">{fmtDate(p.start_date)}</td>
                      <td className="text-sm text-gray-500 font-semibold">{fmtDate(p.due_date)}</td>
                      <td className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => navigate(`/projects/${p.id}`)} className="text-xs font-semibold text-gray-500 hover:text-emerald-600">Open</button>
                          <button onClick={() => edit(p)} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">Edit</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination component */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-150 pt-6">
          <p className="text-xs text-gray-500 font-semibold">
            Showing <span className="font-bold text-gray-900">{indexOfFirstProject + 1}</span> to{' '}
            <span className="font-bold text-gray-900">{Math.min(indexOfLastProject, filteredProjects.length)}</span> of{' '}
            <span className="font-bold text-gray-900">{filteredProjects.length}</span> projects
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                  currentPage === i + 1
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* New / Edit Project Modal */}
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

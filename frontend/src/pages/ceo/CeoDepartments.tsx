import React, { useCallback, useEffect, useState } from 'react';
import { departmentService, designationService } from '../../services/userService';
import { Department, Designation } from '../../types';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

// ─────────────────────────────────────────────────────────────────────────────

interface DeptForm { name: string; code: string; description: string; }
interface DesigForm { title: string; description: string; department_id: number; }

const emptyDept   = (): DeptForm  => ({ name: '', code: '', description: '' });
const emptyDesig  = (): DesigForm => ({ title: '', description: '', department_id: 0 });

const cardThemes = [
  { 
    bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', iconBg: 'bg-blue-500', iconText: 'text-white', badgeBg: 'bg-blue-100', dot: 'bg-blue-500', btnBg: 'bg-blue-50', btnText: 'text-blue-600', btnHover: 'hover:bg-blue-100',
    topIcon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
    bgGraphic: <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="13" rx="1.5"/><path d="M2 20h20M8 20l1.5-3M16 20l-1.5-3M10 8.5l-2.5 2.5L10 13.5m4-5 2.5 2.5-2.5 2.5"/></svg> 
  },
  { 
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', iconBg: 'bg-emerald-400', iconText: 'text-white', badgeBg: 'bg-emerald-100', dot: 'bg-emerald-500', btnBg: 'bg-emerald-50', btnText: 'text-emerald-600', btnHover: 'hover:bg-emerald-100',
    topIcon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    bgGraphic: <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18M5 17h3v-3H5v3Zm5 0h3v-6h-3v6Zm5 0h3V8h-3v9Z"/><path d="m4 11 4-4 4 3 6-6 2 2"/></svg>
  },
  { 
    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', iconBg: 'bg-purple-400', iconText: 'text-white', badgeBg: 'bg-purple-100', dot: 'bg-purple-500', btnBg: 'bg-purple-50', btnText: 'text-purple-600', btnHover: 'hover:bg-purple-100',
    topIcon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    bgGraphic: <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 12h6M8 15h4M15 16l4-4 2 2-4 4-3 1 1-3Z"/></svg>
  },
  { 
    bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', iconBg: 'bg-orange-400', iconText: 'text-white', badgeBg: 'bg-orange-100', dot: 'bg-orange-400', btnBg: 'bg-orange-50', btnText: 'text-orange-500', btnHover: 'hover:bg-orange-100',
    topIcon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
    bgGraphic: <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 1 0 8.5 12h-4a2 2 0 0 1-1.7-3.1A5 5 0 0 0 12 3Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="11" cy="7" r=".8"/><circle cx="15" cy="8" r=".8"/></svg>
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function CeoDepartments() {
  const { user } = useAuth();
  // CEO and managers see every department and can add/manage them.
  const canManageDepts = ['ceo', 'manager'].includes(user?.role || '');
  const [departments, setDepts]     = useState<Department[]>([]);
  const [designations, setDesigs]   = useState<Designation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  useEffect(() => {
    const handleClick = () => setDropdownOpen(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // positions modal
  const [positionsModalDept, setPositionsModalDept] = useState<Department | null>(null);

  // dept modals
  const [deptAdd, setDeptAdd]       = useState(false);
  const [deptEdit, setDeptEdit]     = useState<Department | null>(null);
  const [deptDel, setDeptDel]       = useState<Department | null>(null);
  const [deptForm, setDeptForm]     = useState<DeptForm>(emptyDept());
  const [deptErrs, setDeptErrs]     = useState<Record<string, string>>({});

  // designation modals
  const [desigAdd, setDesigAdd]     = useState<number | null>(null); // dept id
  const [desigEdit, setDesigEdit]   = useState<Designation | null>(null);
  const [desigDel, setDesigDel]     = useState<Designation | null>(null);
  const [desigForm, setDesigForm]   = useState<DesigForm>(emptyDesig());
  const [desigErrs, setDesigErrs]   = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [depts, desigs] = await Promise.all([
        departmentService.getAll(),
        designationService.getAll(),
      ]);
      // CEO and managers see every department; others see only their own.
      const seesAll = ['ceo', 'manager'].includes(user?.role || '');
      const filteredDepts = seesAll ? depts : depts.filter(d => d.id === user?.department?.id);
      setDepts(filteredDepts);
      setDesigs(desigs);
      if (!seesAll && user?.department?.id) {
        // user only sees their own department, no need to expand anything automatically
      }
    } catch {
      if (!silent) toast.error('Failed to load departments');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => { void load(true); });

  // designations for a specific dept
  const desigFor = (deptId: number) =>
    designations.filter(d => d.department?.id === deptId);

  // ── Dept validation ───────────────────────────────────────────────────────
  const validateDept = (f: DeptForm) => {
    const e: Record<string, string> = {};
    if (!f.name.trim())        e.name = 'Department name is required.';
    if (!f.code.trim())        e.code = 'Code is required.';
    else if (f.code.trim().length > 10) e.code = 'Max 10 characters.';
    return e;
  };

  // ── Create dept ───────────────────────────────────────────────────────────
  const handleDeptCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateDept(deptForm);
    if (Object.keys(errs).length) { setDeptErrs(errs); return; }
    setDeptErrs({});
    setSubmitting(true);
    try {
      await departmentService.create({
        name: deptForm.name.trim(),
        code: deptForm.code.trim().toUpperCase(),
        description: deptForm.description.trim(),
      });
      toast.success(`Department "${deptForm.name}" created.`);
      setDeptAdd(false);
      setDeptForm(emptyDept());
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  // ── Update dept ───────────────────────────────────────────────────────────
  const handleDeptUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptEdit) return;
    const errs = validateDept(deptForm);
    if (Object.keys(errs).length) { setDeptErrs(errs); return; }
    setDeptErrs({});
    setSubmitting(true);
    try {
      await departmentService.update(deptEdit.id, {
        name: deptForm.name.trim(),
        code: deptForm.code.trim().toUpperCase(),
        description: deptForm.description.trim(),
      });
      toast.success('Department updated.');
      setDeptEdit(null);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  // ── Delete dept ───────────────────────────────────────────────────────────
  const handleDeptDelete = async () => {
    if (!deptDel) return;
    try {
      await departmentService.delete(deptDel.id);
      toast.success(`"${deptDel.name}" deleted.`);
      setDeptDel(null);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  // ── Create designation ────────────────────────────────────────────────────
  const handleDesigCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desigForm.title.trim()) { setDesigErrs({ title: 'Title is required.' }); return; }
    setDesigErrs({});
    setSubmitting(true);
    try {
      await designationService.create({
        title:         desigForm.title.trim(),
        description:   desigForm.description.trim(),
        department_id: desigAdd,
      });
      toast.success(`Position "${desigForm.title}" added.`);
      setDesigAdd(null);
      setDesigForm(emptyDesig());
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  // ── Update designation ────────────────────────────────────────────────────
  const handleDesigUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desigEdit) return;
    if (!desigForm.title.trim()) { setDesigErrs({ title: 'Title is required.' }); return; }
    setDesigErrs({});
    setSubmitting(true);
    try {
      await designationService.update(desigEdit.id, {
        title:       desigForm.title.trim(),
        description: desigForm.description.trim(),
      });
      toast.success('Position updated.');
      setDesigEdit(null);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  // ── Delete designation ────────────────────────────────────────────────────
  const handleDesigDelete = async () => {
    if (!desigDel) return;
    try {
      await designationService.delete(desigDel.id);
      toast.success(`"${desigDel.title}" removed.`);
      setDesigDel(null);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const Err = ({ msg }: { msg?: string }) => msg
    ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null;

  const [searchQuery, setSearchQuery] = useState('');

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#f8fbff] p-4 text-[#172b45] sm:p-6 lg:p-8">
      <div className="w-full space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-5 pb-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white shadow-[0_10px_24px_rgba(79,70,229,.28)]">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#172b45]">
              {canManageDepts ? 'Departments' : `Department - ${user?.department?.name || ''}`}
            </h1>
            <p className="mt-1 text-sm text-[#71839b]">
              Manage {canManageDepts ? 'departments and their' : 'your department and its'} designations (positions).
            </p>
          </div>
        </div>
        {canManageDepts && (
          <button
            onClick={() => { setDeptForm(emptyDept()); setDeptErrs({}); setDeptAdd(true); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#4f46e5] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(79,70,229,.28)] transition hover:-translate-y-0.5 hover:brightness-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Department
          </button>
        )}
      </div>

      {/* Stats & Search */}
      {!loading && (
        <div className="flex flex-col items-start justify-between gap-4 pb-1 sm:flex-row sm:items-center">
          <div className="flex gap-3">
            <div className="flex items-center gap-2 rounded-full bg-[#e8f4ff] px-4 py-2.5 text-xs font-bold text-blue-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              {departments.length} Departments
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#e9f8f5] px-4 py-2.5 text-xs font-bold text-emerald-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {designations.length} Positions
            </div>
          </div>
          <div className="relative w-full sm:w-72">
            <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search departments..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-[#dfe8f3] bg-white py-3 pl-11 pr-4 text-sm shadow-sm transition-all focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      )}

      {/* Department list */}
      {loading ? <PageLoader /> : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {(() => {
            const filteredDepts = departments.filter(d => !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()));
            if (departments.length === 0) {
              return (
                <div className="card col-span-full text-center py-12 text-gray-400">
                  No departments yet. Add one to get started.
                </div>
              );
            }
            if (filteredDepts.length === 0) {
              return (
                <div className="card col-span-full text-center py-12 text-gray-400">
                  No departments match your search.
                </div>
              );
            }
            return filteredDepts.map((dept, idx) => {
            let positions = desigFor(dept.id);
            if (user?.role === 'tl' && user?.designation?.id) {
              positions = positions.filter(pos => pos.id !== user.designation?.id);
            }
            
            const theme = cardThemes[idx % cardThemes.length];

            return (
              <div key={dept.id} className="group relative min-h-[310px] overflow-hidden rounded-[18px] border border-[#e5edf7] bg-white p-6 shadow-[0_8px_25px_rgba(62,91,128,.08)] transition-shadow hover:shadow-[0_14px_32px_rgba(62,91,128,.14)]">
                
                {/* Abstract shape decoration */}
                <div className={`pointer-events-none absolute -bottom-20 -right-12 h-52 w-64 rounded-[45%] blur-2xl opacity-70 ${theme.bg}`}></div>
                
                <div className="relative z-10 flex flex-col h-full">
                  {/* Header Row */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4 items-center">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[17px] shadow-[0_7px_14px_rgba(30,64,175,.12)] ${theme.iconBg} ${theme.iconText}`}>
                        {theme.topIcon}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{dept.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-gray-500 text-xs font-medium">
                           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                           {positions.length} position{positions.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                    {canManageDepts && (
                      <div className="relative">
                        <button
                          onClick={ev => {
                            ev.stopPropagation();
                            setDropdownOpen(dropdownOpen === `dept-${dept.id}` ? null : `dept-${dept.id}`);
                          }}
                          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                        >
                          <svg className="w-5 h-5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {dropdownOpen === `dept-${dept.id}` && (
                          <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                            <button
                              onClick={ev => { ev.stopPropagation(); setDropdownOpen(null); setDeptEdit(dept); setDeptForm({ name: dept.name, code: dept.code, description: dept.description || '' }); setDeptErrs({}); }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600"
                            >Edit</button>
                            <button
                              onClick={ev => { ev.stopPropagation(); setDropdownOpen(null); setDeptDel(dept); }}
                              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600"
                            >Delete</button>
                          </div>
                        )}
                      </div>
                    )}
                      <button
                        onClick={() => setPositionsModalDept(dept)}
                        aria-label={`Open ${dept.name}`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[40px]">
                    {dept.description || 'No description provided for this department.'}
                  </p>

                  {/* Positions List */}
                  <div className="flex-1">
                    <ul className="space-y-2 mb-6">
                      {positions.slice(0, 4).map(pos => (
                        <li key={pos.id} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                           <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}></span>
                           <span className="truncate">{pos.title}</span>
                        </li>
                      ))}
                      {positions.length > 4 && (
                        <li className="text-xs text-gray-400 font-medium pl-3.5 italic">+ {positions.length - 4} more</li>
                      )}
                    </ul>
                  </div>

                  {/* Footer Button */}
                  <div className="mt-auto flex justify-between items-end">
                    <button 
                      onClick={() => setPositionsModalDept(dept)}
                      className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${theme.btnBg} ${theme.btnText} ${theme.btnHover}`}
                    >
                       View Positions
                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                    {/* Decorative bottom icon */}
                    <div className={`absolute bottom-1 right-2 pointer-events-none ${theme.text} opacity-55`}>
                      {theme.bgGraphic}
                    </div>
                  </div>
                </div>
              </div>
            );
          })})()}
        </div>
      )}

      {/* ── Manage Positions Modal ──────────────────────────────────────────── */}
      <Modal 
        open={!!positionsModalDept} 
        onClose={() => setPositionsModalDept(null)} 
        title={`Positions — ${positionsModalDept?.name}`} 
        size="lg"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">Manage designations for {positionsModalDept?.name}</p>
          <button
            onClick={() => {
              if (positionsModalDept) {
                setDesigForm({ ...emptyDesig(), department_id: positionsModalDept.id });
                setDesigErrs({});
                setDesigAdd(positionsModalDept.id);
              }
            }}
            className="btn-primary text-xs py-1.5 px-3"
          >
            + Add Position
          </button>
        </div>

        <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {positionsModalDept && (() => {
             let positions = desigFor(positionsModalDept.id);
             if (user?.role === 'tl' && user?.designation?.id) {
               positions = positions.filter(pos => pos.id !== user.designation?.id);
             }
             if (positions.length === 0) {
               return <div className="p-8 text-center text-gray-400 text-sm">No positions found.</div>;
             }
             return positions.map(d => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{d.title}</p>
                    {d.description && <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    {!(user?.role === 'tl' && d.created_by !== user?.id) && (
                      <>
                        <button onClick={() => { setDesigEdit(d); setDesigForm({ title: d.title, description: d.description || '', department_id: d.department?.id || 0 }); setDesigErrs({}); }} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDesigDel(d)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
             ));
          })()}
        </div>
      </Modal>

      {/* ── Add Department Modal ────────────────────────────────────────────── */}
      <Modal open={deptAdd} onClose={() => setDeptAdd(false)} title="Add Department" size="md">
        <form onSubmit={handleDeptCreate} className="space-y-4">
          <div>
            <label className="label">Name <span className="text-red-500">*</span></label>
            <input className={`input ${deptErrs.name ? 'border-red-400' : ''}`} placeholder="e.g. Engineering" value={deptForm.name}
              onChange={e => { setDeptForm(f => ({ ...f, name: e.target.value })); setDeptErrs(v => ({ ...v, name: '' })); }} />
            <Err msg={deptErrs.name} />
          </div>
          <div>
            <label className="label">Code <span className="text-red-500">*</span></label>
            <input className={`input uppercase ${deptErrs.code ? 'border-red-400' : ''}`} placeholder="e.g. ENG" value={deptForm.code}
              onChange={e => { setDeptForm(f => ({ ...f, code: e.target.value.toUpperCase() })); setDeptErrs(v => ({ ...v, code: '' })); }} />
            <Err msg={deptErrs.code} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="Brief description…" value={deptForm.description}
              onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setDeptAdd(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Department Modal ───────────────────────────────────────────── */}
      <Modal open={!!deptEdit} onClose={() => setDeptEdit(null)} title={`Edit — ${deptEdit?.name}`} size="md">
        <form onSubmit={handleDeptUpdate} className="space-y-4">
          <div>
            <label className="label">Name <span className="text-red-500">*</span></label>
            <input className={`input ${deptErrs.name ? 'border-red-400' : ''}`} value={deptForm.name}
              onChange={e => { setDeptForm(f => ({ ...f, name: e.target.value })); setDeptErrs(v => ({ ...v, name: '' })); }} />
            <Err msg={deptErrs.name} />
          </div>
          <div>
            <label className="label">Code <span className="text-red-500">*</span></label>
            <input className={`input uppercase ${deptErrs.code ? 'border-red-400' : ''}`} value={deptForm.code}
              onChange={e => { setDeptForm(f => ({ ...f, code: e.target.value.toUpperCase() })); setDeptErrs(v => ({ ...v, code: '' })); }} />
            <Err msg={deptErrs.code} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={deptForm.description}
              onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setDeptEdit(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Department Confirm ───────────────────────────────────────── */}
      <Modal open={!!deptDel} onClose={() => setDeptDel(null)} title="Delete Department" size="sm">
        <p className="text-sm text-gray-600">
          Delete <span className="font-semibold text-gray-900">{deptDel?.name}</span>?
          All positions in this department will also be removed.
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setDeptDel(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDeptDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white  transition-colors">
            Delete
          </button>
        </div>
      </Modal>

      {/* ── Add Position Modal ──────────────────────────────────────────────── */}
      <Modal
        open={desigAdd !== null}
        onClose={() => setDesigAdd(null)}
        title={`Add Position — ${departments.find(d => d.id === desigAdd)?.name}`}
        size="md"
      >
        <form onSubmit={handleDesigCreate} className="space-y-4">
          <div>
            <label className="label">Position Title <span className="text-red-500">*</span></label>
            <input className={`input ${desigErrs.title ? 'border-red-400' : ''}`} placeholder="e.g. Software Engineer"
              value={desigForm.title} onChange={e => { setDesigForm(f => ({ ...f, title: e.target.value })); setDesigErrs({}); }} />
            <Err msg={desigErrs.title} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="Optional description…"
              value={desigForm.description} onChange={e => setDesigForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setDesigAdd(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Position'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Position Modal ─────────────────────────────────────────────── */}
      <Modal open={!!desigEdit} onClose={() => setDesigEdit(null)} title={`Edit Position — ${desigEdit?.title}`} size="md">
        <form onSubmit={handleDesigUpdate} className="space-y-4">
          <div>
            <label className="label">Position Title <span className="text-red-500">*</span></label>
            <input className={`input ${desigErrs.title ? 'border-red-400' : ''}`} value={desigForm.title}
              onChange={e => { setDesigForm(f => ({ ...f, title: e.target.value })); setDesigErrs({}); }} />
            <Err msg={desigErrs.title} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={desigForm.description}
              onChange={e => setDesigForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setDesigEdit(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Position Confirm ─────────────────────────────────────────── */}
      <Modal open={!!desigDel} onClose={() => setDesigDel(null)} title="Remove Position" size="sm">
        <p className="text-sm text-gray-600">
          Remove <span className="font-semibold text-gray-900">{desigDel?.title}</span> from this department?
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setDesigDel(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDesigDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white  transition-colors">
            Remove
          </button>
        </div>
      </Modal>
      </div>
    </div>
  );
}

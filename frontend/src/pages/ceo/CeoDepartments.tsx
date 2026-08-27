import React, { useCallback, useEffect, useState } from 'react';
import { departmentService, designationService } from '../../services/userService';
import { Department, Designation } from '../../types';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../services/api';

// ─────────────────────────────────────────────────────────────────────────────

interface DeptForm { name: string; code: string; description: string; }
interface DesigForm { title: string; description: string; department_id: number; }

const emptyDept   = (): DeptForm  => ({ name: '', code: '', description: '' });
const emptyDesig  = (): DesigForm => ({ title: '', description: '', department_id: 0 });

// ─────────────────────────────────────────────────────────────────────────────

export default function CeoDepartments() {
  const [departments, setDepts]     = useState<Department[]>([]);
  const [designations, setDesigs]   = useState<Designation[]>([]);
  const [loading, setLoading]       = useState(true);

  // expanded dept accordion
  const [expanded, setExpanded]     = useState<number | null>(null);

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
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [depts, desigs] = await Promise.all([
        departmentService.getAll(),
        designationService.getAll(),
      ]);
      setDepts(depts);
      setDesigs(desigs);
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage departments and their designations (positions)
          </p>
        </div>
        <button
          onClick={() => { setDeptForm(emptyDept()); setDeptErrs({}); setDeptAdd(true); }}
          className="btn-primary shrink-0"
        >
          + Add Department
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-emerald-50 rounded-xl text-sm">
            <span className="font-bold text-emerald-700">{departments.length}</span>
            <span className="text-emerald-500 ml-1">Departments</span>
          </div>
          <div className="px-4 py-2 bg-emerald-50 rounded-xl text-sm">
            <span className="font-bold text-emerald-700">{designations.length}</span>
            <span className="text-emerald-500 ml-1">Positions</span>
          </div>
        </div>
      )}

      {/* Department list */}
      {loading ? <PageLoader /> : (
        <div className="space-y-3">
          {departments.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              No departments yet. Add one to get started.
            </div>
          ) : departments.map(dept => {
            const positions = desigFor(dept.id);
            const isOpen    = expanded === dept.id;

            return (
              <div key={dept.id} className="card p-0 overflow-hidden">

                {/* ── Dept row ─────────────────────────────────────── */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : dept.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* colour swatch from code hash */}
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="text-emerald-700 font-bold text-xs">{dept.code}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{dept.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {dept.description || 'No description'}
                        {' · '}
                        <span className="text-emerald-500">{positions.length} position{positions.length !== 1 ? 's' : ''}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {/* Edit dept */}
                    <button
                      onClick={ev => {
                        ev.stopPropagation();
                        setDeptEdit(dept);
                        setDeptForm({ name: dept.name, code: dept.code, description: dept.description || '' });
                        setDeptErrs({});
                      }}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                      title="Edit department"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {/* Delete dept */}
                    <button
                      onClick={ev => { ev.stopPropagation(); setDeptDel(dept); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete department"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    {/* Chevron */}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* ── Designations accordion ────────────────────────── */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {/* sub-header */}
                    <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Positions / Designations
                      </p>
                      <button
                        onClick={() => {
                          setDesigForm({ ...emptyDesig(), department_id: dept.id });
                          setDesigErrs({});
                          setDesigAdd(dept.id);
                        }}
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Position
                      </button>
                    </div>

                    {positions.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">
                        No positions yet — click "Add Position" above.
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {positions.map(d => (
                          <div key={d.id} className="flex items-center justify-between px-5 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{d.title}</p>
                              {d.description && (
                                <p className="text-xs text-gray-400">{d.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setDesigEdit(d);
                                  setDesigForm({ title: d.title, description: d.description || '', department_id: d.department?.id || 0 });
                                  setDesigErrs({});
                                }}
                                className="p-1 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                                title="Edit"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDesigDel(d)}
                                className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
          <button onClick={handleDeptDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">
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
          <button onClick={handleDesigDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
}

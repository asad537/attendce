import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userService, departmentService, designationService } from '../../services/userService';
import { CreateEmployeePayload, Department, Designation, User } from '../../types';
import { SharedEmployeeForm } from '../../components/common/SharedEmployeeForm';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as any).response;
    if (response?.data?.message) {
      if (response.data.errors) {
        const firstErrorKey = Object.keys(response.data.errors)[0];
        const firstErrorMsg = response.data.errors[firstErrorKey][0];
        return `${response.data.message}: ${firstErrorMsg}`;
      }
      return response.data.message;
    }
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

const emptyForm = (): CreateEmployeePayload => ({
  first_name: '',
  last_name: '',
  gender: 'male',
  birth_date: '',
  email: '',
  phone: '',
  role: 'employee',
  employment_type: 'full_time',
  department_id: 0,
  designation_id: 0,
  shift_id: null,
  manager_id: null,
  join_date: '',
  address: '',
  emergency_contact: '',
  allowed_ip: '39.45.1.229',
  status: 'active',
  new_password: '',
});

export default function AddEditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const authRole = authUser?.role || 'employee';
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateEmployeePayload>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editUser, setEditUser] = useState<User | null>(null);
  
  const [departments, setDepts] = useState<Department[]>([]);
  const [designations, setDesigs] = useState<Designation[]>([]);
  const [allLeads, setAllLeads] = useState<User[]>([]);
  
  const [tempPwd, setTempPwd] = useState<{ name: string; password: string; email: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel loading of dependent resources
      const [deptsRes, desigRes, allUsersRes] = await Promise.all([
        departmentService.getAll(),
        designationService.getAll(),
        authRole === 'ceo' ? userService.getList({ per_page: 500 }) : Promise.resolve({ data: [] }),
      ]);
      
      let allowedDepts = deptsRes;
      if (authRole !== 'ceo' && authUser?.department?.id) {
        allowedDepts = deptsRes.filter((d: Department) => d.id === authUser.department?.id);
      }
      
      setDepts(allowedDepts);
      setDesigs(desigRes);
      
      // Auto-select department if there's only one option (i.e. restricted to their own department)
      if (!isEdit && allowedDepts.length === 1) {
        setForm(prev => ({ ...prev, department_id: allowedDepts[0].id }));
      }
      if (authRole === 'ceo') {
        setAllLeads(allUsersRes.data.filter((u: User) => u.role === 'manager' || u.role === 'tl'));
      }
      
      // If editing, load the user
      if (isEdit) {
        const userRes = await userService.getById(Number(id));
        setEditUser(userRes);
        setForm({
          first_name:      userRes.first_name || '',
          last_name:       userRes.last_name || '',
          gender:          userRes.gender || 'male',
          birth_date:      userRes.birth_date || '',
          email:           userRes.email,
          phone:           userRes.phone || '',
          // This form only manages employee / tl / manager — a CEO record
          // (not editable here) falls back to a valid value.
          role:            (['employee', 'tl', 'manager'].includes(userRes.role) ? userRes.role : 'employee') as 'employee' | 'tl' | 'manager',
          employment_type: userRes.employment_type,
          department_id:   userRes.department?.id || 0,
          designation_id:  userRes.designation?.id || 0,
          shift_id:        userRes.shift?.id || null,
          manager_id:      userRes.manager?.id || null,
          join_date:       userRes.join_date || '',
          address:         userRes.address || '',
          emergency_contact: userRes.emergency_contact || '',
          allowed_ip:      userRes.allowed_ip || '39.45.1.229',
          status:          userRes.status,
          new_password:    '',
        });
      }
    } catch (err) {
      toast.error('Failed to load employee data');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [authRole, isEdit, id, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Hide senior titles from lower roles so an employee can't be given a
  // Chief/Manager/Director designation, a TL can't get a manager title, etc.
  const seniorityBans: Record<string, RegExp> = {
    employee: /\b(chief|ceo|officer|director|head|vp|vice\s*president|president|manager|lead|team\s*lead|tl)\b/i,
    tl:       /\b(chief|ceo|officer|director|head|vp|vice\s*president|president|manager)\b/i,
    manager:  /\b(chief|ceo|officer|director|vp|vice\s*president|president)\b/i,
  };
  const filteredDesigs = (() => {
    const byDept = form.department_id
      ? designations.filter(d => !d.department || d.department.id === form.department_id)
      : designations;
    const ban = seniorityBans[form.role];
    return ban ? byDept.filter(d => !ban.test(d.title)) : byDept;
  })();

  const validate = (f: CreateEmployeePayload): Record<string, string> => {
    const e: Record<string, string> = {};
    // Names: letters only (spaces, hyphens, apostrophes allowed), min 2 chars.
    const nameRe = /^[A-Za-z][A-Za-z\s'.-]*$/;
    if (!f.first_name.trim())       e.first_name = 'First name is required.';
    else if (f.first_name.trim().length < 2) e.first_name = 'At least 2 characters.';
    else if (!nameRe.test(f.first_name.trim())) e.first_name = 'Letters only — no numbers or symbols.';
    if (!f.last_name.trim())        e.last_name = 'Last name is required.';
    else if (f.last_name.trim().length < 2)  e.last_name = 'At least 2 characters.';
    else if (!nameRe.test(f.last_name.trim())) e.last_name = 'Letters only — no numbers or symbols.';
    if (!f.gender)                  e.gender = 'Gender is required.';
    if (!f.birth_date)              e.birth_date = 'Date of birth is required.';
    else if (new Date(f.birth_date) >= new Date()) e.birth_date = 'Must be in the past.';
    if (!f.email.trim())            e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Invalid email address.';
    // Phone: allow +, spaces, dashes, parens — but require 7–15 actual digits.
    const phoneDigits = f.phone.replace(/\D/g, '');
    if (!f.phone.trim())            e.phone = 'Phone number is required.';
    else if (!/^\+?[\d\s\-()]+$/.test(f.phone.trim())) e.phone = 'Invalid phone number.';
    else if (phoneDigits.length < 7 || phoneDigits.length > 15) e.phone = 'Enter 7 to 15 digits.';
    if (!f.role)                    e.role = 'Role is required.';
    if (!f.employment_type)         e.employment_type = 'Employment type is required.';
    if (!f.department_id)           e.department_id = 'Department is required.';
    if (!f.designation_id)          e.designation_id = 'Designation is required.';
    // New password (edit only): min 8 chars, at least one letter and one capital.
    if (f.new_password) {
      if (f.new_password.length < 8) e.new_password = 'At least 8 characters.';
      else if (!/[a-zA-Z]/.test(f.new_password)) e.new_password = 'Must include letters.';
      else if (!/[A-Z]/.test(f.new_password)) e.new_password = 'Include at least one capital letter.';
    }
    return e;
  };

  const handleField = (field: keyof CreateEmployeePayload) => (e: React.ChangeEvent<any>) => {
    let val = e.target.value;
    if (field === 'department_id' || field === 'designation_id' || field === 'shift_id' || field === 'manager_id') {
      val = val === '' ? null : Number(val);
    }
    setForm(prev => {
      const next = { ...prev, [field]: val } as CreateEmployeePayload;
      // Role changed → a previously-picked senior designation may now be
      // off-limits, so clear it and make the user re-select.
      if (field === 'role') next.designation_id = 0;
      return next;
    });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deptId = e.target.value === '' ? 0 : Number(e.target.value);
    setForm(prev => ({ ...prev, department_id: deptId, designation_id: 0 }));
    if (errors.department_id) setErrors(prev => ({ ...prev, department_id: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    
    try {
      if (isEdit) {
        if (!editUser) return;
        await userService.update(editUser.id, {
          first_name:     form.first_name,
          last_name:      form.last_name,
          gender:         form.gender,
          birth_date:     form.birth_date,
          email:          form.email,
          phone:          form.phone,
          role:           form.role,
          employment_type: form.employment_type,
          status:         form.status,
          department_id:  form.department_id,
          designation_id: form.designation_id,
          shift_id:       form.shift_id,
          manager_id:     form.manager_id,
          join_date:      form.join_date,
          address:        form.address,
          emergency_contact: form.emergency_contact,
          new_password:   form.new_password || undefined,
        });
        toast.success('Employee updated.');
        navigate(-1);
      } else {
        const res = await userService.createEmployee(form);
        toast.success(`${res.user.name} added successfully!`);
        setTempPwd({ name: res.user.name, password: res.temporary_password, email: res.user.email });
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleOptions = () => {
    if (authRole === 'ceo') {
      return [
        { value: 'employee', label: 'Employee' },
        { value: 'tl',       label: 'Team Lead (TL)' },
        { value: 'manager',  label: 'Manager' },
      ];
    }
    if (authRole === 'manager') {
      return [
        { value: 'tl',       label: 'Team Lead (TL)' },
        { value: 'employee', label: 'Employee' },
      ];
    }
    return [{ value: 'employee', label: 'Employee' }];
  };

  if (loading) {
    return <PageLoader />;
  }

  const pageTitle = isEdit ? `Edit Employee - ${editUser?.name}` : 'Add New Employee';
  const pageSubtitle = isEdit ? 'Update employee profile details.' : 'Create a new employee profile.';

  return (
    <div className="p-4 lg:p-6 w-full space-y-6">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
             <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-sm text-gray-500">{pageSubtitle}</p>
          </div>
        </div>
        <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <SharedEmployeeForm
          form={form}
          errors={errors}
          departments={departments}
          filteredDesigs={filteredDesigs}
          roleOptions={getRoleOptions()}
          showManagerSelection={authRole === 'ceo'}
          allLeads={allLeads.filter(m => m.id !== editUser?.id)}
          submitting={submitting}
          onField={handleField}
          onDeptChange={handleDeptChange}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          mode={isEdit ? 'edit' : 'create'}
        />
      </div>

      {/* Temporary Password Modal (only for create) */}
      <Modal open={!!tempPwd} onClose={() => { setTempPwd(null); navigate(-1); }} title="Employee Added Successfully" size="sm">
        {tempPwd && (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-start gap-2">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold mb-1">Temporary credentials generated</p>
                <p className="text-green-600/90 text-xs leading-relaxed">
                  The employee can log in using these credentials. Please share the password securely.
                </p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm space-y-3 shadow-sm">
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
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded select-all">
                  {tempPwd.password}
                </span>
              </div>
            </div>
            <button onClick={() => { setTempPwd(null); navigate(-1); }} className="btn-primary w-full mt-2">Done</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

import React, { useState } from 'react';
import { CreateEmployeePayload, Department, Designation, User } from '../../types';

// SVGs for sections and inputs
const Icons = {
  User: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  Gender: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="5"/><path d="M12 15v7M9 19h6"/></svg>,
  Calendar: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Phone: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Mail: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Briefcase: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  Building: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M16 10h.01M8 10h.01M8 14h.01M12 14h.01M16 14h.01"/></svg>,
  Badge: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"/><path d="M10.5 14.5l-2.5 7 4-2 4 2-2.5-7"/></svg>,
  MapPin: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Clipboard: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6M9 10h6M9 18h6"/></svg>,
  ShieldCheck: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
  Lock: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
};

export interface SharedEmployeeFormProps {
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
  
  // Specific to CEO
  showManagerSelection?: boolean;
  allLeads?: User[];
}

export function SharedEmployeeForm({
  form, errors, departments, filteredDesigs, roleOptions, submitting,
  onField, onDeptChange, onSubmit, onCancel, mode,
  showManagerSelection, allLeads = []
}: SharedEmployeeFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  const Err = ({ field }: { field: string }) => errors[field]
    ? <p className="text-xs text-red-500 mt-1">{errors[field]}</p> : null;

  // Reporting lead logic for CEO form
  const reportingLeads = (() => {
    if (!showManagerSelection) return [];
    if (form.role === 'manager') return [];
    if (form.role === 'tl') return allLeads.filter(u => u.role === 'manager');
    const tls  = allLeads.filter(u => u.role === 'tl');
    const mgrs = allLeads.filter(u => u.role === 'manager');
    return [...tls, ...mgrs];
  })();

  const reportingLabel = form.role === 'tl' ? 'Reporting Manager' : 'Reporting Team Lead (TL)';
  const reportingPlaceholder = form.role === 'manager'
    ? 'Reports directly to CEO'
    : form.role === 'tl' ? 'Select manager…' : 'Select team lead…';

  const COUNTRY_CODES = [
    { code: '+1', flag: '🇺🇸', name: 'US' },
    { code: '+44', flag: '🇬🇧', name: 'UK' },
    { code: '+92', flag: '🇵🇰', name: 'PK' },
    { code: '+91', flag: '🇮🇳', name: 'IN' },
    { code: '+61', flag: '🇦🇺', name: 'AU' },
    { code: '+971', flag: '🇦🇪', name: 'AE' },
  ];

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    const currentPhone = form.phone || '';
    let updatedPhone = currentPhone;
    const existingMatch = currentPhone.match(/^(\+\d{1,4})\s*(.*)/);
    if (existingMatch) {
       updatedPhone = `${newCode} ${existingMatch[2]}`;
    } else {
       updatedPhone = `${newCode} ${currentPhone}`;
    }
    onField('phone')({ target: { value: updatedPhone } } as any);
  };

  const derivedCountryCode = form.phone?.match(/^(\+\d{1,4})/) ? form.phone.match(/^(\+\d{1,4})/)?.[1] : '+1';
  const localPhoneNumber = form.phone ? form.phone.replace(/^(\+\d{1,4})\s*/, '') : '';

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      
      {/* ── Personal Info ── */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Icons.User />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Personal Information</h3>
            <p className="text-xs text-gray-500">Enter the employee's basic personal details.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">First Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.User />
                </div>
                <input className={`input pl-10 ${errors.first_name ? 'border-red-400' : ''}`} placeholder="Enter first name" value={form.first_name} onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  onField('first_name')({ target: { value: val } } as any);
                }} />
              </div>
              <Err field="first_name" />
            </div>
            <div>
              <label className="label">Last Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.User />
                </div>
                <input className={`input pl-10 ${errors.last_name ? 'border-red-400' : ''}`} placeholder="Enter last name" value={form.last_name} onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  onField('last_name')({ target: { value: val } } as any);
                }} />
              </div>
              <Err field="last_name" />
            </div>
            <div>
              <label className="label">Gender <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.Gender />
                </div>
                <select className={`input pl-10 ${errors.gender ? 'border-red-400' : ''}`} value={form.gender} onChange={onField('gender')}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Err field="gender" />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="label">Date of Birth <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.Calendar />
                </div>
                <input type="date" className={`input pl-10 ${errors.birth_date ? 'border-red-400' : ''}`} value={form.birth_date} max={new Date().toISOString().split('T')[0]} onChange={onField('birth_date')} />
              </div>
              <Err field="birth_date" />
            </div>
          </div>
        </div>
      </div>
      
      <hr className="border-gray-100" />

      {/* ── Contact ── */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Icons.Phone />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Contact Information</h3>
            <p className="text-xs text-gray-500">Add email address and phone number.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Email Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.Mail />
                </div>
                <input type="email" className={`input pl-10 ${errors.email ? 'border-red-400' : ''}`} placeholder="name@company.com" value={form.email} onChange={onField('email')} />
              </div>
              <Err field="email" />
            </div>
            <div>
              <label className="label">Phone Number <span className="text-red-500">*</span></label>
              <div className={`flex items-center w-full rounded-lg border bg-white transition-shadow ${errors.phone ? 'border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20' : 'border-gray-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'} overflow-hidden`}>
                <select 
                  className="h-full py-2 pl-3 pr-7 bg-transparent border-transparent outline-none text-gray-600 text-sm focus:ring-0 focus:outline-none focus:border-transparent cursor-pointer"
                  value={derivedCountryCode}
                  onChange={handleCountryCodeChange}
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <div className="w-px h-5 bg-gray-200 shrink-0"></div>
                <input 
                  type="tel" 
                  className="flex-1 bg-transparent py-2 pl-3 pr-3 border-transparent outline-none text-sm text-gray-900 placeholder-gray-400 focus:ring-0 focus:outline-none focus:border-transparent" 
                  placeholder="555 000 0000" 
                  value={localPhoneNumber} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    onField('phone')({ target: { value: val ? `${derivedCountryCode} ${val}` : '' } } as any);
                  }} 
                />
              </div>
              <Err field="phone" />
            </div>
          </div>
          {mode === 'create' && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-100 mt-2">
              <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {/* TODO: re-enable email invite text once SMTP is configured.
              A temporary login link will be sent to this email for the employee to set their password. */}
              A temporary password will be shown on screen after saving — share it with the employee.
            </div>
          )}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* ── Employment ── */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Icons.Briefcase />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Employment Details</h3>
            <p className="text-xs text-gray-500">Define role and employment information.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Role <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.User />
                </div>
                <select className={`input pl-10 ${errors.role ? 'border-red-400' : ''}`} value={form.role} onChange={onField('role')}>
                  {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <Err field="role" />
            </div>
            <div>
              <label className="label">Employment Type <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.Briefcase />
                </div>
                <select className={`input pl-10 ${errors.employment_type ? 'border-red-400' : ''}`} value={form.employment_type} onChange={onField('employment_type')}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
              <Err field="employment_type" />
            </div>
            <div>
              <label className="label">Allowed IP Address (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.ShieldCheck />
                </div>
                <input 
                  type="text" 
                  className={`input pl-10 ${errors.allowed_ip ? 'border-red-400' : ''}`} 
                  placeholder="e.g. 39.45.1.229" 
                  value={form.allowed_ip || ''} 
                  onChange={onField('allowed_ip')} 
                />
              </div>
              <Err field="allowed_ip" />
            </div>
            <div>
              <label className="label">Join Date <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.Calendar />
                </div>
                <input type="date" className={`input pl-10 ${errors.join_date ? 'border-red-400' : ''}`} value={form.join_date || ''} onChange={onField('join_date')} />
              </div>
              <Err field="join_date" />
            </div>
            {mode === 'edit' && (
              <div>
                <label className="label">Status</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Icons.Badge />
                  </div>
                  <select className="input pl-10" value={form.status} onChange={onField('status')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* ── Organisation ── */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Icons.Building />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Organization Details</h3>
            <p className="text-xs text-gray-500">Select department and designation.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Department <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.Building />
                </div>
                <select 
                  className={`input pl-10 ${errors.department_id ? 'border-red-400' : ''} ${departments.length === 1 ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} 
                  value={form.department_id || ''} 
                  onChange={onDeptChange}
                  disabled={departments.length === 1}
                >
                  <option value="">Select department…</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <Err field="department_id" />
            </div>
            <div>
              <label className="label">Designation / Job Title <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.Badge />
                </div>
                <select
                  className={`input pl-10 ${errors.designation_id ? 'border-red-400' : ''}`}
                  value={form.designation_id || ''}
                  onChange={e => onField('designation_id')({ target: { value: e.target.value } } as any)}
                  disabled={!form.department_id}
                >
                  <option value="">{form.department_id ? 'Select designation…' : 'Select department first…'}</option>
                  {filteredDesigs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
              <Err field="designation_id" />
            </div>
            
            {showManagerSelection && (
              <div className="md:col-span-2">
                <label className="label">{reportingLabel}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Icons.User />
                  </div>
                  {form.role === 'manager' ? (
                    <div className="input pl-10 bg-gray-50 text-gray-400 cursor-not-allowed flex items-center">
                      Reports directly to CEO
                    </div>
                  ) : (
                    <select
                      className="input pl-10"
                      value={form.manager_id || ''}
                      onChange={e => onField('manager_id')({ target: { value: e.target.value } } as any)}
                    >
                      <option value="">{reportingPlaceholder}</option>
                      {reportingLeads.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role === 'tl' ? 'Team Lead' : 'Manager'} · {m.department?.name || 'No dept'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {form.role !== 'manager' && reportingLeads.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No {form.role === 'tl' ? 'managers' : 'team leads'} found yet. Add one first or assign later.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* ── Additional ── */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Icons.Clipboard />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Additional Information</h3>
            <p className="text-xs text-gray-500">Add address and emergency contact (optional).</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Address</label>
              <div className="relative">
                <div className="absolute top-[10px] left-3 flex items-start pointer-events-none text-gray-400">
                  <Icons.MapPin />
                </div>
                <textarea className="input pl-10 resize-none py-[10px]" rows={1} placeholder="Street address, city, state, zip code" value={form.address || ''} onChange={onField('address')} />
              </div>
            </div>
            <div>
              <label className="label">Emergency Contact</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Icons.Phone />
                </div>
                <input className="input pl-10" placeholder="Name and phone number" value={form.emergency_contact || ''} onChange={onField('emergency_contact')} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* ── Account & Invitation (Create) / Security (Edit) ── */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          {mode === 'create' ? <Icons.ShieldCheck /> : <Icons.Lock />}
        </div>
        <div className="flex-1 space-y-4">
          {mode === 'create' ? (
            <>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Account Access</h3>
                <p className="text-xs text-gray-500">A temporary password is generated automatically on save.</p>
              </div>
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-start sm:items-center gap-3">
                <input type="checkbox" id="send_invite" defaultChecked className="w-4 h-4 mt-0.5 sm:mt-0 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-600" />
                <div className="flex-1">
                  <label htmlFor="send_invite" className="text-sm font-semibold text-emerald-900 select-none cursor-pointer">Send account invitation email</label>
                  <p className="text-xs text-emerald-700/70">The employee will receive an email to set up their account.</p>
                </div>
                <div className="hidden sm:block">
                   <svg className="w-12 h-12 text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                     <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                     <polyline points="22,6 12,13 2,6"/>
                     <path d="M19 1l3 3-3 3" />
                     <path d="M12 9l10-8" />
                   </svg>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Security</h3>
                <p className="text-xs text-gray-500">Update account password.</p>
              </div>
              <div>
                <label className="label">New Password</label>
                <div className="relative max-w-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Icons.Lock />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    className={`input pl-10 pr-10 ${errors.new_password ? 'border-red-400' : ''}`} 
                    placeholder="Leave blank to keep current password"
                    value={form.new_password || ''} 
                    onChange={onField('new_password')} 
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                    {showPassword ? (
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                <Err field="new_password" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-8">
        <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm  transition-colors">
          Cancel
        </button>
        <button type="submit" className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm  transition-colors flex items-center gap-2" disabled={submitting}>
          {submitting ? (
            <span>{mode === 'create' ? 'Adding…' : 'Saving…'}</span>
          ) : (
            <>
              {mode === 'create' ? <Icons.User /> : null}
              <span>{mode === 'create' ? 'Add Employee & Send Invitation' : 'Save Changes'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

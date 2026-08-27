import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { documentService, UserDocument } from '../../services/documentService';
import { leaveService } from '../../services/leaveService';
import { employeeProfileService, InternalNote, ProfileStats } from '../../services/employeeProfileService';
import { useSettings } from '../../contexts/SettingsContext';
import { User, LeaveBalance } from '../../types';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../services/api';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';


export default function EmployeeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [noteForm, setNoteForm] = useState({ title: '', body: '' });
  const [addingNote, setAddingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const authUser = useAuth().user;
  const { money } = useSettings();
  const canEditNotes = authUser?.role === 'ceo' || authUser?.role === 'manager';
  const [uploadDocType, setUploadDocType] = useState(authUser?.role === 'ceo' ? 'disciplinary_document' : 'salary_document');
  const [uploadDocFile, setUploadDocFile] = useState<File | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchUser();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    employeeProfileService.getStats(parseInt(id, 10), format(currentMonth, 'yyyy-MM'))
      .then(setStats).catch(() => {});
  }, [id, currentMonth]);

  const fetchUser = async () => {
    try {
      if (!id) return;
      const data = await userService.getById(parseInt(id, 10));
      setUser(data);
      fetchDocuments();
      fetchBalances();
      fetchNotes();
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    if (!id) return;
    try {
      const docsData = await documentService.getDocuments(parseInt(id, 10));
      setDocuments(docsData);
    } catch (error) {
      console.error('Failed to fetch documents', error);
    }
  };

  const fetchBalances = async () => {
    if (!id) return;
    try {
      const res = await leaveService.getBalances({ user_id: parseInt(id, 10) });
      setBalances(res.balances);
    } catch (error) {
      console.error('Failed to fetch balances', error);
    }
  };

  const fetchNotes = async () => {
    if (!id) return;
    try { setNotes(await employeeProfileService.getNotes(parseInt(id, 10))); } catch { /* ignore */ }
  };

  const handleAddNote = async () => {
    if (!id || !noteForm.title.trim()) return;
    setAddingNote(true);
    try {
      await employeeProfileService.addNote(parseInt(id, 10), noteForm);
      setNoteForm({ title: '', body: '' });
      fetchNotes();
      toast.success('Note added');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setAddingNote(false); }
  };

  const handleDeleteNote = async (noteId: number) => {
    try { await employeeProfileService.deleteNote(noteId); fetchNotes(); }
    catch { toast.error('Failed to delete note'); }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uploadDocFile) return;

    setDocLoading(true);
    try {
      await documentService.uploadDocument(user.id, uploadDocType, uploadDocFile);
      toast.success('Document uploaded successfully');
      setUploadDocFile(null);
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setDocLoading(false);
    }
  };

  const handleDocumentDelete = async (docId: number) => {
    try {
      await documentService.deleteDocument(docId);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (err: any) {
      toast.error('Failed to delete document');
    }
  };

  if (loading) return <PageLoader />;
  if (!user) return <div className="p-6 text-center text-gray-500">User not found.</div>;

  // ─── REAL DATA DERIVED FROM API ─────────────────────────────────────────────

  const performanceData = stats?.performance.monthly || [];
  const perfCurrent = stats?.performance.current ?? 0;
  const perfDelta = stats?.performance.delta ?? 0;

  const hoursLoggedData = (stats?.hours_week.days || []).map(d => ({
    day: d.day, hours: d.minutes / 60,
    formatted: `${Math.floor(d.minutes / 60)}:${String(d.minutes % 60).padStart(2, '0')}`,
    active: d.active,
  }));
  const hoursTotal = stats?.hours_week.total_minutes ?? 0;
  const hoursH = Math.floor(hoursTotal / 60);
  const hoursM = hoursTotal % 60;

  const calendarCounts = stats?.calendar.counts || { present: 0, late: 0, on_leave: 0, absent: 0 };
  const statusByDay: Record<number, string | null> = {};
  (stats?.calendar.days || []).forEach(c => { statusByDay[c.day] = c.status; });

  // ─── CALENDAR LOGIC ─────────────────────────────────────────────────────────

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayStatus = (day: Date) => {
    if (!isSameMonth(day, monthStart)) return null;
    return statusByDay[day.getDate()] || null;
  };


  // ─── CIRCULAR PROGRESS COMPONENT ────────────────────────────────────────────

  const CircularProgress = ({ value, max, label, colorClass, trailClass, suffix = '' }: any) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className={`flex flex-col items-center justify-center p-4 rounded-2xl ${trailClass}`}>
        <span className="text-xs font-semibold text-gray-500 mb-2">{label}</span>
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="transform -rotate-90 w-24 h-24">
            <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100" />
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`transition-all duration-1000 ease-out ${colorClass}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 leading-none">
              {value}<span className="text-sm font-bold text-gray-400 ml-0.5">/{max}</span>
            </span>
            {suffix && <span className="text-[10px] text-gray-400 font-medium mt-1 uppercase">{suffix}</span>}
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="p-4 lg:p-6 lg:px-8 max-w-[1600px] mx-auto min-h-screen bg-[#F9FAFB]">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Details</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <Link to="/ceo/dashboard" className="hover:text-emerald-600 transition-colors">Dashboard</Link>
              <span>/</span>
              <Link to="/ceo/employees" className="hover:text-emerald-600 transition-colors">Employees</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Employee Details</span>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <div className="relative">
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search anything" className="w-80 bg-white border border-gray-100 rounded-2xl py-2.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.08)] transition-all" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* ── LEFT SIDEBAR (Profile) ── */}
        <div className="md:col-span-3 space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-28 h-28 rounded-2xl bg-emerald-400 overflow-hidden shadow-inner">
                {user.avatar_url ? (
                   <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white uppercase bg-emerald-500">
                    {user.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">{user.designation?.title || user.role} · {user.department?.name}</p>
            
            <div className="flex items-center gap-3 mt-4 w-full justify-center">
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold font-mono">
                {user.employee_id || 'EMP-XXXX'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {user.status === 'active' ? 'Active' : user.status}
              </span>
            </div>

            <div className="w-full mt-6 space-y-4 border-t border-gray-100 pt-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Employment Type</span>
                <span className="font-semibold text-gray-900 capitalize">{user.employment_type?.replace('_', '-')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Work Model</span>
                <span className="font-semibold text-gray-900">{stats?.work_model || '—'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Join Date</span>
                <span className="font-semibold text-gray-900">
                  {user.join_date ? format(parseISO(user.join_date), 'dd MMMM yyyy') : '—'}
                </span>
              </div>
            </div>

            <div className="w-full mt-6 border-t border-gray-100 pt-6 flex items-center justify-between">
              <span className="text-sm text-gray-500">Social Media:</span>
              <div className="flex gap-2">
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 text-lg">Personal Info</h3>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Gender</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{user.gender || '—'}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Date of Birth</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {user.birth_date ? format(parseISO(user.birth_date), 'dd MMMM yyyy') : '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Email Address</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Phone</p>
                  <p className="text-sm font-semibold text-gray-900">{user.phone || '—'}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Address</p>
                  <p className="text-sm font-semibold text-gray-900 leading-snug pr-2">{user.address || '—'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Satisfaction Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-64 flex items-center justify-center text-gray-500 italic">
            More details coming soon...
          </div>
        </div>

        {/* ── MIDDLE COLUMN (Charts & Data) ── */}
        <div className="md:col-span-6 space-y-6">
          
          {/* Leaves Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6">
            <CircularProgress 
              value={balances.filter(b => ['Annual Leave', 'Casual Leave', 'Sick Leave'].includes(b.leave_type?.name || '')).reduce((acc, b) => acc + (b.remaining || 0), 0)} 
              max={balances.filter(b => ['Annual Leave', 'Casual Leave', 'Sick Leave'].includes(b.leave_type?.name || '')).reduce((acc, b) => acc + (b.allocated || 0), 0) || 1} 
              label="All Leaves" 
              colorClass="text-emerald-800" trailClass="bg-white border border-gray-100 shadow-sm" suffix="Days" 
            />
            <CircularProgress 
              value={balances.find(b => b.leave_type?.code === 'AL' || b.leave_type?.name === 'Annual Leave')?.remaining || 0} 
              max={balances.find(b => b.leave_type?.code === 'AL' || b.leave_type?.name === 'Annual Leave')?.allocated || 1} 
              label="Annual Leaves" 
              colorClass="text-teal-500" trailClass="bg-white border border-gray-100 shadow-sm" suffix="Days" 
            />
            <CircularProgress 
              value={balances.find(b => b.leave_type?.code === 'SL' || b.leave_type?.name === 'Sick Leave')?.remaining || 0} 
              max={balances.find(b => b.leave_type?.code === 'SL' || b.leave_type?.name === 'Sick Leave')?.allocated || 1} 
              label="Sick Leaves" 
              colorClass="text-emerald-600" trailClass="bg-white border border-gray-100 shadow-sm" suffix="Days" 
            />
          </div>

          {/* Performance Overview */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900 text-lg">Performance Overview</h3>
              <select className="bg-emerald-50 border-none text-emerald-700 text-sm font-semibold rounded-xl px-4 py-2 appearance-none cursor-pointer outline-none ring-0 pr-8 relative">
                <option>This Year</option>
                <option>Last Year</option>
              </select>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{perfCurrent}%</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1 ${perfDelta < 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                  <svg className={`w-3 h-3 ${perfDelta < 0 ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  {perfDelta >= 0 ? '+' : ''}{perfDelta}%
                </span>
                <span className="text-xs text-gray-500 font-medium">{perfDelta >= 0 ? 'Increased' : 'Decreased'} vs last month · attendance rate</span>
              </div>
            </div>

            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickFormatter={(val) => `${val}%`}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#047857', fontWeight: 'bold' }}
                    cursor={{ stroke: '#10B981', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#047857" 
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    activeDot={{ r: 6, fill: '#047857', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Hours Logged */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-lg">Hours Logged</h3>
                <select className="bg-emerald-50 border-none text-emerald-700 text-sm font-semibold rounded-xl px-4 py-2 appearance-none outline-none">
                  <option>This Week</option>
                  <option>Last Week</option>
                </select>
              </div>
              
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-2xl font-bold text-gray-900">{hoursH}</span>
                <span className="text-sm font-semibold text-gray-500">h</span>
                <span className="text-2xl font-bold text-gray-900 ml-1">{hoursM}</span>
                <span className="text-sm font-semibold text-gray-500">m</span>
              </div>

              <div className="h-40 w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hoursLoggedData} margin={{ top: 15, right: 0, left: 0, bottom: 0 }} barSize={24}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }}
                      dy={10}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                              {payload[0].payload.formatted}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="hours" radius={[6, 6, 6, 6]}>
                      {hoursLoggedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.active ? '#064e3b' : '#34d399'} opacity={1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-lg">Documents</h3>
              </div>
              
              {(authUser?.role === 'ceo' || authUser?.role === 'manager') && (
                <div className="bg-gray-50 p-3 rounded-xl mb-4 border border-gray-100 flex flex-col gap-3">
                  <select 
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="disciplinary_document">Disciplinary Document</option>
                    {authUser?.role !== 'ceo' && (
                      <>
                        <option value="salary_document">Salary Document</option>
                        <option value="bank_details">Bank Details</option>
                      </>
                    )}
                  </select>
                  <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setUploadDocFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                    <button 
                      type="button" 
                      onClick={handleDocumentUpload}
                      disabled={!uploadDocFile || docLoading}
                      className="w-full xl:w-auto whitespace-nowrap px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {docLoading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">Only PDF files up to 2MB are allowed.</p>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {documents.map((doc, idx) => (
                  <div key={idx} onClick={() => documentService.downloadDocument(doc.id, doc.name)} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex flex-col items-center justify-center shrink-0 border border-emerald-100">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="text-[9px] font-bold mt-0.5" title={doc.type}>{doc.type.substring(0, 3).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-500 font-medium capitalize">{doc.type.replace('_', ' ')}</p>
                    </div>
                    {(authUser?.role === 'ceo' || authUser?.role === 'manager') && (
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); handleDocumentDelete(doc.id); }} 
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                ))}
                {documents.length === 0 && (
                  <div className="text-center text-sm text-gray-500 py-4">No documents found.</div>
                )}
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-lg">Internal Notes</h3>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
            </div>
            {canEditNotes && (
              <div className="mb-4 bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col gap-2">
                <input value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} placeholder="Note title" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                <textarea value={noteForm.body} onChange={e => setNoteForm({ ...noteForm, body: e.target.value })} placeholder="Write a note…" rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:ring-1 focus:ring-emerald-500 resize-none" />
                <button type="button" onClick={handleAddNote} disabled={!noteForm.title.trim() || addingNote} className="self-end px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">{addingNote ? 'Adding…' : 'Add Note'}</button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4">
              {notes.map(note => (
                <div key={note.id} className="group relative bg-[#f2faef] rounded-2xl p-5 border border-[#e3f4df]">
                  <h4 className="font-bold text-sm text-gray-900 pr-6">{note.title}</h4>
                  <p className="text-[10px] text-gray-400 font-semibold mb-2">{note.author} · {note.created_at ? format(parseISO(note.created_at), 'dd MMM yyyy') : ''}</p>
                  {note.body && <p className="text-xs text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{note.body.replace(/<[^>]*>/g, '')}</p>}
                  {canEditNotes && <button type="button" onClick={() => handleDeleteNote(note.id)} className="absolute top-4 right-4 hidden group-hover:block text-red-500 hover:text-red-700"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                </div>
              ))}
              {!notes.length && <div className="text-center text-sm text-gray-400 py-4">No notes yet.</div>}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN (Calendar & Payroll) ── */}
        <div className="md:col-span-3 space-y-6">
          
          {/* Calendar Widget */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 hover:bg-emerald-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-4">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-xs font-bold text-gray-400 py-1">{d}</div>
              ))}
              
              {days.map((day, i) => {
                const status = getDayStatus(day);
                const isCurrentMonth = isSameMonth(day, monthStart);
                
                let bgClass = 'bg-transparent';
                let textClass = isCurrentMonth ? 'text-gray-900' : 'text-gray-300';
                
                if (status === 'present') {
                  bgClass = 'bg-[#c6f6d5]';
                  textClass = 'text-[#064e3b] font-bold';
                } else if (status === 'leave') {
                  bgClass = 'bg-[#064e3b]';
                  textClass = 'text-white font-bold';
                } else if (status === 'late') {
                  bgClass = 'bg-[#4fd1c5]';
                  textClass = 'text-white font-bold';
                }

                return (
                  <div key={i} className="p-0.5">
                    <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-lg text-sm transition-colors cursor-pointer ${bgClass} ${textClass} hover:opacity-80`}>
                      {format(day, dateFormat)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-100">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-4 bg-[#c6f6d5] rounded-sm"></div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Present</span>
                </div>
                <span className="text-sm font-bold text-gray-900 pl-3">{calendarCounts.present}</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-4 bg-[#4fd1c5] rounded-sm"></div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Late</span>
                </div>
                <span className="text-sm font-bold text-gray-900 pl-3">{calendarCounts.late}</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-4 bg-[#064e3b] rounded-sm"></div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase leading-tight">On<br/>Leave</span>
                </div>
                <span className="text-sm font-bold text-gray-900 pl-3">{calendarCounts.on_leave}</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-4 bg-gray-200 rounded-sm"></div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Absent</span>
                </div>
                <span className="text-sm font-bold text-gray-900 pl-3">{calendarCounts.absent}</span>
              </div>
            </div>
          </div>

          {/* Payroll Summary */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 text-lg">Payroll Summary</h3>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center mb-6">
              <span className="text-xs font-semibold text-gray-500">Description</span>
              <div className="text-right">
                <span className="text-xs font-semibold text-gray-500 block">Amount</span>
                <span className="text-[9px] text-gray-400 font-medium uppercase">per month</span>
              </div>
            </div>

            {!stats?.payroll.has_record ? (
              <div className="text-center text-sm text-gray-400 py-6">No payroll record set for this employee.</div>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-sm font-bold text-gray-900">Base Salary</span>
                  <span className="text-sm font-bold text-gray-900">{money(stats.payroll.base_salary)}</span>
                </div>
                <div className="flex justify-between text-sm px-1">
                  <span className="text-gray-500 font-medium">Allowances</span>
                  <span className="font-bold text-gray-900">{money(stats.payroll.allowances)}</span>
                </div>
                <div className="flex justify-between text-sm px-1">
                  <span className="text-gray-500 font-medium">Incentives</span>
                  <span className="font-bold text-gray-900">{money(stats.payroll.incentives)}</span>
                </div>
                <div className="flex justify-between text-sm px-1">
                  <span className="text-gray-500 font-medium">Overtime rate / hour</span>
                  <span className="font-bold text-gray-900">{money(stats.payroll.overtime_rate)}</span>
                </div>
                <div className="flex justify-between text-sm px-1">
                  <span className="text-gray-500 font-medium">Deductions</span>
                  <span className="font-bold text-red-500">−{money(stats.payroll.deductions)}</span>
                </div>
                <div className="border-t border-gray-100 pt-5 px-1 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900">Net Monthly</span>
                  <span className="text-lg font-bold text-emerald-700">{money(stats.payroll.total)}</span>
                </div>
                {stats.payroll.month && <p className="text-[10px] text-gray-400 text-center">Latest record: {stats.payroll.month}</p>}
              </div>
            )}

          </div>

        </div>
      </div>

    </div>
  );
}

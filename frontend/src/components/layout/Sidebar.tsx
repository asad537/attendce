import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { projectService } from '../../services/projectService';
import { Project } from '../../types';

interface NavItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  roles: string[];
  subItems?: { label: string; path: string; }[];
}

const navItems: NavItem[] = [
  // ── Employee ──────────────────────────────────────────────────────────────
  {
    label: 'Dashboard', path: '/employee',
    roles: ['employee'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    label: 'My Attendance', path: '/employee/attendance',
    roles: ['employee'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  },
  {
    label: 'My Leaves', path: '/employee/leaves',
    roles: ['employee'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    label: 'Work From Home (WFM)', path: '/employee/wfh',
    roles: ['employee'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },

  // ── Manager ───────────────────────────────────────────────────────────────
  {
    label: 'Dashboard', path: '/manager',
    roles: ['manager'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    label: 'Performance', path: '/manager/reports',
    roles: ['manager'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    label: 'Team Attendance', path: '/manager/attendance',
    roles: ['manager'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    label: 'Leave Approvals', path: '/manager/leave-approvals',
    roles: ['manager'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    label: 'My Team', path: '/manager/team',
    roles: ['manager'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  },
  {
    label: 'WFM Approvals', path: '/manager/wfh-approvals',
    roles: ['manager'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    label: 'My WFM', path: '/manager/wfh',
    roles: ['manager'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },

  // ── Team Lead (TL) ────────────────────────────────────────────────────────
  {
    label: 'Dashboard', path: '/tl',
    roles: ['tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    label: 'Performance', path: '/tl/reports',
    roles: ['tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    label: 'Team Attendance', path: '/tl/attendance',
    roles: ['tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    label: 'Leave Approvals', path: '/tl/leaves',
    roles: ['tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    label: 'My Team', path: '/tl/team',
    roles: ['tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  },
  {
    label: 'My Attendance', path: '/tl/my-attendance',
    roles: ['tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  },
  {
    label: 'My Leaves', path: '/tl/my-leaves',
    roles: ['tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    label: 'WFM Approvals', path: '/tl/wfh-approvals',
    roles: ['tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    label: 'My WFM', path: '/tl/wfh',
    roles: ['tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },

  // ── CEO ───────────────────────────────────────────────────────────────────
  {
    label: 'Dashboard', path: '/ceo',
    roles: ['ceo'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    label: 'Payroll', path: '/ceo/payroll',
    roles: ['ceo'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16v12H4V6Zm3 3h.01M17 15h.01M9 12h6m-3-3v6" /></svg>,
  },
  {
    label: 'Attendance',
    roles: ['ceo'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    subItems: [
      { label: 'All Attendance', path: '/ceo/attendance' },
      { label: 'Leave Approvals', path: '/ceo/leave-approvals' },
      { label: 'WFM Approvals', path: '/ceo/wfh-approvals' },
    ],
  },
  {
    label: 'Employees', path: '/ceo/employees',
    roles: ['ceo'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  },
  {
    label: 'Projects', path: '/projects',
    roles: ['ceo', 'manager', 'tl', 'employee'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" /></svg>,
  },
  {
    label: 'Calendar', path: '/calendar',
    roles: ['ceo', 'manager', 'tl', 'employee'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  },
  {
    label: 'My Tickets', path: '/my-tickets',
    roles: ['ceo', 'manager', 'tl', 'employee'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  {
    label: 'Inbox', path: '/inbox',
    roles: ['ceo', 'manager', 'tl', 'employee'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4V4Zm0 3 8 6 8-6" /></svg>,
  },
  {
    label: 'Departments', path: '/departments',
    roles: ['ceo', 'manager', 'tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    label: 'Performance', path: '/ceo/reports',
    roles: ['ceo'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    label: 'Holidays', path: '/ceo/holidays',
    roles: ['ceo'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  },
  {
    label: 'Audit Logs', path: '/ceo/audit-logs',
    roles: ['ceo'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  },
  {
    label: 'Attendance Sheet', path: '/attendance-sheet',
    roles: ['ceo', 'manager', 'tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  {
    label: 'Settings', path: '/settings',
    roles: ['ceo', 'manager'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
];

const roleLabel: Record<string, string> = {
  employee: 'Employee',
  tl:       'Team Lead',
  manager:  'Manager',
  ceo:      'CEO',
};

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  useEffect(() => {
    // Fetch for every role — backend already scopes the list per role
    // (CEO=all, Manager/TL=owned+led, Employee=projects with an assigned ticket).
    if (user) {
      projectService.getAll().then(setProjects).catch(() => {});
    }
  }, [user]);

  const filtered = navItems.filter((item) => user && item.roles.includes(user.role));

  const isActive = (path?: string) => {
    if (!path) return false;
    // exact match for root dashboard paths
    if (['/employee', '/manager', '/ceo', '/tl'].includes(path)) {
      return location.pathname === path || location.pathname === path + '/dashboard';
    }
    // Projects parent should NOT stay lit when a specific project (a child
    // link like /projects/12) is open — otherwise both rows highlight.
    if (path === '/projects') {
      return location.pathname === '/projects';
    }
    return location.pathname.startsWith(path);
  };

  const roleColors: Record<string, string> = {
    employee: 'badge-green',
    tl:       'badge-cyan',
    manager:  'badge-blue',
    ceo:      'badge-purple',
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">

      {/* ── Brand ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight">ERP System</p>
          <p className="text-xs text-gray-400">Workforce Management</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 lg:hidden">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {filtered.map((item) => {
          const isItemActive = isActive(item.path);
          const hasActiveSub = item.subItems?.some(sub => location.pathname.startsWith(sub.path));
          const active = isItemActive || hasActiveSub;
          const isExpanded = expandedItems[item.label] ?? hasActiveSub;
          
          return (
          <React.Fragment key={item.label}>
            {item.path ? (
              <Link
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className={active ? 'text-emerald-600' : 'text-gray-400'}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
              </Link>
            ) : (
              <div
                onClick={() => toggleExpand(item.label)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active || isExpanded
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className={active || isExpanded ? 'text-emerald-600' : 'text-gray-400'}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.subItems && (
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            )}

            {item.subItems && item.subItems.length > 0 && isExpanded && (
              <div className="ml-[1.35rem] mt-1 mb-2 space-y-0.5 border-l border-gray-200 pl-3">
                {item.subItems.map((sub) => {
                  const subActive = location.pathname.startsWith(sub.path);
                  return (
                    <Link
                      key={sub.path}
                      to={sub.path}
                      onClick={onClose}
                      className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                        subActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                          subActive ? 'bg-emerald-500' : 'bg-gray-300 group-hover:bg-gray-400'
                        }`}
                      />
                      <span className="truncate">{sub.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
            
            {item.label === 'Projects' && projects.length > 0 && (
              <div className="ml-[1.35rem] mt-1 mb-2 space-y-0.5 border-l border-gray-200 pl-3">
                {projects.map((p) => {
                  const active = location.pathname === `/projects/${p.id}`;
                  return (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      onClick={onClose}
                      title={p.name}
                      className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                        active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                          active ? 'bg-emerald-500' : 'bg-gray-300 group-hover:bg-gray-400'
                        }`}
                      />
                      <span className="truncate">{p.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </React.Fragment>
          );
        })}
      </nav>

      {/* ── User strip + Logout ──────────────────────────────────────────── */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        {/* compact user row */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50">
          <div className="relative w-7 h-7 flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-xs">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            {user?.avatar_url && (
              <img src={user.avatar_url} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} className="absolute inset-0 w-7 h-7 rounded-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 truncate leading-tight">{user?.name}</p>
            <p className={`text-xs ${roleColors[user?.role || 'employee']} leading-tight`}>
              {user?.designation?.title || roleLabel[user?.role || 'employee']}
            </p>
          </div>
        </div>

        {/* sign out */}
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import ProfileSettingsModal from '../common/ProfileSettingsModal';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="flex min-h-screen h-dvh bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-60 xl:w-64 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-[min(18rem,86vw)] h-full">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-14 px-3 sm:px-4 lg:px-6 bg-white border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 focus:outline-none"
              >
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  {user?.avatar_url && (
                    <img src={user.avatar_url} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} className="absolute inset-0 w-8 h-8 rounded-full object-cover" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 leading-none">{user?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user?.employee_id}</p>
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <button
                    onClick={() => { setDropdownOpen(false); setSettingsOpen(true); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    My Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      <ProfileSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

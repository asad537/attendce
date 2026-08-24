import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../../services/reportService';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoader } from '../../components/common/LoadingSpinner';

export default function CeoDashboard() {
  const { user } = useAuth();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: snapshot, isLoading } = useQuery({
    queryKey: ['daily-snapshot', today],
    queryFn: () => reportService.getDailySnapshot(),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.name}. Here's today's overview.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Employees */}
        <div className="card bg-gradient-to-br from-indigo-50 to-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Total Workforce</h3>
            <span className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{snapshot?.total || 0}</p>
        </div>

        {/* Present Today */}
        <div className="card bg-gradient-to-br from-emerald-50 to-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Present</h3>
            <span className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{snapshot?.working || 0}</p>
        </div>

        {/* Absent */}
        <div className="card bg-gradient-to-br from-red-50 to-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wider">Absent</h3>
            <span className="p-2 bg-red-100 rounded-lg text-red-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{snapshot?.absent || 0}</p>
        </div>

        {/* On Leave */}
        <div className="card bg-gradient-to-br from-amber-50 to-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wider">On Leave</h3>
            <span className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{snapshot?.on_leave || 0}</p>
        </div>
      </div>

      {/* Recent Activity or Teams */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Today's Workforce Status</h2>
        {snapshot?.employees && snapshot.employees.length > 0 ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {snapshot.employees.map((emp) => (
                  <tr key={emp.id}>
                    <td className="font-medium text-gray-900">{emp.name}</td>
                    <td className="text-gray-500">{emp.department || 'N/A'}</td>
                    <td>
                      <span className={`badge ${
                        emp.current_status === 'working' ? 'badge-green' :
                        emp.current_status === 'absent' ? 'badge-red' :
                        emp.current_status === 'on_leave' ? 'badge-yellow' :
                        emp.current_status === 'work_from_home' ? 'badge-purple' :
                        'badge-gray'
                      }`}>
                        {(emp.current_status || '').replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="text-gray-500">{emp.check_in ? format(new Date(emp.check_in), 'hh:mm a') : '-'}</td>
                    <td className="text-gray-500">{emp.check_out ? format(new Date(emp.check_out), 'hh:mm a') : '-'}</td>
                    <td className="text-gray-500">{emp.working_hours ? emp.working_hours.toFixed(1) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No employee data available for today yet.
          </div>
        )}
      </div>
    </div>
  );
}

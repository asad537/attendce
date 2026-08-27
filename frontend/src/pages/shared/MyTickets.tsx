import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../services/api';
import { getPriorityIconSVG } from '../../components/common/PriorityDropdown';
import { PageLoader } from '../../components/common/LoadingSpinner';

type Ticket = {
    id: number;
    title: string;
    status: 'todo' | 'in_progress' | 'in_review' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
    project?: { id: number; name: string };
};

export default function MyTickets() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const res = await api.get('/my-tickets');
            setTickets(res.data.tickets || []);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    if (loading) return <PageLoader />;

    const formatStatus = (s: string) => {
        return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const getStatusBadge = (s: string) => {
        switch (s) {
            case 'todo': return 'bg-gray-100 text-gray-700';
            case 'in_progress': return 'bg-blue-100 text-blue-700';
            case 'in_review': return 'bg-yellow-100 text-yellow-700';
            case 'done': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="w-full p-4 sm:p-6 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Tickets</h1>
                    <p className="text-sm text-gray-500 mt-1">All tickets assigned to you across all projects</p>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span><strong className="text-gray-900">{tickets.length}</strong> assigned</span>
                </div>
            </div>

            {tickets.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center shadow-sm">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h2 className="text-base font-semibold text-gray-900">No tickets assigned yet</h2>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-gray-500">Tickets assigned to you from any project will appear here automatically.</p>
                </div>
            ) : (
                <>
                <div className="grid grid-cols-1 gap-3 md:hidden">
                    {tickets.map((t) => (
                        <article key={t.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t.project?.name || 'Unknown project'}</p>
                                    {t.project ? <Link to={`/projects/${t.project.id}`} className="mt-1 block font-semibold text-emerald-700 hover:underline">{t.title}</Link> : <h2 className="mt-1 font-semibold text-gray-900">{t.title}</h2>}
                                </div>
                                <span className={`shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-full ${getStatusBadge(t.status)}`}>{formatStatus(t.status)}</span>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                                <div className="flex items-center gap-2">{getPriorityIconSVG(t.priority)}<span className="text-sm capitalize text-gray-600">{t.priority || 'Medium'}</span></div>
                                <span className="text-sm text-gray-500">Due {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'not set'}</span>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
                <table className="w-full min-w-[760px] divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="w-[34%] px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                            <th className="w-[22%] px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tickets.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 lg:px-6 py-4">
                                        {t.project ? (
                                            <Link 
                                                to={`/projects/${t.project.id}`}
                                                className="text-sm font-medium text-emerald-600 hover:text-emerald-900 hover:underline line-clamp-2 block"
                                            >
                                                {t.title}
                                            </Link>
                                        ) : (
                                            <div className="text-sm font-medium text-gray-900 line-clamp-2 block">
                                                {t.title}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                        {t.project ? (
                                            <Link 
                                                to={`/projects/${t.project.id}`} 
                                                className="text-sm text-emerald-600 hover:text-emerald-900 hover:underline"
                                            >
                                                {t.project.name}
                                            </Link>
                                        ) : (
                                            <span className="text-sm text-gray-400">Unknown</span>
                                        )}
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {getPriorityIconSVG(t.priority)}
                                            <span className="text-sm text-gray-700 capitalize">{t.priority || 'Medium'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${getStatusBadge(t.status)}`}>
                                            {formatStatus(t.status)}
                                        </span>
                                    </td>
                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-500">
                                            {t.due_date ? new Date(t.due_date).toLocaleDateString() : '-'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
                </div>
                </>
            )}
        </div>
    );
}

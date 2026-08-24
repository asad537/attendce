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
        <div className="w-full py-4 px-4 sm:py-6 sm:px-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
                <p className="text-sm text-gray-500 mt-1">All tickets assigned to you across all projects</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tickets.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                                    No tickets assigned to you.
                                </td>
                            </tr>
                        ) : (
                            tickets.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        {t.project ? (
                                            <Link 
                                                to={`/projects/${t.project.id}`}
                                                className="text-sm font-medium text-indigo-600 hover:text-indigo-900 hover:underline line-clamp-2 block"
                                            >
                                                {t.title}
                                            </Link>
                                        ) : (
                                            <div className="text-sm font-medium text-gray-900 line-clamp-2 block">
                                                {t.title}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {t.project ? (
                                            <Link 
                                                to={`/projects/${t.project.id}`} 
                                                className="text-sm text-indigo-600 hover:text-indigo-900 hover:underline"
                                            >
                                                {t.project.name}
                                            </Link>
                                        ) : (
                                            <span className="text-sm text-gray-400">Unknown</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {getPriorityIconSVG(t.priority)}
                                            <span className="text-sm text-gray-700 capitalize">{t.priority || 'Medium'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${getStatusBadge(t.status)}`}>
                                            {formatStatus(t.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-500">
                                            {t.due_date ? new Date(t.due_date).toLocaleDateString() : '-'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

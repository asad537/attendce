import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { holidayService } from '../../services/reportService';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Holiday } from '../../types';

export default function CeoHolidays() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('public');
  const [description, setDescription] = useState('');

  const { data: holidays, isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => holidayService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => holidayService.create(data),
    onSuccess: () => {
      toast.success('Holiday created successfully!');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      closeModal();
    },
    onError: () => toast.error('Failed to create holiday.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => holidayService.update(id, data),
    onSuccess: () => {
      toast.success('Holiday updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      closeModal();
    },
    onError: () => toast.error('Failed to update holiday.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => holidayService.delete(id),
    onSuccess: () => {
      toast.success('Holiday deleted.');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: () => toast.error('Failed to delete holiday.'),
  });

  const openModal = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setName(holiday.name);
      setDate(holiday.date);
      setType(holiday.type);
      setDescription(holiday.description || '');
    } else {
      setEditingHoliday(null);
      setName('');
      setDate('');
      setType('public');
      setDescription('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHoliday(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, date, type, description };
    if (editingHoliday) {
      updateMutation.mutate({ id: editingHoliday.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Holidays</h1>
          <p className="text-sm text-gray-500 mt-1">Manage public holidays and company-wide days off.</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Holiday
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Holiday Name</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {holidays?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                    No holidays configured yet.
                  </td>
                </tr>
              ) : (
                holidays?.map((holiday) => (
                  <tr key={holiday.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{new Date(holiday.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{holiday.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium \${holiday.type === 'public' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {holiday.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{holiday.description || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openModal(holiday)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(holiday.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Holiday Name</label>
                <input type="text" required className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Independence Day" />
              </div>
              
              <div>
                <label className="label">Date</label>
                <input type="date" required className="input" value={date} onChange={e => setDate(e.target.value)} />
              </div>

              <div>
                <label className="label">Type</label>
                <select className="input" value={type} onChange={e => setType(e.target.value)}>
                  <option value="public">Public</option>
                  <option value="restricted">Company (Restricted)</option>
                  <option value="optional">Optional</option>
                </select>
              </div>

              <div>
                <label className="label">Description (Optional)</label>
                <textarea className="input resize-none" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Additional notes..." />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
                  {editingHoliday ? 'Save Changes' : 'Create Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

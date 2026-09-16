import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import { leaveService, leaveTypeService } from '../../services/leaveService';
import { LeaveType } from '../../types';
import { getErrorMessage } from '../../services/api';

export default function LeaveQuotaSetter() {
  const [open, setOpen] = useState(false);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [typeId, setTypeId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const openModal = async () => {
    try {
      const typeRes = await leaveTypeService.getAll();
      setTypes(typeRes.filter(type => type.is_active));
      setOpen(true);
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!typeId || amount === '') return toast.error('Select leave type and monthly leaves.');
    setSaving(true);
    try {
      await leaveService.setMonthlyBalance({ leave_type_id: Number(typeId), year: new Date().getFullYear(), monthly_allocated: Number(amount) });
      toast.success('Monthly leave limit applied to all employees.');
      setOpen(false); setAmount('');
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setSaving(false); }
  };

  return <>
    <button onClick={openModal} className="btn-primary">Set Monthly Leaves</button>
    <Modal open={open} onClose={() => !saving && setOpen(false)} title="Set monthly leave limit" size="md">
      <form onSubmit={save} className="space-y-4">
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">This limit will apply to all active employees.</p>
        <label className="label">Leave type<select className="input mt-1" value={typeId} onChange={event => setTypeId(event.target.value)}><option value="">Select leave type</option>{types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
        <label className="label">Leaves allowed per month<input className="input mt-1" type="number" min="0" max="100" step="0.5" value={amount} onChange={event => setAmount(event.target.value)} placeholder="e.g. 2" /></label>
        <div className="flex justify-end gap-3 pt-2"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save limit'}</button></div>
      </form>
    </Modal>
  </>;
}

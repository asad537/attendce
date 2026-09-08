import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { applyAccent, formatMoney, useSettings } from '../../contexts/SettingsContext';
import { getErrorMessage } from '../../services/api';
import ProfileSettingsModal from '../../components/common/ProfileSettingsModal';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'SAR', 'CAD', 'AUD', 'JPY', 'CNY'];
const ACCENTS = ['emerald', 'teal', 'green', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'red', 'orange', 'amber', 'lime', 'yellow', 'zinc', 'slate'];
const names: Record<string, string> = { USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', PKR: 'Pakistani Rupee', INR: 'Indian Rupee', AED: 'UAE Dirham', SAR: 'Saudi Riyal', CAD: 'Canadian Dollar', AUD: 'Australian Dollar', JPY: 'Japanese Yen', CNY: 'Chinese Yuan' };

export default function SettingsPage() {
  const { user } = useAuth();
  const { currency, accent, options, save } = useSettings();
  const canEdit = user?.role === 'ceo' || user?.role === 'manager';
  const [draftCurrency, setDraftCurrency] = useState(currency);
  const [draftAccent, setDraftAccent] = useState(accent);
  const [saving, setSaving] = useState(false);
  const savedAccent = useRef(accent);
  useEffect(() => setDraftCurrency(currency), [currency]);
  useEffect(() => { setDraftAccent(accent); savedAccent.current = accent; }, [accent]);
  useEffect(() => () => applyAccent(savedAccent.current), []);
  const dirty = draftCurrency !== currency || draftAccent !== accent;
  const onSave = async () => { setSaving(true); try { await save({ currency: draftCurrency, accent: draftAccent }); toast.success('Settings saved'); } catch (e) { toast.error(getErrorMessage(e)); applyAccent(accent); } finally { setSaving(false); } };
  const currencies = options?.currencies || CURRENCIES;
  const accents = options?.accents || ACCENTS;
  const dashboardSettings = <div className="space-y-5">
    {!canEdit && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Only the CEO and managers can change dashboard settings. You can preview but not save.</div>}
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Currency</h2><p className="mt-1 text-sm text-gray-500">Used across payroll and every amount shown in the app.</p><div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center"><select value={draftCurrency} onChange={e => setDraftCurrency(e.target.value)} disabled={!canEdit} className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm sm:w-72"><option value={draftCurrency}>{draftCurrency} — {names[draftCurrency] || draftCurrency}</option>{currencies.filter(code => code !== draftCurrency).map(code => <option key={code} value={code}>{code} — {names[code] || code}</option>)}</select><div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Preview: <b>{formatMoney(12500, draftCurrency)}</b></div></div></section>
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Theme colour</h2><p className="mt-1 text-sm text-gray-500">Pick an accent for dashboard buttons and highlights.</p><div className="mt-4 flex flex-wrap gap-3">{accents.map(name => <button key={name} type="button" disabled={!canEdit} onClick={() => { setDraftAccent(name); applyAccent(name); }} className={`grid h-11 w-11 place-items-center rounded-full ring-2 ring-offset-2 ${draftAccent === name ? 'ring-gray-800' : 'ring-transparent'}`} style={{ background: `var(--color-${name}-500)` }}>{draftAccent === name && <span className="text-xl text-white">✓</span>}</button>)}</div><div className="mt-6 border-t border-gray-100 pt-5"><label className="mb-2 block text-sm font-bold">Custom Color</label><input value={draftAccent} onChange={e => { setDraftAccent(e.target.value); applyAccent(e.target.value); }} disabled={!canEdit} className="h-11 w-full max-w-xs rounded-xl border border-gray-300 px-3" /></div></section>
    <div className="flex justify-end gap-3">{dirty && <button type="button" onClick={() => { setDraftCurrency(currency); setDraftAccent(accent); applyAccent(accent); }} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold">Reset</button>}<button type="button" onClick={onSave} disabled={!canEdit || !dirty || saving} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button></div>
  </div>;
  return <div className="min-h-full bg-[#f7f9f8] p-4 text-[#17251f] sm:p-6 lg:p-8"><div className="max-w-5xl"><header className="mb-6"><h1 className="text-[26px] font-bold tracking-[-.03em]">My Settings</h1><p className="mt-1 text-sm text-gray-500"><span className="font-semibold text-emerald-600">Dashboard</span> &nbsp;/&nbsp; Settings</p></header><ProfileSettingsModal isOpen embedded defaultTab="dashboard" dashboardSettings={dashboardSettings} onClose={() => undefined} /></div></div>;
}

import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { applyAccent, formatMoney, useSettings } from '../../contexts/SettingsContext';
import { getErrorMessage } from '../../services/api';

const FALLBACK_CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'SAR', 'CAD', 'AUD', 'JPY', 'CNY'];
const FALLBACK_ACCENTS = ['emerald', 'teal', 'green', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'red', 'orange', 'amber', 'lime', 'yellow', 'zinc', 'slate'];
const currencyName: Record<string, string> = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', PKR: 'Pakistani Rupee', INR: 'Indian Rupee',
  AED: 'UAE Dirham', SAR: 'Saudi Riyal', CAD: 'Canadian Dollar', AUD: 'Australian Dollar', JPY: 'Japanese Yen', CNY: 'Chinese Yuan',
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { currency, accent, options, save } = useSettings();
  const canEdit = user?.role === 'ceo' || user?.role === 'manager';
  const currencies = options?.currencies || FALLBACK_CURRENCIES;
  const accents = options?.accents || FALLBACK_ACCENTS;

  const [draftCurrency, setDraftCurrency] = useState(currency);
  const [draftAccent, setDraftAccent] = useState(accent);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraftCurrency(currency); }, [currency]);
  useEffect(() => { setDraftAccent(accent); }, [accent]);

  // Live-preview the accent while choosing; revert to the saved one on unmount.
  const previewAccent = (value: string) => { setDraftAccent(value); applyAccent(value); };
  
  const savedAccentRef = useRef(accent);
  useEffect(() => { savedAccentRef.current = accent; }, [accent]);
  useEffect(() => () => applyAccent(savedAccentRef.current), []);

  const dirty = draftCurrency !== currency || draftAccent !== accent;

  const onSave = async () => {
    setSaving(true);
    try { await save({ currency: draftCurrency, accent: draftAccent }); toast.success('Settings saved'); }
    catch (error) { toast.error(getErrorMessage(error)); applyAccent(accent); }
    finally { setSaving(false); }
  };

  return <div className="min-h-full bg-[#f7f9f8] p-4 text-[#17251f] sm:p-6 lg:p-8"><div className="max-w-5xl">
    <header className="mb-6">
      <h1 className="text-[26px] font-bold tracking-[-.03em]">Dashboard Settings</h1>
      <p className="mt-1 text-sm text-gray-500"><span className="font-semibold text-emerald-600">Dashboard</span> &nbsp;/&nbsp; Settings</p>
    </header>

    {!canEdit && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Only the CEO and managers can change these settings. You can preview but not save.</div>}

    {/* Currency */}
    <section className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold">Currency</h2>
      <p className="mt-1 text-sm text-gray-500">Used across payroll and every amount shown in the app.</p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <select value={draftCurrency} onChange={e => setDraftCurrency(e.target.value)} disabled={!canEdit} className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none focus:border-emerald-500 disabled:bg-gray-50 sm:w-72">
          {currencies.map(code => <option key={code} value={code}>{code} — {currencyName[code] || code}</option>)}
        </select>
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Preview: <b className="text-base">{formatMoney(12500, draftCurrency)}</b>
        </div>
      </div>
    </section>

    {/* Accent colour */}
    <section className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold">Theme colour</h2>
      <p className="mt-1 text-sm text-gray-500">Pick an accent — buttons, highlights and the whole app follow it.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {accents.map(name => {
          const active = draftAccent === name;
          return <button key={name} type="button" onClick={() => canEdit && previewAccent(name)} disabled={!canEdit} title={name}
            className={`grid h-11 w-11 place-items-center rounded-full ring-2 ring-offset-2 transition ${active ? 'ring-gray-800' : 'ring-transparent hover:ring-gray-300'} disabled:cursor-not-allowed`}
            style={{ background: `var(--color-${name}-500)` }}>
            {active && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m5 12 5 5 9-11"/></svg>}
          </button>;
        })}
      </div>
      <div className="mt-6 border-t border-gray-100 pt-5">
        <label className="text-sm font-bold text-gray-800 block mb-2">Custom Color</label>
        <p className="text-xs text-gray-500 mb-3">Don't like the presets? Enter a custom HEX, RGB, or HSL value.</p>
        <div className="flex gap-3 items-center">
          <input 
            type="text" 
            placeholder="e.g. #ff0055, rgb(10, 20, 30)" 
            value={draftAccent} 
            onChange={(e) => {
              const val = e.target.value;
              setDraftAccent(val);
              // Only live-preview if it looks like a valid CSS color
              if (val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl')) {
                applyAccent(val);
              }
            }}
            disabled={!canEdit}
            className="input max-w-xs h-11"
          />
          <div className="relative w-11 h-11 rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer group" title="Click to pick a color">
            <input 
              type="color" 
              className="absolute inset-[-10px] w-16 h-16 cursor-pointer opacity-0"
              value={draftAccent.startsWith('#') && draftAccent.length === 7 ? draftAccent : '#10b981'}
              onChange={(e) => {
                const val = e.target.value;
                setDraftAccent(val);
                applyAccent(val);
              }}
            />
            <div 
              className="w-full h-full pointer-events-none" 
              style={{ 
                background: (draftAccent.startsWith('#') || draftAccent.startsWith('rgb') || draftAccent.startsWith('hsl')) 
                  ? draftAccent 
                  : `var(--color-${draftAccent}-500)` 
              }}
            ></div>
          </div>
        </div>
      </div>
    </section>

    {/* Live sample */}
    <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold">Preview</h2>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white ">Primary button</button>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Badge</span>
        <span className="font-semibold text-emerald-600">Accent text</span>
        <span className="rounded-lg border border-emerald-500 px-3 py-2 text-sm text-emerald-700">Outlined</span>
      </div>
    </section>

    <div className="flex items-center justify-end gap-3">
      {dirty && <button onClick={() => { setDraftCurrency(currency); setDraftAccent(accent); applyAccent(accent); }} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Reset</button>}
      <button onClick={onSave} disabled={!canEdit || !dirty || saving} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition  disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button>
    </div>
  </div></div>;
}

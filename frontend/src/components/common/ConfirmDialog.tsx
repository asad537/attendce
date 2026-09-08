import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Professional, app-styled replacement for the browser's native
 * `window.confirm` / `window.prompt`. Promise-based so call sites barely change:
 *
 *   if (!(await confirmDialog({ title: 'Delete ticket', tone: 'danger' }))) return;
 *   const note = await promptDialog({ title: 'Add remarks', textarea: true });
 *
 * Mount <ConfirmDialogHost /> once near the app root.
 */

type Tone = 'danger' | 'primary';

interface ConfirmOpts {
  title?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: Tone;
}

interface PromptOpts extends ConfirmOpts {
  input: true;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}

type AnyOpts = (ConfirmOpts & { input?: false }) | PromptOpts;

let openImpl: ((opts: AnyOpts, resolve: (v: unknown) => void) => void) | null = null;

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    if (openImpl) openImpl({ ...opts, input: false }, (v) => resolve(Boolean(v)));
    else resolve(window.confirm(typeof opts.message === 'string' ? opts.message : opts.title || 'Are you sure?'));
  });
}

export function promptDialog(opts: Omit<PromptOpts, 'input'>): Promise<string | null> {
  return new Promise((resolve) => {
    if (openImpl) openImpl({ ...opts, input: true }, (v) => resolve(v == null ? null : String(v)));
    else resolve(window.prompt(opts.title || '', opts.defaultValue || ''));
  });
}

export function ConfirmDialogHost() {
  const [state, setState] = useState<{ opts: AnyOpts; resolve: (v: unknown) => void } | null>(null);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    openImpl = (opts, resolve) => {
      setState({ opts, resolve });
      setValue((opts as PromptOpts).defaultValue || '');
    };
    return () => { openImpl = null; };
  }, []);

  useEffect(() => {
    if (state && (state.opts as PromptOpts).input) {
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [state]);

  if (!state) return null;

  const opts = state.opts as PromptOpts;
  const isPrompt = !!opts.input;
  const tone: Tone = opts.tone || (isPrompt ? 'primary' : 'danger');
  const disabled = isPrompt && !!opts.required && !value.trim();

  const settle = (result: unknown) => { state.resolve(result); setState(null); setValue(''); };
  const onCancel = () => settle(isPrompt ? null : false);
  const onConfirm = () => { if (disabled) return; settle(isPrompt ? value : true); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    if (e.key === 'Enter' && (!isPrompt || !opts.textarea)) { e.preventDefault(); onConfirm(); }
  };

  const confirmClasses = tone === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-emerald-600 hover:bg-emerald-700';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onKeyDown={onKeyDown}
      role="presentation"
    >
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px]" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
      >
        <div className="flex items-start gap-4">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
              tone === 'danger' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            {tone === 'danger' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900">{opts.title || (isPrompt ? 'Enter details' : 'Are you sure?')}</h3>
            {opts.message && <p className="mt-1 text-sm leading-relaxed text-gray-500">{opts.message}</p>}

            {isPrompt && (
              opts.textarea ? (
                <textarea
                  ref={inputRef}
                  rows={3}
                  value={value}
                  placeholder={opts.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                  className="mt-3 w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              ) : (
                <input
                  ref={inputRef}
                  value={value}
                  placeholder={opts.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              )
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            {opts.cancelText || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${confirmClasses}`}
          >
            {opts.confirmText || (isPrompt ? 'Save' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

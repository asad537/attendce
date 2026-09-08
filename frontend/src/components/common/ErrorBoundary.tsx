import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Vite filenames are content-hashed. If a deployment happens while a tab
    // is in the background, React can try to load an asset from the previous
    // build on return. Refresh once into the current build instead of leaving
    // the user on a blank page.
    const message = `${error.message || ''} ${error.name || ''}`;
    const isStaleChunk = /dynamically imported module|loading chunk|importing a module script|chunkloaderror/i.test(message);
    const recoveryKey = 'stale_chunk_recovered_at';
    const lastAttempt = Number(sessionStorage.getItem(recoveryKey) || 0);
    if (isStaleChunk && Date.now() - lastAttempt > 30_000) {
      sessionStorage.setItem(recoveryKey, String(Date.now()));
      window.location.reload();
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-[50vh] place-items-center p-6">
          <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <h2 className="font-bold text-gray-900">This page needs a refresh</h2>
            <p className="mt-2 text-sm text-gray-500">A newer version of the app may have just been deployed.</p>
            <button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Refresh page</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

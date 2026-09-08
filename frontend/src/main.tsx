import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { ConfirmDialogHost } from './components/common/ConfirmDialog'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Live data without a page reload: refetch when the user returns to the
      // tab, when the network reconnects, and on a background interval. Cached
      // data still shows instantly; the fresh copy swaps in when it arrives.
      // (Individual queries with their own interval/staleTime still override.)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: 20_000,
      refetchIntervalInBackground: false,
      staleTime: 15_000,
      gcTime: 5 * 60_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <Toaster position="top-right" />
            <ConfirmDialogHost />
            <App />
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

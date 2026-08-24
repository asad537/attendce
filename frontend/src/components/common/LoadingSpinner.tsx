import React from 'react';

export default function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin`} style={{ borderWidth: '3px' }} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-64">
      <LoadingSpinner size="lg" text="Loading…" />
    </div>
  );
}

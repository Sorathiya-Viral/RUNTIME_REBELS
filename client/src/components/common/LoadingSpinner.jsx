import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading...', size = 'md' }) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
      <Loader2 className={`animate-spin text-brand-600 ${sizeMap[size] || sizeMap.md}`} />
      {message && <p className="text-sm font-medium text-slate-500">{message}</p>}
    </div>
  );
}

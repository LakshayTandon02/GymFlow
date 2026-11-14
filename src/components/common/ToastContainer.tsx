import React from 'react';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { useGym } from '../../context/GymContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useGym();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const Icon =
          toast.type === 'success'
            ? CheckCircle2
            : toast.type === 'error'
              ? AlertCircle
              : Info;
        const iconColor =
          toast.type === 'success'
            ? 'text-emerald-600'
            : toast.type === 'error'
              ? 'text-red-600'
              : 'text-blue-600';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-lg"
            role="status"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
              <p className="text-sm font-medium text-slate-800 truncate">{toast.title}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 text-slate-400 hover:text-slate-700 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';

export type ToastType = 'success' | 'error';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  action?: { label: string; href?: string; onClick?: () => void };
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 2500);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [toast.id, onDismiss]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      role="alert"
      className={`flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl shadow-card-hover bg-white
        border-l-4 border border-neutral-100 min-w-[280px] max-w-sm
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${toast.type === 'success' ? 'border-l-brand-primary' : 'border-l-red-500'}
      `}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      )}

      <p className="text-sm font-medium text-brand-charcoal flex-1 leading-snug">
        {toast.message}
      </p>

      {toast.action && (
        toast.action.href ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Link
            href={toast.action.href as any}
            onClick={dismiss}
            className="text-xs font-bold text-brand-primary hover:text-brand-dark whitespace-nowrap transition-colors"
          >
            {toast.action.label}
          </Link>
        ) : (
          <button
            onClick={() => { toast.action?.onClick?.(); dismiss(); }}
            className="text-xs font-bold text-brand-primary hover:text-brand-dark whitespace-nowrap transition-colors"
          >
            {toast.action.label}
          </button>
        )
      )}

      <button
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="w-6 h-6 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all ml-1 flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed z-50 flex flex-col gap-2 pointer-events-none
        bottom-4 left-1/2 -translate-x-1/2 items-center
        sm:top-4 sm:right-4 sm:bottom-auto sm:left-auto sm:translate-x-0 sm:items-end"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

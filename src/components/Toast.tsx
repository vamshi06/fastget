'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X, ShoppingCart } from 'lucide-react';
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
  const [progress, setProgress] = useState(100);

  const DURATION = 3000;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));

    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / DURATION) * 100));
    }, 30);

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 350);
    }, DURATION);

    return () => {
      cancelAnimationFrame(frame);
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [toast.id, onDismiss]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 350);
  };

  const isSuccess = toast.type === 'success';

  return (
    <div
      role="alert"
      className={`
        relative overflow-hidden rounded-2xl w-[320px] max-w-[calc(100vw-2rem)]
        shadow-[0_8px_32px_rgba(0,0,0,0.18)] border
        transition-all duration-350 ease-out
        ${visible
          ? 'opacity-100 translate-x-0 scale-100'
          : 'opacity-0 translate-x-8 scale-95'}
        ${isSuccess
          ? 'bg-gray-900 border-gray-700'
          : 'bg-red-950 border-red-800'}
      `}
    >
      {/* Main content */}
      <div className="flex items-center gap-3 px-4 py-3.5">

        {/* Icon */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
          ${isSuccess ? 'bg-brand-primary/20' : 'bg-red-500/20'}`}>
          {isSuccess
            ? <CheckCircle2 className="w-5 h-5 text-brand-primary" />
            : <AlertCircle className="w-5 h-5 text-red-400" />}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white leading-snug truncate">
            {toast.message}
          </p>
          {toast.action && (
            <div className="mt-0.5">
              {toast.action.href ? (
                <Link
                  href={toast.action.href as any}
                  onClick={dismiss}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:text-amber-300 transition-colors"
                >
                  <ShoppingCart className="w-3 h-3" />
                  {toast.action.label}
                </Link>
              ) : (
                <button
                  onClick={() => { toast.action?.onClick?.(); dismiss(); }}
                  className="text-[11px] font-bold text-brand-primary hover:text-amber-300 transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
        <div
          className={`h-full transition-none ${isSuccess ? 'bg-brand-primary' : 'bg-red-400'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
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
      className="fixed z-[9999] flex flex-col gap-2.5 pointer-events-none
        top-28 right-4 items-end"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

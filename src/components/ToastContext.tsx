'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { ToastContainer, ToastData, ToastType } from './Toast';

interface ToastContextValue {
  showToast: (
    message: string,
    type?: ToastType,
    action?: { label: string; href?: string; onClick?: () => void }
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'success',
      action?: { label: string; href?: string; onClick?: () => void }
    ) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, message, type, action }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

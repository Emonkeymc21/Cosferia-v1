'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Hook para disparar toasts desde cualquier Client Component. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const COLORS: Record<ToastKind, string> = {
  success: 'border-jade/50 text-jade',
  error: 'border-chalk/50 text-chalk',
  info: 'border-line text-muted',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState | null>(null);

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    setState({ message, kind });
    setTimeout(() => setState(null), 3400);
  }, []);

  const Icon = state ? ICONS[state.kind] : CheckCircle2;

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {state && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-[80] max-w-[92vw] animate-fade-up">
          <div className={`bg-void2 border rounded-full px-5 py-3 flex items-center gap-2.5 shadow-2xl ${COLORS[state.kind]}`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-[13.5px] font-medium text-ink">{state.message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

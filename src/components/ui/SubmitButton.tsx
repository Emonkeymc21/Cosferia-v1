'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

/**
 * Boton de envio que se deshabilita solo mientras la accion corre.
 * useFormStatus solo funciona en un hijo de <form>, por eso vive
 * en su propio componente.
 */
export function SubmitButton({
  children,
  pendingText = 'Guardando...',
  className = '',
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex items-center justify-center gap-2 rounded-xl bg-chalk text-void font-bold transition hover:bg-chalkd disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      {pending ? pendingText : children}
    </button>
  );
}

'use client';

import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

/**
 * Ingreso con Google OAuth y, como alternativa, magic link por email.
 * El magic link importa: no todos los cosmakers usan Gmail, y forzar
 * un unico proveedor deja gente afuera sin necesidad.
 */
export function LoginButtons({ next }: { next: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function withGoogle() {
    setLoading('google');
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      toast('No pudimos abrir el ingreso con Google', 'error');
      setLoading(null);
    }
  }

  async function withEmail() {
    if (!email.includes('@')) {
      toast('Escribi un email valido', 'error');
      return;
    }
    setLoading('email');
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setLoading(null);
    if (error) toast('No pudimos enviar el enlace', 'error');
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="bg-void2 hairline rounded-2xl p-5 text-center">
        <Mail className="w-8 h-8 mx-auto text-jade mb-2" />
        <p className="font-semibold text-[14px]">Revisá tu correo</p>
        <p className="text-[13px] text-muted mt-1">
          Te mandamos un enlace a <span className="text-ink">{email}</span>. Tocalo desde este mismo
          dispositivo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={withGoogle}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-void2 hairline hover:border-mathi transition font-semibold text-[14px] disabled:opacity-50"
      >
        {loading === 'google' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.05 6.05 29.3 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.3-.14-2.65-.4-3.9z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.65 15.1 18.95 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.05 6.05 29.3 4 24 4 16.3 4 9.65 8.35 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.85-1.95 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.25 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.55 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.1H42V20H24v8h11.3c-.75 2.15-2.15 4-3.9 5.3l6.2 5.2C37.2 40.2 44 35 44 24c0-1.3-.14-2.65-.4-3.9z"
            />
          </svg>
        )}
        Continuar con Google
      </button>

      <div className="flex items-center gap-3">
        <span className="flex-1 h-px bg-line" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">o</span>
        <span className="flex-1 h-px bg-line" />
      </div>

      <div className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          aria-label="Email"
          className="w-full bg-void2 hairline rounded-xl px-4 py-3 text-[14px] outline-none focus:border-chalk"
        />
        <button
          onClick={withEmail}
          disabled={loading !== null || !email}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-chalk text-void font-bold text-[14px] hover:bg-chalkd transition disabled:opacity-50"
        >
          {loading === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Enviarme un enlace
        </button>
      </div>
    </div>
  );
}

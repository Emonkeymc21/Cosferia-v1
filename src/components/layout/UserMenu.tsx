'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Store, LogOut, ShoppingBag } from 'lucide-react';
import type { SessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/constants';

export function UserMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Cierra al hacer clic afuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-4 py-2 rounded-full bg-chalk text-void font-bold text-sm hover:bg-chalkd transition"
      >
        Ingresar
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-void2 hairline hover:border-mathi transition"
      >
        <span className="w-7 h-7 rounded-full bg-chalk text-void grid place-items-center text-[11px] font-extrabold shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:block text-left leading-none">
          <span className="block text-[12.5px] font-semibold">{user.name.split(' ')[0]}</span>
          <span className="block font-mono text-[9px] text-muted uppercase tracking-wider mt-0.5">
            {ROLE_LABELS[user.role]}
          </span>
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-void2 hairline rounded-2xl p-2 shadow-2xl z-50 animate-fade-up">
          <div className="px-3 py-2.5 border-b border-line mb-1">
            <p className="text-[13px] font-semibold truncate">{user.name}</p>
            <p className="font-mono text-[10px] text-muted truncate">{user.email}</p>
          </div>

          <Link
            href="/pedidos"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-void3 transition text-[13.5px]"
          >
            <ShoppingBag className="w-4 h-4 text-muted" />
            Mis pedidos
          </Link>

          <Link
            href="/mi-tienda"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-void3 transition text-[13.5px]"
          >
            <Store className="w-4 h-4 text-muted" />
            {user.storeId ? 'Mi tienda' : 'Activar mi tienda'}
          </Link>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-void3 transition text-[13.5px] text-muted"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesion
          </button>
        </div>
      )}
    </div>
  );
}

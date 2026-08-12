import Link from 'next/link';
import { LayoutGrid, MessagesSquare, CalendarDays, Receipt } from 'lucide-react';
import type { SessionUser } from '@/lib/auth';
import { UserMenu } from './UserMenu';

export const NAV_ITEMS = [
  { href: '/', label: 'Catalogo', icon: LayoutGrid },
  { href: '/comunidad', label: 'Comunidad', icon: MessagesSquare },
  { href: '/eventos', label: 'Eventos', icon: CalendarDays },
  { href: '/pedidos', label: 'Pedidos', icon: Receipt },
] as const;

export function Header({ user }: { user: SessionUser | null }) {
  return (
    <header className="sticky top-0 z-40 bg-void/85 backdrop-blur-xl border-b border-line">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-9 h-9 rounded-xl cutting-mat grid place-items-center border border-mathi">
            <span className="font-extrabold text-chalk text-lg leading-none">C</span>
          </span>
          <span className="hidden sm:block leading-none">
            <span className="block font-extrabold tracking-tight text-[17px]">Cosferia</span>
            <span className="block font-mono text-[9px] tracking-[.18em] text-muted uppercase mt-0.5">
              Mendoza · AR
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-muted hover:text-ink hover:bg-void2 transition flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user?.storeId && (
            <Link
              href="/publicar"
              className="hidden sm:block px-4 py-2 rounded-full bg-chalk text-void font-bold text-sm hover:bg-chalkd transition"
            >
              Vender
            </Link>
          )}
          <UserMenu user={user} />
        </div>
      </div>
      <div className="measure-rail" aria-hidden />
    </header>
  );
}

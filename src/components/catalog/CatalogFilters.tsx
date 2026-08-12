'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { ORIGINS, CATEGORIES, ZONES } from '@/lib/constants';

/**
 * Filtros del catalogo.
 *
 * El estado vive en la URL, no en useState: asi el catalogo filtrado
 * es compartible por link, sobrevive al refresh y el Server Component
 * de la pagina puede hacer la query real en la base en vez de traer
 * todo y filtrar en el cliente.
 */
export function CatalogFilters({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  const origin = params.get('origin') ?? '';
  const category = params.get('cat') ?? '';
  const zone = params.get('zone') ?? '';
  const sort = params.get('sort') ?? 'new';
  const query = params.get('q') ?? '';
  const hasFilters = Boolean(origin || category || zone || query);

  return (
    <div className={isPending ? 'opacity-60 transition' : 'transition'}>
      {/* Buscador */}
      <div className="relative max-w-xl">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          defaultValue={query}
          onChange={(e) => setParam('q', e.target.value)}
          placeholder="Peluca, armadura, vestido..."
          aria-label="Buscar productos"
          className="w-full bg-void2 hairline rounded-xl pl-11 pr-4 py-3.5 text-[15px] placeholder:text-muted focus:border-chalk transition outline-none"
        />
      </div>

      {/* Labels de origen */}
      <div className="mt-6">
        <p className="font-mono text-[9.5px] uppercase tracking-[.16em] text-muted mb-2.5">
          Origen del producto
        </p>
        <div className="flex gap-2 overflow-x-auto no-bar pb-1">
          <button
            onClick={() => setParam('origin', '')}
            className={`shrink-0 px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition ${
              origin === '' ? 'bg-ink text-void border-ink' : 'bg-void2 text-muted border-line hover:border-mathi'
            }`}
          >
            Todos
          </button>
          {ORIGINS.map((o) => (
            <button
              key={o.id}
              onClick={() => setParam('origin', origin === o.id ? '' : o.id)}
              className={`shrink-0 px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition ${
                origin === o.id ? o.active : 'bg-void2 text-muted border-line hover:border-mathi'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros secundarios */}
      <div className="mt-4 flex flex-wrap gap-2.5 items-center">
        <select
          value={category}
          onChange={(e) => setParam('cat', e.target.value)}
          aria-label="Categoria"
          className="bg-void2 hairline rounded-lg px-3 py-2 text-[13px] outline-none focus:border-chalk"
        >
          <option value="">Todas las categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={zone}
          onChange={(e) => setParam('zone', e.target.value)}
          aria-label="Zona"
          className="bg-void2 hairline rounded-lg px-3 py-2 text-[13px] outline-none focus:border-chalk"
        >
          <option value="">Todo Mendoza</option>
          {ZONES.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setParam('sort', e.target.value)}
          aria-label="Orden"
          className="bg-void2 hairline rounded-lg px-3 py-2 text-[13px] outline-none focus:border-chalk"
        >
          <option value="new">Mas nuevos</option>
          <option value="asc">Menor precio</option>
          <option value="desc">Mayor precio</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
            className="flex items-center gap-1 text-[13px] text-chalk font-semibold px-2"
          >
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}

        <span className="ml-auto font-mono text-[11px] text-muted">
          {total} {total === 1 ? 'resultado' : 'resultados'}
        </span>
      </div>
    </div>
  );
}

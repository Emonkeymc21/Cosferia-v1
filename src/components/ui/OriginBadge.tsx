import type { ProductOrigin } from '@prisma/client';
import { originOf } from '@/lib/constants';

/**
 * Label de origen del producto.
 * Server Component: es puramente presentacional, no manda JS al cliente.
 */
export function OriginBadge({
  origin,
  full = false,
  className = '',
}: {
  origin: ProductOrigin;
  full?: boolean;
  className?: string;
}) {
  const meta = originOf(origin);
  return (
    <span
      className={`inline-block px-2 py-1 rounded-md font-mono text-[8.5px] uppercase tracking-wider font-bold ${meta.badge} ${className}`}
    >
      {full ? meta.label : meta.short}
    </span>
  );
}

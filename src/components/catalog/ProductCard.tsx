import Image from 'next/image';
import Link from 'next/link';
import { ProductStatus, type ProductOrigin } from '@prisma/client';
import { OriginBadge } from '@/components/ui/OriginBadge';
import { formatCents } from '@/lib/money';

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  price: number;
  origin: ProductOrigin;
  status: ProductStatus;
  images: string[];
  zone: string;
  store: { name: string; isVerified: boolean; hidePrices: boolean };
}

/**
 * Server Component: no necesita interactividad, asi que no manda JS.
 * Fallback SVG inline cuando el producto no tiene fotos.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  const isSold = product.status === ProductStatus.SOLD;
  const hidePrice = isSold && product.store.hidePrices;
  const cover = product.images[0];

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group bg-void2 hairline rounded-2xl overflow-hidden hover:border-mathi hover:-translate-y-1 transition duration-200 flex flex-col"
    >
      <div className="aspect-[4/3] relative overflow-hidden cutting-mat">
        {cover ? (
          <Image
            src={cover}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 260px"
            className={`object-cover group-hover:scale-105 transition duration-500 ${isSold ? 'grayscale opacity-60' : ''}`}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              sin foto
            </span>
          </div>
        )}

        <OriginBadge origin={product.origin} className="absolute top-2 left-2" />

        {isSold && (
          <span className="absolute inset-0 bg-void/75 grid place-items-center font-extrabold text-chalk text-sm tracking-wider">
            VENDIDO
          </span>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <h3 className="text-[13.5px] font-semibold leading-snug line-clamp-2">{product.title}</h3>
        <p className="mt-1.5 text-lg font-extrabold tracking-tight">
          {hidePrice ? (
            <span className="text-sm font-semibold text-muted">Precio reservado</span>
          ) : (
            formatCents(product.price)
          )}
        </p>
        <p className="mt-auto pt-1 font-mono text-[10px] text-muted truncate">
          {product.store.name}
          {product.store.isVerified && ' ✓'} · {product.zone}
        </p>
      </div>
    </Link>
  );
}

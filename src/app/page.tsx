import { PackageSearch } from 'lucide-react';
import { Prisma, ProductStatus, type ProductOrigin } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CatalogFilters } from '@/components/catalog/CatalogFilters';
import { EmptyState } from '@/components/ui/EmptyState';

// El catalogo cambia seguido: revalidamos cada 30 segundos en vez de
// forzar dynamic, asi Vercel puede cachear la respuesta.
export const revalidate = 30;

interface SearchParams {
  q?: string;
  origin?: string;
  cat?: string;
  zone?: string;
  sort?: string;
}

const VALID_ORIGINS = ['HANDMADE', 'NATIONAL', 'IMPORTED', 'USED'] as const;

function isOrigin(value: string | undefined): value is ProductOrigin {
  return typeof value === 'string' && (VALID_ORIGINS as readonly string[]).includes(value);
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  // El filtrado ocurre en la base, no en memoria: con mil productos,
  // traer todo y filtrar en el servidor arruina el tiempo de respuesta.
  const where: Prisma.ProductWhereInput = {
    status: { in: [ProductStatus.LIVE, ProductStatus.SOLD] },
  };

  if (isOrigin(searchParams.origin)) where.origin = searchParams.origin;
  if (searchParams.cat) where.category = searchParams.cat;
  if (searchParams.zone) where.zone = searchParams.zone;

  if (searchParams.q) {
    where.OR = [
      { title: { contains: searchParams.q, mode: 'insensitive' } },
      { description: { contains: searchParams.q, mode: 'insensitive' } },
      { category: { contains: searchParams.q, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    searchParams.sort === 'asc'
      ? { price: 'asc' }
      : searchParams.sort === 'desc'
        ? { price: 'desc' }
        : { createdAt: 'desc' };

  const [products, storeCount, eventCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      take: 60,
      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        origin: true,
        status: true,
        images: true,
        zone: true,
        store: { select: { name: true, isVerified: true, hidePrices: true } },
      },
    }),
    prisma.store.count(),
    prisma.event.count({ where: { date: { gte: new Date() } } }),
  ]);

  return (
    <div className="animate-fade-up">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl cutting-mat border border-mathi mt-5 p-6 sm:p-10">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-chalk/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <span className="font-mono text-[10px] tracking-[.2em] uppercase text-chalk">
            ◆ Hecho en Mendoza
          </span>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.02] max-w-2xl">
            Compra y vende <span className="text-chalk">cosplay</span> hecho a mano
          </h1>
          <p className="mt-3 text-muted max-w-lg text-[15px] leading-relaxed">
            Trajes, pelucas, props y accesorios de cosmakers de Cuyo. Tambien segunda mano en buen
            estado. <span className="font-jp text-chalk/70">コスプレ</span>
          </p>

          <div className="mt-6 flex gap-7 flex-wrap font-mono text-[10px] uppercase tracking-[.14em] text-muted">
            <span>
              <b className="block text-xl font-sans font-extrabold text-ink">{products.length}</b>
              publicaciones
            </span>
            <span>
              <b className="block text-xl font-sans font-extrabold text-ink">{storeCount}</b>
              cosmakers
            </span>
            <span>
              <b className="block text-xl font-sans font-extrabold text-ink">{eventCount}</b>
              eventos
            </span>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <CatalogFilters total={products.length} />
      </div>

      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3.5 pb-10">
        {products.length > 0 ? (
          products.map((product) => <ProductCard key={product.id} product={product} />)
        ) : (
          <div className="col-span-2 lg:col-span-4">
            <EmptyState
              icon={PackageSearch}
              title="No encontramos nada con esos filtros"
              description="Proba quitar alguno o buscar otra palabra."
            />
          </div>
        )}
      </div>
    </div>
  );
}

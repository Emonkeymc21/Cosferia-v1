import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import { ProductStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatCents } from '@/lib/money';
import { OriginBadge } from '@/components/ui/OriginBadge';
import { BuyButton } from '@/components/checkout/BuyButton';

export const revalidate = 30;

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const [product, user] = await Promise.all([
    prisma.product.findUnique({
      where: { slug: params.slug },
      include: { store: true },
    }),
    getCurrentUser(),
  ]);

  if (!product) notFound();

  const available = product.status === ProductStatus.LIVE;
  const isOwnProduct = user?.storeId === product.storeId;
  const cover = product.images[0];

  return (
    <div className="py-6 animate-fade-up">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-muted hover:text-ink transition mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al catalogo
      </Link>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Imagenes */}
        <div>
          <div className="aspect-square relative rounded-2xl overflow-hidden cutting-mat hairline">
            {cover ? (
              <Image
                src={cover}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                className={`object-cover ${!available ? 'grayscale opacity-60' : ''}`}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  sin foto
                </span>
              </div>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.slice(1, 6).map((url) => (
                <div key={url} className="aspect-square relative rounded-lg overflow-hidden hairline">
                  <Image src={url} alt="" fill sizes="20vw" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Datos */}
        <div>
          <OriginBadge origin={product.origin} full />

          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            {product.title}
          </h1>
          <p className="mt-2 text-4xl font-extrabold tracking-tight">{formatCents(product.price)}</p>

          <dl className="mt-5 text-[13.5px]">
            {[
              ['Categoria', product.category],
              ['Talle / medida', product.size ?? '—'],
              ['Vendedor', product.store.name + (product.store.isVerified ? ' ✓' : '')],
              ['Zona', product.zone],
              ['Entrega', product.allowsShipping ? 'Envio a todo Cuyo' : 'Retiro en mano'],
            ].map(([key, value]) => (
              <div key={key} className="flex justify-between py-2.5 border-b border-line">
                <dt className="text-muted">{key}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {product.description && (
            <p className="mt-5 text-[14px] text-muted leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          <div className="mt-6">
            {isOwnProduct ? (
              <p className="text-[13.5px] text-muted bg-void2 hairline rounded-xl p-4">
                Esta es tu publicacion. Podes editarla desde tu tienda.
              </p>
            ) : (
              <BuyButton
                productId={product.id}
                productTitle={product.title}
                totalAmount={product.price}
                sellerName={product.store.name}
                sellerBank={{
                  holder: product.store.bankHolder,
                  cuit: product.store.bankCuit,
                  cbu: product.store.bankCbu,
                  alias: product.store.bankAlias,
                }}
                isLoggedIn={Boolean(user)}
                disabled={!available}
              />
            )}
          </div>

          <p className="mt-4 text-[11.5px] text-muted flex gap-2">
            <Shield className="w-3.5 h-3.5 shrink-0 mt-px" />
            Pagas por transferencia y subis el comprobante. El vendedor confirma antes de despachar.
          </p>
        </div>
      </div>
    </div>
  );
}

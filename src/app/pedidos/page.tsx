import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { EmptyState } from '@/components/ui/EmptyState';
import { OrderList, type OrderData } from '@/components/checkout/OrderList';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/pedidos');

  // Traemos las compras del usuario y, si tiene tienda, sus ventas.
  const [purchases, sales] = await Promise.all([
    prisma.order.findMany({
      where: { buyerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { title: true, images: true } },
        sellerStore: { select: { name: true } },
        receipts: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    user.storeId
      ? prisma.order.findMany({
          where: { sellerStoreId: user.storeId },
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { title: true, images: true } },
            sellerStore: { select: { name: true } },
            receipts: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        })
      : Promise.resolve([]),
  ]);

  function serialize(orders: typeof purchases): OrderData[] {
    return orders.map((o) => {
      const receipt = o.receipts[0];
      return {
        id: o.id,
        reference: o.reference,
        title: o.product.title,
        image: o.product.images[0] ?? null,
        storeName: o.sellerStore.name,
        totalAmount: o.totalAmount,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        trackingCode: o.trackingCode,
        receipt: receipt
          ? {
              id: receipt.id,
              score: receipt.confidenceScore,
              flags: receipt.flags,
              status: receipt.status,
              source: receipt.ocrSource,
              extractedAmount: receipt.extractedAmount,
              extractedCuit: receipt.extractedCuit,
              extractedOperation: receipt.extractedOperation,
              extractedDate: receipt.extractedDate?.toISOString() ?? null,
            }
          : null,
      };
    });
  }

  const myPurchases = serialize(purchases);
  const mySales = serialize(sales);

  return (
    <div className="py-6 animate-fade-up">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Mis pedidos</h1>
      <p className="text-muted mt-1.5 text-[14.5px]">
        Seguimiento de compras y verificacion de comprobantes.
      </p>

      <div className="mt-6 pb-10 space-y-10">
        <section>
          <h2 className="font-mono text-[9.5px] uppercase tracking-[.16em] text-muted mb-3">
            Compras ({myPurchases.length})
          </h2>
          {myPurchases.length > 0 ? (
            <OrderList orders={myPurchases} mode="buyer" />
          ) : (
            <EmptyState
              icon={Receipt}
              title="Todavia no compraste nada"
              description="Cuando compres, aca vas a ver el estado de cada pedido."
              action={
                <Link
                  href="/"
                  className="inline-block px-5 py-2.5 rounded-xl bg-chalk text-void font-bold text-sm"
                >
                  Ir al catalogo
                </Link>
              }
            />
          )}
        </section>

        {user.storeId && (
          <section>
            <h2 className="font-mono text-[9.5px] uppercase tracking-[.16em] text-muted mb-3">
              Ventas de mi tienda ({mySales.length})
            </h2>
            {mySales.length > 0 ? (
              <OrderList orders={mySales} mode="seller" />
            ) : (
              <EmptyState
                icon={Receipt}
                title="Sin ventas todavia"
                description="Cuando alguien compre uno de tus productos, vas a poder confirmar el pago aca."
              />
            )}
          </section>
        )}
      </div>
    </div>
  );
}

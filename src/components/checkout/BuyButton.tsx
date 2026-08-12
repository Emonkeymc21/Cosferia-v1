'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingCart } from 'lucide-react';
import { createOrder } from '@/app/actions/orders';
import { useToast } from '@/components/ui/Toast';
import { CheckoutModal, type SellerBank } from './CheckoutModal';

/**
 * Crea la orden y abre el checkout.
 * La orden se crea ANTES de mostrar los datos bancarios: asi el
 * producto queda reservado y no se lo compra otro mientras el usuario
 * hace la transferencia.
 */
export function BuyButton({
  productId,
  productTitle,
  totalAmount,
  sellerName,
  sellerBank,
  isLoggedIn,
  disabled,
}: {
  productId: string;
  productTitle: string;
  totalAmount: number;
  sellerName: string;
  sellerBank: SellerBank;
  isLoggedIn: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [order, setOrder] = useState<{ orderId: string; reference: string } | null>(null);

  function start() {
    if (!isLoggedIn) {
      router.push('/login?next=/producto');
      return;
    }

    startTransition(async () => {
      const result = await createOrder({ productId });
      if (result.ok) {
        setOrder(result.data);
      } else {
        toast(result.error, 'error');
      }
    });
  }

  return (
    <>
      <button
        onClick={start}
        disabled={isPending || disabled}
        className="w-full py-3.5 rounded-xl bg-chalk text-void font-bold text-[15px] hover:bg-chalkd transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
        {disabled ? 'No disponible' : 'Comprar por transferencia'}
      </button>

      {order && (
        <CheckoutModal
          orderId={order.orderId}
          reference={order.reference}
          productTitle={productTitle}
          totalAmount={totalAmount}
          sellerName={sellerName}
          sellerBank={sellerBank}
          onClose={() => setOrder(null)}
        />
      )}
    </>
  );
}

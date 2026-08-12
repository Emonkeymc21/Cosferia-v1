'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ExternalLink, Loader2, PackageCheck, Truck } from 'lucide-react';
import type { OrderStatus, ReceiptStatus, OcrSource } from '@prisma/client';
import { resolveReceipt, shipOrder, completeOrder, getReceiptUrl } from '@/app/actions/orders';
import { useToast } from '@/components/ui/Toast';
import { formatCents } from '@/lib/money';
import { ORDER_STATUS_META } from '@/lib/constants';

export interface OrderData {
  id: string;
  reference: string;
  title: string;
  image: string | null;
  storeName: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  trackingCode: string | null;
  receipt: {
    id: string;
    score: number;
    flags: string[];
    status: ReceiptStatus;
    source: OcrSource;
    extractedAmount: number | null;
    extractedCuit: string | null;
    extractedOperation: string | null;
    extractedDate: string | null;
  } | null;
}

const SOURCE_LABEL: Record<OcrSource, string> = {
  PDF_TEXT: 'texto PDF',
  SERVER_OCR: 'OCR servidor',
  CLIENT_OCR: 'OCR navegador',
  NONE: 'sin lectura',
};

export function OrderList({ orders, mode }: { orders: OrderData[]; mode: 'buyer' | 'seller' }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function resolve(orderId: string, approve: boolean) {
    setBusyId(orderId);
    startTransition(async () => {
      const result = await resolveReceipt(orderId, approve);
      toast(result.ok ? (result.message ?? 'Listo') : result.error, result.ok ? 'success' : 'error');
      setBusyId(null);
      router.refresh();
    });
  }

  function ship(orderId: string) {
    const code = window.prompt('Codigo de seguimiento del envio:');
    if (code === null) return;
    setBusyId(orderId);
    startTransition(async () => {
      const result = await shipOrder(orderId, code);
      toast(result.ok ? 'Despachado' : result.error, result.ok ? 'success' : 'error');
      setBusyId(null);
      router.refresh();
    });
  }

  function complete(orderId: string) {
    setBusyId(orderId);
    startTransition(async () => {
      const result = await completeOrder(orderId);
      toast(result.ok ? 'Pedido completado' : result.error, result.ok ? 'success' : 'error');
      setBusyId(null);
      router.refresh();
    });
  }

  async function openReceipt(receiptId: string) {
    const result = await getReceiptUrl(receiptId);
    if (result.ok) window.open(result.data.url, '_blank', 'noopener');
    else toast(result.error, 'error');
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const meta = ORDER_STATUS_META[order.status];
        const busy = busyId === order.id && isPending;

        return (
          <div key={order.id} className="bg-void2 hairline rounded-2xl p-4">
            <div className="flex gap-4 items-start">
              <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 relative cutting-mat">
                {order.image && (
                  <Image src={order.image} alt="" fill sizes="80px" className="object-cover" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[14.5px] leading-snug">{order.title}</p>
                <p className="font-mono text-[10.5px] text-muted mt-1">
                  {order.reference} · {new Date(order.createdAt).toLocaleDateString('es-AR')} ·{' '}
                  {order.storeName}
                </p>
                <p className="mt-1.5 font-extrabold text-lg">{formatCents(order.totalAmount)}</p>
              </div>

              <span
                className={`px-2.5 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-wider font-bold shrink-0 ${meta.cls}`}
              >
                {meta.label}
              </span>
            </div>

            {/* Lectura del comprobante */}
            {order.receipt && (
              <div className="mt-3 bg-void rounded-xl p-3.5 font-mono text-[11.5px] space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted uppercase tracking-[.14em] text-[9px]">
                    Lectura del comprobante
                  </span>
                  <button
                    onClick={() => void openReceipt(order.receipt!.id)}
                    className="text-chalk flex items-center gap-1 text-[10px]"
                  >
                    <ExternalLink className="w-3 h-3" /> Ver archivo
                  </button>
                </div>

                {[
                  ['CUIT', order.receipt.extractedCuit ?? 'no detectado'],
                  [
                    'Monto',
                    order.receipt.extractedAmount !== null
                      ? formatCents(order.receipt.extractedAmount)
                      : 'no detectado',
                  ],
                  [
                    'Fecha',
                    order.receipt.extractedDate
                      ? new Date(order.receipt.extractedDate).toLocaleDateString('es-AR')
                      : 'no detectada',
                  ],
                  ['Operacion', order.receipt.extractedOperation ?? 'no detectada'],
                  ['Fuente', SOURCE_LABEL[order.receipt.source]],
                ].map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <span className="text-muted">{key}</span>
                    <span>{value}</span>
                  </div>
                ))}

                <div className="pt-2 mt-2 border-t border-line flex justify-between">
                  <span className="text-muted">Confianza</span>
                  <span
                    className={
                      order.receipt.score >= 80
                        ? 'text-jade'
                        : order.receipt.score >= 50
                          ? 'text-amber'
                          : 'text-chalk'
                    }
                  >
                    {order.receipt.score}/100
                  </span>
                </div>
              </div>
            )}

            {order.receipt && order.receipt.flags.length > 0 && (
              <ul className="mt-2 space-y-1">
                {order.receipt.flags.map((flag) => (
                  <li key={flag} className="text-[11.5px] text-amber flex gap-1.5">
                    <span>•</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Acciones del vendedor */}
            {mode === 'seller' && order.status === 'VERIFYING' && (
              <div className="mt-3 p-3 rounded-xl bg-mat border border-mathi">
                <p className="font-mono text-[9px] uppercase tracking-[.14em] text-chalk mb-2">
                  ◆ Confirmá mirando tu homebanking
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolve(order.id, true)}
                    disabled={busy}
                    className="flex-1 py-2.5 rounded-lg bg-chalk text-void font-bold text-[13px] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirmar pago
                  </button>
                  <button
                    onClick={() => resolve(order.id, false)}
                    disabled={busy}
                    className="px-4 py-2.5 rounded-lg bg-void3 hairline text-[13px] font-semibold disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            )}

            {mode === 'seller' && order.status === 'CONFIRMED' && (
              <button
                onClick={() => ship(order.id)}
                disabled={busy}
                className="mt-3 w-full py-2.5 rounded-lg bg-void3 hairline text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Truck className="w-4 h-4" /> Cargar codigo de seguimiento
              </button>
            )}

            {/* Acciones del comprador */}
            {mode === 'buyer' && order.status === 'SHIPPED' && (
              <div className="mt-3">
                {order.trackingCode && (
                  <p className="font-mono text-[11.5px] text-muted mb-2">
                    Seguimiento: <span className="text-ink">{order.trackingCode}</span>
                  </p>
                )}
                <button
                  onClick={() => complete(order.id)}
                  disabled={busy}
                  className="w-full py-2.5 rounded-lg bg-chalk text-void font-bold text-[13px] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <PackageCheck className="w-4 h-4" /> Ya lo recibi
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

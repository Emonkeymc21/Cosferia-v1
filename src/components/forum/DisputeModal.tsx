'use client';

import { useState, useTransition } from 'react';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { createDispute } from '@/app/actions/community';
import { useToast } from '@/components/ui/Toast';
import { DISPUTE_TYPES } from '@/lib/constants';

/**
 * Centro de Disputas.
 * Es el destino de todo lo que la moderacion saca del feed publico.
 * Cuando llega desde un post bloqueado, el texto original viene
 * precargado para que el usuario no tenga que escribirlo de nuevo.
 */
export function DisputeModal({
  initialType = 'No recibi el producto',
  blockedText = '',
  reason,
  orders = [],
  onClose,
}: {
  initialType?: (typeof DISPUTE_TYPES)[number];
  blockedText?: string;
  reason?: string;
  orders?: Array<{ id: string; reference: string; title: string }>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<(typeof DISPUTE_TYPES)[number]>(initialType);
  const [orderId, setOrderId] = useState('');
  const [detail, setDetail] = useState(blockedText);

  function submit() {
    startTransition(async () => {
      const result = await createDispute({
        type,
        orderId: orderId || '',
        detail,
        sourceText: blockedText,
      });

      if (result.ok) {
        toast(result.message ?? 'Caso abierto');
        onClose();
      } else {
        toast(result.error, 'error');
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-void/90 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div className="min-h-full grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-md bg-void2 hairline rounded-3xl overflow-hidden animate-fade-up"
        >
          <div className="cutting-mat border-b border-mathi p-5 relative">
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-void/60 grid place-items-center"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-mono text-[9.5px] uppercase tracking-[.16em] text-chalk">
              Soporte privado
            </p>
            <h2 className="mt-2 text-xl font-extrabold">Centro de Disputas</h2>
            <p className="mt-1.5 text-[13px] text-muted leading-relaxed pr-6">
              Contanos que paso. Un moderador media entre las partes. Nada de esto se publica.
            </p>
          </div>

          <div className="p-5 space-y-4">
            {blockedText && (
              <div className="p-3 rounded-xl bg-chalk/10 border border-chalk/40">
                <p className="font-mono text-[9px] uppercase tracking-[.14em] text-chalk mb-1.5">
                  Mensaje bloqueado en el foro
                </p>
                {reason && <p className="text-[12px] text-muted mb-2">{reason}</p>}
                <p className="text-[12.5px] text-muted italic leading-relaxed">
                  «{blockedText.slice(0, 180)}
                  {blockedText.length > 180 ? '…' : ''}»
                </p>
              </div>
            )}

            <div>
              <label htmlFor="d-type" className="block text-[13px] font-semibold mb-1.5">
                Tipo de problema
              </label>
              <select
                id="d-type"
                value={type}
                onChange={(e) => setType(e.target.value as (typeof DISPUTE_TYPES)[number])}
                className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14px] outline-none focus:border-chalk"
              >
                {DISPUTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {orders.length > 0 && (
              <div>
                <label htmlFor="d-order" className="block text-[13px] font-semibold mb-1.5">
                  Pedido relacionado{' '}
                  <span className="text-muted font-normal text-[12px]">· opcional</span>
                </label>
                <select
                  id="d-order"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14px] outline-none focus:border-chalk"
                >
                  <option value="">No aplica</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.reference} — {o.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="d-detail" className="block text-[13px] font-semibold mb-1.5">
                Que paso
              </label>
              <textarea
                id="d-detail"
                rows={4}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Conta los hechos: fechas, montos, que se acordo."
                className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14px] outline-none focus:border-chalk resize-y"
              />
            </div>

            <button
              onClick={submit}
              disabled={isPending || detail.trim().length < 10}
              className="w-full py-3.5 rounded-xl bg-chalk text-void font-bold text-[15px] hover:bg-chalkd transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Enviar al equipo de moderacion
            </button>

            <p className="text-[11.5px] text-muted text-center leading-relaxed">
              Respuesta estimada: 48 horas habiles. Tu reclamo es privado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

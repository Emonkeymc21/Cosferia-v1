'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Landmark } from 'lucide-react';
import { upsertStore } from '@/app/actions/products';
import { useToast } from '@/components/ui/Toast';
import { ZONES } from '@/lib/constants';

const STORE_TYPES = ['Cosmaker', 'Wigmaker', 'Propmaker', 'Tienda', 'Vendedor particular'] as const;

export interface StoreFormValues {
  name: string;
  storeType: string;
  zone: string;
  bio: string;
  bankHolder: string;
  bankCuit: string;
  bankCbu: string;
  bankAlias: string;
  hidePrices: boolean;
}

export function StoreForm({ initial }: { initial: StoreFormValues | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [values, setValues] = useState<StoreFormValues>(
    initial ?? {
      name: '',
      storeType: 'Cosmaker',
      zone: 'Ciudad de Mendoza',
      bio: '',
      bankHolder: '',
      bankCuit: '',
      bankCbu: '',
      bankAlias: '',
      hidePrices: false,
    },
  );

  function set<K extends keyof StoreFormValues>(key: K, value: StoreFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    setErrors({});
    startTransition(async () => {
      const result = await upsertStore(values);
      if (result.ok) {
        toast(result.message ?? 'Tienda guardada');
        router.push('/publicar');
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        toast(result.error, 'error');
      }
    });
  }

  const err = (key: string) => errors[key]?.[0];

  return (
    <div className="bg-void2 hairline rounded-2xl p-5 sm:p-6 space-y-5">
      <div>
        <label htmlFor="s-name" className="block text-[13px] font-semibold mb-1.5">
          Nombre de la tienda
        </label>
        <input
          id="s-name"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ej: Taller Cerezo"
          className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] outline-none focus:border-chalk"
        />
        {err('name') && <p className="text-[11.5px] text-chalk mt-1">{err('name')}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="s-type" className="block text-[13px] font-semibold mb-1.5">
            Que hacés
          </label>
          <select
            id="s-type"
            value={values.storeType}
            onChange={(e) => set('storeType', e.target.value)}
            className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] outline-none focus:border-chalk"
          >
            {STORE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="s-zone" className="block text-[13px] font-semibold mb-1.5">
            Zona
          </label>
          <select
            id="s-zone"
            value={values.zone}
            onChange={(e) => set('zone', e.target.value)}
            className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] outline-none focus:border-chalk"
          >
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="s-bio" className="block text-[13px] font-semibold mb-1.5">
          Contá qué hacés{' '}
          <span className="text-muted font-normal text-[12px]">· materiales, plazos, señas</span>
        </label>
        <textarea
          id="s-bio"
          rows={3}
          value={values.bio}
          onChange={(e) => set('bio', e.target.value)}
          placeholder="Props en foam y resina. Entrego en 3 semanas, seña del 40%."
          className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] outline-none focus:border-chalk resize-y"
        />
      </div>

      {/* Datos bancarios */}
      <div className="border-t border-line pt-5">
        <div className="flex items-center gap-2 mb-1">
          <Landmark className="w-4 h-4 text-chalk" />
          <h2 className="font-semibold text-[14px]">Datos para cobrar</h2>
        </div>
        <p className="text-[12.5px] text-muted mb-4 leading-relaxed">
          El sistema compara estos datos con lo que dice el comprobante que sube el comprador. Si el
          CUIT o el CBU no coinciden, la orden se marca para revision.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="s-holder" className="block text-[13px] font-semibold mb-1.5">
              Titular de la cuenta
            </label>
            <input
              id="s-holder"
              value={values.bankHolder}
              onChange={(e) => set('bankHolder', e.target.value)}
              placeholder="Maria Belen Cerezo"
              className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] outline-none focus:border-chalk"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-cuit" className="block text-[13px] font-semibold mb-1.5">
                CUIT / CUIL
              </label>
              <input
                id="s-cuit"
                value={values.bankCuit}
                onChange={(e) => set('bankCuit', e.target.value)}
                placeholder="27-33456789-4"
                className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] font-mono outline-none focus:border-chalk"
              />
              {err('bankCuit') && <p className="text-[11.5px] text-chalk mt-1">{err('bankCuit')}</p>}
            </div>

            <div>
              <label htmlFor="s-alias" className="block text-[13px] font-semibold mb-1.5">
                Alias
              </label>
              <input
                id="s-alias"
                value={values.bankAlias}
                onChange={(e) => set('bankAlias', e.target.value)}
                placeholder="taller.cerezo.mza"
                className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] font-mono outline-none focus:border-chalk"
              />
            </div>
          </div>

          <div>
            <label htmlFor="s-cbu" className="block text-[13px] font-semibold mb-1.5">
              CBU o CVU <span className="text-muted font-normal text-[12px]">· 22 digitos</span>
            </label>
            <input
              id="s-cbu"
              value={values.bankCbu}
              onChange={(e) => set('bankCbu', e.target.value.replace(/\D/g, '').slice(0, 22))}
              placeholder="0720123488000012345678"
              className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] font-mono outline-none focus:border-chalk"
            />
            <div className="flex justify-between mt-1">
              {err('bankCbu') && <p className="text-[11.5px] text-chalk">{err('bankCbu')}</p>}
              <p className="font-mono text-[10px] text-muted ml-auto">{values.bankCbu.length}/22</p>
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={values.hidePrices}
              onChange={(e) => set('hidePrices', e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-chalk"
            />
            <span>
              <span className="block text-[13.5px] font-medium">
                Ocultar los precios en mi historial de ventas
              </span>
              <span className="block text-[12px] text-muted mt-0.5">
                Se sigue viendo que vendiste y cuantas ventas hiciste, pero no a cuanto.
              </span>
            </span>
          </label>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={isPending}
        className="w-full py-3.5 rounded-xl bg-chalk text-void font-bold text-[15px] hover:bg-chalkd transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        {initial ? 'Guardar cambios' : 'Crear mi tienda'}
      </button>
    </div>
  );
}

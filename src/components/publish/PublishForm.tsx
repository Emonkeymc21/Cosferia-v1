'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { createProduct } from '@/app/actions/products';
import { useToast } from '@/components/ui/Toast';
import { OriginBadge } from '@/components/ui/OriginBadge';
import { ORIGINS, CATEGORIES, ZONES, MAX_UPLOAD_BYTES } from '@/lib/constants';
import { formatCents } from '@/lib/money';
import type { ProductOrigin } from '@prisma/client';

/**
 * Formulario de publicacion con preview en vivo.
 *
 * Las fotos se suben ANTES de guardar el producto para que el preview
 * muestre la imagen real y no un placeholder. El costo es que una foto
 * subida y luego abandonada queda huerfana en Storage: se limpia con un
 * cron semanal (pendiente, documentado en el README).
 */
export function PublishForm({ storeName }: { storeName: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Pelucas');
  const [origin, setOrigin] = useState<ProductOrigin>('HANDMADE');
  const [size, setSize] = useState('');
  const [zone, setZone] = useState<(typeof ZONES)[number]>('Ciudad de Mendoza');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    const valid = Array.from(files).filter((f) => {
      if (f.size > MAX_UPLOAD_BYTES) {
        toast(`"${f.name}" supera los 15 MB`, 'error');
        return false;
      }
      return f.type.startsWith('image/');
    });

    if (!valid.length) return;
    if (images.length + valid.length > 6) {
      toast('Maximo 6 fotos por producto', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      valid.forEach((f) => formData.append('files', f));

      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = (await response.json()) as { ok: boolean; urls?: string[]; message?: string };

      if (data.ok && data.urls) {
        setImages((prev) => [...prev, ...data.urls!]);
        toast(data.urls.length === 1 ? 'Foto subida' : `${data.urls.length} fotos subidas`);
      } else {
        toast(data.message ?? 'No pudimos subir las fotos', 'error');
      }
    } catch {
      toast('Fallo la subida. Revisá tu conexion.', 'error');
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    setErrors({});
    startTransition(async () => {
      const result = await createProduct({
        title,
        price: Number(price),
        category,
        origin,
        size,
        zone,
        description,
        images,
        allowsShipping: true,
        allowsEventDelivery: false,
      });

      if (result.ok) {
        toast(result.message ?? 'Publicado');
        router.push('/');
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        toast(result.error, 'error');
      }
    });
  }

  const fieldError = (name: string) => errors[name]?.[0];

  return (
    <div className="grid lg:grid-cols-[1.4fr_.9fr] gap-7 items-start">
      {/* ── Formulario ── */}
      <div className="bg-void2 hairline rounded-2xl p-5 sm:p-6 space-y-5">
        <div>
          <label htmlFor="title" className="block text-[13px] font-semibold mb-1.5">
            Titulo
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Ej: Peluca lace front lila 80 cm"
            className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] outline-none focus:border-chalk transition"
          />
          <div className="flex justify-between mt-1">
            {fieldError('title') && <p className="text-[11.5px] text-chalk">{fieldError('title')}</p>}
            <p className="font-mono text-[10px] text-muted ml-auto">{title.length}/80</p>
          </div>
        </div>

        {/* Labels de origen: obligatorio */}
        <div>
          <label className="block text-[13px] font-semibold mb-2">
            Origen del producto <span className="text-chalk">*</span>
          </label>
          <div className="grid sm:grid-cols-2 gap-2">
            {ORIGINS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOrigin(o.id)}
                className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition ${
                  origin === o.id ? 'border-chalk bg-chalk/10' : 'border-line bg-void hover:border-mathi'
                }`}
              >
                <span className="text-[13px] font-semibold leading-tight">{o.label}</span>
                <span className="text-[11px] text-muted leading-snug">{o.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-[13px] font-semibold mb-1.5">
              Categoria
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
              className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] outline-none focus:border-chalk"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="price" className="block text-[13px] font-semibold mb-1.5">
              Precio (ARS)
            </label>
            <input
              id="price"
              type="number"
              min={0}
              step={500}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="45000"
              className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] outline-none focus:border-chalk"
            />
            {fieldError('price') && <p className="text-[11.5px] text-chalk mt-1">{fieldError('price')}</p>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="size" className="block text-[13px] font-semibold mb-1.5">
              Talle o medida
            </label>
            <input
              id="size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="M · 80 cm"
              className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] outline-none focus:border-chalk"
            />
          </div>

          <div>
            <label htmlFor="zone" className="block text-[13px] font-semibold mb-1.5">
              Zona de entrega
            </label>
            <select
              id="zone"
              value={zone}
              onChange={(e) => setZone(e.target.value as (typeof ZONES)[number])}
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
          <label htmlFor="description" className="block text-[13px] font-semibold mb-1.5">
            Descripcion{' '}
            <span className="text-muted font-normal text-[12px]">· materiales, plazos, cuidados</span>
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Base de encaje suizo, fibra resistente al calor hasta 180°. Peinada y sellada a mano."
            className="w-full bg-void hairline rounded-xl px-4 py-3 text-[14.5px] outline-none focus:border-chalk resize-y"
          />
        </div>

        {/* Fotos */}
        <div>
          <label className="block text-[13px] font-semibold mb-2">
            Fotos <span className="text-muted font-normal text-[12px]">· hasta 15 MB cada una</span>
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition ${
              dragging ? 'border-chalk bg-chalk/5' : 'border-line'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-7 h-7 mx-auto text-chalk mb-2 animate-spin" />
                <p className="text-[13.5px] font-semibold">Subiendo...</p>
              </>
            ) : (
              <>
                <ImagePlus className="w-7 h-7 mx-auto text-muted mb-2" />
                <p className="text-[13.5px] font-semibold">Arrastrá tus fotos aca</p>
                <p className="text-[11.5px] text-muted mt-0.5">JPG, PNG o WEBP · maximo 6</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 px-4 py-2 rounded-lg bg-void3 hairline text-[13px] font-semibold hover:border-mathi transition"
                >
                  Elegir archivos
                </button>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {images.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {images.map((url, i) => (
                <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden hairline group">
                  <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Quitar foto"
                    className="absolute inset-0 bg-void/80 opacity-0 group-hover:opacity-100 transition grid place-items-center"
                  >
                    <Trash2 className="w-4 h-4 text-chalk" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-3 rounded-xl bg-void3 hairline font-semibold text-[14px] hover:border-mathi transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isPending || uploading}
            className="flex-1 py-3 rounded-xl bg-chalk text-void font-bold text-[14.5px] hover:bg-chalkd transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'Publicando...' : 'Publicar ahora'}
          </button>
        </div>
      </div>

      {/* ── Preview en vivo ── */}
      <div className="lg:sticky lg:top-24">
        <p className="font-mono text-[9.5px] uppercase tracking-[.16em] text-muted mb-2.5">
          Vista previa en vivo
        </p>
        <article className="bg-void2 hairline rounded-2xl overflow-hidden max-w-[280px]">
          <div className="aspect-[4/3] relative cutting-mat">
            {images[0] ? (
              <Image src={images[0]} alt="" fill sizes="280px" className="object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  sin foto
                </span>
              </div>
            )}
            <OriginBadge origin={origin} className="absolute top-2 left-2" />
          </div>
          <div className="p-3">
            <h3 className="text-[13.5px] font-semibold leading-snug">
              {title || 'Titulo de tu publicacion'}
            </h3>
            <p className="mt-1.5 text-lg font-extrabold tracking-tight">
              {formatCents(Number(price || 0) * 100)}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              {storeName} · {zone}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}

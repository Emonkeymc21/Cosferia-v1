'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Loader2 } from 'lucide-react';
import { toggleAttendance, uploadEventPhoto } from '@/app/actions/events';
import { useToast } from '@/components/ui/Toast';
import { MAX_UPLOAD_BYTES } from '@/lib/constants';

export interface EventCardData {
  id: string;
  title: string;
  place: string;
  description: string;
  day: string;
  month: string;
  attendeeCount: number;
  isGoing: boolean;
  photos: Array<{ id: string; url: string; uploaderName: string }>;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function formatEventDate(date: Date): { day: string; month: string } {
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: MONTHS[date.getMonth()] ?? '',
  };
}

export function EventCard({
  event,
  isLoggedIn,
  onOpenPhoto,
}: {
  event: EventCardData;
  isLoggedIn: boolean;
  onOpenPhoto: (url: string) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function attend() {
    if (!isLoggedIn) {
      toast('Ingresá para marcar que vas', 'info');
      return;
    }
    startTransition(async () => {
      const result = await toggleAttendance(event.id);
      if (result.ok) {
        toast(result.data.going ? `Vas a ${event.title}` : 'Sacamos tu asistencia');
        router.refresh();
      } else {
        toast(result.error, 'error');
      }
    });
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (!isLoggedIn) {
      toast('Ingresá para subir fotos', 'info');
      return;
    }

    setUploading(true);
    let added = 0;

    // Subida secuencial: en paralelo, seis archivos de 15 MB saturan
    // el ancho de banda de subida de una conexion movil.
    for (const file of Array.from(files).slice(0, 6)) {
      if (file.size > MAX_UPLOAD_BYTES) {
        toast(`"${file.name}" supera los 15 MB`, 'error');
        continue;
      }
      const formData = new FormData();
      formData.append('eventId', event.id);
      formData.append('file', file);

      const result = await uploadEventPhoto(formData);
      if (result.ok) added += 1;
      else toast(result.error, 'error');
    }

    setUploading(false);
    if (added > 0) {
      toast(added === 1 ? 'Foto subida a la galeria' : `${added} fotos subidas`);
      router.refresh();
    }
  }

  return (
    <div className="bg-void2 hairline rounded-2xl overflow-hidden">
      <div className="p-4 flex gap-4 items-center flex-wrap">
        <div className="w-16 h-16 rounded-xl cutting-mat border border-mathi grid place-content-center text-center shrink-0">
          <span className="block text-xl font-extrabold leading-none">{event.day}</span>
          <span className="block font-mono text-[9px] uppercase tracking-wider text-chalk mt-0.5">
            {event.month}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-[17px] tracking-tight">{event.title}</h3>
          <p className="text-muted text-[13px] mt-0.5">{event.place}</p>
          <p className="text-muted text-[12.5px] mt-1.5 leading-relaxed">{event.description}</p>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={attend}
            disabled={isPending}
            className={`px-4 py-2.5 rounded-xl border font-semibold text-[13px] transition disabled:opacity-50 ${
              event.isGoing
                ? 'bg-chalk text-void border-chalk'
                : 'bg-void3 border-line text-ink hover:border-mathi'
            }`}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : event.isGoing ? '✓ Vas' : 'Voy'}
          </button>
          <span className="font-mono text-[10.5px] text-muted">{event.attendeeCount} van</span>
        </div>
      </div>

      {/* Galeria */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-2.5">
          <p className="font-mono text-[9.5px] uppercase tracking-[.16em] text-muted">
            Galeria · {event.photos.length} fotos
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="ml-auto px-3 py-1.5 rounded-lg bg-void3 hairline text-[12px] font-semibold hover:border-mathi transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            {uploading ? 'Subiendo...' : 'Subir foto'}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = '';
          }}
        />

        {event.photos.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {event.photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => onOpenPhoto(photo.url)}
                className="aspect-square rounded-xl overflow-hidden hairline hover:border-chalk transition group relative"
              >
                <Image
                  src={photo.url}
                  alt={`Foto de ${photo.uploaderName}`}
                  fill
                  sizes="(max-width: 640px) 33vw, 20vw"
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute bottom-0 inset-x-0 bg-void/80 px-1.5 py-1 font-mono text-[8.5px] truncate text-left">
                  {photo.uploaderName}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center border border-dashed border-line rounded-xl">
            <p className="text-[13px] text-muted">Todavia no hay fotos de este evento.</p>
            <p className="text-[12px] text-muted mt-0.5">Subi la primera y arranca la galeria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

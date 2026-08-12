'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { EventCard, type EventCardData } from './EventCard';

/**
 * Lista de eventos con lightbox compartido.
 * El lightbox vive aca y no en cada tarjeta para que solo exista una
 * instancia en el DOM.
 */
export function EventGallery({
  events,
  isLoggedIn,
}: {
  events: EventCardData[];
  isLoggedIn: boolean;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isLoggedIn={isLoggedIn}
            onOpenPhoto={setLightbox}
          />
        ))}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[70] bg-void/95 grid place-items-center p-4 cursor-zoom-out"
          role="presentation"
        >
          <div className="relative w-full h-full max-w-5xl">
            <Image src={lightbox} alt="" fill sizes="100vw" className="object-contain" />
          </div>
          <button
            aria-label="Cerrar"
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-void2 hairline grid place-items-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}

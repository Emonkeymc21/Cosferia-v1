import { CalendarDays } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { EventGallery } from '@/components/events/EventGallery';
import { formatEventDate, type EventCardData } from '@/components/events/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';

export const revalidate = 30;

export default async function EventsPage() {
  const user = await getCurrentUser();

  const events = await prisma.event.findMany({
    orderBy: { date: 'asc' },
    include: {
      photos: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { uploader: { select: { name: true } } },
      },
      _count: { select: { attendees: true } },
      attendees: user ? { where: { userId: user.id }, select: { userId: true } } : false,
    },
  });

  const cards: EventCardData[] = events.map((event) => {
    const { day, month } = formatEventDate(event.date);
    return {
      id: event.id,
      title: event.title,
      place: event.place,
      description: event.description,
      day,
      month,
      attendeeCount: event._count.attendees,
      isGoing: Array.isArray(event.attendees) && event.attendees.length > 0,
      photos: event.photos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        uploaderName: photo.uploader.name,
      })),
    };
  });

  return (
    <div className="py-6 animate-fade-up">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Eventos de Cuyo</h1>
      <p className="text-muted mt-1.5 text-[14.5px]">
        Convenciones, ferias y su galeria de fotos. Marca a cuales vas.
      </p>

      <div className="mt-6 pb-10">
        {cards.length > 0 ? (
          <EventGallery events={cards} isLoggedIn={Boolean(user)} />
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Todavia no hay eventos cargados"
            description="Cuando un organizador publique uno, va a aparecer aca con su galeria."
          />
        )}
      </div>
    </div>
  );
}

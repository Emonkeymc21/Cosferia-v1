'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { eventSchema, actionOk, actionError, type ActionResult } from '@/lib/validators';
import { uniqueSlug } from '@/lib/slug';
import { uploadFile, buildPath, BUCKETS } from '@/lib/storage';
import { MAX_UPLOAD_BYTES, ACCEPTED_IMAGE_TYPES } from '@/lib/constants';

export async function createEvent(input: unknown): Promise<ActionResult<{ slug: string }>> {
  try {
    const user = await requireUser();

    if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
      return actionError('Solo los organizadores pueden crear eventos');
    }

    const parsed = eventSchema.safeParse(input);
    if (!parsed.success) {
      return actionError('Revisá los datos del evento', parsed.error.flatten().fieldErrors);
    }

    const d = parsed.data;
    const slug = uniqueSlug(d.title);

    await prisma.event.create({
      data: {
        organizerId: user.id,
        title: d.title,
        slug,
        date: new Date(`${d.date}T12:00:00`), // mediodia: evita corrimientos de zona horaria
        place: d.place,
        description: d.description,
      },
    });

    revalidatePath('/eventos');
    return actionOk({ slug }, 'Evento creado y publicado');
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos crear el evento');
  }
}

export async function toggleAttendance(eventId: string): Promise<ActionResult<{ going: boolean }>> {
  try {
    const user = await requireUser();

    const existing = await prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });

    if (existing) {
      await prisma.eventAttendee.delete({
        where: { eventId_userId: { eventId, userId: user.id } },
      });
      revalidatePath('/eventos');
      return actionOk({ going: false });
    }

    await prisma.eventAttendee.create({ data: { eventId, userId: user.id } });
    revalidatePath('/eventos');
    return actionOk({ going: true });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos registrar tu asistencia');
  }
}

/**
 * Sube una foto a la galeria del evento.
 * Recibe FormData porque los archivos no serializan como argumentos
 * normales de Server Action.
 */
export async function uploadEventPhoto(formData: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    const user = await requireUser();

    const eventId = formData.get('eventId');
    const file = formData.get('file');
    const caption = formData.get('caption');

    if (typeof eventId !== 'string' || !(file instanceof File)) {
      return actionError('Falta el archivo o el evento');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return actionError('La foto supera los 15 MB');
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      return actionError('Formato no admitido. Subi JPG, PNG o WEBP.');
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return actionError('No encontramos ese evento');

    const path = buildPath(`events/${eventId}`, file.name);
    const { publicUrl } = await uploadFile(BUCKETS.events, path, file, file.type);

    if (!publicUrl) return actionError('No pudimos obtener la URL de la foto');

    await prisma.eventPhoto.create({
      data: {
        eventId,
        uploaderId: user.id,
        url: publicUrl,
        caption: typeof caption === 'string' && caption.trim() ? caption.trim() : null,
      },
    });

    revalidatePath('/eventos');
    return actionOk({ url: publicUrl }, 'Foto subida a la galeria');
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos subir la foto');
  }
}

'use server';

import { revalidatePath } from 'next/cache';
import { PostStatus, DisputeStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { moderate } from '@/lib/moderation';
import { postSchema, disputeSchema, actionOk, actionError, type ActionResult } from '@/lib/validators';

/**
 * Foro con moderacion Zero Funas.
 *
 * La moderacion corre TAMBIEN en el cliente para dar aviso en vivo
 * mientras el usuario escribe, pero la decision real es esta: el
 * cliente puede desactivar JavaScript, el servidor no.
 */

export interface BlockedPost {
  blocked: true;
  reason: string;
  originalText: string;
}

export async function createPost(
  input: unknown,
): Promise<ActionResult<{ postId: string } | BlockedPost>> {
  try {
    const user = await requireUser();
    const parsed = postSchema.safeParse(input);

    if (!parsed.success) {
      return actionError('Revisá el mensaje', parsed.error.flatten().fieldErrors);
    }

    const { content, tag } = parsed.data;
    const verdict = moderate(content);

    if (!verdict.allowed) {
      // Guardamos el intento bloqueado para poder auditar el algoritmo
      // y medir falsos positivos. Sin esto, no hay forma de saber si la
      // moderacion esta siendo demasiado agresiva.
      await prisma.post.create({
        data: {
          authorId: user.id,
          content,
          tag,
          status: PostStatus.BLOCKED,
          blockedReason: verdict.rule,
        },
      });

      return actionOk({
        blocked: true as const,
        reason: verdict.reason ?? 'El mensaje no cumple las reglas de la comunidad.',
        originalText: content,
      });
    }

    const post = await prisma.post.create({
      data: { authorId: user.id, content, tag, status: PostStatus.PUBLISHED },
    });

    revalidatePath('/comunidad');
    return actionOk({ postId: post.id }, 'Publicado en la comunidad');
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos publicar');
  }
}

/** Like idempotente: si ya existe, lo saca. */
export async function togglePostLike(postId: string): Promise<ActionResult<{ liked: boolean }>> {
  try {
    const user = await requireUser();

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.postLike.delete({ where: { postId_userId: { postId, userId: user.id } } }),
        prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      revalidatePath('/comunidad');
      return actionOk({ liked: false });
    }

    await prisma.$transaction([
      prisma.postLike.create({ data: { postId, userId: user.id } }),
      prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);

    revalidatePath('/comunidad');
    return actionOk({ liked: true });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos registrar el like');
  }
}

/**
 * Centro de Disputas: el canal privado al que se deriva todo lo que la
 * moderacion saca del feed publico.
 *
 * Detalle de producto importante: cuando bloqueamos un post, el texto
 * original viaja hasta aca. Si le cerras la puerta al usuario sin
 * ofrecerle salida, se va a Instagram a hacer la funa igual.
 */
export async function createDispute(input: unknown): Promise<ActionResult<{ disputeId: string }>> {
  try {
    const user = await requireUser();
    const parsed = disputeSchema.safeParse(input);

    if (!parsed.success) {
      return actionError('Revisá el formulario', parsed.error.flatten().fieldErrors);
    }

    const d = parsed.data;

    // Si menciona una orden, verificamos que sea del usuario
    if (d.orderId) {
      const order = await prisma.order.findUnique({ where: { id: d.orderId } });
      if (!order || order.buyerId !== user.id) {
        return actionError('Esa orden no figura entre tus compras');
      }
    }

    const dispute = await prisma.dispute.create({
      data: {
        authorId: user.id,
        orderId: d.orderId || null,
        type: d.type,
        detail: d.detail,
        sourceText: d.sourceText || null,
        status: DisputeStatus.OPEN,
      },
    });

    return actionOk({ disputeId: dispute.id }, 'Caso abierto. Un moderador te responde en 48 h.');
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos abrir el caso');
  }
}

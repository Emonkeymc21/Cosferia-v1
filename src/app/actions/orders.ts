'use server';

import { revalidatePath } from 'next/cache';
import { OrderStatus, ProductStatus, ReceiptStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, requireStore } from '@/lib/auth';
import { orderSchema, actionOk, actionError, type ActionResult } from '@/lib/validators';
import { generateOrderReference } from '@/lib/slug';
import { signedReceiptUrl } from '@/lib/storage';

/**
 * Maquina de estados de la orden.
 * Ninguna funcion cambia order.status a mano: todas pasan por
 * assertTransition. Sin esto, en tres meses hay ordenes en SHIPPED sin
 * estar pagas porque alguien llamo un update desde donde no debia.
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  AWAITING_RECEIPT: ['VERIFYING', 'CONFIRMED', 'REJECTED', 'CANCELLED'],
  VERIFYING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  REJECTED: ['VERIFYING', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'COMPLETED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new Error(`Transicion invalida: ${from} -> ${to}`);
  }
}

/** Crea la orden y reserva el producto para que no lo compren dos veces. */
export async function createOrder(input: unknown): Promise<ActionResult<{ orderId: string; reference: string }>> {
  try {
    const user = await requireUser();
    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) return actionError('Producto invalido');

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: parsed.data.productId },
        include: { store: true },
      });

      if (!product || product.status !== ProductStatus.LIVE) {
        throw new Error('El producto ya no esta disponible.');
      }
      if (product.store.userId === user.id) {
        throw new Error('No podes comprar tu propio producto.');
      }
      if (!product.store.bankCbu && !product.store.bankAlias) {
        throw new Error('El vendedor todavia no cargo sus datos bancarios.');
      }

      const order = await tx.order.create({
        data: {
          reference: generateOrderReference(),
          buyerId: user.id,
          sellerStoreId: product.storeId,
          productId: product.id,
          totalAmount: product.price,
          status: OrderStatus.AWAITING_RECEIPT,
        },
      });

      // Reservamos: evita vender dos veces una pieza unica
      await tx.product.update({
        where: { id: product.id },
        data: { status: ProductStatus.RESERVED },
      });

      return order;
    });

    revalidatePath('/pedidos');
    revalidatePath('/');
    return actionOk({ orderId: result.id, reference: result.reference });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos crear la orden');
  }
}

/**
 * El vendedor confirma o rechaza el comprobante.
 * Esta es la autoridad real sobre el pago: el OCR solo hace triage.
 */
export async function resolveReceipt(
  orderId: string,
  approve: boolean,
): Promise<ActionResult> {
  try {
    const seller = await requireStore();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { receipts: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!order || order.sellerStoreId !== seller.storeId) {
      return actionError('No encontramos esa orden');
    }

    const nextStatus = approve ? OrderStatus.CONFIRMED : OrderStatus.REJECTED;
    assertTransition(order.status, nextStatus);

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus, confirmedAt: approve ? new Date() : null },
      });

      const receipt = order.receipts[0];
      if (receipt) {
        await tx.receipt.update({
          where: { id: receipt.id },
          data: {
            status: approve ? ReceiptStatus.APPROVED : ReceiptStatus.REJECTED,
            reviewedBy: seller.id,
            reviewedAt: new Date(),
          },
        });
      }

      await tx.product.update({
        where: { id: order.productId },
        data: approve
          ? { status: ProductStatus.SOLD, soldAt: new Date() }
          : { status: ProductStatus.LIVE }, // vuelve al catalogo
      });
    });

    revalidatePath('/pedidos');
    revalidatePath('/mi-tienda');
    return actionOk(
      undefined,
      approve ? 'Pago confirmado. Coordina la entrega.' : 'Comprobante rechazado.',
    );
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos resolver el comprobante');
  }
}

/** Despacho. Solo con el pago confirmado. */
export async function shipOrder(orderId: string, trackingCode: string): Promise<ActionResult> {
  try {
    const seller = await requireStore();

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.sellerStoreId !== seller.storeId) {
      return actionError('No encontramos esa orden');
    }

    assertTransition(order.status, OrderStatus.SHIPPED);

    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.SHIPPED, trackingCode: trackingCode.trim() || null },
    });

    revalidatePath('/pedidos');
    return actionOk(undefined, 'Despachado');
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos despachar la orden');
  }
}

/** El comprador confirma que recibio. */
export async function completeOrder(orderId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== user.id) return actionError('No encontramos esa orden');

    assertTransition(order.status, OrderStatus.COMPLETED);

    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
    });

    revalidatePath('/pedidos');
    return actionOk(undefined, 'Pedido completado');
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos completar la orden');
  }
}

/**
 * URL firmada para que el vendedor mire el comprobante.
 * Dura 10 minutos: suficiente para verificarlo, corto para que no
 * circule por WhatsApp.
 */
export async function getReceiptUrl(receiptId: string): Promise<ActionResult<{ url: string }>> {
  try {
    const user = await requireUser();

    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { order: { include: { sellerStore: true } } },
    });

    if (!receipt) return actionError('No encontramos el comprobante');

    // Solo el comprador o el vendedor pueden verlo
    const isBuyer = receipt.order.buyerId === user.id;
    const isSeller = receipt.order.sellerStore.userId === user.id;
    if (!isBuyer && !isSeller) return actionError('No tenes permiso para ver este comprobante');

    const url = await signedReceiptUrl(receipt.filePath);
    if (!url) return actionError('No pudimos generar el enlace');

    return actionOk({ url });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos abrir el comprobante');
  }
}

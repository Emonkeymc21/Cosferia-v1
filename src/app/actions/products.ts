'use server';

import { revalidatePath } from 'next/cache';
import { ProductStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, requireStore } from '@/lib/auth';
import { productSchema, storeSchema, actionOk, actionError, type ActionResult } from '@/lib/validators';
import { pesosToCents } from '@/lib/money';
import { uniqueSlug, slugify } from '@/lib/slug';

/**
 * Server Actions de productos.
 * Toda la autorizacion vive aca: Prisma se conecta con el rol postgres
 * y por lo tanto ignora RLS. Nunca confiar en lo que manda el cliente.
 */

export async function createProduct(input: unknown): Promise<ActionResult<{ slug: string }>> {
  try {
    const seller = await requireStore();
    const parsed = productSchema.safeParse(input);

    if (!parsed.success) {
      return actionError('Revisá los datos del formulario', parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;
    const slug = uniqueSlug(data.title);

    await prisma.product.create({
      data: {
        storeId: seller.storeId,
        title: data.title,
        slug,
        price: pesosToCents(data.price),
        category: data.category,
        origin: data.origin,
        size: data.size || null,
        zone: data.zone,
        description: data.description,
        images: data.images,
        allowsShipping: data.allowsShipping,
        allowsEventDelivery: data.allowsEventDelivery,
        status: ProductStatus.LIVE,
      },
    });

    revalidatePath('/');
    revalidatePath('/mi-tienda');
    return actionOk({ slug }, 'Publicado. Ya aparece en el catalogo.');
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos publicar el producto');
  }
}

export async function updateProductStatus(
  productId: string,
  status: ProductStatus,
): Promise<ActionResult> {
  try {
    const seller = await requireStore();

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.storeId !== seller.storeId) {
      return actionError('No encontramos ese producto');
    }

    await prisma.product.update({
      where: { id: productId },
      data: { status, soldAt: status === ProductStatus.SOLD ? new Date() : null },
    });

    revalidatePath('/');
    revalidatePath('/mi-tienda');
    return actionOk(undefined, 'Estado actualizado');
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos actualizar el producto');
  }
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  try {
    const seller = await requireStore();

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { _count: { select: { orders: true } } },
    });

    if (!product || product.storeId !== seller.storeId) {
      return actionError('No encontramos ese producto');
    }

    // Con ordenes asociadas no se borra: se pausa. Borrar romperia el
    // historial de compras del comprador.
    if (product._count.orders > 0) {
      await prisma.product.update({
        where: { id: productId },
        data: { status: ProductStatus.PAUSED },
      });
      revalidatePath('/');
      return actionOk(undefined, 'Tiene ventas asociadas: la pausamos en vez de borrarla.');
    }

    await prisma.product.delete({ where: { id: productId } });
    revalidatePath('/');
    revalidatePath('/mi-tienda');
    return actionOk(undefined, 'Publicacion eliminada');
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos eliminar el producto');
  }
}

/** Crea o actualiza la tienda del usuario y lo pasa a rol MAKER. */
export async function upsertStore(input: unknown): Promise<ActionResult<{ storeId: string }>> {
  try {
    const user = await requireUser();
    const parsed = storeSchema.safeParse(input);

    if (!parsed.success) {
      return actionError('Revisá los datos de la tienda', parsed.error.flatten().fieldErrors);
    }

    const d = parsed.data;

    const store = await prisma.store.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        name: d.name,
        slug: uniqueSlug(d.name),
        storeType: d.storeType,
        zone: d.zone,
        bio: d.bio,
        bankHolder: d.bankHolder || null,
        bankCuit: d.bankCuit || null,
        bankCbu: d.bankCbu || null,
        bankAlias: d.bankAlias || null,
        hidePrices: d.hidePrices,
      },
      update: {
        name: d.name,
        storeType: d.storeType,
        zone: d.zone,
        bio: d.bio,
        bankHolder: d.bankHolder || null,
        bankCuit: d.bankCuit || null,
        bankCbu: d.bankCbu || null,
        bankAlias: d.bankAlias || null,
        hidePrices: d.hidePrices,
      },
    });

    // El rol acompana: si abriste tienda, sos vendedor
    if (user.role === 'BUYER') {
      await prisma.user.update({ where: { id: user.id }, data: { role: 'MAKER' } });
    }

    revalidatePath('/mi-tienda');
    return actionOk({ storeId: store.id }, 'Tienda actualizada');
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'No pudimos guardar la tienda');
  }
}

/** Slug determinista para tiendas nuevas creadas desde el seed. */
export async function storeSlugFor(name: string): Promise<string> {
  return slugify(name);
}

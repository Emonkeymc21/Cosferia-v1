import type { ProductOrigin, Role, OrderStatus } from '@prisma/client';

/** Los 4 labels obligatorios de origen. */
export const ORIGINS: ReadonlyArray<{
  id: ProductOrigin;
  label: string;
  short: string;
  hint: string;
  icon: string;
  badge: string;
  active: string;
}> = [
  {
    id: 'HANDMADE',
    label: 'Trabajo a mano / Cosmaker',
    short: 'A mano',
    hint: 'Lo hiciste vos o un taller local.',
    icon: 'hand-heart',
    badge: 'bg-chalk text-void',
    active: 'bg-chalk text-void border-chalk',
  },
  {
    id: 'NATIONAL',
    label: 'Industria Argentina',
    short: 'Ind. Arg.',
    hint: 'Produccion nacional en serie.',
    icon: 'factory',
    badge: 'bg-sky-300 text-void',
    active: 'bg-sky-300 text-void border-sky-300',
  },
  {
    id: 'IMPORTED',
    label: 'Comprado en el exterior',
    short: 'Importado',
    hint: 'Traido de afuera, reventa.',
    icon: 'plane',
    badge: 'bg-violet-300 text-void',
    active: 'bg-violet-300 text-void border-violet-300',
  },
  {
    id: 'USED',
    label: 'Segunda Mano / Usado',
    short: 'Usado',
    hint: 'Ya se uso, en buen estado.',
    icon: 'recycle',
    badge: 'bg-amber text-void',
    active: 'bg-amber text-void border-amber',
  },
];

export function originOf(id: ProductOrigin) {
  return ORIGINS.find((o) => o.id === id) ?? ORIGINS[0]!;
}

export const CATEGORIES = [
  'Pelucas',
  'Trajes',
  'Props y armas',
  'Accesorios',
  'Calzado',
  'Maquillaje FX',
  'Encargos',
] as const;

export const ZONES = [
  'Ciudad de Mendoza',
  'Godoy Cruz',
  'Guaymallen',
  'Maipu',
  'Las Heras',
  'Lujan de Cuyo',
  'San Rafael',
] as const;

export const POST_TAGS = [
  'General',
  'Materiales',
  'Busco',
  'Muestro',
  'Eventos',
  'Consejos',
] as const;

export const DISPUTE_TYPES = [
  'No recibi el producto',
  'El producto no era como se describia',
  'El vendedor no responde',
  'Problema con el pago o el reembolso',
  'Conducta inapropiada de un usuario',
  'Otro',
] as const;

export const ROLE_LABELS: Record<Role, string> = {
  BUYER: 'Comprador',
  MAKER: 'Tienda Cosmaker',
  ORGANIZER: 'Organizador de eventos',
  ADMIN: 'Administracion',
};

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; cls: string }> = {
  AWAITING_RECEIPT: { label: 'Falta el comprobante', cls: 'bg-void3 text-muted' },
  VERIFYING: { label: 'Verificando pago', cls: 'bg-amber/20 text-amber' },
  CONFIRMED: { label: 'Pago confirmado', cls: 'bg-jade/20 text-jade' },
  REJECTED: { label: 'Rechazado', cls: 'bg-chalk/20 text-chalk' },
  SHIPPED: { label: 'En camino', cls: 'bg-sky-400/20 text-sky-300' },
  COMPLETED: { label: 'Completado', cls: 'bg-jade/20 text-jade' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-void3 text-muted' },
};

/** Limites de subida. 15 MB como pidio el producto. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPTED_RECEIPT_TYPES = ['application/pdf', ...ACCEPTED_IMAGE_TYPES] as const;

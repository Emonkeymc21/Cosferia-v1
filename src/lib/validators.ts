import { z } from 'zod';
import { CATEGORIES, ZONES, POST_TAGS, DISPUTE_TYPES } from './constants';

/**
 * Esquemas zod compartidos por Server Actions y formularios.
 * Una sola fuente de verdad para la validacion: si cambia una regla,
 * cambia en los dos lados a la vez.
 */

export const productSchema = z.object({
  title: z
    .string()
    .trim()
    .min(6, 'El titulo necesita al menos 6 caracteres')
    .max(80, 'El titulo no puede superar los 80 caracteres'),
  /** Precio EN PESOS: se convierte a centavos en la action. */
  price: z
    .number({ invalid_type_error: 'Poné un precio valido' })
    .int('El precio tiene que ser un numero entero')
    .positive('El precio tiene que ser mayor a cero')
    .max(50_000_000, 'Ese precio parece un error'),
  category: z.enum(CATEGORIES),
  origin: z.enum(['HANDMADE', 'NATIONAL', 'IMPORTED', 'USED'], {
    errorMap: () => ({ message: 'Elegí el origen del producto' }),
  }),
  size: z.string().trim().max(40).optional().default(''),
  zone: z.enum(ZONES),
  description: z.string().trim().max(2000).optional().default(''),
  images: z.array(z.string().url()).max(6, 'Maximo 6 fotos').optional().default([]),
  allowsShipping: z.boolean().optional().default(true),
  allowsEventDelivery: z.boolean().optional().default(false),
});

export type ProductInput = z.infer<typeof productSchema>;

export const storeSchema = z.object({
  name: z.string().trim().min(3, 'El nombre de la tienda es muy corto').max(60),
  storeType: z.enum(['Cosmaker', 'Wigmaker', 'Propmaker', 'Tienda', 'Vendedor particular']),
  zone: z.enum(ZONES),
  bio: z.string().trim().max(600).optional().default(''),
  bankHolder: z.string().trim().max(80).optional().default(''),
  // CUIT argentino: 11 digitos con o sin guiones
  bankCuit: z
    .string()
    .trim()
    .regex(/^\d{2}-?\d{8}-?\d$/, 'CUIT invalido (formato 20-12345678-9)')
    .optional()
    .or(z.literal('')),
  bankCbu: z
    .string()
    .trim()
    .regex(/^\d{22}$/, 'El CBU o CVU tiene 22 digitos')
    .optional()
    .or(z.literal('')),
  bankAlias: z.string().trim().max(40).optional().default(''),
  hidePrices: z.boolean().optional().default(false),
});

export const orderSchema = z.object({
  productId: z.string().cuid(),
});

export const postSchema = z.object({
  content: z
    .string()
    .trim()
    .min(3, 'Escribí algo antes de publicar')
    .max(600, 'Maximo 600 caracteres'),
  tag: z.enum(POST_TAGS).default('General'),
});

export const disputeSchema = z.object({
  type: z.enum(DISPUTE_TYPES),
  orderId: z.string().cuid().optional().or(z.literal('')),
  detail: z.string().trim().min(10, 'Contanos un poco mas para poder ayudarte').max(3000),
  sourceText: z.string().max(3000).optional().default(''),
});

export const eventSchema = z.object({
  title: z.string().trim().min(4, 'El nombre es muy corto').max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida'),
  place: z.string().trim().min(3, 'Indicá el lugar').max(120),
  description: z.string().trim().max(1000).optional().default(''),
});

/** Payload del cliente hacia /api/ocr/verify */
export const ocrPayloadSchema = z.object({
  orderId: z.string().cuid(),
  /** Texto que el navegador extrajo con Tesseract. Puede faltar. */
  clientText: z.string().max(20_000).optional().default(''),
});

/** Resultado uniforme de todas las Server Actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function actionError(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function actionOk<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

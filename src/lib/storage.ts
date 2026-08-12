import { createAdminClient } from './supabase/server';

/**
 * Supabase Storage.
 *
 * Dos buckets con politicas opuestas:
 *   - "products" y "events": PUBLICOS. Las fotos se sirven por CDN.
 *   - "receipts": PRIVADO. Un comprobante tiene CUIT, CBU y montos:
 *     nunca puede quedar accesible por URL adivinable. Se lee solo
 *     con URL firmada y de corta duracion.
 */

export const BUCKETS = {
  products: 'products',
  events: 'events',
  receipts: 'receipts',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

export interface UploadResult {
  path: string;
  /** URL publica. null para buckets privados. */
  publicUrl: string | null;
}

/** Sube un archivo y devuelve la ruta y, si el bucket es publico, la URL. */
export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File | Buffer,
  contentType: string,
): Promise<UploadResult> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: false,
    cacheControl: '31536000', // un ano: los archivos son inmutables
  });

  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`);

  if (bucket === BUCKETS.receipts) {
    return { path, publicUrl: null };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/**
 * URL firmada para leer un comprobante.
 * Por defecto dura 10 minutos: suficiente para mirarlo, corto para que
 * no circule por WhatsApp.
 */
export async function signedReceiptUrl(path: string, expiresIn = 600): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKETS.receipts)
    .createSignedUrl(path, expiresIn);

  if (error) return null;
  return data.signedUrl;
}

/** Elimina un archivo. Se usa al borrar una publicacion. */
export async function deleteFile(bucket: BucketName, path: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.storage.from(bucket).remove([path]);
}

/** Ruta unica y ordenable por fecha. */
export function buildPath(prefix: string, fileName: string): string {
  const clean = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').slice(-60);
  return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${clean}`;
}

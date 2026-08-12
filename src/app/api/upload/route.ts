/**
 * POST /api/upload
 * Sube imagenes de producto a Supabase Storage y devuelve las URLs.
 *
 * Ruta separada de las Server Actions porque el formulario de
 * publicacion sube las fotos ANTES de guardar el producto: asi el
 * usuario ve el preview real mientras completa el resto.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { uploadFile, buildPath, BUCKETS } from '@/lib/storage';
import { MAX_UPLOAD_BYTES, ACCEPTED_IMAGE_TYPES } from '@/lib/constants';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Necesitas iniciar sesion.' }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files').filter((f): f is File => f instanceof File);

    if (!files.length) {
      return NextResponse.json({ ok: false, message: 'No llegaron archivos.' }, { status: 400 });
    }
    if (files.length > 6) {
      return NextResponse.json({ ok: false, message: 'Maximo 6 fotos por producto.' }, { status: 400 });
    }

    const urls: string[] = [];

    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { ok: false, message: `"${file.name}" supera los 15 MB.` },
          { status: 413 },
        );
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        return NextResponse.json(
          { ok: false, message: 'Formato no admitido. Subi JPG, PNG o WEBP.' },
          { status: 415 },
        );
      }

      const path = buildPath(`products/${user.id}`, file.name);
      const { publicUrl } = await uploadFile(BUCKETS.products, path, file, file.type);
      if (publicUrl) urls.push(publicUrl);
    }

    return NextResponse.json({ ok: true, urls });
  } catch (error) {
    console.error('[upload]', error);
    return NextResponse.json(
      { ok: false, message: 'No pudimos subir las imagenes.' },
      { status: 500 },
    );
  }
}

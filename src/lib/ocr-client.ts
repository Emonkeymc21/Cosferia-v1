'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * OCR EN EL NAVEGADOR
 * ═══════════════════════════════════════════════════════════════
 *
 * POR QUE ACA Y NO EN EL SERVIDOR:
 * Tesseract necesita descargar un modelo de idioma de ~15 MB. En una
 * funcion serverless de Vercel eso significa superar el limite de
 * bundle y agotar el tiempo de ejecucion en cada cold start. En el
 * navegador el modelo se cachea, no hay limite de tiempo y no cuesta
 * nada de infraestructura.
 *
 * EL COSTO DE ESTA DECISION:
 * el texto sale de una maquina que el usuario controla, asi que podria
 * estar fabricado. Por eso el servidor marca estos comprobantes como
 * CLIENT_OCR y les baja el puntaje un 30%. Un PDF con texto nativo, en
 * cambio, lo lee el servidor y es confiable.
 *
 * tesseract.js se importa dinamicamente para que no entre en el bundle
 * inicial: solo lo paga quien realmente sube un comprobante.
 */

export interface ClientOcrProgress {
  status: string;
  progress: number;
}

export interface ClientOcrResult {
  text: string;
  ok: boolean;
  error?: string;
}

/** Corre OCR sobre una imagen. Devuelve texto plano. */
export async function recognizeImage(
  file: File,
  onProgress?: (p: ClientOcrProgress) => void,
): Promise<ClientOcrResult> {
  try {
    const { default: Tesseract } = await import('tesseract.js');

    const { data } = await Tesseract.recognize(file, 'spa', {
      logger: (m: { status: string; progress: number }) => {
        if (!onProgress) return;
        const label =
          m.status === 'recognizing text'
            ? 'Reconociendo texto...'
            : m.status === 'loading language traineddata'
              ? 'Cargando modelo en espanol...'
              : 'Procesando...';
        onProgress({ status: label, progress: Math.round((m.progress ?? 0) * 100) });
      },
    });

    return { text: data.text ?? '', ok: true };
  } catch (error) {
    return {
      text: '',
      ok: false,
      error: error instanceof Error ? error.message : 'Fallo el OCR',
    };
  }
}

/**
 * Decide si conviene correr OCR en el cliente.
 * Los PDFs los procesa el servidor: extrae el texto nativo, que es
 * exacto y no necesita reconocimiento de imagen.
 */
export function shouldRunClientOcr(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * ═══════════════════════════════════════════════════════════════
 * POST /api/ocr/verify
 * ═══════════════════════════════════════════════════════════════
 *
 * Recibe el comprobante de transferencia y decide si la orden avanza.
 *
 * FLUJO
 *   1. Autenticar y verificar que la orden es del comprador
 *   2. Validar tipo y tamano del archivo
 *   3. Deduplicar por hash SHA-256
 *   4. Extraer texto:
 *        - PDF con texto nativo  -> pdf-parse en el servidor (confiable)
 *        - Imagen                -> texto que mando el navegador (CLIENT_OCR)
 *   5. Parsear, puntuar y deduplicar por numero de operacion
 *   6. Subir al bucket privado
 *   7. Persistir Receipt y transicionar la Order en una transaccion
 *
 * Runtime nodejs porque pdf-parse usa APIs de Node.
 * maxDuration alto porque un PDF pesado tarda.
 */

import { NextRequest, NextResponse } from 'next/server';
import { OcrSource, OrderStatus, ProductStatus, ReceiptStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { uploadFile, buildPath, BUCKETS } from '@/lib/storage';
import { parseReceiptText, analyzeReceipt, hashBuffer } from '@/lib/receipt';
import { formatCents } from '@/lib/money';
import { ACCEPTED_RECEIPT_TYPES, MAX_UPLOAD_BYTES } from '@/lib/constants';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Politica de aprobacion.
 * Con REQUIRE_MANUAL_REVIEW en true (default), el sistema NUNCA
 * aprueba plata solo: lo maximo que hace es dejar el comprobante
 * listo para que el vendedor lo confirme de un clic mirando su
 * homebanking. Es la configuracion recomendada para produccion.
 */
const REQUIRE_MANUAL_REVIEW = process.env.RECEIPT_REQUIRE_MANUAL_REVIEW !== 'false';
const AUTO_APPROVE_SCORE = Number(process.env.RECEIPT_AUTO_APPROVE_SCORE ?? '85');

interface VerifyResponse {
  ok: boolean;
  message: string;
  receiptId?: string;
  receiptStatus?: ReceiptStatus;
  orderStatus?: OrderStatus;
  score?: number;
  rows?: Array<{ key: string; value: string; ok: boolean; warn: boolean }>;
  flags?: string[];
}

/** Extrae texto nativo de un PDF. Devuelve null si es un escaneo. */
async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    // Import dinamico: pdf-parse es pesado y solo corre en Node
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    const text = result.text ?? '';
    return text.trim().length > 40 ? text : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<VerifyResponse>> {
  try {
    // ── 1. Autenticacion ──
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Necesitas iniciar sesion.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const orderId = formData.get('orderId');
    const clientText = formData.get('clientText');

    if (!(file instanceof File) || typeof orderId !== 'string') {
      return NextResponse.json(
        { ok: false, message: 'Falta el archivo o el numero de orden.' },
        { status: 400 },
      );
    }

    // ── 2. Validacion del archivo ──
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, message: 'El archivo supera los 15 MB.' },
        { status: 413 },
      );
    }
    if (!ACCEPTED_RECEIPT_TYPES.includes(file.type as (typeof ACCEPTED_RECEIPT_TYPES)[number])) {
      return NextResponse.json(
        { ok: false, message: 'Formato no admitido. Subi un PDF o una imagen JPG, PNG o WEBP.' },
        { status: 415 },
      );
    }

    // ── 3. Cargar la orden y verificar pertenencia ──
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { sellerStore: true, product: true },
    });

    // 404 en vez de 403 para no confirmar que la orden existe
    if (!order || order.buyerId !== user.id) {
      return NextResponse.json({ ok: false, message: 'No encontramos esa orden.' }, { status: 404 });
    }

    const acceptedStates: OrderStatus[] = [OrderStatus.AWAITING_RECEIPT, OrderStatus.REJECTED];
    if (!acceptedStates.includes(order.status)) {
      return NextResponse.json(
        { ok: false, message: 'Esta orden no esta esperando un comprobante.' },
        { status: 409 },
      );
    }

    // ── 4. Deduplicacion por hash ──
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = hashBuffer(buffer);

    const duplicate = await prisma.receipt.findUnique({ where: { fileHash } });
    if (duplicate) {
      return NextResponse.json(
        { ok: false, message: 'Este comprobante ya fue subido antes. Subi el de esta operacion.' },
        { status: 409 },
      );
    }

    // ── 5. Extraccion de texto ──
    let rawText = '';
    let source: OcrSource = OcrSource.NONE;

    if (file.type === 'application/pdf') {
      const pdfText = await extractPdfText(buffer);
      if (pdfText) {
        rawText = pdfText;
        source = OcrSource.PDF_TEXT;
      } else if (typeof clientText === 'string' && clientText.trim().length > 20) {
        // PDF escaneado: el cliente pudo haberlo rasterizado
        rawText = clientText;
        source = OcrSource.CLIENT_OCR;
      }
    } else if (typeof clientText === 'string' && clientText.trim().length > 20) {
      rawText = clientText;
      source = OcrSource.CLIENT_OCR;
    }

    const parsed = parseReceiptText(rawText);
    const analysis = analyzeReceipt({
      parsed,
      expectedAmount: order.totalAmount,
      seller: {
        holder: order.sellerStore.bankHolder,
        cuit: order.sellerStore.bankCuit,
        cbu: order.sellerStore.bankCbu,
        alias: order.sellerStore.bankAlias,
      },
      source: source === OcrSource.NONE ? 'NONE' : source === OcrSource.PDF_TEXT ? 'PDF_TEXT' : 'CLIENT_OCR',
    });

    // ── 6. Deduplicacion por numero de operacion ──
    // Ataca el caso de re-exportar el PDF: cambia el hash pero no el
    // numero de operacion del banco.
    if (parsed.operationNumber) {
      const sameOperation = await prisma.receipt.findFirst({
        where: {
          extractedOperation: parsed.operationNumber,
          status: { in: [ReceiptStatus.APPROVED, ReceiptStatus.AUTO_APPROVED] },
        },
      });
      if (sameOperation) {
        analysis.flags.push('Ese numero de operacion ya se uso en otra orden.');
        analysis.score = 0;
      }
    }

    // ── 7. Subida al bucket privado ──
    const path = buildPath(`orders/${order.id}`, file.name);
    await uploadFile(BUCKETS.receipts, path, buffer, file.type);

    // ── 8. Decision de estado ──
    const canAutoApprove =
      !REQUIRE_MANUAL_REVIEW &&
      analysis.amountMatches &&
      analysis.score >= AUTO_APPROVE_SCORE &&
      source === OcrSource.PDF_TEXT; // nunca auto-aprobar sobre CLIENT_OCR

    const receiptStatus: ReceiptStatus = analysis.rejected
      ? ReceiptStatus.REJECTED
      : canAutoApprove
        ? ReceiptStatus.AUTO_APPROVED
        : ReceiptStatus.NEEDS_REVIEW;

    // ── 9. Persistencia transaccional ──
    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          orderId: order.id,
          filePath: path,
          fileName: file.name,
          mimeType: file.type,
          fileHash,
          extractedAmount: parsed.amount,
          extractedCuit: parsed.cuit,
          extractedDate: parsed.date,
          extractedOperation: parsed.operationNumber,
          extractedCbu: parsed.cbu,
          rawText: parsed.rawText,
          ocrSource: source,
          confidenceScore: analysis.score,
          flags: analysis.flags,
          status: receiptStatus,
        },
      });

      const nextOrderStatus: OrderStatus = analysis.rejected
        ? OrderStatus.REJECTED
        : canAutoApprove
          ? OrderStatus.CONFIRMED
          : OrderStatus.VERIFYING;

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: nextOrderStatus,
          confirmedAt: canAutoApprove ? new Date() : null,
        },
      });

      // Si se aprueba automatico, la publicacion pasa a vendida
      if (canAutoApprove) {
        await tx.product.update({
          where: { id: order.productId },
          data: { status: ProductStatus.SOLD, soldAt: new Date() },
        });
      }

      return { receipt, order: updatedOrder };
    });

    // ── 10. Respuesta ──
    const message = analysis.rejected
      ? `El monto del comprobante no coincide con ${formatCents(order.totalAmount)}. Revisalo y volve a subirlo.`
      : canAutoApprove
        ? 'Pago verificado. El vendedor ya puede coordinar la entrega.'
        : 'Recibimos el comprobante. El vendedor lo confirma y te avisamos, normalmente dentro de las 24 horas.';

    return NextResponse.json({
      ok: !analysis.rejected,
      message,
      receiptId: result.receipt.id,
      receiptStatus,
      orderStatus: result.order.status,
      score: analysis.score,
      rows: analysis.rows,
      flags: analysis.flags,
    });
  } catch (error) {
    // No filtramos el error crudo al cliente
    console.error('[ocr/verify]', error);
    return NextResponse.json(
      { ok: false, message: 'No pudimos procesar el comprobante. Proba de nuevo en un rato.' },
      { status: 500 },
    );
  }
}

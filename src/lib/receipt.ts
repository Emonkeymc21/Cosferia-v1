/**
 * ═══════════════════════════════════════════════════════════════
 * COMPROBANTES DE TRANSFERENCIA — parseo y triage
 * ═══════════════════════════════════════════════════════════════
 *
 * ADVERTENCIA DE SEGURIDAD, y es la decision mas importante de este
 * modulo: lo que sale de aca es una SENAL, no una verdad.
 *
 * Un comprobante es un archivo que el comprador controla por completo.
 * Editar "$89.500" para que diga "$8.950" en una imagen lleva treinta
 * segundos y el OCR va a leer obediente lo que le pongan. Por eso el
 * sistema clasifica y le ahorra trabajo al vendedor, pero NUNCA
 * aprueba plata solo cuando RECEIPT_REQUIRE_MANUAL_REVIEW esta en true.
 *
 * Ademas, el OCR de imagenes corre en el NAVEGADOR (ver ocr-client.ts)
 * porque Tesseract no entra en una funcion serverless de Vercel. Eso
 * significa que el texto de una imagen llega desde el cliente y podria
 * estar fabricado. Lo marcamos con ocrSource = CLIENT_OCR y le bajamos
 * el puntaje. El texto de un PDF nativo, en cambio, lo extrae el
 * servidor y si es confiable.
 */

import { createHash } from 'crypto';
import { parseArsToCents, formatCents } from './money';

// ─────────────────────────── Tipos ───────────────────────────

export interface ParsedReceipt {
  /** Monto principal detectado, en centavos. */
  amount: number | null;
  /** Todos los montos hallados, de mayor a menor (centavos). */
  candidateAmounts: number[];
  cuit: string | null;
  operationNumber: string | null;
  date: Date | null;
  /** CBU de destino elegido (ver seleccion en analyzeReceipt). */
  cbu: string | null;
  /** Todos los CBU hallados: un comprobante trae origen Y destino. */
  cbus: string[];
  rawText: string;
}

export interface ScoreRow {
  key: string;
  value: string;
  ok: boolean;
  warn: boolean;
}

export interface ReceiptAnalysis {
  parsed: ParsedReceipt;
  /** 0 a 100 */
  score: number;
  flags: string[];
  rows: ScoreRow[];
  amountMatches: boolean;
  /** true si el monto leido difiere del esperado: rechazo directo. */
  rejected: boolean;
}

export interface SellerBankData {
  holder?: string | null;
  cuit?: string | null;
  cbu?: string | null;
  alias?: string | null;
}

// ─────────────────── Expresiones regulares ───────────────────

/**
 * Los homebanking argentinos (Galicia, Santander, BNA, Brubank, Ualá,
 * Mercado Pago) tienen formatos distintos. Buscamos por etiqueta y,
 * si no aparece, caemos a cualquier "$ 12.345,67" del documento.
 */
const AMOUNT_LABELED =
  /(?:importe|monto|total|transferiste|enviaste|valor)[^\d$]{0,20}\$?\s*([\d.,]{4,})/gi;
const AMOUNT_LOOSE = /\$\s*([\d.,]{4,})/g;

/** CUIT/CUIL: 2 digitos + 8 + 1, con o sin separadores. */
const CUIT_REGEX = /\b(\d{2})[\s.-]?(\d{8})[\s.-]?(\d)\b/;

const OPERATION_REGEX =
  /(?:n[uú]mero de operaci[oó]n|nro\.?\s*de\s*operaci[oó]n|n[°º]\s*operaci[oó]n|operaci[oó]n|comprobante|c[oó]digo de transferencia|id de operaci[oó]n)\s*[:#nN°º]*\s*([A-Z0-9-]{6,30})/i;

const DATE_REGEX = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/;
/** Global: un comprobante trae el CBU de origen Y el de destino. */
const CBU_REGEX = /\b(\d{22})\b/g;

// ─────────────────────────── Parseo ───────────────────────────

/**
 * Extrae los datos de un texto plano.
 * Exportada aparte de la lectura del archivo para poder testearla con
 * strings reales de cada banco sin necesitar PDFs.
 */
export function parseReceiptText(rawText: string): ParsedReceipt {
  const flat = rawText.replace(/\s+/g, ' ');

  // ── Montos ──
  const amounts = new Set<number>();

  AMOUNT_LABELED.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = AMOUNT_LABELED.exec(flat)) !== null) {
    const cents = parseArsToCents(match[1] ?? '');
    // Descartamos ruido: menos de $100 no es una compra de cosplay
    if (cents !== null && cents >= 10_000) amounts.add(cents);
  }

  AMOUNT_LOOSE.lastIndex = 0;
  while ((match = AMOUNT_LOOSE.exec(flat)) !== null) {
    const cents = parseArsToCents(match[1] ?? '');
    if (cents !== null && cents >= 10_000) amounts.add(cents);
  }

  const candidateAmounts = [...amounts].sort((a, b) => b - a);

  // ── CUIT ──
  const cuitMatch = CUIT_REGEX.exec(flat);
  const cuit = cuitMatch ? `${cuitMatch[1]}-${cuitMatch[2]}-${cuitMatch[3]}` : null;

  // ── Numero de operacion ──
  const opMatch = OPERATION_REGEX.exec(flat);
  const operationNumber = opMatch?.[1]?.trim() ?? null;

  // ── Fecha ──
  let date: Date | null = null;
  const dateMatch = DATE_REGEX.exec(flat);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const rawYear = dateMatch[3] ?? '';
    const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  // ── CBU ──
  // Un comprobante trae al menos dos: el de origen y el de destino.
  // Tomar el primero es un error: casi siempre es el del comprador.
  // Recolectamos todos y la eleccion final la hace analyzeReceipt,
  // que si sabe cual es el CBU del vendedor.
  const cbus: string[] = [];
  CBU_REGEX.lastIndex = 0;
  let cbuMatch: RegExpExecArray | null;
  while ((cbuMatch = CBU_REGEX.exec(flat)) !== null) {
    const value = cbuMatch[1];
    if (value && !cbus.includes(value)) cbus.push(value);
  }
  // Por defecto el ultimo: el destino suele venir despues del origen.
  const cbu = cbus.length > 0 ? (cbus[cbus.length - 1] ?? null) : null;

  return {
    amount: candidateAmounts[0] ?? null,
    candidateAmounts,
    cuit,
    operationNumber,
    date,
    cbu,
    cbus,
    rawText: rawText.slice(0, 5000), // recortamos para no inflar la fila
  };
}

// ─────────────────────────── Triage ───────────────────────────

/** Tolerancia: 1% del monto o $500, lo que sea mayor. */
function withinTolerance(expected: number, found: number): boolean {
  const tolerance = Math.max(Math.round(expected * 0.01), 50_000);
  return Math.abs(expected - found) <= tolerance;
}

function digitsOnly(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

export interface AnalyzeInput {
  parsed: ParsedReceipt;
  /** Monto esperado, en centavos. */
  expectedAmount: number;
  seller: SellerBankData;
  /** De donde salio el texto. Define la penalizacion de confianza. */
  source: 'PDF_TEXT' | 'SERVER_OCR' | 'CLIENT_OCR' | 'NONE';
}

/**
 * Puntua el comprobante y arma los motivos.
 * No decide el estado final: eso lo hace la Server Action, que ademas
 * consulta duplicados en base y respeta la politica de revision manual.
 *
 * Reparto de puntos: monto 45, CUIT 20, operacion 15, fecha 12, CBU 8.
 */
export function analyzeReceipt({
  parsed,
  expectedAmount,
  seller,
  source,
}: AnalyzeInput): ReceiptAnalysis {
  const flags: string[] = [];
  let score = 0;

  // ── Monto (45) ──
  const matched = parsed.candidateAmounts.find((c) => withinTolerance(expectedAmount, c));
  const amountMatches = matched !== undefined;

  if (amountMatches) {
    score += 45;
  } else if (parsed.amount === null) {
    flags.push('No se pudo leer ningun monto en el comprobante.');
  } else {
    flags.push(
      `El monto leido (${formatCents(parsed.amount)}) no coincide con ${formatCents(expectedAmount)}.`,
    );
  }

  // ── CUIT (20) ──
  const cuitOk =
    Boolean(parsed.cuit) &&
    Boolean(seller.cuit) &&
    digitsOnly(parsed.cuit) === digitsOnly(seller.cuit);

  if (cuitOk) {
    score += 20;
  } else if (!seller.cuit) {
    flags.push('El vendedor todavia no cargo su CUIT: no se pudo verificar el destinatario.');
  } else if (!parsed.cuit) {
    flags.push('No se encontro el CUIT del destinatario.');
  } else {
    flags.push('El CUIT del comprobante no coincide con el del vendedor.');
  }

  // ── Numero de operacion (15) ──
  if (parsed.operationNumber) {
    score += 15;
  } else {
    flags.push('No se encontro numero de operacion.');
  }

  // ── Fecha reciente (12) ──
  let dateOk = false;
  if (parsed.date) {
    const days = (Date.now() - parsed.date.getTime()) / 86_400_000;
    dateOk = days >= -1 && days <= 7;
    if (dateOk) score += 12;
    else flags.push('La fecha del comprobante no es de los ultimos 7 dias.');
  } else {
    flags.push('No se encontro la fecha de la operacion.');
  }

  // ── CBU (8) ──
  // Buscamos el CBU del vendedor entre TODOS los detectados, no solo
  // el primero: el comprobante lista origen y destino, y cual va
  // primero depende del banco.
  const sellerCbuDigits = digitsOnly(seller.cbu);
  const matchedCbu = sellerCbuDigits
    ? parsed.cbus.find((c) => digitsOnly(c) === sellerCbuDigits)
    : undefined;
  const cbuOk = matchedCbu !== undefined;
  if (cbuOk) score += 8;

  // ── Penalizacion por origen del texto ──
  if (source === 'CLIENT_OCR') {
    // El texto vino del navegador del comprador: podria estar fabricado.
    score = Math.round(score * 0.7);
    flags.push('El texto se leyo en el navegador del comprador: requiere revision del vendedor.');
  } else if (source === 'SERVER_OCR') {
    score = Math.round(score * 0.9);
    flags.push('Se leyo por OCR: conviene una revision visual.');
  } else if (source === 'NONE') {
    score = 0;
    flags.push('No se pudo extraer texto del archivo.');
  }

  const rows: ScoreRow[] = [
    {
      key: 'CUIT',
      value: parsed.cuit ?? 'no detectado',
      ok: cuitOk,
      warn: !parsed.cuit,
    },
    {
      key: 'Monto',
      value: parsed.amount !== null ? formatCents(parsed.amount) : 'no detectado',
      ok: amountMatches,
      warn: parsed.amount === null,
    },
    {
      key: 'Fecha',
      value: parsed.date ? parsed.date.toLocaleDateString('es-AR') : 'no detectada',
      ok: dateOk,
      warn: !parsed.date,
    },
    {
      key: 'Operacion',
      value: parsed.operationNumber ?? 'no detectada',
      ok: Boolean(parsed.operationNumber),
      warn: !parsed.operationNumber,
    },
    {
      key: 'CBU destino',
      value: matchedCbu
        ? `...${matchedCbu.slice(-6)}`
        : parsed.cbu
          ? `...${parsed.cbu.slice(-6)} (no coincide)`
          : 'no detectado',
      ok: cbuOk,
      warn: parsed.cbus.length === 0,
    },
    {
      key: 'Fuente',
      value:
        source === 'PDF_TEXT'
          ? 'texto PDF'
          : source === 'SERVER_OCR'
            ? 'OCR servidor'
            : source === 'CLIENT_OCR'
              ? 'OCR navegador'
              : 'sin lectura',
      ok: source === 'PDF_TEXT',
      warn: source !== 'PDF_TEXT',
    },
  ];

  // Un monto legible que NO coincide es rechazo directo.
  const rejected = parsed.amount !== null && !amountMatches;

  return {
    parsed,
    score: Math.max(0, Math.min(score, 100)),
    flags,
    rows,
    amountMatches,
    rejected,
  };
}

/** SHA-256 del archivo, para detectar reenvios del mismo comprobante. */
export function hashBuffer(buffer: Buffer | ArrayBuffer): string {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return createHash('sha256').update(buf).digest('hex');
}

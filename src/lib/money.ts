/**
 * Helpers de dinero. Todo el sistema trabaja en CENTAVOS (Int).
 * Nunca hacer aritmetica de plata con floats.
 */

/** 4500000 => "$45.000" */
export function formatCents(cents: number, withDecimals = false): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(cents / 100);
}

/** 45000 (pesos que escribe el vendedor) => 4500000 (centavos) */
export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100);
}

/** 4500000 => 45000 */
export function centsToPesos(cents: number): number {
  return cents / 100;
}

/**
 * Convierte un monto en formato argentino a centavos.
 * Acepta: "89.500,00" | "$ 89.500" | "89500,50" | "ARS 89.500,00"
 *
 * El caso ambiguo es "1.500": el punto es separador de miles, no
 * decimal. Se resuelve por la longitud del ultimo grupo.
 */
export function parseArsToCents(raw: string): number | null {
  const cleaned = String(raw).replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return null;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized: string;

  if (hasComma && hasDot) {
    // "89.500,00" -> puntos son miles, coma es decimal
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.');
  } else if (hasDot) {
    const parts = cleaned.split('.');
    const last = parts[parts.length - 1] ?? '';
    // "1.500" o "1.500.000" -> miles. "1500.50" -> decimal ingles.
    normalized = last.length === 3 && parts.length > 1 ? cleaned.replace(/\./g, '') : cleaned;
  } else {
    normalized = cleaned;
  }

  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

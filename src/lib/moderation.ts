/**
 * ═══════════════════════════════════════════════════════════════
 * MODERACION "ZONA ZERO FUNAS"
 * ═══════════════════════════════════════════════════════════════
 *
 * Objetivo: sacar del feed publico los escraches y las acusaciones
 * contra personas identificables, y derivarlos al Centro de Disputas
 * donde se pueden resolver de verdad.
 *
 * NO es censura de la queja: es cambiarle el canal. Por eso, cuando
 * bloqueamos, arrastramos el texto original al formulario de disputa.
 *
 * DOS CAPAS, porque una lista plana de palabras no alcanza:
 *
 *   Capa 1 — Terminos de escrache explicitos ("funa", "no le compren").
 *            Bloqueo directo, no admiten lectura inocente.
 *
 *   Capa 2 — Acusacion grave + senalamiento identificable en el mismo
 *            texto. Es el patron real de una funa aunque no use la
 *            palabra. Sin senalamiento, "es un robo lo que cobran por
 *            la tela" es conversacion legitima y debe pasar.
 *
 * LIMITACION CONOCIDA, documentada a proposito:
 * ningun sistema de regex resuelve esto del todo. Alguien decidido
 * escribe "la persona que todos sabemos" y pasa. Esto funciona como
 * friccion y como declaracion de politica, no como muro. La denuncia
 * humana sigue siendo necesaria.
 */

export interface ModerationResult {
  /** true si el contenido puede publicarse */
  allowed: boolean;
  /** Motivo legible para mostrarle al usuario. null si esta permitido. */
  reason: string | null;
  /** Etiqueta interna para medir falsos positivos despues. */
  rule: 'FUNA_TERM' | 'ACCUSATION_TARGETED' | 'ACCUSATION_LOOSE' | 'PERSONAL_DATA' | null;
}

const ALLOWED: ModerationResult = { allowed: true, reason: null, rule: null };

/** Capa 1: escrache explicito. */
const FUNA_TERMS: readonly string[] = [
  'funa',
  'funar',
  'funado',
  'funada',
  'escrache',
  'escrachar',
  'escrachado',
  'no le compren',
  'no les compren',
  'no le compres',
  'nadie le compre',
  'es un estafador',
  'es una estafadora',
  'son estafadores',
  'cuidado con esta persona',
  'cuidado con este vendedor',
  'cuidado con esta vendedora',
  'aviso a todos',
  'pasen dato',
  'para que todos sepan',
  'lista negra',
  'boicot',
];

/** Capa 2a: acusaciones graves. */
const ACCUSATION_WORDS: readonly string[] = [
  'estafa',
  'estafo',
  'ladron',
  'ladrona',
  'chorro',
  'chorra',
  'rata',
  'mentiroso',
  'mentirosa',
  'garca',
  'garco',
  'trucho',
  'trucha',
  'me robo',
  'no me devolvio',
  'me clavo',
  'sinverguenza',
  'careta',
  'chanta',
];

/** Capa 2b: marcadores de que la acusacion apunta a alguien concreto. */
const TARGET_MARKERS: readonly string[] = [
  '@',
  'la cuenta de',
  'el perfil de',
  'la tienda de',
  'se llama',
];

const TARGET_REGEX =
  /\b(el|la)\s+(vendedor|vendedora|tienda|cosmaker|wigmaker|chica|chico|pibe|piba|mina|tipo)\b/;

/** Telefono o documento de terceros expuesto. */
const PHONE_REGEX = /\b\d{2,4}[\s-]?\d{6,8}\b/;
const PHONE_CONTEXT = /(telefono|celular|numero|whatsapp|wsp|wpp)/;

/**
 * Normaliza para comparar: minusculas y sin acentos.
 * Sin esto, "Estafó" no matchea con "estafo".
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Evalua un texto antes de publicarlo.
 * Puro y sincrono a proposito: se usa igual en el cliente (aviso en
 * vivo mientras escribe) y en el servidor (decision real).
 */
export function moderate(text: string): ModerationResult {
  if (!text || !text.trim()) return ALLOWED;

  const t = normalize(text);

  // ── Capa 1 ──
  for (const term of FUNA_TERMS) {
    if (t.includes(normalize(term))) {
      return {
        allowed: false,
        rule: 'FUNA_TERM',
        reason:
          'Detectamos un intento de escrache publico. Este tipo de mensaje se resuelve en el Centro de Disputas.',
      };
    }
  }

  // ── Capa 2 ──
  const accusation = ACCUSATION_WORDS.find((w) => t.includes(normalize(w)));
  if (accusation) {
    const hasTarget = TARGET_MARKERS.some((m) => t.includes(normalize(m))) || TARGET_REGEX.test(t);
    if (hasTarget) {
      return {
        allowed: false,
        rule: 'ACCUSATION_TARGETED',
        reason:
          'El mensaje acusa a una persona identificable. Llevalo al Centro de Disputas para que un moderador intervenga.',
      };
    }
    return {
      allowed: false,
      rule: 'ACCUSATION_LOOSE',
      reason:
        'El mensaje contiene una acusacion grave. Si te paso algo con una compra, abri un caso privado.',
    };
  }

  // ── Datos personales de terceros ──
  if (PHONE_REGEX.test(t) && PHONE_CONTEXT.test(t)) {
    return {
      allowed: false,
      rule: 'PERSONAL_DATA',
      reason: 'No publiques telefonos de otras personas. Usa el mensaje privado.',
    };
  }

  return ALLOWED;
}

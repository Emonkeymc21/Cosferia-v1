/** Convierte un titulo en slug URL-safe, sin acentos ni simbolos. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

/** Sufijo corto para garantizar unicidad sin pegarle a la base. */
export function uniqueSlug(text: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  const base = slugify(text) || 'item';
  return `${base}-${suffix}`;
}

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Codigo de orden legible para hablar por chat: "CF-4K2P9M" */
export function generateOrderReference(): string {
  const code = Array.from(
    { length: 6 },
    () => REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)],
  ).join('');
  return `CF-${code}`;
}

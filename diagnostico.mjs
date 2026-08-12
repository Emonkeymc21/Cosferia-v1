/**
 * Diagnostico de entorno para Cosferia.
 * Ejecutar con:  node diagnostico.mjs
 *
 * Verifica que las variables esten presentes y bien formadas ANTES
 * de desplegar. La mayoria de los 500 en produccion son una variable
 * ausente o con comillas de mas.
 */

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_APP_URL',
];

let errores = 0;

console.log('\n=== Variables de entorno ===\n');

for (const name of REQUIRED) {
  const value = process.env[name];

  if (!value) {
    console.log(`  FALTA    ${name}`);
    errores++;
    continue;
  }

  // Error clasico: pegar el valor con comillas incluidas
  if (value.startsWith('"') || value.startsWith("'")) {
    console.log(`  COMILLAS ${name} — sacale las comillas del valor`);
    errores++;
    continue;
  }

  console.log(`  ok       ${name}  (${value.length} chars)`);
}

console.log('\n=== Conexion a Postgres ===\n');

const db = process.env.DATABASE_URL ?? '';
if (db) {
  if (!db.includes('pgbouncer=true')) {
    console.log('  AVISO  DATABASE_URL sin ?pgbouncer=true&connection_limit=1');
    console.log('         Sin eso agotas el pool del plan gratuito de Supabase.');
  }
  if (db.includes(':5432')) {
    console.log('  AVISO  DATABASE_URL usa el puerto 5432 (conexion directa).');
    console.log('         Deberia ser 6543 (pooler). El 5432 va en DIRECT_URL.');
  }
  if (/:\/\/[^:]+:[^@]*[#?&][^@]*@/.test(db)) {
    console.log('  ERROR  La contrasena tiene caracteres sin escapar (# ? &).');
    console.log('         Codificalos: # -> %23, ? -> %3F, & -> %26');
    errores++;
  }
  if (db.includes('[YOUR-PASSWORD]') || db.includes('PASSWORD')) {
    console.log('  ERROR  No reemplazaste el placeholder de la contrasena.');
    errores++;
  }
  if (errores === 0) console.log('  ok     formato de DATABASE_URL correcto');
}

console.log('\n=== Prisma ===\n');

try {
  const { readFileSync } = await import('fs');
  const schema = readFileSync('prisma/schema.prisma', 'utf8');

  if (!schema.includes('binaryTargets')) {
    console.log('  ERROR  Falta binaryTargets en el generator.');
    console.log('         Sin eso, Prisma falla en Netlify/Vercel con un 500.');
    console.log('         Agregar: binaryTargets = ["native", "rhel-openssl-3.0.x"]');
    errores++;
  } else {
    console.log('  ok     binaryTargets presente');
  }
} catch {
  console.log('  AVISO  No encontre prisma/schema.prisma (corriendo desde otra carpeta?)');
}

console.log(
  errores === 0
    ? '\nTodo en orden. Si igual falla, el problema esta en la base o en el codigo.\n'
    : `\n${errores} problema(s) a corregir antes de desplegar.\n`,
);

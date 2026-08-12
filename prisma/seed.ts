/**
 * Seed de datos de prueba.
 * Ejecutar con: npm run db:seed
 *
 * Los usuarios se crean con UUID fijos para poder re-ejecutar el seed
 * sin duplicar. Ojo: estos usuarios NO existen en auth.users de
 * Supabase, asi que no se puede iniciar sesion con ellos. Sirven para
 * poblar el catalogo y que la app no se vea vacia mientras desarrollas.
 */

import { PrismaClient, ProductOrigin, Role } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

interface SeedStore {
  uuid: string;
  userName: string;
  email: string;
  storeName: string;
  type: string;
  zone: string;
  bio: string;
  holder: string;
  cuit: string;
  cbu: string;
  alias: string;
  verified: boolean;
}

const STORES: SeedStore[] = [
  {
    uuid: '11111111-1111-4111-8111-111111111111',
    userName: 'Maria Belen Cerezo',
    email: 'cerezo@demo.cosferia.ar',
    storeName: 'Taller Cerezo',
    type: 'Cosmaker',
    zone: 'Godoy Cruz',
    bio: 'Confeccion de trajes completos y armaduras en EVA foam. Trabajo por encargo con sena del 50% y entregas de 3 a 6 semanas.',
    holder: 'Maria Belen Cerezo',
    cuit: '27-33456789-4',
    cbu: '0720123488000012345678',
    alias: 'taller.cerezo.mza',
    verified: true,
  },
  {
    uuid: '22222222-2222-4222-8222-222222222222',
    userName: 'Lucia Moreno',
    email: 'luna@demo.cosferia.ar',
    storeName: 'Luna Wigs',
    type: 'Wigmaker',
    zone: 'Ciudad de Mendoza',
    bio: 'Pelucas lace front peinadas y selladas a mano. Hago colorimetria a pedido y arreglo pelucas de otras marcas.',
    holder: 'Lucia Moreno',
    cuit: '27-35876543-1',
    cbu: '0000003100098765432101',
    alias: 'luna.wigs.mdz',
    verified: true,
  },
  {
    uuid: '33333333-3333-4333-8333-333333333333',
    userName: 'Diego Andrada',
    email: 'forja@demo.cosferia.ar',
    storeName: 'Forja Andina',
    type: 'Propmaker',
    zone: 'Maipu',
    bio: 'Props, armas y accesorios en foam, PVC y resina. Todo liviano y aprobado para ingresar a convencion.',
    holder: 'Diego Andrada',
    cuit: '20-30123456-7',
    cbu: '1910012345678901234567',
    alias: 'forja.andina.arg',
    verified: true,
  },
  {
    uuid: '44444444-4444-4444-8444-444444444444',
    userName: 'Sofia Ruiz',
    email: 'sofi@demo.cosferia.ar',
    storeName: 'Sofi Cosplay',
    type: 'Vendedor particular',
    zone: 'Guaymallen',
    bio: 'Vendo mis cosplays usados para renovar armario. Todo lavado, planchado y con fotos reales del estado.',
    holder: 'Sofia Ruiz',
    cuit: '27-38765432-9',
    cbu: '0110599520000012345678',
    alias: 'sofi.cosplay.mza',
    verified: false,
  },
  {
    uuid: '55555555-5555-4555-8555-555555555555',
    userName: 'Kitsune Store',
    email: 'kitsune@demo.cosferia.ar',
    storeName: 'Kitsune Store',
    type: 'Tienda',
    zone: 'Las Heras',
    bio: 'Local con stock permanente de accesorios, lentes, medias, guantes y basicos para armar tu cosplay.',
    holder: 'Kitsune Store SRL',
    cuit: '30-71234567-2',
    cbu: '0170099140000067891234',
    alias: 'kitsune.store.mza',
    verified: true,
  },
];

type SeedProduct = [
  title: string,
  pricePesos: number,
  category: string,
  origin: ProductOrigin,
  size: string,
  storeIndex: number,
  description: string,
];

const PRODUCTS: SeedProduct[] = [
  ['Peluca lace front lila 80 cm', 45000, 'Pelucas', ProductOrigin.HANDMADE, '80 cm', 1, 'Base de encaje suizo tenida al tono de piel, fibra resistente al calor hasta 180 grados. Peinada y sellada a mano.'],
  ['Armadura de pecho y hombreras en EVA foam', 178000, 'Trajes', ProductOrigin.HANDMADE, 'A medida', 0, 'Termoformada sobre molde propio, sellada con Plasti Dip y pintada con acrilicos. Correas regulables ocultas.'],
  ['Katana decorativa 100 cm', 32000, 'Props y armas', ProductOrigin.HANDMADE, '100 cm', 2, 'Nucleo de madera balsa con recubrimiento de foam. Liviana, sin filo, apta para convenciones.'],
  ['Vestido gotico victoriano talle M', 28000, 'Trajes', ProductOrigin.USED, 'M', 3, 'Usado dos veces, sin roturas ni manchas. Corset con ballenas, falda con dos enaguas incluidas.'],
  ['Cola y orejas de kitsune', 22000, 'Accesorios', ProductOrigin.HANDMADE, '70 cm', 0, 'Estructura de alambre forrada que permite darle forma. Orejas montadas sobre vincha disimulada.'],
  ['Peluca corta negra restaurada', 12000, 'Pelucas', ProductOrigin.USED, '35 cm', 3, 'Lavada, desenredada y sellada de nuevo. Ideal como base para intervenir.'],
  ['Botas altas blancas talle 38', 25000, 'Calzado', ProductOrigin.USED, '38', 3, 'Cuero sintetico, taco de 5 cm. Suela con desgaste minimo.'],
  ['Alas articuladas de foam 1,60 m', 96000, 'Props y armas', ProductOrigin.HANDMADE, '1,60 m', 2, 'Se abren y cierran con mecanismo de cordon oculto. Arnes de mochila para repartir el peso.'],
  ['Lentes de contacto cosplay sellados', 18000, 'Accesorios', ProductOrigin.IMPORTED, 'Unico', 4, 'Traidos de Corea, sin abrir, con vencimiento 2028. Diametro 14.5 mm.'],
  ['Medias hasta la rodilla, pack de 3', 7500, 'Accesorios', ProductOrigin.NATIONAL, 'Unico', 4, 'Algodon con lycra de produccion nacional. Tres colores lisos.'],
  ['Corset con ballenas de acero talle S', 39000, 'Trajes', ProductOrigin.HANDMADE, 'S', 0, 'Doce ballenas de acero espiralado, entretela rigida y cordon de algodon.'],
  ['Kit de maquillaje FX con protesis', 16500, 'Maquillaje FX', ProductOrigin.NATIONAL, 'Kit', 4, 'Dos protesis de latex sin usar, adhesivo, sellador y paleta de tres tonos.'],
  ['Uniforme escolar estilo anime talle S', 19000, 'Trajes', ProductOrigin.IMPORTED, 'S', 3, 'Comprado en Japon, usado una vez. Blazer, camisa, falda plisada y mono.'],
  ['Baston con luz LED 120 cm', 47000, 'Props y armas', ProductOrigin.HANDMADE, '120 cm', 2, 'Tira LED con pilas y switch escondido en el mango. Se desarma en dos partes.'],
  ['Guantes largos de saten', 9000, 'Accesorios', ProductOrigin.NATIONAL, 'Unico', 4, 'Llegan por encima del codo, con elastico interno. Varios colores.'],
  ['Capa con capucha forrada en saten', 34000, 'Trajes', ProductOrigin.HANDMADE, 'Unico', 0, 'Pano de lana en el exterior y saten en el interior. Cierre con broche metalico.'],
];

const POSTS: Array<[storeIndex: number, tag: string, likes: number, content: string]> = [
  [1, 'Muestro', 41, 'Termine una lace front degrade rosa a violeta, tres semanas de trabajo. La colorimetria en fibra sintetica es otro mundo comparado con pelo natural: hay que sellar cada capa.'],
  [0, 'Consejos', 23, 'Tip para termoformar EVA: si lo calentas con pistola de calor a 30 cm y en movimiento constante, no se te quema la superficie. El error clasico es acercar mucho y quedan burbujas.'],
  [2, 'Materiales', 12, 'Consegui worbla en una ferreteria de Maipu, mucho mas barato que pedirlo a Buenos Aires. Si a alguien le sirve, paso el dato por privado.'],
  [3, 'Busco', 4, 'Busco peluca blanca larga, minimo 70 cm, para un personaje de invierno. Presupuesto hasta 40 lucas. Zona Godoy Cruz o Ciudad.'],
  [4, 'Eventos', 15, 'Abrimos inscripcion para stands del proximo evento. Prioridad para cosmakers de la provincia. Escriban por privado asi les paso el formulario.'],
];

const EVENTS: Array<[title: string, isoDate: string, place: string, description: string]> = [
  [
    'Mendoza Anime Fest',
    '2026-09-12',
    'Nave Cultural, Ciudad de Mendoza',
    'El evento mas grande de la provincia. Feria de artistas, concurso de cosplay individual y grupal, zona de gaming.',
  ],
  [
    'Comic-Con Cuyo',
    '2026-10-04',
    'Espacio Julio Le Parc, Godoy Cruz',
    'Primera edicion regional. Invitados de doblaje, concurso con premio en efectivo y feria de segunda mano.',
  ],
  [
    'Feria Otaku San Rafael',
    '2026-11-22',
    'Centro de Convenciones, San Rafael',
    'Para los del sur provincial. Buena oportunidad para vender usado y encontrarse con la comunidad local.',
  ],
];

async function main() {
  console.log('Sembrando datos de prueba...');

  // ── Usuarios y tiendas ──
  const storeIds: string[] = [];

  for (const s of STORES) {
    await prisma.user.upsert({
      where: { id: s.uuid },
      create: { id: s.uuid, email: s.email, name: s.userName, role: Role.MAKER },
      update: { name: s.userName, role: Role.MAKER },
    });

    const store = await prisma.store.upsert({
      where: { userId: s.uuid },
      create: {
        userId: s.uuid,
        name: s.storeName,
        slug: slugify(s.storeName),
        storeType: s.type,
        zone: s.zone,
        bio: s.bio,
        isVerified: s.verified,
        bankHolder: s.holder,
        bankCuit: s.cuit,
        bankCbu: s.cbu,
        bankAlias: s.alias,
      },
      update: { bio: s.bio, isVerified: s.verified },
    });

    storeIds.push(store.id);
  }

  console.log(`  ${STORES.length} tiendas`);

  // ── Productos ──
  let productCount = 0;
  for (const [title, pricePesos, category, origin, size, storeIndex, description] of PRODUCTS) {
    const storeId = storeIds[storeIndex];
    if (!storeId) continue;

    const slug = slugify(title);
    await prisma.product.upsert({
      where: { slug },
      create: {
        storeId,
        title,
        slug,
        price: pricePesos * 100, // a centavos
        category,
        origin,
        size,
        description,
        zone: STORES[storeIndex]?.zone ?? 'Ciudad de Mendoza',
        images: [],
      },
      update: { price: pricePesos * 100, description },
    });
    productCount += 1;
  }

  console.log(`  ${productCount} productos`);

  // ── Posts del foro ──
  const existingPosts = await prisma.post.count();
  if (existingPosts === 0) {
    for (const [storeIndex, tag, likes, content] of POSTS) {
      const author = STORES[storeIndex];
      if (!author) continue;
      await prisma.post.create({
        data: { authorId: author.uuid, content, tag, likeCount: likes },
      });
    }
    console.log(`  ${POSTS.length} publicaciones del foro`);
  }

  // ── Eventos ──
  for (const [title, isoDate, place, description] of EVENTS) {
    const slug = slugify(title);
    await prisma.event.upsert({
      where: { slug },
      create: {
        title,
        slug,
        date: new Date(`${isoDate}T12:00:00`),
        place,
        description,
        organizerId: STORES[0]?.uuid ?? randomUUID(),
      },
      update: { place, description },
    });
  }

  console.log(`  ${EVENTS.length} eventos`);
  console.log('Listo.');
}

main()
  .catch((error) => {
    console.error('Error sembrando datos:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

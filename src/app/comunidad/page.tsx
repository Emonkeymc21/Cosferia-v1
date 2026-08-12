import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { PostStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PostComposer } from '@/components/forum/PostComposer';
import { PostList, type PostData } from '@/components/forum/PostList';

export const revalidate = 15;

export default async function CommunityPage() {
  const [user, posts] = await Promise.all([
    getCurrentUser(),
    prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: { author: { select: { name: true, role: true } } },
    }),
  ]);

  const serialized: PostData[] = posts.map((p) => ({
    id: p.id,
    content: p.content,
    tag: p.tag,
    likeCount: p.likeCount,
    createdAt: p.createdAt.toISOString(),
    author: { name: p.author.name, role: p.author.role },
  }));

  return (
    <div className="py-6 animate-fade-up">
      <div className="flex items-start gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Comunidad</h1>
          <p className="text-muted mt-1.5 text-[14.5px]">
            Consultas, materiales, coordinacion de eventos.
          </p>
        </div>
        <span className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-mat border border-mathi">
          <span className="w-2 h-2 rounded-full bg-jade" />
          <span className="font-mono text-[10px] uppercase tracking-[.14em] text-jade">
            Zona Zero Funas
          </span>
        </span>
      </div>

      {/* Politica */}
      <div className="mt-5 bg-void2 hairline rounded-2xl p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-jade shrink-0 mt-0.5" />
        <div className="text-[13px] leading-relaxed">
          <p className="font-semibold text-[13.5px]">Aca no se hacen funas</p>
          <p className="text-muted mt-1">
            Si tenes un problema con una compra o una persona, el foro no es el lugar: se resuelve en
            el Centro de Disputas, en privado y con moderacion. Los mensajes que apuntan contra
            alguien se bloquean antes de publicarse y te derivamos ahi con el texto ya cargado.
          </p>
        </div>
      </div>

      {user ? (
        <div className="mt-5">
          <PostComposer userInitial={user.name.charAt(0).toUpperCase()} />
        </div>
      ) : (
        <div className="mt-5 bg-void2 hairline rounded-2xl p-5 text-center">
          <p className="text-[14px]">Ingresá para participar de la comunidad.</p>
          <Link
            href="/login?next=/comunidad"
            className="inline-block mt-3 px-5 py-2.5 rounded-xl bg-chalk text-void font-bold text-[13.5px]"
          >
            Ingresar
          </Link>
        </div>
      )}

      <div className="mt-5 pb-10">
        <PostList posts={serialized} />
      </div>
    </div>
  );
}

'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Heart } from 'lucide-react';
import { togglePostLike } from '@/app/actions/community';
import { ROLE_LABELS } from '@/lib/constants';
import type { Role } from '@prisma/client';

export interface PostData {
  id: string;
  content: string;
  tag: string;
  likeCount: number;
  createdAt: string;
  author: { name: string; role: Role };
}

/** Formatea la antiguedad en lenguaje natural rioplatense. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'recien';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} dias`;
  return new Date(iso).toLocaleDateString('es-AR');
}

export function PostList({ posts }: { posts: PostData[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function like(postId: string) {
    startTransition(async () => {
      await togglePostLike(postId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <article key={post.id} className="bg-void2 hairline rounded-2xl p-4">
          <div className="flex gap-3">
            <span className="w-9 h-9 rounded-full bg-chalk text-void grid place-items-center text-[12px] font-extrabold shrink-0">
              {post.author.name.charAt(0).toUpperCase()}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[13.5px]">{post.author.name}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-void3 text-muted">
                  {ROLE_LABELS[post.author.role]}
                </span>
                <span className="font-mono text-[10px] text-muted">{timeAgo(post.createdAt)}</span>
                <span className="ml-auto font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded-md bg-void3 text-muted">
                  {post.tag}
                </span>
              </div>

              <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-line">{post.content}</p>

              <div className="mt-3 flex items-center gap-4">
                <button
                  onClick={() => like(post.id)}
                  className="flex items-center gap-1.5 text-muted hover:text-chalk transition text-[12.5px]"
                >
                  <Heart className="w-3.5 h-3.5" />
                  {post.likeCount}
                </button>
                <span className="font-mono text-[10px] text-jade flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Moderado
                </span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

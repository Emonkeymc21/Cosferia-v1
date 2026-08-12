'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Send } from 'lucide-react';
import { createPost } from '@/app/actions/community';
import { moderate } from '@/lib/moderation';
import { useToast } from '@/components/ui/Toast';
import { POST_TAGS } from '@/lib/constants';
import { DisputeModal } from './DisputeModal';

/**
 * Composer del foro con moderacion Zero Funas.
 *
 * La moderacion corre en dos momentos:
 *   1. Mientras escribe (aca, en el cliente) para dar aviso preventivo.
 *      Es UX: te avisa antes de que apretes publicar.
 *   2. Al publicar (en el servidor) porque es la unica decision que
 *      no se puede saltear desactivando JavaScript.
 */
export function PostComposer({ userInitial }: { userInitial: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [content, setContent] = useState('');
  const [tag, setTag] = useState<(typeof POST_TAGS)[number]>('General');
  const [liveWarning, setLiveWarning] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<{ reason: string; text: string } | null>(null);

  function onChange(value: string) {
    setContent(value);
    const verdict = moderate(value);
    setLiveWarning(verdict.allowed ? null : verdict.reason);
  }

  function submit() {
    if (!content.trim()) return;

    startTransition(async () => {
      const result = await createPost({ content, tag });

      if (!result.ok) {
        toast(result.error, 'error');
        return;
      }

      if ('blocked' in result.data && result.data.blocked) {
        // No se publico: derivamos al canal privado con el texto original.
        // Si le cerras la puerta sin ofrecerle salida, se va a Instagram
        // a hacer la funa igual.
        setBlocked({ reason: result.data.reason, text: result.data.originalText });
        toast('Publicacion bloqueada por la politica Zero Funas', 'error');
        return;
      }

      setContent('');
      setLiveWarning(null);
      toast('Publicado en la comunidad');
      router.refresh();
    });
  }

  return (
    <>
      <div className="bg-void2 hairline rounded-2xl p-4">
        <div className="flex gap-3">
          <span className="w-9 h-9 rounded-full bg-chalk text-void grid place-items-center text-[12px] font-extrabold shrink-0">
            {userInitial}
          </span>

          <div className="flex-1 min-w-0">
            <textarea
              value={content}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Conta algo, pregunta por materiales, busca referencias..."
              className={`w-full bg-void rounded-xl px-3.5 py-3 text-[14px] outline-none resize-y border transition ${
                liveWarning ? 'border-chalk' : 'border-line focus:border-chalk'
              }`}
            />

            {liveWarning && (
              <div className="mt-2 p-3 rounded-xl bg-chalk/10 border border-chalk/40 animate-fade-up">
                <p className="text-[12.5px] font-semibold text-chalk flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Esto no se va a poder publicar
                </p>
                <p className="text-[12px] text-muted mt-1">{liveWarning}</p>
              </div>
            )}

            <div className="flex items-center gap-2 mt-2.5">
              <span className="font-mono text-[10px] text-muted">{content.length}/600</span>

              <select
                value={tag}
                onChange={(e) => setTag(e.target.value as (typeof POST_TAGS)[number])}
                aria-label="Etiqueta"
                className="ml-auto bg-void hairline rounded-lg px-2.5 py-2 text-[12px] outline-none focus:border-chalk"
              >
                {POST_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <button
                onClick={submit}
                disabled={!content.trim() || isPending}
                className="px-4 py-2 rounded-lg bg-chalk text-void font-bold text-[13px] hover:bg-chalkd transition disabled:opacity-40 flex items-center gap-1.5"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Publicar
              </button>
            </div>
          </div>
        </div>
      </div>

      {blocked && (
        <DisputeModal
          initialType="Conducta inapropiada de un usuario"
          blockedText={blocked.text}
          reason={blocked.reason}
          onClose={() => {
            setBlocked(null);
            setContent('');
            setLiveWarning(null);
          }}
        />
      )}
    </>
  );
}

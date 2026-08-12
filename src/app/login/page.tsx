import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginButtons } from '@/components/layout/LoginButtons';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect(searchParams.next ?? '/');

  return (
    <div className="min-h-[70vh] grid place-items-center py-10 animate-fade-up">
      <div className="w-full max-w-sm">
        <div className="cutting-mat border border-mathi rounded-3xl p-7 text-center">
          <span className="w-12 h-12 rounded-2xl bg-void grid place-items-center border border-mathi mx-auto">
            <span className="font-extrabold text-chalk text-2xl leading-none">C</span>
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Entrá a Cosferia</h1>
          <p className="mt-2 text-[13.5px] text-muted leading-relaxed">
            Con cuenta comprás con comprobante verificado, publicás tus productos y participás de la
            comunidad.
          </p>
        </div>

        {searchParams.error && (
          <p className="mt-4 p-3 rounded-xl bg-chalk/10 border border-chalk/40 text-[12.5px] text-chalk text-center">
            No pudimos completar el ingreso. Proba de nuevo.
          </p>
        )}

        <div className="mt-5">
          <LoginButtons next={searchParams.next ?? '/'} />
        </div>

        <p className="mt-5 text-[11.5px] text-muted text-center leading-relaxed">
          Al ingresar aceptás las reglas de la comunidad, incluida la politica Zero Funas.
        </p>
      </div>
    </div>
  );
}

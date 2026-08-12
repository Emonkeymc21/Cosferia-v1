import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { PublishForm } from '@/components/publish/PublishForm';

export const dynamic = 'force-dynamic';

export default async function PublishPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/publicar');

  // Sin tienda no se puede publicar: primero hay que cargar los datos
  // bancarios, porque sin CBU el comprador no puede pagar.
  if (!user.storeId) {
    return (
      <div className="py-16 max-w-md mx-auto text-center animate-fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight">Activá tu tienda</h1>
        <p className="mt-2 text-muted text-[14.5px] leading-relaxed">
          Para publicar necesitas un nombre de tienda y tus datos bancarios: sin CBU o alias, el
          comprador no tiene a donde transferir.
        </p>
        <Link
          href="/mi-tienda"
          className="inline-block mt-5 px-6 py-3 rounded-xl bg-chalk text-void font-bold text-[14.5px]"
        >
          Crear mi tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6 animate-fade-up">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Publicar producto</h1>
      <p className="text-muted mt-1.5 text-[14.5px]">
        Completa los datos y mira como queda tu publicacion en vivo.
      </p>

      <div className="mt-6">
        <PublishForm storeName={user.storeName ?? 'Tu tienda'} />
      </div>
    </div>
  );
}

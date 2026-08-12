import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { StoreForm } from '@/components/publish/StoreForm';

export const dynamic = 'force-dynamic';

export default async function MyStorePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/mi-tienda');

  const store = user.storeId
    ? await prisma.store.findUnique({ where: { id: user.storeId } })
    : null;

  return (
    <div className="py-6 animate-fade-up max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
        {store ? 'Mi tienda' : 'Activá tu tienda'}
      </h1>
      <p className="text-muted mt-1.5 text-[14.5px]">
        {store
          ? 'Estos datos los ve el comprador cuando va a transferir.'
          : 'Cargá tus datos y tu CBU para poder publicar y cobrar.'}
      </p>

      <div className="mt-6">
        <StoreForm
          initial={
            store
              ? {
                  name: store.name,
                  storeType: store.storeType,
                  zone: store.zone,
                  bio: store.bio,
                  bankHolder: store.bankHolder ?? '',
                  bankCuit: store.bankCuit ?? '',
                  bankCbu: store.bankCbu ?? '',
                  bankAlias: store.bankAlias ?? '',
                  hidePrices: store.hidePrices,
                }
              : null
          }
        />
      </div>
    </div>
  );
}

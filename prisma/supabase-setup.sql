-- ═══════════════════════════════════════════════════════════════
-- COSFERIA — Configuracion de Supabase
-- Ejecutar en el SQL Editor DESPUES de `npx prisma db push`.
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1. TRIGGER: crear la fila en public.users al registrarse
-- ───────────────────────────────────────────────────────────────
-- Sin esto, un usuario que se registra existe en auth.users pero no
-- en nuestra tabla, y toda relacion por FK falla. La app tambien hace
-- un upsert defensivo en getCurrentUser(), pero el trigger es mas
-- rapido y cubre el caso de registro sin abrir la app.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, "avatarUrl", role, "createdAt", "updatedAt")
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    'BUYER',
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────
-- IMPORTANTE: Prisma se conecta con el rol postgres y por lo tanto
-- IGNORA estas policies. La autorizacion real de la app vive en las
-- Server Actions. RLS es la segunda linea de defensa: protege contra
-- el acceso directo con la anon key desde el navegador.

alter table public.users            enable row level security;
alter table public.stores           enable row level security;
alter table public.products         enable row level security;
alter table public.orders           enable row level security;
alter table public.receipts         enable row level security;
alter table public.posts            enable row level security;
alter table public.post_likes       enable row level security;
alter table public.events           enable row level security;
alter table public.event_photos     enable row level security;
alter table public.event_attendees  enable row level security;
alter table public.disputes         enable row level security;

-- ── Perfiles: publicos para leer, propios para escribir ──
create policy "users_select_all" on public.users
  for select using (true);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- ── Tiendas: publicas ──
create policy "stores_select_all" on public.stores
  for select using (true);
create policy "stores_write_own" on public.stores
  for all using (auth.uid() = "userId");

-- ── Productos: publicos ──
create policy "products_select_all" on public.products
  for select using (true);
create policy "products_write_own" on public.products
  for all using (
    exists (
      select 1 from public.stores s
      where s.id = "storeId" and s."userId" = auth.uid()
    )
  );

-- ── Ordenes: solo comprador y vendedor ──
create policy "orders_select_parties" on public.orders
  for select using (
    auth.uid() = "buyerId"
    or exists (
      select 1 from public.stores s
      where s.id = "sellerStoreId" and s."userId" = auth.uid()
    )
  );

-- ── Comprobantes: contienen CUIT y CBU. Solo las partes. ──
create policy "receipts_select_parties" on public.receipts
  for select using (
    exists (
      select 1 from public.orders o
      left join public.stores s on s.id = o."sellerStoreId"
      where o.id = "orderId"
        and (o."buyerId" = auth.uid() or s."userId" = auth.uid())
    )
  );

-- ── Foro: solo se ven los publicados ──
create policy "posts_select_published" on public.posts
  for select using (status = 'PUBLISHED' or auth.uid() = "authorId");
create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = "authorId");

create policy "likes_select_all" on public.post_likes
  for select using (true);
create policy "likes_write_own" on public.post_likes
  for all using (auth.uid() = "userId");

-- ── Eventos: publicos ──
create policy "events_select_all" on public.events
  for select using (true);
create policy "event_photos_select_all" on public.event_photos
  for select using (true);
create policy "event_photos_write_own" on public.event_photos
  for all using (auth.uid() = "uploaderId");
create policy "attendees_select_all" on public.event_attendees
  for select using (true);
create policy "attendees_write_own" on public.event_attendees
  for all using (auth.uid() = "userId");

-- ── Disputas: PRIVADAS. Solo el autor. ──
create policy "disputes_select_own" on public.disputes
  for select using (auth.uid() = "authorId");
create policy "disputes_insert_own" on public.disputes
  for insert with check (auth.uid() = "authorId");

-- ───────────────────────────────────────────────────────────────
-- 3. STORAGE
-- ───────────────────────────────────────────────────────────────
-- Dos buckets publicos y uno privado. Un comprobante tiene CUIT, CBU
-- y montos: nunca puede quedar accesible por URL adivinable.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('products', 'products', true,  15728640),  -- 15 MB
  ('events',   'events',   true,  15728640),
  ('receipts', 'receipts', false, 15728640)
on conflict (id) do nothing;

-- Lectura publica de fotos
create policy "public_read_products" on storage.objects
  for select using (bucket_id = 'products');
create policy "public_read_events" on storage.objects
  for select using (bucket_id = 'events');

-- Subida solo con sesion
create policy "auth_upload_products" on storage.objects
  for insert with check (bucket_id = 'products' and auth.role() = 'authenticated');
create policy "auth_upload_events" on storage.objects
  for insert with check (bucket_id = 'events' and auth.role() = 'authenticated');

-- Los comprobantes NO tienen policy de lectura publica a proposito:
-- se leen unicamente con URL firmada generada por el service role.

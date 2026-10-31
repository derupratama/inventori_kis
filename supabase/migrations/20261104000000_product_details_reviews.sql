-- Additive product details, private product photos, and one private review per product/user.
-- Existing products and diary history are retained; legacy category remains supported.
begin;

alter table public.products
  add column if not exists category_group text,
  add column if not exists product_type text,
  add column if not exists purchase_date date,
  add column if not exists usage_time text[] not null default '{}'::text[],
  add column if not exists usage_frequency text,
  add column if not exists usage_amount text,
  add column if not exists usage_notes text,
  add column if not exists product_status text,
  add column if not exists image_path text;

alter table public.routines add column if not exists archived_at timestamptz;
drop index if exists public.routines_unique_standard_kind_idx;
create unique index routines_unique_standard_kind_idx
  on public.routines (user_id, kind)
  where kind in ('morning', 'evening') and archived_at is null;

do $product_checks$
begin
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.products'::regclass and conname = 'products_category_group_valid') then
    alter table public.products add constraint products_category_group_valid check (category_group is null or category_group in ('skincare', 'makeup'));
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.products'::regclass and conname = 'products_status_valid') then
    alter table public.products add constraint products_status_valid check (product_status is null or product_status in ('unused', 'in_use', 'finished', 'expired'));
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.products'::regclass and conname = 'products_usage_time_valid') then
    alter table public.products add constraint products_usage_time_valid check (usage_time <@ array['morning', 'evening']::text[]);
  end if;
end;
$product_checks$;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null,
  rating smallint not null check (rating between 1 and 10),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_reviews_product_owner_fk foreign key (product_id, user_id)
    references public.products(id, user_id) on delete cascade,
  constraint product_reviews_one_per_owner_key unique (product_id, user_id),
  constraint product_reviews_text_length check (review is null or char_length(review) <= 5000)
);
create index if not exists product_reviews_user_idx on public.product_reviews(user_id);
drop trigger if exists product_reviews_set_updated_at on public.product_reviews;
create trigger product_reviews_set_updated_at before update on public.product_reviews
  for each row execute function public.set_updated_at();

alter table public.product_reviews enable row level security;
revoke all on table public.product_reviews from public, anon, authenticated;
grant select, insert, update, delete on table public.product_reviews to authenticated;
drop policy if exists product_reviews_select_own on public.product_reviews;
create policy product_reviews_select_own on public.product_reviews for select to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));
drop policy if exists product_reviews_insert_own on public.product_reviews;
create policy product_reviews_insert_own on public.product_reviews for insert to authenticated
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));
drop policy if exists product_reviews_update_own on public.product_reviews;
create policy product_reviews_update_own on public.product_reviews for update to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()))
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));
drop policy if exists product_reviews_delete_own on public.product_reviews;
create policy product_reviews_delete_own on public.product_reviews for delete to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

-- Private bucket: path format is <auth.uid()>/<random-file-name>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
drop policy if exists product_images_select_own on storage.objects;
create policy product_images_select_own on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists product_images_insert_own on storage.objects;
create policy product_images_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists product_images_update_own on storage.objects;
create policy product_images_update_own on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists product_images_delete_own on storage.objects;
create policy product_images_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

notify pgrst, 'reload schema';

commit;

-- se-math — skema Supabase. Jalankan di dashboard project coaching-math:
-- SQL Editor -> New query -> paste -> Run. Aman dijalankan ulang.
--
-- Prasyarat: `admin.sql` dari coaching-math sudah pernah dijalankan di
-- project ini (fungsi public.is_admin() harus sudah ada). se-math pakai
-- project + auth + admin yang SAMA — tabelnya saja yang di-prefix `se_`.

create table if not exists public.se_hyperlist (
  id         uuid primary key default gen_random_uuid(),
  kode       text not null default '',
  topik      text not null default '',
  subtopik   text not null default '',
  link       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Tanpa unique constraint di `kode`: data sumber punya kode kembar /
-- rusak (mis. "TB_V1"). `id` surrogate yang jadi kunci.
create index if not exists se_hyperlist_topik_idx on public.se_hyperlist (topik);
create index if not exists se_hyperlist_kode_idx  on public.se_hyperlist (kode);

alter table public.se_hyperlist enable row level security;

grant select on public.se_hyperlist to anon, authenticated;
grant insert, update, delete on public.se_hyperlist to authenticated;
grant all on public.se_hyperlist to service_role;

-- Baca: siapa saja (katalog).
drop policy if exists "se_hyperlist read" on public.se_hyperlist;
create policy "se_hyperlist read"
  on public.se_hyperlist for select using (true);

-- Tulis (insert/update/delete): admin saja — pakai helper yang sudah ada
-- dari admin.sql coaching-math.
drop policy if exists "se_hyperlist write admin" on public.se_hyperlist;
create policy "se_hyperlist write admin"
  on public.se_hyperlist for all
  using (public.is_admin()) with check (public.is_admin());

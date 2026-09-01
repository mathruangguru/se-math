-- se-math — skema Supabase. Jalankan di dashboard project coaching-math:
-- SQL Editor -> New query -> paste -> Run. Aman dijalankan ulang.
--
-- se-math numpang PROJECT + auth (auth.users) coaching-math, tapi punya
-- tabel user & role sendiri: `se_profile`. Login pakai akun Supabase yang
-- sama, tapi cuma yang punya baris di `se_profile` yang boleh masuk app.
-- Tabel se-math semua di-prefix `se_`.

-- ── se_profile: 1 baris per user se-math ─────────────────────────────

create table if not exists public.se_profile (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  first_name text,
  last_name  text,
  role       text not null default 'member'
             check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.se_profile enable row level security;

grant select, insert, update, delete on public.se_profile to authenticated;
grant all on public.se_profile to service_role;

-- Helper: caller admin se-math? SECURITY DEFINER -> query di dalamnya
-- bypass RLS, jadi aman dipakai di policy se_profile sendiri.
create or replace function public.se_is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.se_profile
    where id = auth.uid() and role = 'admin'
  );
$$;
grant execute on function public.se_is_admin() to anon, authenticated;

-- RLS se_profile: user baca baris sendiri; admin baca + tulis semua.
drop policy if exists "se_profile select own" on public.se_profile;
create policy "se_profile select own"
  on public.se_profile for select using (auth.uid() = id);

drop policy if exists "se_profile select admin" on public.se_profile;
create policy "se_profile select admin"
  on public.se_profile for select using (public.se_is_admin());

drop policy if exists "se_profile write admin" on public.se_profile;
create policy "se_profile write admin"
  on public.se_profile for all
  using (public.se_is_admin()) with check (public.se_is_admin());

-- Cegah admin nge-lock diri sendiri: nggak bisa hapus / turunkan role
-- akun sendiri. (Di SQL Editor auth.uid() NULL -> trigger nggak ganggu.)
create or replace function public.se_profile_guard_self()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and auth.uid() = old.id then
    if tg_op = 'DELETE' then
      raise exception 'Nggak bisa hapus akun sendiri.';
    end if;
    if new.role is distinct from old.role then
      new.role := old.role;
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists se_profile_guard_self on public.se_profile;
create trigger se_profile_guard_self
  before update or delete on public.se_profile
  for each row execute function public.se_profile_guard_self();

-- Tambah user se-math dari email (harus sudah punya akun Supabase /
-- coaching-math). Dipanggil dari /admin/users. SECURITY DEFINER supaya
-- bisa baca auth.users; di dalamnya dicek caller = admin se-math.
create or replace function public.se_add_member(
  p_email text,
  p_role  text default 'member'
)
returns public.se_profile
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user auth.users%rowtype;
  v_row  public.se_profile%rowtype;
begin
  if not public.se_is_admin() then
    raise exception 'Bukan admin.' using errcode = '42501';
  end if;
  if p_role not in ('member', 'admin') then
    raise exception 'Role tidak valid.';
  end if;

  select * into v_user
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user.id is null then
    raise exception
      'Email % belum punya akun Supabase (daftar / login coaching-math dulu).',
      p_email;
  end if;

  insert into public.se_profile (id, email, first_name, last_name, role)
  values (
    v_user.id,
    v_user.email,
    nullif(v_user.raw_user_meta_data ->> 'first_name', ''),
    nullif(v_user.raw_user_meta_data ->> 'last_name', ''),
    p_role
  )
  on conflict (id) do update set role = excluded.role
  returning * into v_row;

  return v_row;
end;
$$;
grant execute on function public.se_add_member(text, text) to authenticated;

-- ── se_hyperlist: katalog materi PDF LMS ─────────────────────────────

create table if not exists public.se_hyperlist (
  id         uuid primary key default gen_random_uuid(),
  kode       text not null default '',
  topik      text not null default '',
  subtopik   text not null default '',
  link       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Tanpa unique di `kode`: data sumber punya kode kembar / rusak
-- (mis. "TB_V1"). `id` surrogate yang jadi kunci.
create index if not exists se_hyperlist_topik_idx on public.se_hyperlist (topik);
create index if not exists se_hyperlist_kode_idx  on public.se_hyperlist (kode);

alter table public.se_hyperlist enable row level security;

grant select on public.se_hyperlist to anon, authenticated;
grant insert, update, delete on public.se_hyperlist to authenticated;
grant all on public.se_hyperlist to service_role;

drop policy if exists "se_hyperlist read" on public.se_hyperlist;
create policy "se_hyperlist read"
  on public.se_hyperlist for select using (true);

drop policy if exists "se_hyperlist write admin" on public.se_hyperlist;
create policy "se_hyperlist write admin"
  on public.se_hyperlist for all
  using (public.se_is_admin()) with check (public.se_is_admin());

-- ── Bootstrap admin pertama ─────────────────────────────────────────
-- User-nya harus sudah ada di auth.users (pernah login coaching-math, atau
-- dibuat lewat Authentication -> Users -> Add user). Ganti email, uncomment,
-- Run. auth.uid() NULL di SQL Editor -> trigger guard nggak menghalangi.
--
-- insert into public.se_profile (id, email, first_name, last_name, role)
-- select id, email,
--        nullif(raw_user_meta_data ->> 'first_name', ''),
--        nullif(raw_user_meta_data ->> 'last_name', ''),
--        'admin'
-- from auth.users where lower(email) = lower('kamu@contoh.com')
-- on conflict (id) do update set role = 'admin';
--
-- Setelah punya 1 admin, user berikutnya ditambah dari /admin/users.

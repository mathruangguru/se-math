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

-- Helper: caller punya baris se_profile (member se-math)? SECURITY DEFINER
-- biar aman dipakai di policy se_profile tanpa rekursi RLS.
create or replace function public.se_is_member()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (select 1 from public.se_profile where id = auth.uid());
$$;
grant execute on function public.se_is_member() to anon, authenticated;

-- RLS se_profile: user baca baris sendiri; sesama member se-math boleh
-- saling lihat (buat assignee, dsb); admin baca + tulis semua.
drop policy if exists "se_profile select own" on public.se_profile;
create policy "se_profile select own"
  on public.se_profile for select using (auth.uid() = id);

drop policy if exists "se_profile select admin" on public.se_profile;
create policy "se_profile select admin"
  on public.se_profile for select using (public.se_is_admin());

drop policy if exists "se_profile select member" on public.se_profile;
create policy "se_profile select member"
  on public.se_profile for select using (public.se_is_member());

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

-- ── se_link: kumpulan link ─────────────────────────────────────────
-- Semua user login lihat & klik; tambah/edit/hapus admin saja.

create table if not exists public.se_link (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',
  url         text not null default '',
  description text not null default '',
  category    text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);
create index if not exists se_link_category_idx on public.se_link (category);

alter table public.se_link enable row level security;

grant select on public.se_link to anon, authenticated;
grant insert, update, delete on public.se_link to authenticated;
grant all on public.se_link to service_role;

drop policy if exists "se_link read" on public.se_link;
create policy "se_link read"
  on public.se_link for select using (true);

drop policy if exists "se_link write admin" on public.se_link;
create policy "se_link write admin"
  on public.se_link for all
  using (public.se_is_admin()) with check (public.se_is_admin());

-- ── se_task: board tugas bersama ────────────────────────────────────
-- Semua user login lihat & bisa ubah STATUS. CRUD penuh admin. Assignee
-- BUKAN di sini — dia per-subtask (se_subtask_assignee), direkap ke task.

create table if not exists public.se_task (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  priority    text not null default 'P2'
              check (priority in ('P0', 'P1', 'P2', 'P3', 'P4')),
  status      text not null default 'todo'
              check (status in ('todo', 'doing', 'done')),
  deadline    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);
create index if not exists se_task_status_idx on public.se_task (status);

-- Dulu ada se_task.assignee_id (assignee per-task). Sekarang assignee
-- per-subtask & bisa banyak orang, jadi kolom + RPC lama dibuang.
drop function if exists public.se_task_set_assignee(uuid, uuid);
drop index if exists public.se_task_assignee_idx;
alter table public.se_task drop column if exists assignee_id;

alter table public.se_task enable row level security;

grant select, insert, update, delete on public.se_task to authenticated;
grant all on public.se_task to service_role;

drop policy if exists "se_task read" on public.se_task;
create policy "se_task read"
  on public.se_task for select using (auth.uid() is not null);

drop policy if exists "se_task write admin" on public.se_task;
create policy "se_task write admin"
  on public.se_task for all
  using (public.se_is_admin()) with check (public.se_is_admin());

-- Member (bukan admin) boleh ubah status doang — lewat RPC ini.
create or replace function public.se_task_set_status(p_id uuid, p_status text)
returns public.se_task
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.se_task%rowtype;
begin
  if not exists (select 1 from public.se_profile where id = auth.uid()) then
    raise exception 'Bukan member.' using errcode = '42501';
  end if;
  if p_status not in ('todo', 'doing', 'done') then
    raise exception 'Status tidak valid.';
  end if;

  update public.se_task
     set status = p_status, updated_at = now()
   where id = p_id
   returning * into v_row;

  return v_row;
end;
$$;
grant execute on function public.se_task_set_status(uuid, text) to authenticated;

-- ── se_subtask: checklist di dalam sebuah task ──────────────────────
-- Admin nambah/ubah/hapus; semua member boleh centang (lewat RPC).

create table if not exists public.se_subtask (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.se_task (id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists se_subtask_task_idx on public.se_subtask (task_id);

alter table public.se_subtask enable row level security;

grant select, insert, update, delete on public.se_subtask to authenticated;
grant all on public.se_subtask to service_role;

drop policy if exists "se_subtask read" on public.se_subtask;
create policy "se_subtask read"
  on public.se_subtask for select using (auth.uid() is not null);

drop policy if exists "se_subtask write admin" on public.se_subtask;
create policy "se_subtask write admin"
  on public.se_subtask for all
  using (public.se_is_admin()) with check (public.se_is_admin());

-- Member biasa boleh centang / uncentang doang.
create or replace function public.se_subtask_set_done(p_id uuid, p_done boolean)
returns public.se_subtask
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.se_subtask%rowtype;
begin
  if not exists (select 1 from public.se_profile where id = auth.uid()) then
    raise exception 'Bukan member.' using errcode = '42501';
  end if;
  update public.se_subtask
     set done = p_done
   where id = p_id
   returning * into v_row;
  return v_row;
end;
$$;
grant execute on function public.se_subtask_set_done(uuid, boolean) to authenticated;

-- ── se_subtask_assignee: siapa ngerjain subtask (bisa > 1 orang) ────
-- Assignee task = rekap union dari semua assignee subtask-nya (di klien).

create table if not exists public.se_subtask_assignee (
  subtask_id uuid not null references public.se_subtask (id) on delete cascade,
  person_id  uuid not null references public.se_profile (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subtask_id, person_id)
);
create index if not exists se_subtask_assignee_person_idx
  on public.se_subtask_assignee (person_id);

alter table public.se_subtask_assignee enable row level security;

grant select, insert, update, delete on public.se_subtask_assignee to authenticated;
grant all on public.se_subtask_assignee to service_role;

drop policy if exists "se_subtask_assignee read" on public.se_subtask_assignee;
create policy "se_subtask_assignee read"
  on public.se_subtask_assignee for select using (auth.uid() is not null);

drop policy if exists "se_subtask_assignee write admin" on public.se_subtask_assignee;
create policy "se_subtask_assignee write admin"
  on public.se_subtask_assignee for all
  using (public.se_is_admin()) with check (public.se_is_admin());

-- Member biasa boleh set daftar assignee subtask — lewat RPC ini.
-- p_person_ids = daftar FINAL (replace); yang nggak ada di situ dilepas.
-- null / non-member dibuang. Balikin daftar person_id yang kepasang.
create or replace function public.se_subtask_set_assignees(
  p_subtask_id uuid,
  p_person_ids uuid[]
)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
begin
  if not exists (select 1 from public.se_profile where id = auth.uid()) then
    raise exception 'Bukan member.' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct p), '{}')
    into v_ids
  from unnest(coalesce(p_person_ids, '{}'::uuid[])) as p
  where p is not null
    and exists (select 1 from public.se_profile where id = p);

  delete from public.se_subtask_assignee
   where subtask_id = p_subtask_id
     and not (person_id = any (v_ids));

  insert into public.se_subtask_assignee (subtask_id, person_id)
  select p_subtask_id, p from unnest(v_ids) as p
  on conflict do nothing;

  return v_ids;
end;
$$;
grant execute on function public.se_subtask_set_assignees(uuid, uuid[]) to authenticated;

-- ── se_joke: Jokes Corner (flashcard tebak-tebakan) ────────────────
-- front = tebakan, back = jawaban. Semua member boleh nyumbang; edit /
-- hapus punya sendiri, admin boleh hapus/edit punya siapa aja.

create table if not exists public.se_joke (
  id         uuid primary key default gen_random_uuid(),
  front      text not null default '',
  back       text not null default '',
  created_by uuid references public.se_profile (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists se_joke_created_by_idx on public.se_joke (created_by);

alter table public.se_joke enable row level security;

grant select, insert, update, delete on public.se_joke to authenticated;
grant all on public.se_joke to service_role;

drop policy if exists "se_joke read" on public.se_joke;
create policy "se_joke read"
  on public.se_joke for select using (auth.uid() is not null);

drop policy if exists "se_joke insert own" on public.se_joke;
create policy "se_joke insert own"
  on public.se_joke for insert
  with check (public.se_is_member() and created_by = auth.uid());

drop policy if exists "se_joke update own or admin" on public.se_joke;
create policy "se_joke update own or admin"
  on public.se_joke for update
  using (created_by = auth.uid() or public.se_is_admin())
  with check (created_by = auth.uid() or public.se_is_admin());

drop policy if exists "se_joke delete own or admin" on public.se_joke;
create policy "se_joke delete own or admin"
  on public.se_joke for delete
  using (created_by = auth.uid() or public.se_is_admin());

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

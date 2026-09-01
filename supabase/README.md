# Supabase

se-math numpang **project Supabase coaching-math** (ref `fvepworawhlsghsjhsca`)
buat auth-nya (`auth.users`) — login pakai akun yang sama. Tapi user &
role-nya sendiri di **`se_profile`**: nggak semua user coaching-math punya
akses ke se-math, cuma yang punya baris `se_profile`. Semua tabel di-prefix
`se_`.

## Setup (sekali)

1. **SQL Editor** → jalankan [`se_schema.sql`](./se_schema.sql). Bikin:
   - `se_profile` (`role`: `member` | `admin`) + `se_is_admin()` +
     `se_add_member(email, role)` + trigger `se_profile_guard_self`
   - `se_hyperlist` + RLS (baca publik, tulis `se_is_admin()`)
   - `se_task` + RLS (baca user login, tulis `se_is_admin()`) +
     `se_task_set_status(id, status)` — biar member bisa ubah status doang
   - Aman di-run ulang tiap ada tabel baru.
2. **Bikin admin pertama** — di `se_schema.sql` bagian bawah, uncomment
   blok bootstrap, ganti email (user harus sudah pernah login
   coaching-math / dibuat di Authentication → Users), Run.
3. **Project Settings → API** → salin `Project URL` + `anon` `public` key.
4. Lokal:
   ```bash
   cp .env.example .env
   # isi VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
   npm run dev
   ```
   Tanpa `.env` app fallback baca `public/hyperlist.tsv` (read-only) — tapi
   karena seluruh app di balik login, praktisnya `.env` wajib.

## Deploy (GitHub Pages)

Set di repo **Settings → Secrets and variables → Actions → Variables**:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | anon public key |

`.github/workflows/deploy.yml` step **Build** sudah membaca keduanya lewat
`${{ vars.* }}`. `anon` key aman di frontend (diproteksi RLS).

## Kelola user — `/admin/users`

Admin tambah user dari **email** (harus sudah punya akun Supabase /
coaching-math — se-math nggak bikin akun auth baru). Bisa set role
`member` / `admin`, ganti role, atau cabut akses. Nggak bisa
hapus/turunkan role akun sendiri (trigger `se_profile_guard_self`).

- User login tapi belum ada di `se_profile` → layar "Akun belum terdaftar".
- `member` = bisa buka Dashboard / Task / Hyperlist.
- `admin` = + `/admin/hyperlist` & `/admin/users`.

## Isi data Hyperlist — `/admin/hyperlist`

**Impor massal** → tempel TSV (`KODE ⇥ TOPIK ⇥ SUBTOPIK ⇥ LINK`, satu
baris per materi) → centang **Ganti semua isi tabel** → **Impor**. Format
sama persis dengan `public/hyperlist.tsv`.

## Task — `/task`

Board bersama. Semua user login lihat & bisa ubah **status** (lewat RPC
`se_task_set_status`). Tambah / edit / hapus task cuma admin. Tampilan
List / Tabel / Kanban (pilihan disimpan di `localStorage`).

## Isi

| File | |
| --- | --- |
| `se_schema.sql` | `se_profile` + `se_is_admin()` + `se_add_member()` + guard trigger + `se_hyperlist` + `se_task` + `se_task_set_status()` + RLS |

Kode klien: `src/lib/supabase.js` (client), `src/lib/hyperlist.js`
(list/create/update/delete/bulkCreate), `src/lib/tasks.js`
(list/create/update/delete + `setTaskStatus` rpc), `src/lib/members.js`
(list/add/setRole/remove), `src/lib/auth.js` +
`src/context/AuthProvider.jsx` (session, `se_profile`, role).

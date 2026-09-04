# Supabase

se-math numpang **project Supabase coaching-math** (ref `fvepworawhlsghsjhsca`)
buat auth-nya (`auth.users`) — login pakai akun yang sama. Tapi user &
role-nya sendiri di **`se_profile`**: nggak semua user coaching-math punya
akses ke se-math, cuma yang punya baris `se_profile`. Semua tabel di-prefix
`se_`.

## Setup (sekali)

1. **SQL Editor** → jalankan [`se_schema.sql`](./se_schema.sql). Bikin:
   - `se_profile` (`role`: `member` | `admin`) + `se_is_admin()` +
     `se_is_member()` + `se_add_member(email, role)` + trigger
     `se_profile_guard_self`. Policy `se_profile select member` bikin sesama
     member se-math bisa saling lihat (buat assignee).
   - `se_hyperlist` + RLS (baca publik, tulis `se_is_admin()`)
   - `se_link` + RLS (baca publik, tulis `se_is_admin()`)
   - `se_joke` + RLS — Pojok Jokes. Baca semua yang login; tiap member
     nyumbang joke sendiri (edit/hapus punya sendiri), admin bisa edit/hapus
     punya siapa aja. Murni policy, tanpa RPC.
   - `se_task` + `se_subtask` + `se_subtask_assignee` (assignee per-subtask,
     boleh > 1 orang) + RLS (baca user login, tulis `se_is_admin()`) +
     `se_task_set_status(id, status)` / `se_subtask_set_done(id, done)` /
     `se_subtask_set_assignees(subtask_id, person_ids[])` — biar member bisa
     ubah status / centang / atur assignee subtask doang
   - Aman di-run ulang tiap ada tabel / kolom baru. Re-run juga otomatis
     buang `se_task.assignee_id` lama (assignee sekarang per-subtask).
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
- `member` = bisa buka Dashboard / Task / Hyperlist / Link / Pojok Jokes.
- `admin` = + `/admin/hyperlist`, `/admin/link` & `/admin/users`.

## Isi data Hyperlist — `/admin/hyperlist`

**Impor massal** → tempel TSV (`KODE ⇥ TOPIK ⇥ SUBTOPIK ⇥ LINK`, satu
baris per materi) → centang **Ganti semua isi tabel** → **Impor**. Format
sama persis dengan `public/hyperlist.tsv`.

## Task — `/task`

Board bersama. Semua user login lihat & bisa ubah **status** (RPC
`se_task_set_status`). Tambah / edit / hapus task cuma admin. Tampilan
List / Tabel / Kanban (pilihan disimpan di `localStorage`). Filter per
status & per orang ("Punya saya" / "Belum ada assignee").

Tiap task punya **subtask** (checklist, tabel `se_subtask`): admin
nambah/hapus, semua member boleh centang (`se_subtask_set_done`).

**Assignee ada di subtask, bukan task.** Satu subtask boleh di-assign ke
**lebih dari satu orang** (`se_subtask_assignee`, PK `(subtask_id,
person_id)`). Semua member boleh atur lewat RPC
`se_subtask_set_assignees(subtask_id, person_ids[])` (replace penuh; null /
non-member dibuang). Assignee yang tampil di kartu task = **rekap union**
dari assignee semua subtask-nya (dihitung di klien).

## Isi data Link — `/admin/link`

**Tambah link** (modal): judul + URL (wajib), deskripsi, kategori / grup.
Menu **Link** buat semua user login mengelompokkan link per kategori.

## Pojok Jokes — `/jokes`

Flashcard tebak-tebakan: **depan** = tebakan, **belakang** = jawaban (klik
kartu buat balik). Grid + search + tombol **Acak** yang nyorot satu kartu
random. Semua member boleh **Tambah joke**; edit/hapus joke **punya
sendiri** (admin: punya siapa aja). Gak ada halaman admin terpisah —
kelolanya inline di kartu.

## Isi

| File | |
| --- | --- |
| `se_schema.sql` | `se_profile` + `se_is_admin()` / `se_is_member()` + `se_add_member()` + guard trigger + `se_hyperlist` + `se_link` + `se_joke` + `se_task` / `se_subtask` / `se_subtask_assignee` + `se_task_set_status()` / `se_subtask_set_done()` / `se_subtask_set_assignees()` + RLS |

Kode klien: `src/lib/supabase.js` (client), `src/lib/hyperlist.js`
(list/create/update/delete/bulkCreate), `src/lib/links.js`
(list/create/update/delete), `src/lib/jokes.js` (list/create/update/delete),
`src/lib/tasks.js` (task + subtask + subtask-assignee: list/create/update/delete +
`setTaskStatus` / `setSubtaskDone` / `setSubtaskAssignees` rpc),
`src/lib/people.js` (list orang buat assignee), `src/lib/members.js`
(list/add/setRole/remove), `src/lib/auth.js` +
`src/context/AuthProvider.jsx` (session, `se_profile`, role).

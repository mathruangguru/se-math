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
   - `se_daily_report` + RLS — Manpower Allocation (laporan harian). Member
     isi & baca punya sendiri; admin baca semua. Murni policy, tanpa RPC.
   - `se_leave` + RLS — cuti / sakit / izin. Tabel bareng: semua yang login
     lihat, semua member isi/edit/hapus buat siapa aja.
   - `se_potential_work` + RLS — watch-list kerjaan yang mungkin bakal
     masuk. Tabel bareng: semua yang login lihat, semua member kelola.
   - `se_b2b_project` (kolom `syllabus` = markdown, `category` teks bebas)
     + RLS (baca user login, tulis `se_is_admin()`).
   - `se_b2b_milestone` + RLS — checkpoint progress tiap project (judul +
     target tanggal + tercapai/belum). Baca user login, tulis `se_is_admin()`.
   - `se_b2b_important_date` + RLS — tanggal kunci tiap project (label +
     tanggal + catatan, tanpa status). Baca user login, tulis `se_is_admin()`.
   - `se_syllabus` + RLS — template silabus (markdown), dibikin duluan
     lalu di-insert ke project B2B. Baca user login, tulis `se_is_admin()`.
   - `se_b2b_material` + RLS — katalog bahan ajar B2B (markdown + link
     opsional), berdiri sendiri (nggak terikat project). Baca user login,
     tulis `se_is_admin()`.
   - `se_b2b_question_need` + RLS — kebutuhan soal B2B (topik + jumlah +
     tipe + status + deadline + catatan), list umum nggak terikat project.
     Tabel bareng: semua yang login lihat, semua member isi/edit/hapus.
   - Re-run juga otomatis buang `se_b2b_syllabus` lama (tabel per-topik) —
     silabus sekarang teks markdown di kolom `se_b2b_project.syllabus`.
   - `se_task` (kolom `project_id` opsional → `se_b2b_project`) + `se_subtask`
     + `se_subtask_assignee` (assignee per-subtask,
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
- `member` = bisa buka Dashboard / Task / Potential Work / Manpower /
  B2B Center (empat tab: Deals & Silabus & Bahan Ajar lihat doang kecuali
  status task, Kebutuhan Soal bebas kelola) / Hyperlist / Link / Pojok
  Jokes (di Manpower cuma lihat laporan sendiri).
- `admin` = + rekap semua orang di Manpower, kelola project + milestone +
  tanggal penting + task + silabus + bahan ajar B2B (Kebutuhan Soal sama
  kayak member — bukan admin-only), `/admin/hyperlist`, `/admin/link` &
  `/admin/users`.

## Isi data Hyperlist — `/admin/hyperlist`

**Impor massal** → tempel TSV (`KODE ⇥ TOPIK ⇥ SUBTOPIK ⇥ LINK`, satu
baris per materi) → centang **Ganti semua isi tabel** → **Impor**. Format
sama persis dengan `public/hyperlist.tsv`.

## Task — `/task`

Board bersama. Semua user login lihat & bisa ubah **status** (RPC
`se_task_set_status`). Tambah / edit / hapus task cuma admin. Tampilan
List / Tabel / Kanban (pilihan disimpan di `localStorage`). Filter per
status, per orang ("Punya saya" / "Belum ada assignee"), dan per **project
B2B** (opsional, `se_task.project_id` → `se_b2b_project`). Task yang
kekait ke project nunjukin tag klien-nya (klik → halaman project). Deep
link filter project: `/task?project=<id>`.

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

## Potential Work — `/potential`

Watch-list kerjaan yang **kemungkinan bakal masuk** — biar nggak lupa.
Tiap item: judul + catatan + perkiraan waktu + sumber (teks bebas, mis.
"abis Tryout Ep 3" / "rapat mingguan"). Grid 2 kolom, deskripsi keliat 2
baris — klik kartu buka modal detail. Tabel bareng (`se_potential_work`):
**semua yang login lihat, semua member nambah/edit/hapus**. Terbaru dulu
+ search.

## B2B Center — `/b2b`

Empat tab (segmented control di kanan atas):

- **Deals** — project B2B: klien + **paket yang deal** + **kategori**
  (teks bebas, mis. "Pelatihan Guru") + status (Berjalan / Selesai /
  Batal) + tanggal mulai + catatan. Klik project → halaman detailnya:
  - **Milestone** (`se_b2b_milestone`) — checkpoint progress: judul +
    target tanggal + centang tercapai/belum.
  - **Tanggal penting** (`se_b2b_important_date`) — beda dari milestone,
    cuma label + tanggal + catatan, tanpa status (mis. deadline
    pembayaran, kickoff).
  - **Task** — task dari board `/task` yang `project_id`-nya diset ke
    project ini (lihat section Task di atas); status bisa diubah
    member biasa, CRUD admin, sama kayak di board utama.
  - **Silabus** (markdown, kolom `se_b2b_project.syllabus`) yang
    di-render pakai komponen `Markdown`
    (headers/list & checklist/tabel/blockquote/hr/kode/link/bold/italic/coret/
    **LaTeX** `$x$` inline & `$$x$$` display lewat KaTeX
    — bukan HTML asli, jadi aman dari script nyelip).
- **Silabus** — library template silabus (`se_syllabus`), **isinya
  markdown polos**, dibikin duluan lepas dari deal mana pun. Grid kartu
  (preview isi 3 baris) → klik → halaman detail sendiri (`/b2b/silabus/:id`,
  markdown ke-render). Deep link langsung ke tab list: `/b2b?tab=silabus`.
- **Bahan Ajar** — katalog bahan ajar B2B (`se_b2b_material`), **markdown
  (termasuk LaTeX) + link opsional** (mis. ke Drive/PDF/slide/video), mirip
  Silabus tapi **berdiri sendiri** — bukan diinsert ke project mana pun,
  murni katalog referensi. Grid kartu (link + preview isi 3 baris) → klik →
  halaman detail sendiri (`/b2b/materi/:id`). Deep link: `/b2b?tab=materi`.
- **Kebutuhan Soal** — daftar kebutuhan soal (`se_b2b_question_need`):
  topik/materi + jumlah + tipe soal (teks bebas) + status (Belum / Proses
  / Selesai, bisa diganti langsung di tabel) + deadline + catatan. List
  umum, nggak terikat project. Tabel bareng — **semua yang login lihat,
  semua member isi/edit/hapus** (murni policy, tanpa RPC, sama kayak
  Potential Work). Deep link: `/b2b?tab=soal`.

Di halaman detail sebuah project, admin bisa **"Insert dari silabus"**
(pilih template dari tab Silabus, isinya ditambahin ke bawah silabus yang
ada) atau **"Edit"** (tulis/ubah manual di textarea).

- **Admin**: kelola project + milestone + tanggal penting + task + template
  silabus + bahan ajar (tambah/ubah/hapus) + kelola silabus tiap project.
- **Semua member**: lihat semuanya (read only), kecuali status task (bisa
  diubah semua member, sama kayak board Task) dan **Kebutuhan Soal** (bebas
  tambah/ubah/hapus, sama kayak Potential Work).

## Pojok Jokes — `/jokes`

Flashcard tebak-tebakan: **depan** = tebakan, **belakang** = jawaban (klik
kartu buat balik). Grid + search + tombol **Acak** yang nyorot satu kartu
random. Semua member boleh **Tambah joke**; edit/hapus joke **punya
sendiri** (admin: punya siapa aja). Gak ada halaman admin terpisah —
kelolanya inline di kartu.

## Manpower Allocation — `/manpower`

Laporan harian: tiap entri = tanggal + kegiatan + kategori/stream +
alokasi durasi (jam / menit). Dua mode:

- **Harian** — pilih tanggal (‹ › + "Hari ini"), entri dikelompokkan
  **per orang** (header = total jam). Tambah/edit/hapus di sini.
- **Rekap** — pilih rentang tanggal ("Hari ini" / "7 hari" / "Bulan ini"),
  matriks **orang × kategori** total jam + baris/kolom Total. Entri menit
  dikonversi ke jam.

Tiap member **isi & lihat entri sendiri**; **admin** lihat semua orang
(termasuk rekap). Edit/hapus: punya sendiri atau admin. Murni RLS.

**Cuti / sakit / izin** (`se_leave`, tombol "Catat cuti/izin"): tabel
bareng — **semua yang login lihat**, **semua member bisa isi/edit/hapus
buat siapa aja** (rentang tanggal + catatan). Tampil sebagai panel
"Cuti & izin" di kedua mode.

## Isi

| File | |
| --- | --- |
| `se_schema.sql` | `se_profile` + `se_is_admin()` / `se_is_member()` + `se_add_member()` + guard trigger + `se_hyperlist` + `se_link` + `se_joke` + `se_daily_report` + `se_leave` + `se_potential_work` + `se_syllabus` + `se_b2b_project` (kolom `syllabus` markdown, `category` teks bebas) + `se_b2b_milestone` + `se_b2b_important_date` + `se_b2b_material` + `se_b2b_question_need` + `se_task` (kolom `project_id` opsional → `se_b2b_project`) / `se_subtask` / `se_subtask_assignee` + `se_task_set_status()` / `se_subtask_set_done()` / `se_subtask_set_assignees()` + RLS |

Kode klien: `src/lib/supabase.js` (client), `src/lib/hyperlist.js`
(list/create/update/delete/bulkCreate), `src/lib/links.js`
(list/create/update/delete), `src/lib/jokes.js` (list/create/update/delete),
`src/lib/daily.js` (laporan harian: list/create/update/delete),
`src/lib/leave.js` (cuti/izin: list/create/update/delete),
`src/lib/potential.js` (potential work: list/create/update/delete),
`src/lib/syllabus.js` (template silabus: list/create/update/delete),
`src/lib/materials.js` (bahan ajar B2B: list/create/update/delete),
`src/lib/questionNeeds.js` (kebutuhan soal B2B: list/create/update/delete),
`src/lib/b2b.js` (project B2B: list/create/update/delete +
`updateProjectSyllabus` + milestone: list/create/update/`setMilestoneDone`/delete
+ tanggal penting: list/create/update/delete), `src/components/ui/Markdown.jsx`
(render markdown ringan tanpa dependency),
`src/lib/tasks.js` (task + subtask + subtask-assignee: list/create/update/delete
(`project_id` opsional) + `listTasksByProject` +
`setTaskStatus` / `setSubtaskDone` / `setSubtaskAssignees` rpc),
`src/lib/people.js` (list orang buat assignee), `src/lib/members.js`
(list/add/setRole/remove), `src/lib/auth.js` +
`src/context/AuthProvider.jsx` (session, `se_profile`, role).

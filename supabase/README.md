# Supabase

se-math pakai **project Supabase yang sama dengan coaching-math**
(ref `fvepworawhlsghsjhsca`). Auth, tabel `coaching_profiles`, dan fungsi
`public.is_admin()` dipakai bareng — admin se-math = admin coaching-math,
login pakai akun yang sama. Tabel baru di-prefix `se_`.

## Setup (sekali)

1. **SQL Editor** → jalankan [`se_schema.sql`](./se_schema.sql). Bikin
   `public.se_hyperlist` + RLS (baca publik, tulis `is_admin()`).
2. **Project Settings → API** → salin `Project URL` + `anon` `public` key.
3. Lokal:
   ```bash
   cp .env.example .env
   # isi VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
   npm run dev
   ```
   Tanpa `.env` app fallback baca `public/hyperlist.tsv` (read-only) —
   tapi karena seluruh app di balik login, praktisnya `.env` wajib.

## Deploy (GitHub Pages)

Build jalan di GitHub Actions. Set di repo
**Settings → Secrets and variables → Actions → Variables**:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | anon public key |

`.github/workflows/deploy.yml` step **Build** sudah membaca keduanya lewat
`${{ vars.* }}`. `anon` key aman di frontend (diproteksi RLS) — jangan
pernah pakai `service_role` key.

## Isi data Hyperlist

Login sebagai admin → sidebar **Admin** → **/admin/hyperlist** →
**Impor massal** → tempel TSV (`KODE ⇥ TOPIK ⇥ SUBTOPIK ⇥ LINK`, satu
baris per materi) → centang **Ganti semua isi tabel** → **Impor**.
Format sama persis dengan `public/hyperlist.tsv`.

## Isi

| File | |
| --- | --- |
| `se_schema.sql` | tabel `se_hyperlist` + RLS (baca publik, tulis admin via `public.is_admin()`) |

Kode klien: `src/lib/supabase.js` (client), `src/lib/hyperlist.js`
(`listHyperlist`, `createHyperlistEntry`, `updateHyperlistEntry`,
`deleteHyperlistEntry`, `bulkCreateHyperlist`), `src/lib/auth.js` +
`src/context/AuthProvider.jsx` (session, role).

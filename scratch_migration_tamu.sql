-- ============================================================
-- Link personal per tamu (tabel "guests").
--
-- Kondisi awal yang ditemukan sebelum migrasi ini:
--  * Tabel guests sudah ada (id, invitation_id, name, personal_link,
--    shared_at) dengan FK ke invitations ... ON DELETE CASCADE, tapi
--    isinya 0 baris.
--  * RLS-nya AKTIF tapi policy-nya NOL — artinya tabel ini terkunci
--    total, tidak ada satu pun peran yang bisa membaca atau menulis.
--  * Ketiga tema di templates/ sudah lama punya slot
--    <b data-slot="nama_tamu">Tamu Undangan</b> di sampul undangan,
--    tapi render-undangan.js tidak pernah mengisinya — jadi semua tamu
--    melihat tulisan "Tamu Undangan" apa adanya.
--
-- Yang ditambahkan di sini:
--  1. Kolom code (kunci acak di URL), created_at, dan opened_at.
--  2. Policy RLS "hanya pemilik undangannya" untuk mempelai.
--  3. Fungsi SECURITY DEFINER buka_undangan_tamu() supaya tamu bisa
--     mendapatkan NAMANYA SENDIRI tanpa tabel guests perlu dibuka ke
--     publik. Ini penting: policy SELECT publik biasa akan membocorkan
--     seluruh daftar tamu ke siapa pun. Fungsi ini hanya mengembalikan
--     satu nama, dan hanya kalau slug + code-nya cocok persis.
--
-- Kolom personal_link yang sudah ada sengaja tidak dipakai: menyimpan
-- URL penuh berarti seluruh baris harus ditulis ulang kalau domainnya
-- berubah. Yang disimpan cukup code-nya, URL dirakit di sisi aplikasi.
-- ============================================================

-- ---------- 1. Kolom baru ----------
alter table public.guests
  add column if not exists code text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists opened_at timestamptz;

-- Code dipakai sebagai kunci pencarian di URL, jadi wajib unik dan
-- terindeks. Dibuat sebagai index unik (bukan constraint) supaya baris
-- lama bercode NULL tetap boleh ada tanpa menggagalkan migrasi.
create unique index if not exists guests_code_key on public.guests (code) where code is not null;
create index if not exists guests_invitation_id_idx on public.guests (invitation_id);

-- ---------- 2. RLS: mempelai hanya boleh menyentuh tamu miliknya ----------
-- Kepemilikan tidak disimpan di guests, melainkan diturunkan lewat
-- invitation_id -> invitations.user_id, sama seperti pola rsvp/ucapan/hadiah.
drop policy if exists "guests_select_own" on public.guests;
create policy "guests_select_own"
  on public.guests for select
  to authenticated
  using (exists (
    select 1 from public.invitations i
    where i.id = guests.invitation_id and i.user_id = auth.uid()
  ));

drop policy if exists "guests_insert_own" on public.guests;
create policy "guests_insert_own"
  on public.guests for insert
  to authenticated
  with check (exists (
    select 1 from public.invitations i
    where i.id = guests.invitation_id and i.user_id = auth.uid()
  ));

drop policy if exists "guests_update_own" on public.guests;
create policy "guests_update_own"
  on public.guests for update
  to authenticated
  using (exists (
    select 1 from public.invitations i
    where i.id = guests.invitation_id and i.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.invitations i
    where i.id = guests.invitation_id and i.user_id = auth.uid()
  ));

drop policy if exists "guests_delete_own" on public.guests;
create policy "guests_delete_own"
  on public.guests for delete
  to authenticated
  using (exists (
    select 1 from public.invitations i
    where i.id = guests.invitation_id and i.user_id = auth.uid()
  ));

-- ---------- 3. Jalan masuk untuk tamu (tanpa login) ----------
-- Mengembalikan nama satu tamu DAN mencatat kapan link-nya pertama kali
-- dibuka, dalam satu panggilan. Sengaja VOLATILE karena menulis.
-- coalesce(opened_at, now()) menjaga stempel pertama tetap utuh kalau
-- tamu membuka link yang sama berkali-kali.
--
-- Tidak ada policy SELECT publik pada guests, jadi ini satu-satunya
-- cara tamu menyentuh tabel itu — dan yang keluar cuma satu kolom nama,
-- bukan barisnya, apalagi daftarnya.
create or replace function public.buka_undangan_tamu(p_slug text, p_kode text)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $function$
declare
  v_nama text;
begin
  update public.guests g
     set opened_at = coalesce(g.opened_at, now())
    from public.invitations i
   where i.id = g.invitation_id
     and i.slug = p_slug
     and i.status = 'aktif'
     and g.code = p_kode
  returning g.name into v_nama;

  return v_nama;
end;
$function$;

grant execute on function public.buka_undangan_tamu(text, text) to anon, authenticated;

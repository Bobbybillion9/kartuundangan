-- ============================================================
-- 1. Tambah kolom konten undangan ke tabel invitations yang sudah ada
--    (template_id, data, tier, last_active_tab TIDAK diubah/dihapus)
-- ============================================================
alter table public.invitations
  add column if not exists kategori_desain text,
  add column if not exists nama_desain text,
  add column if not exists slug text,
  add column if not exists nama_pria_panggilan text,
  add column if not exists nama_wanita_panggilan text,
  add column if not exists nama_pria_lengkap text,
  add column if not exists nama_wanita_lengkap text,
  add column if not exists orangtua_pria text,
  add column if not exists orangtua_wanita text,
  add column if not exists tanggal_akad date,
  add column if not exists waktu_akad text,
  add column if not exists tanggal_resepsi date,
  add column if not exists waktu_resepsi text,
  add column if not exists lokasi_nama text,
  add column if not exists lokasi_alamat text,
  add column if not exists lokasi_maps_url text,
  add column if not exists kalimat_pembuka text,
  add column if not exists kalimat_penutup text,
  add column if not exists foto_utama_url text,
  add column if not exists foto_pria_url text,
  add column if not exists foto_wanita_url text,
  add column if not exists foto_galeri jsonb default '[]'::jsonb,
  add column if not exists nama_bank_1 text,
  add column if not exists no_rekening_1 text,
  add column if not exists pemilik_rekening_1 text,
  add column if not exists nama_bank_2 text,
  add column if not exists no_rekening_2 text,
  add column if not exists pemilik_rekening_2 text;

-- slug unik (nullable, tapi kalau diisi harus unik)
alter table public.invitations
  add constraint invitations_slug_key unique (slug);

-- status hanya boleh 'draft' atau 'aktif' (default sudah 'draft')
alter table public.invitations
  add constraint invitations_status_check check (status in ('draft', 'aktif'));

-- ============================================================
-- 2. RLS: tabel sudah RLS-enabled tapi belum ada policy sama sekali
--    (artinya saat ini semua akses non-service-role terblokir total)
-- ============================================================
create policy "invitations_select_own"
  on public.invitations for select
  using (auth.uid() = user_id);

create policy "invitations_insert_own"
  on public.invitations for insert
  with check (auth.uid() = user_id);

create policy "invitations_update_own"
  on public.invitations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "invitations_delete_own"
  on public.invitations for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 3. Storage bucket publik untuk foto undangan
-- ============================================================
insert into storage.buckets (id, name, public)
values ('foto-undangan', 'foto-undangan', true)
on conflict (id) do nothing;

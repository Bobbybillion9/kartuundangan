-- ============================================================
-- Halaman publik /u/[slug]: izinkan siapa pun (tanpa login) membaca
-- baris invitations yang statusnya 'aktif' saja. Baris 'draft' tetap
-- sepenuhnya tersembunyi dari publik lewat policy invitations_select_own
-- yang sudah ada (cuma pemilik baris yang bisa baca draft miliknya).
-- ============================================================
create policy "invitations_select_public_aktif"
  on public.invitations for select
  to public
  using (status = 'aktif');

-- ============================================================
-- Fungsi bantu untuk halaman publik: membedakan "slug tidak ada sama
-- sekali" vs "slug ada tapi undangannya masih draft" TANPA membocorkan
-- isi baris draft (nama, tanggal, rekening, dst.) ke publik — cuma
-- mengembalikan kolom status-nya saja. SECURITY DEFINER supaya bisa
-- membaca baris draft yang disembunyikan RLS dari anon, tapi return
-- value-nya sengaja dibatasi ke satu kata (status) saja.
-- ============================================================
create or replace function public.cek_status_undangan(p_slug text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select status from public.invitations where slug = p_slug limit 1;
$$;

grant execute on function public.cek_status_undangan(text) to anon, authenticated;

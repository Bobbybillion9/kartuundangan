-- ============================================================
-- PERBAIKAN: SELURUH TULISAN TAMU DITOLAK RLS
-- Ditemukan 2026-09-04 saat menguji jalur bukti transfer.
-- ============================================================
--
-- GEJALANYA
-- ---------
-- Tamu tidak bisa mengisi RSVP, tidak bisa mengirim ucapan, tidak bisa
-- membaca ucapan tamu lain, dan tidak bisa mengunggah bukti transfer.
-- Yang ia lihat cuma "Terjadi kesalahan. Periksa koneksi internetmu."
-- Terbukti langsung di browser pada undangan aktif:
--
--   insert ucapan          -> new row violates row-level security policy [42501]
--   unggah bukti-transfer  -> 403 "new row violates row-level security policy"
--   select ucapan (publik) -> 0 baris
--
-- Sejalan dengan datanya: tabel rsvp, ucapan, dan hadiah SEMUANYA nol
-- baris, dan bucket bukti-transfer cuma berisi 2 objek berukuran 0 byte.
--
-- SEBABNYA
-- --------
-- Kelima kebijakan publik di bawah ini memeriksa status undangan dengan
-- SUBQUERY LANGSUNG ke tabel invitations:
--
--     exists (select 1 from invitations i
--             where i.id = <tabel>.invitation_id and i.status = 'aktif')
--
-- Subquery itu dijalankan SEBAGAI PERAN TAMU (anon), dan sejak akses
-- publik ke invitations dipindahkan ke fungsi SECURITY DEFINER
-- (ambil_undangan_publik / buka_undangan_tamu / cek_status_undangan),
-- peran anon TIDAK PUNYA SATU PUN policy select di invitations. Jadi
-- subquery itu selalu mengembalikan NOL BARIS, exists() selalu false,
-- dan setiap tulisan tamu ditolak.
--
-- Diperiksa langsung: `select id,status from invitations where id=...`
-- sebagai anon mengembalikan 0 baris TANPA GALAT, sementara
-- `rpc('cek_status_undangan')` untuk undangan yang sama mengembalikan
-- 'aktif'. Itu selisih yang persis menjelaskan kegagalannya.
--
-- Inilah bentuk kegagalan yang paling mahal di project ini: tidak ada
-- yang error di sisi server, kebijakannya terlihat benar kalau dibaca,
-- dan yang menanggung akibatnya adalah TAMU pelanggan — orang yang
-- tidak punya cara melapor.
--
-- PERBAIKANNYA
-- ------------
-- Satu fungsi SECURITY DEFINER yang menjawab pertanyaan "undangan ini
-- aktif?" tanpa membocorkan isinya, lalu kelima kebijakan memakai fungsi
-- itu. Polanya sama persis dengan cek_status_undangan yang sudah ada —
-- bedanya hanya kuncinya id, bukan slug, karena kebijakan-kebijakan ini
-- memang bekerja dengan invitation_id.
--
-- YANG TIDAK BERUBAH: siapa boleh apa. Tamu tetap hanya boleh MENULIS
-- ke undangan yang berstatus aktif, tetap tidak bisa membaca rsvp/hadiah
-- milik siapa pun, dan tetap tidak bisa melihat baris invitations.
--
-- CARA MENJALANKAN: tempel seluruh berkas ini di Supabase Studio ->
-- SQL Editor -> Run. Aman diulang (idempoten).
-- ============================================================

-- ---------- 1. Fungsi penjawab ----------
-- STABLE + SECURITY DEFINER: berjalan sebagai pemilik fungsi, jadi ia
-- boleh membaca invitations walau pemanggilnya tidak.
-- search_path dikunci: tanpa itu, fungsi SECURITY DEFINER bisa
-- diarahkan ke tabel palsu lewat search_path pemanggilnya.
create or replace function public.undangan_aktif(p_invitation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.invitations
    where id = p_invitation_id and status = 'aktif'
  );
$$;

-- Versi teks untuk kebijakan Storage: nama objek berbentuk
-- "<invitation_id>/<berkas>", dan segmen pertamanya adalah TEKS. Cast
-- langsung ke uuid akan MELEMPAR GALAT pada nama objek yang tidak
-- berbentuk uuid — dan galat di dalam evaluasi kebijakan menggagalkan
-- seluruh permintaan, bukan sekadar mengembalikan false. Karena itu
-- bentuknya diperiksa dulu.
create or replace function public.undangan_aktif_teks(p_invitation_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    when p_invitation_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.undangan_aktif(p_invitation_id::uuid)
    else false
  end;
$$;

grant execute on function public.undangan_aktif(uuid) to anon, authenticated;
grant execute on function public.undangan_aktif_teks(text) to anon, authenticated;

-- ---------- 2. Kebijakan tabel ----------
drop policy if exists rsvp_insert_public_aktif on public.rsvp;
create policy rsvp_insert_public_aktif on public.rsvp
  for insert to public
  with check (public.undangan_aktif(invitation_id));

drop policy if exists ucapan_insert_public_aktif on public.ucapan;
create policy ucapan_insert_public_aktif on public.ucapan
  for insert to public
  with check (public.undangan_aktif(invitation_id));

-- Ucapan memang dimaksudkan terbaca tamu lain — ini satu-satunya select
-- publik di project ini, dan sengaja begitu.
drop policy if exists ucapan_select_public_aktif on public.ucapan;
create policy ucapan_select_public_aktif on public.ucapan
  for select to public
  using (public.undangan_aktif(invitation_id));

drop policy if exists hadiah_insert_public_aktif on public.hadiah;
create policy hadiah_insert_public_aktif on public.hadiah
  for insert to public
  with check (public.undangan_aktif(invitation_id));

-- ---------- 3. Kebijakan Storage (bucket bukti-transfer) ----------
-- Path-nya "[invitation_id]/[berkas]" TANPA user_id, karena tamu anonim
-- yang mengunggah tidak tahu (dan tidak boleh tahu) user_id pemiliknya.
drop policy if exists bukti_transfer_insert_public_aktif on storage.objects;
create policy bukti_transfer_insert_public_aktif on storage.objects
  for insert to public
  with check (
    bucket_id = 'bukti-transfer'
    and public.undangan_aktif_teks((storage.foldername(name))[1])
  );

-- ---------- 4. Bukti bahwa perbaikannya bekerja ----------
-- Jalankan SESUDAH blok di atas. Baris pertama harus true untuk undangan
-- yang aktif, false untuk yang draft.
--
--   select id, status, public.undangan_aktif(id) as boleh_ditulis_tamu
--   from public.invitations order by status;
--
-- Lalu uji dari sisi tamu sungguhan: buka /u/<slug>, isi form ucapan,
-- dan pastikan pesannya "Terima kasih", bukan "Terjadi kesalahan".

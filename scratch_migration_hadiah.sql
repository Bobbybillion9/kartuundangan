-- ============================================================
-- Tabel hadiah: catatan siapa yang mengaku sudah mengirim tanda kasih
-- (transfer) untuk satu undangan, plus foto bukti transfernya. INI
-- BUKAN pencatatan transaksi sungguhan -- uang tetap masuk langsung ke
-- rekening pasangan lewat info di gift-card, sistem cuma mencatat
-- nama/pesan/bukti yang diunggah tamu secara manual dan bisa saja
-- keliru atau tidak jujur. Jangan dipakai sebagai sumber kebenaran
-- nominal atau status pembayaran.
-- ============================================================
create table public.hadiah (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  nama_pengirim text not null,
  pesan text,
  bukti_url text,
  created_at timestamptz not null default now()
);

create index hadiah_invitation_id_idx on public.hadiah (invitation_id);

alter table public.hadiah enable row level security;

-- ============================================================
-- RLS: hadiah -- pola sama persis dengan rsvp (lihat
-- scratch_migration_rsvp_ucapan.sql): insert publik dibatasi ke
-- undangan aktif, select cuma pemilik (data ini privat, BUKAN
-- ditampilkan ke tamu lain seperti ucapan), tidak ada policy update
-- sama sekali, delete cuma pemilik untuk tombol "Hapus" di dashboard.
-- ============================================================

create policy "hadiah_insert_public_aktif"
  on public.hadiah for insert
  to public
  with check (
    exists (
      select 1 from public.invitations i
      where i.id = hadiah.invitation_id and i.status = 'aktif'
    )
  );

create policy "hadiah_select_own_invitation"
  on public.hadiah for select
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = hadiah.invitation_id and i.user_id = auth.uid()
    )
  );

create policy "hadiah_delete_own_invitation"
  on public.hadiah for delete
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = hadiah.invitation_id and i.user_id = auth.uid()
    )
  );

-- Sengaja TIDAK ada policy "for update" sama sekali -- tanpa policy,
-- RLS menolak semua UPDATE secara default untuk siapa pun (termasuk
-- pemilik undangan). Kalau nanti ternyata perlu, tambahkan lewat
-- migration baru, jangan diam-diam ditambah di sini.

-- ============================================================
-- Bucket Storage baru "bukti-transfer" (PRIVATE, beda dari
-- "foto-undangan" yang public=true -- lihat scratch_migration_storage_
-- foto.sql). Keputusan bucket terpisah & privat:
--
-- 1. foto-undangan public=true berarti siapa pun yang tahu URL file
--    bisa membukanya langsung, RLS storage.objects tidak berlaku sama
--    sekali untuk endpoint /storage/v1/object/public/... itu. Untuk
--    foto mempelai itu memang tujuannya (tamu memang boleh lihat),
--    tapi bukti transfer harus PRIVAT ke pasangan -- cuma bucket
--    private yang benar-benar menegakkan itu (bukan cuma path yang
--    sulit ditebak).
-- 2. Pola path foto-undangan adalah [user_id]/[invitation_id]/... dan
--    semua policy-nya "to authenticated" cocok ke auth.uid() milik
--    yang login -- tidak bisa dipakai tamu anonim yang tidak/tidak
--    boleh tahu user_id pemilik undangan. Bucket baru ini pakai path
--    [invitation_id]/[nama-file] saja, dicocokkan ke invitations
--    lewat invitation_id (sama seperti policy tabel hadiah di atas),
--    supaya tamu anonim cukup tahu invitation_id (yang memang sudah
--    mereka tahu, dari halaman undangan yang sedang mereka buka).
--
-- file_size_limit & allowed_mime_types didaftarkan di level bucket
-- juga (bukan cuma divalidasi di JS) supaya batas 5 MB dan jpg/png/
-- webp tetap ditegakkan server-side walau validasi klien dilewati.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bukti-transfer', 'bukti-transfer', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "bukti_transfer_insert_public_aktif"
  on storage.objects for insert
  to public
  with check (
    bucket_id = 'bukti-transfer'
    and exists (
      select 1 from public.invitations i
      where i.id::text = (storage.foldername(name))[1] and i.status = 'aktif'
    )
  );

-- Tamu anonim SENGAJA tidak diberi policy select/list sama sekali --
-- default RLS tanpa policy = ditolak, jadi tamu bisa unggah tapi tidak
-- bisa list/lihat/unduh file tamu lain di folder invitation_id yang
-- sama, walau tahu invitation_id-nya.
create policy "bukti_transfer_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'bukti-transfer'
    and exists (
      select 1 from public.invitations i
      where i.id::text = (storage.foldername(name))[1] and i.user_id = auth.uid()
    )
  );

-- Dibutuhkan untuk: (a) tombol "Hapus" per entri hadiah di dashboard,
-- (b) membersihkan file saat seluruh undangan dihapus (lihat
-- hapusUndanganDenganKonfirmasi di assets/dashboard.js).
create policy "bukti_transfer_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'bukti-transfer'
    and exists (
      select 1 from public.invitations i
      where i.id::text = (storage.foldername(name))[1] and i.user_id = auth.uid()
    )
  );

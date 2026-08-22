-- ============================================================
-- Tabel rsvp: konfirmasi kehadiran tamu untuk satu undangan.
-- ============================================================
create table public.rsvp (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  nama_tamu text not null,
  pihak text,
  kehadiran text,
  jumlah_tamu integer default 1,
  created_at timestamptz not null default now(),
  constraint rsvp_pihak_check check (pihak is null or pihak in ('pria', 'wanita')),
  constraint rsvp_kehadiran_check check (kehadiran is null or kehadiran in ('hadir', 'tidak_hadir'))
);

create index rsvp_invitation_id_idx on public.rsvp (invitation_id);

alter table public.rsvp enable row level security;

-- ============================================================
-- Tabel ucapan: ucapan & doa tamu untuk satu undangan.
-- ============================================================
create table public.ucapan (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  nama text not null,
  pesan text not null,
  created_at timestamptz not null default now()
);

create index ucapan_invitation_id_idx on public.ucapan (invitation_id);

alter table public.ucapan enable row level security;

-- ============================================================
-- RLS: rsvp
-- ============================================================

-- Tamu (anonim atau login) boleh INSERT, TAPI hanya ke invitation_id
-- yang undangannya berstatus 'aktif' -- mencegah kirim ke undangan
-- draft atau invitation_id sembarangan/tidak ada.
create policy "rsvp_insert_public_aktif"
  on public.rsvp for insert
  to public
  with check (
    exists (
      select 1 from public.invitations i
      where i.id = rsvp.invitation_id and i.status = 'aktif'
    )
  );

-- Data kehadiran itu privat: TIDAK ada policy SELECT untuk tamu
-- (anon/public) sama sekali -- default RLS tanpa policy = akses
-- ditolak, jadi tabel rsvp tidak bisa dibaca publik lewat cara apa
-- pun. Hanya pemilik undangan (login, invitations.user_id = auth.uid())
-- yang boleh membaca daftar rsvp miliknya sendiri.
create policy "rsvp_select_own_invitation"
  on public.rsvp for select
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = rsvp.invitation_id and i.user_id = auth.uid()
    )
  );

-- ============================================================
-- RLS: ucapan
-- ============================================================

-- Tamu (anonim atau login) boleh INSERT, hanya ke invitation_id yang
-- undangannya berstatus 'aktif'.
create policy "ucapan_insert_public_aktif"
  on public.ucapan for insert
  to public
  with check (
    exists (
      select 1 from public.invitations i
      where i.id = ucapan.invitation_id and i.status = 'aktif'
    )
  );

-- Siapa pun (termasuk tamu anonim) boleh membaca ucapan milik
-- undangan yang aktif, supaya daftar ucapan tampil di halaman publik.
create policy "ucapan_select_public_aktif"
  on public.ucapan for select
  to public
  using (
    exists (
      select 1 from public.invitations i
      where i.id = ucapan.invitation_id and i.status = 'aktif'
    )
  );

-- Pemilik undangan juga boleh membaca ucapan di undangannya sendiri
-- walau masih draft (mis. untuk pratinjau sebelum diaktifkan).
create policy "ucapan_select_own_invitation"
  on public.ucapan for select
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = ucapan.invitation_id and i.user_id = auth.uid()
    )
  );

-- Dibutuhkan untuk tombol "Hapus" per ucapan di dashboard pasangan
-- (tab Tamu & Ucapan, lihat Langkah 3) -- ditambahkan belakangan,
-- bukan bagian rancangan awal Langkah 1.
create policy "ucapan_delete_own_invitation"
  on public.ucapan for delete
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = ucapan.invitation_id and i.user_id = auth.uid()
    )
  );

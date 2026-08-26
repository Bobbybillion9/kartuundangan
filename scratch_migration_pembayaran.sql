-- ============================================================
-- Fase 3 — Pembayaran (Midtrans Snap).
--
-- Kondisi awal: tabel payments sudah ada (id, invitation_id, amount,
-- method, status, paid_at) dengan RLS AKTIF tapi NOL policy — terkunci
-- total, sama seperti guests dulu. Kolom invitations.tier ada dan berisi
-- 'standar' di semua baris karena default kolom, tapi tidak pernah
-- dibaca satu baris kode pun.
--
-- Prinsip yang dipegang di sini:
--
-- 1. HARGA TIDAK PERNAH DIPERCAYA DARI KLIEN. Nominal ditentukan di
--    server (api/bayar/buat.js) dan dicatat di baris payments. Kalau
--    harga ikut dikirim browser, siapa pun bisa membayar Rp1.
-- 2. PENGAKTIFAN DIJAGA DI DATABASE, bukan cuma di tombol. Tanpa ini,
--    siapa pun yang paham DevTools bisa memanggil update status='aktif'
--    sendiri dan melewati pembayaran sepenuhnya — RLS "own rows only"
--    tetap mengizinkannya karena baris itu memang miliknya.
-- 3. Klien TIDAK BOLEH menulis ke payments sama sekali. Yang menulis
--    hanya webhook Midtrans lewat service role (yang melewati RLS).
-- ============================================================

-- ---------- 1. Kolom tambahan di payments ----------
alter table public.payments
  add column if not exists order_id text,
  add column if not exists tier text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz,
  -- Simpan payload notifikasi apa adanya untuk jejak audit: kalau ada
  -- sengketa "sudah bayar tapi belum aktif", inilah buktinya.
  add column if not exists notifikasi jsonb;

-- order_id adalah kunci yang dikirim ke Midtrans dan dipakai webhook
-- untuk menemukan barisnya kembali. Wajib unik.
create unique index if not exists payments_order_id_key
  on public.payments (order_id) where order_id is not null;
create index if not exists payments_invitation_id_idx
  on public.payments (invitation_id);

-- ---------- 2. RLS payments: pemilik hanya boleh MEMBACA ----------
-- Tidak ada policy insert/update/delete untuk siapa pun. Penulisan
-- sepenuhnya lewat service role di webhook, yang melewati RLS.
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
  on public.payments for select
  to authenticated
  using (exists (
    select 1 from public.invitations i
    where i.id = payments.invitation_id and i.user_id = auth.uid()
  ));

-- ---------- 3. Penanda "sudah dibayar" ----------
-- Satu sumber kebenaran, dipakai trigger di bawah maupun aplikasi.
create or replace function public.undangan_sudah_dibayar(p_invitation_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.payments
    where invitation_id = p_invitation_id and status = 'paid'
  );
$function$;

grant execute on function public.undangan_sudah_dibayar(uuid) to anon, authenticated;

-- ---------- 4. Gerbang pengaktifan di level database ----------
-- Menahan perpindahan status draft -> aktif kalau belum ada pembayaran
-- lunas. Sengaja hanya memeriksa PERPINDAHAN, bukan keadaan: undangan
-- yang sudah aktif sebelum gerbang ini dipasang tidak ikut dijatuhkan,
-- dan pembaruan biasa pada baris aktif (ganti nama, ganti foto) tidak
-- ikut terhalang.
create or replace function public.jaga_aktivasi_berbayar()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status = 'aktif' and coalesce(old.status, '') <> 'aktif' then
    if not public.undangan_sudah_dibayar(new.id) then
      raise exception 'Undangan ini belum dibayar, jadi belum bisa diaktifkan.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_jaga_aktivasi_berbayar on public.invitations;
create trigger trg_jaga_aktivasi_berbayar
  before update on public.invitations
  for each row
  execute function public.jaga_aktivasi_berbayar();

-- ---------- 5. Jangan jatuhkan undangan yang sudah tayang ----------
-- Undangan yang sudah aktif sebelum gerbang ini ada dianggap lunas,
-- supaya menonaktifkan lalu mengaktifkan kembali tidak tiba-tiba
-- ditolak. Ditandai method 'grandfather' agar bisa dibedakan dari
-- pembayaran sungguhan saat rekonsiliasi.
insert into public.payments (invitation_id, amount, method, status, paid_at, tier, order_id)
select i.id, 0, 'grandfather', 'paid', now(), coalesce(i.tier, 'standar'),
       'GRANDFATHER-' || i.id
from public.invitations i
-- Tanpa ON CONFLICT: index unik order_id bersifat partial
-- (where order_id is not null), dan Postgres tidak menerima index partial
-- sebagai penengah ON CONFLICT. Klausa "not exists" di atas sudah cukup.
where i.status = 'aktif'
  and not exists (select 1 from public.payments p where p.invitation_id = i.id);

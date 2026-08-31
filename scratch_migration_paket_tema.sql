-- ============================================================
-- GERBANG AKTIVASI: pembayaran harus SESUAI PAKET TEMANYA
-- ------------------------------------------------------------
-- JALANKAN SENDIRI DI SUPABASE SQL EDITOR. Sengaja tidak diterapkan
-- dari sesi ini: ini perubahan pada database PRODUKSI, dan trigger
-- aktivasi adalah satu-satunya hal yang berdiri di antara "undangan
-- dibayar" dan "undangan tayang".
--
-- KENAPA PERLU
-- ------------
-- Sejak 2026-08-31 katalog punya DUA tingkat harga: tema Elegan Klasik
-- Rp49.000 (paket standar), dua belas tema lainnya Rp89.000 (paket pro).
-- Sisi server sudah menagih dengan benar — api/bayar/buat.js menurunkan
-- paketnya dari invitations.kategori_desain dan MENGABAIKAN apa pun yang
-- dikirim browser (lihat api/_lib/tema-tier.js).
--
-- Yang MASIH terbuka ada di database: jaga_aktivasi_berbayar() cuma
-- memeriksa ADA baris payments berstatus 'paid', tidak memeriksa
-- paketnya. Jadi urutan ini lolos:
--
--   1. buat undangan dengan tema Elegan Klasik
--   2. bayar Rp49.000            -> payments.tier = 'standar', paid
--   3. GANTI tema ke Pura Bentar (Rp89.000)
--   4. aktifkan                  -> lolos, karena syaratnya cuma "ada
--                                   pembayaran lunas"
--
-- Tidak ada yang gagal, tidak ada yang tercatat aneh. Selisihnya
-- Rp40.000 per undangan dan tidak akan pernah ketahuan dari data.
--
-- APA YANG DIUBAH
-- ---------------
-- Ditambah satu fungsi pembantu paket_untuk_kategori() yang isinya SAMA
-- PERSIS dengan api/_lib/tema-tier.js, lalu penjaga aktivasinya
-- mensyaratkan payments.tier cocok dengan paket tema undangan itu.
--
-- Sama seperti pasangan pricing-plans.js / harga.js, ini tempat KETIGA
-- untuk aturan yang sama — dan itu memang tidak bisa dihindari tanpa
-- build step. Kalau kategori baru ditambahkan, ubah di tiga tempat:
--   assets/theme-templates.js   (tier per tema, untuk tampilan)
--   api/_lib/tema-tier.js       (aturan server)
--   fungsi paket_untuk_kategori (di bawah)
-- ============================================================

-- 1. Aturan kategori -> paket. Sengaja daftar-yang-MURAH, bukan
--    daftar-yang-mahal: kategori baru yang lupa didaftarkan jatuh ke
--    'pro' (menagih lebih, bisa dikembalikan), bukan ke 'standar'
--    (menagih kurang, tidak ada yang tahu).
create or replace function public.paket_untuk_kategori(p_kategori text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(trim(p_kategori), '') = '' then 'standar'
    when trim(p_kategori) = 'Elegan Klasik'  then 'standar'
    else 'pro'
  end
$$;

-- 2. Penjaga aktivasi. Ganti isi fungsi trigger yang sudah ada.
--    PERIKSA DULU nama fungsi & trigger yang sebenarnya dipakai:
--      select tgname, pg_get_triggerdef(oid)
--      from pg_trigger where tgrelid = 'public.invitations'::regclass;
--    Kalau namanya berbeda, sesuaikan nama fungsi di bawah — JANGAN
--    membuat trigger kedua, dua penjaga untuk satu hal adalah cara
--    tercepat membuat salah satunya dilupakan.
create or replace function public.jaga_aktivasi_berbayar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paket text;
begin
  -- Hanya perpindahan draft -> aktif yang dijaga.
  if not (coalesce(old.status,'') is distinct from 'aktif' and new.status = 'aktif') then
    return new;
  end if;

  if not public.pembayaran_diwajibkan() then
    return new;
  end if;

  -- Akun yang dibebaskan (admin) tetap dibebaskan. Nama fungsinya
  -- mengikuti yang sudah dipakai penjaga lama; kalau berbeda,
  -- sesuaikan.
  if not public.undangan_wajib_dibayar(new.id) then
    return new;
  end if;

  v_paket := public.paket_untuk_kategori(new.kategori_desain);

  if not exists (
    select 1 from public.payments p
    where p.invitation_id = new.id
      and p.status = 'paid'
      and p.tier = v_paket
  ) then
    raise exception
      'Undangan ini memakai tema paket % dan belum ada pembayaran paket itu yang lunas.', v_paket
      using errcode = 'check_violation';
  end if;

  return new;
end
$$;

-- 3. Bukti bahwa gerbangnya benar-benar mengikat (jalankan sesudahnya,
--    jangan percaya bahwa "tidak ada error" berarti aman):
--
--    select i.id, i.nama_desain, i.kategori_desain,
--           public.paket_untuk_kategori(i.kategori_desain) as paket_wajib,
--           p.tier as paket_dibayar, p.status
--    from public.invitations i
--    left join public.payments p on p.invitation_id = i.id and p.status = 'paid'
--    where i.status = 'aktif';
--
--    Baris mana pun yang paket_wajib <> paket_dibayar adalah undangan
--    yang TERLANJUR aktif dengan pembayaran kurang. Trigger ini tidak
--    menyentuh baris yang sudah aktif — ia hanya menjaga perpindahan
--    berikutnya.

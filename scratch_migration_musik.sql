-- ============================================================
-- Kolom "musik_url" untuk fitur Musik Latar undangan.
--
-- Kenapa migrasi ini perlu: ketiga tema di templates/ SUDAH punya
-- perangkat musik yang lengkap (elemen <audio id="bgMusic">, tombol
-- mengambang #musicBtn, dan logika putar/jeda di inline script-nya),
-- dan assets/render-undangan.js sudah membaca inv.musik_url untuk
-- memutuskan tombol musik ditampilkan atau tidak. Tapi kolomnya tidak
-- pernah ada di tabel invitations, jadi nilainya selalu undefined dan
-- tombol musik tersembunyi selamanya di semua undangan — tanpa error
-- apa pun yang kelihatan. Fitur ini terlihat 90% jadi padahal tidak
-- pernah bisa menyala.
--
-- Tidak perlu bucket Storage baru: berkas lagu menumpang di bucket
-- "foto-undangan" yang sudah ada, dengan path [user_id]/[invitation_id]/
-- musik.mp3. Policy bucket itu mencocokkan segmen pertama path ke
-- auth.uid() (lihat scratch_migration_storage_foto.sql) dan tidak
-- membatasi tipe berkas maupun ukurannya, jadi audio ikut tercakup apa
-- adanya. Bucket-nya juga sudah public=true — memang harus, karena tamu
-- yang membuka undangan perlu bisa memutar lagunya langsung.
--
-- Aman dijalankan berulang kali (if not exists) dan tidak menyentuh
-- baris yang sudah ada: undangan lama nilainya NULL, yang artinya
-- "tidak ada musik" — persis perilaku yang berlaku selama ini.
-- ============================================================

alter table public.invitations
  add column if not exists musik_url text;

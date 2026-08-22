-- ============================================================
-- RLS storage.objects untuk bucket "foto-undangan" (fitur Unggah Foto
-- di tab Isi Data). PENTING: dicek langsung ke DB — bucket ini sudah
-- ada dan public=true, TAPI storage.objects belum punya satu pun
-- policy untuk bucket ini. Bucket public cuma bikin file bisa DIBACA
-- publik tanpa auth (lewat endpoint /storage/v1/object/public/...);
-- upload/ganti/hapus tetap ditolak RLS sampai policy di bawah ini ada.
-- Tanpa migration ini, semua percobaan unggah dari browser akan
-- gagal dengan error izin ditolak.
--
-- Path file wajib berbentuk [user_id]/[invitation_id]/nama-file supaya
-- segmen pertama path (storage.foldername(name))[1]) bisa dicocokkan
-- ke auth.uid() milik yang sedang login.
-- ============================================================

create policy "foto_undangan_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'foto-undangan' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "foto_undangan_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'foto-undangan' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "foto_undangan_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'foto-undangan' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'foto-undangan' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "foto_undangan_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'foto-undangan' and (storage.foldername(name))[1] = auth.uid()::text);

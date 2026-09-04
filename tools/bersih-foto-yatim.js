/**
 * bersih-foto-yatim.js — menghapus foto YATIM di bucket foto-undangan.
 *
 * YATIM = berkas yang folder invitation_id-nya sudah tidak punya baris
 * di tabel invitations lagi. Tidak ada satu pun halaman yang bisa
 * menampilkannya, tidak ada yang bisa menghapusnya lewat UI, dan ia
 * tetap terhitung sebagai pemakaian Storage selamanya.
 *
 * KENAPA ADA YATIM PADAHAL DASHBOARD SUDAH MEMBERSIHKAN
 * -----------------------------------------------------
 * hapusUndangan() di dashboard.js memang memanggil
 * hapusSemuaFotoInvitation() lebih dulu dan melaporkan kalau gagal.
 * Yatim muncul dari baris invitations yang dihapus DI LUAR dashboard —
 * lewat SQL saat mengetes, misalnya. Pada 2026-09-04 ada 55 berkas
 * yatim berjumlah 33,1 MB dari total 65 berkas; 35 di antaranya
 * (akun test) dibersihkan hari itu juga.
 *
 * KENAPA LEWAT BROWSER, BUKAN SQL
 * -------------------------------
 * Menghapus baris storage.objects lewat SQL TIDAK menghapus berkasnya
 * di penyimpanan: yang hilang cuma catatannya, sementara berkasnya
 * tetap ada dan tetap dihitung. Satu-satunya cara yang benar adalah API
 * Storage. Skrip ini karena itu masuk lewat halaman login sungguhan dan
 * bekerja sebagai user itu sendiri — kebijakan RLS
 * foto_undangan_delete_own memang membatasi tiap orang pada folder
 * miliknya, jadi tiap akun harus dibersihkan dengan akunnya sendiri.
 *
 * PRASYARAT: server statis lokal :5500 + Chrome headless :9222.
 *
 * PAKAI:
 *   KU_EMAIL=... KU_PASSWORD=... node tools/bersih-foto-yatim.js --coba
 *   KU_EMAIL=... KU_PASSWORD=... node tools/bersih-foto-yatim.js
 *
 * Tanpa KU_EMAIL/KU_PASSWORD, skrip memakai berkas kredensial akun test
 * di %USERPROFILE%\.kartuundangan-test.env kalau ada.
 *
 * SELALU jalankan --coba dulu dan BACA daftarnya. Skrip ini menghapus
 * berkas secara permanen.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const CDP = 'http://127.0.0.1:9222';
const BASE = 'http://localhost:5500';
const COBA = process.argv.includes('--coba');

function kredensial() {
  if (process.env.KU_EMAIL && process.env.KU_PASSWORD) {
    return { email: process.env.KU_EMAIL, sandi: process.env.KU_PASSWORD, dari: 'variabel lingkungan' };
  }
  const f = path.join(os.homedir(), '.kartuundangan-test.env');
  if (!fs.existsSync(f)) return null;
  const env = {};
  for (const b of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(b);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  if (!env.KU_TEST_EMAIL || !env.KU_TEST_PASSWORD) return null;
  return { email: env.KU_TEST_EMAIL, sandi: env.KU_TEST_PASSWORD, dari: '.kartuundangan-test.env' };
}

async function cdp() {
  const r = await fetch(CDP + '/json/new?about:blank', { method: 'PUT' });
  const t = await r.json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const nunggu = new Map();
  await new Promise(res => (ws.onopen = res));
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && nunggu.has(m.id)) { nunggu.get(m.id)(m); nunggu.delete(m.id); } };
  const kirim = (metode, params) => new Promise(res => { const n = ++id; nunggu.set(n, res); ws.send(JSON.stringify({ id: n, method: metode, params: params || {} })); });
  return { kirim, tutup: async () => { ws.close(); await fetch(CDP + '/json/close/' + t.id); } };
}

async function ev(c, expr, tunggu) {
  const r = await c.kirim('Runtime.evaluate', { expression: expr, awaitPromise: !!tunggu, returnByValue: true });
  if (r.result && r.result.exceptionDetails) return 'GALAT: ' + r.result.exceptionDetails.text;
  return r.result && r.result.result ? r.result.result.value : null;
}

function skripKerja(coba) {
  return `(async () => {
    const sb = window.KU.sb, ses = window.KU.getSession();
    if (!ses) return JSON.stringify({ galat: 'tidak ada sesi login' });
    const uid = ses.user.id;

    // Daftar undangan yang MASIH ADA. select ini hanya mengembalikan
    // baris milik user ini (RLS), yang justru yang kita perlukan.
    const inv = await sb.from('invitations').select('id');
    if (inv.error) return JSON.stringify({ galat: 'baca invitations: ' + inv.error.message });
    const hidup = new Set((inv.data || []).map(r => r.id));

    const top = await sb.storage.from('foto-undangan').list(uid, { limit: 1000 });
    if (top.error) return JSON.stringify({ galat: 'list storage: ' + top.error.message });

    const laporan = []; let berkasYatim = 0, byteYatim = 0, dihapus = 0;
    for (const f of (top.data || [])) {
      // Folder muncul sebagai entri TANPA metadata; berkas punya metadata.
      if (f.metadata) continue;
      if (hidup.has(f.name)) { laporan.push(f.name.slice(0, 8) + '...: masih dipakai, dilewati'); continue; }

      const paths = []; let byte = 0;
      const isi = await sb.storage.from('foto-undangan').list(uid + '/' + f.name, { limit: 1000 });
      for (const o of (isi.data || [])) if (o.metadata) { paths.push(uid + '/' + f.name + '/' + o.name); byte += (o.metadata.size || 0); }
      const gal = await sb.storage.from('foto-undangan').list(uid + '/' + f.name + '/galeri', { limit: 1000 });
      for (const o of (gal.data || [])) if (o.metadata) { paths.push(uid + '/' + f.name + '/galeri/' + o.name); byte += (o.metadata.size || 0); }

      if (!paths.length) { laporan.push(f.name.slice(0, 8) + '...: yatim tapi kosong'); continue; }
      berkasYatim += paths.length; byteYatim += byte;
      const mb = (byte / 1048576).toFixed(1);
      if (${coba}) { laporan.push(f.name.slice(0, 8) + '...: YATIM, ' + paths.length + ' berkas, ' + mb + ' MB'); continue; }
      const rem = await sb.storage.from('foto-undangan').remove(paths);
      if (rem.error) { laporan.push(f.name.slice(0, 8) + '...: GAGAL ' + rem.error.message); continue; }
      dihapus += paths.length;
      laporan.push(f.name.slice(0, 8) + '...: ' + paths.length + ' berkas dihapus (' + mb + ' MB)');
    }
    // ---- Bagian kedua: bucket bukti-transfer ----
    //
    // Yatim di sini bentuknya beda: berkasnya ada, undangannya masih
    // ada, tapi baris 'hadiah' yang menunjuk ke berkas itu sudah tidak
    // ada. Tidak ada satu pun halaman yang bisa menampilkannya lagi.
    // Muncul, misalnya, saat baris hadiah dihapus lewat SQL — atau saat
    // sebuah unggahan berhasil tapi insert barisnya gagal sesudahnya.
    //
    // Path di bucket ini "[invitation_id]/[berkas]" TANPA user_id
    // (tamu anonim yang mengunggah tidak tahu user_id pemiliknya), jadi
    // yang bisa dijelajahi cuma folder milik undangan sendiri.
    const dipakai = new Set();
    const hd = await sb.from('hadiah').select('bukti_url');
    if (!hd.error) for (const r of (hd.data || [])) if (r.bukti_url) dipakai.add(r.bukti_url);

    for (const invId of hidup) {
      const isi = await sb.storage.from('bukti-transfer').list(invId, { limit: 1000 });
      if (isi.error) continue;
      const paths = [];
      for (const o of (isi.data || [])) {
        if (!o.metadata) continue;
        const p = invId + '/' + o.name;
        if (!dipakai.has(p)) { paths.push(p); byteYatim += (o.metadata.size || 0); }
      }
      if (!paths.length) continue;
      berkasYatim += paths.length;
      if (${coba}) { laporan.push('bukti-transfer ' + invId.slice(0, 8) + '...: YATIM, ' + paths.length + ' berkas'); continue; }
      const rem = await sb.storage.from('bukti-transfer').remove(paths);
      if (rem.error) { laporan.push('bukti-transfer ' + invId.slice(0, 8) + '...: GAGAL ' + rem.error.message); continue; }
      dihapus += paths.length;
      laporan.push('bukti-transfer ' + invId.slice(0, 8) + '...: ' + paths.length + ' berkas dihapus');
    }

    return JSON.stringify({ berkasYatim, mbYatim: +(byteYatim / 1048576).toFixed(1), dihapus, laporan });
  })()`;
}

(async () => {
  const kred = kredensial();
  if (!kred) {
    console.error('Kredensial tidak ada. Jalankan dengan:\n  KU_EMAIL=... KU_PASSWORD=... node tools/bersih-foto-yatim.js --coba');
    process.exit(1);
  }
  try { await fetch(CDP + '/json/version'); } catch (e) {
    console.error('Chrome dengan --remote-debugging-port=9222 tidak ditemukan.'); process.exit(1);
  }
  try { await fetch(BASE + '/index.html', { method: 'HEAD' }); } catch (e) {
    console.error('Server statis :5500 tidak menjawab.'); process.exit(1);
  }

  console.log('masuk sebagai ' + kred.email + ' (dari ' + kred.dari + ')' + (COBA ? '  [--coba: tidak menghapus apa pun]' : ''));
  const c = await cdp();
  await c.kirim('Page.navigate', { url: BASE + '/index.html#masuk' });
  await new Promise(r => setTimeout(r, 4000));
  await ev(c, `(async()=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    const a=document.getElementById('loginEmail'),b=document.getElementById('loginPassword');
    s.call(a,${JSON.stringify(kred.email)});a.dispatchEvent(new Event('input',{bubbles:true}));
    s.call(b,${JSON.stringify(kred.sandi)});b.dispatchEvent(new Event('input',{bubbles:true}));
    document.getElementById('loginForm').requestSubmit();return 1})()`, true);
  await new Promise(r => setTimeout(r, 6000));

  await c.kirim('Page.navigate', { url: BASE + '/app.html' });
  await new Promise(r => setTimeout(r, 6000));
  const jalan = await ev(c, "location.pathname");
  if (jalan !== '/app.html') {
    console.error('Login gagal — dashboard tidak terbuka (alamat: ' + jalan + '). Periksa email/kata sandinya.');
    await c.tutup(); process.exit(1);
  }

  const hasil = await ev(c, skripKerja(COBA), true);
  await c.tutup();
  let o; try { o = JSON.parse(hasil); } catch (e) { console.error(hasil); process.exit(1); }
  if (o.galat) { console.error('Gagal: ' + o.galat); process.exit(1); }
  for (const b of o.laporan) console.log('  ' + b);
  console.log('');
  console.log('yatim: ' + o.berkasYatim + ' berkas, ' + o.mbYatim + ' MB' + (COBA ? '  (belum dihapus — jalankan tanpa --coba)' : '; dihapus: ' + o.dihapus));
})();

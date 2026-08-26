// Akses Supabase dari sisi server (serverless function).
//
// Dua kunci berbeda dipakai untuk dua tujuan yang sengaja dipisah:
//
// - SUPABASE_SERVICE_ROLE_KEY: melewati seluruh RLS. Hanya dipakai untuk
//   menulis baris payments dari webhook Midtrans. RAHASIA — hanya boleh
//   ada sebagai environment variable di Vercel. Kalau kunci ini bocor ke
//   browser, seluruh database bisa dibaca dan ditulis siapa pun.
// - Token akses milik user sendiri: dipakai untuk MEMBUKTIKAN siapa yang
//   memanggil, bukan untuk menulis.
//
// Sengaja memakai REST API langsung, bukan SDK, karena project ini tanpa
// dependensi npm sama sekali (lihat CLAUDE.md).

const URL_SUPABASE = 'https://ebjwjnxunedjftgzzbch.supabase.co';

function serviceKey() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diset di environment');
  return k;
}

/**
 * Buktikan token akses yang dikirim klien memang milik user yang sah, lalu
 * kembalikan user-nya. Ini yang mencegah orang membuatkan tagihan atas
 * nama undangan milik orang lain: kita tidak pernah percaya user_id yang
 * dikirim di body request, hanya yang dibuktikan token.
 */
async function userDariToken(accessToken) {
  if (!accessToken) return null;
  const r = await fetch(URL_SUPABASE + '/auth/v1/user', {
    headers: {
      apikey: serviceKey(),
      Authorization: 'Bearer ' + accessToken
    }
  });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u && u.id ? u : null;
}

/** Query REST memakai service role (melewati RLS). */
async function db(path, opsi) {
  const o = opsi || {};
  const r = await fetch(URL_SUPABASE + '/rest/v1/' + path, {
    method: o.method || 'GET',
    headers: Object.assign({
      apikey: serviceKey(),
      Authorization: 'Bearer ' + serviceKey(),
      'Content-Type': 'application/json',
      Prefer: o.prefer || 'return=representation'
    }, o.headers || {}),
    body: o.body ? JSON.stringify(o.body) : undefined
  });
  const teks = await r.text();
  let data = null;
  try { data = teks ? JSON.parse(teks) : null; } catch (e) { data = teks; }
  if (!r.ok) {
    const pesan = (data && data.message) || ('HTTP ' + r.status);
    throw new Error('Supabase: ' + pesan);
  }
  return data;
}

module.exports = { URL_SUPABASE, userDariToken, db };

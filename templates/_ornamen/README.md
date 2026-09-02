# Aset ornamen bersama

Berkas di folder ini dipakai **bersama oleh banyak tema**, tidak dimiliki
satu tema. Itu sebabnya namanya deskriptif (`sudut-baroque-a.webp`), bukan
menyebut nama tema.

Bedakan dari dua folder gambar lain di repo ini:

| Folder | Isinya | Milik |
|---|---|---|
| `templates/_ornamen/` | ornamen desain (latar, sudut, wax seal) | dipakai bersama |
| `templates/_demo/<tema>/` | foto contoh pasangan untuk halaman pratinjau | per tema |
| `templates/<kat>/<tema>/assets/thumbnail.jpg` | potret sampul tema | per tema |

## Semuanya dihasilkan skrip, jangan diedit tangan

Sumber mentahnya ada **di luar repo**, di folder milik user:

```
OneDrive/Dokumen/Website Project/Kartuundangan Project/FOTO UNTUK SAMPEL/ORNAMENT/
```

Berkas di sini adalah hasil olahan `tools/siapkan-ornamen.js`. Untuk
menambah aset baru: tambahkan entrinya di daftar `ORNAMEN` di dalam skrip
itu, lalu jalankan

```
node tools/siapkan-ornamen.js               # yang belum ada saja
node tools/siapkan-ornamen.js --paksa       # tulis ulang semuanya
```

Prasyaratnya cuma Chrome headless di port 9222 — skrip itu memakai mesin
encoder WebP di dalam Chrome, karena tidak ada ImageMagick di mesin ini
dan System.Drawing (yang dipakai `potret-tema.js`) tidak bisa menulis WebP.

## Kenapa harus dikecilkan, bukan dipakai apa adanya

Aset mentahnya 23 MB. Wax seal saja rata-rata **371 KB** untuk gambar
500×500 — PNG RGBA memang seboros itu. Satu tema dengan latar penuh, empat
ornamen sudut, dan sebuah wax seal akan melewati 2 MB.

Undangan ini dibuka tamu di HP memakai kuota, sering di gedung resepsi
dengan sinyal buruk. Tiga tema pertama murni CSS/SVG dan terbuka seketika;
tema berornamen yang butuh 2 MB akan terasa seperti kemunduran justru pada
tema yang paling mahal.

Hasil sekarang: **2866 KB → 700 KB (−76%)**. Wax seal turun ~92%.

Catatan mutu yang mudah salah: latar sengaja dipakai pada mutu rendah
(0,70–0,72) sedangkan ornamen transparan pada mutu tinggi (0,88–0,90).
Latar adalah tekstur di belakang teks — turunnya mutu tidak terlihat, tapi
sangat terasa di ukuran berkas. Sebaliknya ornamen punya tepi tajam di atas
latar polos, dan artefak di sana langsung kelihatan. Sumber latar juga
sudah berupa JPEG terkompres, jadi encode ulang pada mutu tinggi bisa
**membesarkan** berkasnya — sudah terjadi sekali (106 KB → 120 KB) sebelum
mutunya diturunkan.

## Lebar sumbernya terbatas

Latar aslinya cuma ~675–736 px. Layar HP 390 px pada rasio 3× idealnya
butuh ~1170 px. Skrip **tidak pernah memperbesar** — memperbesar hanya
menambah berat tanpa menambah detail.

Akibatnya: latar yang dipakai harus **bertekstur rata** (relief, kain,
plaster). Teksturnya menyamarkan kelembutan. Latar yang punya garis tajam
atau tulisan akan terlihat lunak kalau direntangkan penuh layar — jangan
dipakai full-bleed.

## Ketajaman: satu aturan, dan alat yang menjaganya

2026-09-02 user menulis: *"jika terdeteksi atau terlihat ornamen hiasan
atau background yang buram, tolong diganti dengan yang lain."* Keluhan itu
punya angka yang bisa dihitung, bukan sekadar rasa:

> **rasio = piksel BERKAS ÷ piksel CSS tempat ia dilukis**

`garis-d.webp` yang ditolak user berada di **1,36** — berkasnya 480 px
sementara CSS melukisnya 352 px, jadi pada HP 2× DPI ia sudah diperbesar
satu setengah kali. Berkas itu **sudah dihapus dari repo**, bukan sekadar
dilepas dari temanya, dan entrinya di `tools/siapkan-ornamen.js` diganti
komentar yang menjelaskan alasannya.

**Ambang yang dipakai sekarang: 1,60.** Bukan 2,00 — sumber mentah milik
user kebanyakan 360–500 px, jadi 2,00 akan menolak aset yang sebenarnya
dipakai pada ukuran wajar dan tidak bisa diperbaiki tanpa mengganti
asetnya. 1,60 menangkap yang benar-benar terlihat.

Diperiksa `tools/cek-ketajaman.js` — memuat kelima belas tema di Chrome,
membaca `getComputedStyle` elemen **dan kedua pseudo-element-nya** (hampir
semua ornamen di sini digambar sebagai `::before`/`::after`, jadi
memeriksa elemen saja melewatkan hampir semuanya), menghitung
`background-size`, lalu mengambil pemakaian TERBESAR tiap aset. Keluar
dengan kode 1 kalau ada yang di bawah ambang, jadi bisa jadi gerbang
commit.

**Jalankan setiap kali sebuah ornamen dibesarkan di CSS, atau sebuah aset
dipakai ulang oleh tema baru.** Dua-duanya bisa membuat aset yang tadinya
lolos jadi buram tanpa gambarnya disentuh sama sekali.

Dua cara memperbaikinya, sesuai urutan:

1. **Perbesar berkasnya** — naikkan `lebar` pada entrinya di
   `tools/siapkan-ornamen.js`, lalu `--paksa`. Batasnya ukuran asli sumber:
   skripnya tidak pernah memperbesar. Ini yang dilakukan 2026-09-02 untuk
   `bebas-jam-rococo` (320→441), `monogram-lingkar-emas` (420→500),
   `mahkota-bunga-emas` (300→375), `lentera-cina-emas` (300→360) dan
   `bebas-angsa-hati` (380→420).
2. **Kecilkan kotaknya di CSS** — kalau sumbernya sudah dipakai habis.
   Ini yang dilakukan untuk angsa di kaki galeri Blanc Royale
   (280px→200px): sesudah dipangkas berkasnya cuma 337 px, dan tidak ada
   ukuran berkas yang bisa menyelamatkannya pada 280 px.

Kalau sebuah aset lolos hanya karena kelembutannya memang tidak terbaca —
latar tekstur, atau ornamen beropasitas belasan persen di belakang teks —
tulis alasannya di `DIKECUALIKAN` di dalam skrip itu. Daftar itu bukan
tempat menaruh yang belum sempat diperbaiki.

## Kalau LATAR-nya yang buram: jangan cari foto lain, gambar polanya

2026-09-02 user menolak latar hitam Noir Dore dengan alasan yang sama
("buram"). Berkasnya `latar-hitam-emas.webp` 736x1104 — dan itu ukuran
ASLI sumbernya. Dipakai `background-size:cover` pada 390x844 ia dilukis
562x844, yaitu 1,31 piksel berkas per piksel CSS.

**Menaikkan `lebar` tidak menolong, dan mengganti berkas juga tidak:**
seluruh isi folder BACKGROUND FULL ORNAMENT milik user berhenti di 736px.
Tidak ada satu pun foto latar yang bisa tajam pada layar HP.

Jalan keluarnya bukan foto: **pola vektor yang digambar sendiri**, ditulis
sebagai SVG data-URI di `:root` temanya. Noir Dore sekarang memakai kisi
belah ketupat art-deco (tera 120x120 yang menyambung di keempat tepi,
dengan kipas dan kuncup wajik). Tiga keuntungannya, dan ketiganya nyata:

- **tajam di DPI berapa pun** — browser meraster SVG pada resolusi
  perangkat, jadi tidak ada ukuran layar yang membuatnya lunak;
- **1,2 KB, tanpa permintaan jaringan** — ia menyatu di berkas CSS;
- **warnanya persis warna tema**, bukan emas foto orang lain yang harus
  ditutup lapisan hitam 80% supaya cocok.

Syaratnya cuma satu dan gampang terlewat: karena ia pola BERULANG, tiap
tempat yang memakainya wajib menyetel `background-size` seukuran teranya
+ `background-repeat:repeat`. Dengan `cover` (bawaan) satu tera diregangkan
sepenuh layar dan yang terlihat cuma dua garis raksasa — tanpa error.

Berkas `latar-hitam-emas.webp` sudah DIHAPUS dari repo, bukan sekadar
dilepas dari temanya.

## Aset yang ada di folder ini tapi belum dipakai tema mana pun

Per 2026-09-02: `bingkai-oval-emas`, `bintang-hijau-emas`,
`latar-bingkai-renda`, `latar-wayang-pasangan`, `lingkar-sulur-emas`,
`segel-emas-bunga`, `segel-gading`, `segel-mawar-hitam-emas` — sekitar
430 KB.

Sengaja **tidak** dihapus: mutunya baik, semuanya sudah pernah dipilih
dengan mata dari folder sumber, dan resepnya tetap ada di daftar `ORNAMEN`
sehingga menghapusnya cuma memindahkan pekerjaan memilih ke kemudian hari.
Berkas statis yang tidak dirujuk siapa pun tidak pernah diunduh tamu, jadi
ia tidak membebani undangan siapa pun — cuma repo.

## Soal hak pakai

Nama berkas sumbernya berpola ID Pinterest. Berbeda dari foto contoh di
`_demo/` yang hanya tampil di halaman pratinjau, ornamen ini **dipanggang
ke dalam template yang dijual** dan tampil di HP setiap tamu. Risiko
hukumnya beda kelas. Sudah disampaikan ke user dan dilanjutkan atas
keputusannya.

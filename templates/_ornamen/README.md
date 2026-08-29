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

## Soal hak pakai

Nama berkas sumbernya berpola ID Pinterest. Berbeda dari foto contoh di
`_demo/` yang hanya tampil di halaman pratinjau, ornamen ini **dipanggang
ke dalam template yang dijual** dan tampil di HP setiap tamu. Risiko
hukumnya beda kelas. Sudah disampaikan ke user dan dilanjutkan atas
keputusannya.

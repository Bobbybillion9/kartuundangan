# Berkas contoh untuk halaman Pratinjau tema

**Satu set per tema**, di folder yang namanya sama persis dengan folder
temanya:

```
templates/_demo/sage-rose/
templates/_demo/ivory-gold/
templates/_demo/emerald-dusk/
```

Nama tema dibaca `assets/demo-template.js` dari alamat halaman, jadi
menambah tema baru cukup dengan membuat folder baru di sini — tidak ada
kode yang perlu disentuh.

## Kenapa ada folder ini

Halaman `templates/pratinjau.html` memuat berkas tema **apa adanya**, tanpa
data siapa pun. Tanpa berkas di sini, calon pembeli yang menekan "Pratinjau"
melihat undangan dengan semua slot foto kosong dan tombol musik mati —
bukan gambaran yang adil tentang hasil akhirnya.

## Kenapa per tema, bukan satu set dipakai bertiga

Dulu memang satu set untuk ketiganya. Itu salah begitu fotonya benar-benar
ada: tiap tema punya nuansa warnanya sendiri, dan satu set foto membuat dua
dari tiga pratinjau bertabrakan dengan desainnya sendiri — foto luar ruang
bernuansa hijau di Emerald Dusk yang gelap, atau foto berlatar hitam di
Ivory Gold yang krem.

Yang dipakai sekarang:

| Tema           | Nuansa fotonya                          |
|----------------|-----------------------------------------|
| `sage-rose`    | Luar ruang, hijau, putih lembut         |
| `ivory-gold`   | Mahkota emas, krem hangat               |
| `emerald-dusk` | Latar gelap, jas hitam, dramatis        |

## Berkas yang dicari di dalam tiap folder

| Berkas         | Dipakai di                | Ukuran yang dipakai |
|----------------|---------------------------|---------------------|
| `sampul.jpg`   | Latar penuh sampul depan  | 1200 × 1800         |
| `utama.jpg`    | Foto utama di bagian hero | 1200 × 1500         |
| `pria.jpg`     | Foto mempelai pria        | 800 × 1000          |
| `wanita.jpg`   | Foto mempelai wanita      | 800 × 1000          |
| `galeri-1.jpg` … `galeri-6.jpg` | Galeri momen | 1000 × 1000       |
| `musik.mp3`    | Musik latar               | dipotong 45 detik   |

**Semua opsional.** Berkas yang belum ada dilewati begitu saja — slotnya
tetap menampilkan keadaan kosong berdesain seperti sebelumnya, tidak pernah
menjadi ikon "gambar rusak".

## Kalau mau mengganti fotonya

Foto sumber aslinya ada di
`OneDrive/Dokumen/Website Project/Kartuundangan Project/FOTO UNTUK SAMPEL/`
(FOLDER 1/2/3). Untuk mengolah ulang, tidak ada ImageMagick di mesin ini —
yang dipakai skrip `System.Drawing` (bawaan .NET) untuk foto dan pemotong
frame MP3 buatan sendiri untuk musik, keduanya di scratchpad sesi.
Pemotongan fotonya "cover" dari titik sepertiga atas, supaya potret orang
tidak terpotong kepalanya.

Catatan penting: **begitu `sampul.jpg` sebuah tema diganti, thumbnail tema
itu harus dipotret ulang** (`templates/<kategori>/<tema>/assets/thumbnail.jpg`,
780×1170) — kalau tidak, kartu tema di halaman depan masih memperlihatkan
sampul yang lama.

## Soal hak pakai

Foto dan lagu di sini tayang publik di halaman pratinjau, jadi berlaku sama
seperti materi pemasaran lain. Lagu yang dipakai sekarang adalah rekaman
komersial (Glenn Fredly, Payung Teduh, Tulus) yang dipotong 45 detik —
pastikan pemakaiannya memang sudah kamu pertimbangkan, atau ganti dengan
musik berlisensi bebas.

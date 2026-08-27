# Berkas contoh untuk halaman Pratinjau tema

Taruh berkas di folder ini. Ketiga tema memakai **set yang sama** — jadi
cukup satu kali, bukan tiga kali.

## Kenapa ada folder ini

Halaman `templates/pratinjau.html` memuat berkas tema **apa adanya**, tanpa
data siapa pun. Tanpa berkas di sini, calon pembeli yang menekan "Pratinjau"
melihat undangan dengan semua slot foto kosong dan tombol musik mati —
bukan gambaran yang adil tentang hasil akhirnya.

## Berkas yang dicari

| Berkas         | Dipakai di                | Saran ukuran        |
|----------------|---------------------------|---------------------|
| `sampul.jpg`   | Latar penuh sampul depan  | 1200 × 1800 (potret)|
| `utama.jpg`    | Foto utama di bagian hero | 1200 × 1500         |
| `pria.jpg`     | Foto mempelai pria        | 800 × 1000 (potret) |
| `wanita.jpg`   | Foto mempelai wanita      | 800 × 1000 (potret) |
| `galeri-1.jpg` … `galeri-6.jpg` | Galeri momen | 1000 × 1000 (persegi) |
| `musik.mp3`    | Musik latar               | lihat catatan bawah |

**Semua opsional.** Berkas yang belum ada dilewati begitu saja — slotnya
tetap menampilkan keadaan kosong berdesain seperti sekarang, tidak pernah
menjadi ikon "gambar rusak".

## Saran isi

- **`sampul.jpg` yang paling menentukan.** Itu yang pertama dilihat orang.
  Pilih foto **potret** dengan ruang lapang di tengah — nama mempelai dan
  tombol "Buka Undangan" duduk di situ. Foto dengan wajah tepat di tengah
  akan tertutup tulisan.
- Hindari foto yang terlalu ramai di bagian bawah: di situ gradasi gelap
  paling pekat.
- Ukuran berkas: usahakan tiap foto **di bawah 400 KB** (dan `sampul.jpg`
  di bawah 600 KB). Pratinjau memuat semuanya sekaligus.
- `musik.mp3`: **30–60 detik sudah cukup**, dan pakai bitrate 128 kbps.
  Lagu utuh 5 menit berukuran 8 MB membuat pratinjau terasa berat, padahal
  yang perlu ditunjukkan cuma bahwa fiturnya ada dan enak.
- Pastikan kamu berhak memakai foto dan lagunya. Ini tampil publik di
  halaman pratinjau, jadi berlaku sama seperti materi pemasaran lain.

## Kalau mau berbeda per tema

Sekarang ketiganya memakai set yang sama. Kalau nanti tiap tema mau punya
foto sendiri (mis. Emerald Dusk bernuansa malam), bilang saja — tinggal
mengubah `BASIS` di `assets/demo-template.js` menjadi per-tema.

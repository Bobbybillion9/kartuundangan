# Logo metode pembayaran

Taruh berkas logo di folder ini. Kisi logo di footer `index.html` mencarinya
otomatis — tidak ada kode yang perlu diubah setelah berkasnya masuk.

## Nama berkas yang dicari

Urutannya: `.svg` dulu, kalau tidak ada baru `.png`. Kalau dua-duanya tidak
ada, chip-nya menampilkan nama metode sebagai teks — jadi footer tidak
pernah terlihat rusak walaupun logonya belum lengkap.

| Metode      | Nama berkas                    |
|-------------|--------------------------------|
| QRIS        | `qris.svg` / `qris.png`        |
| GoPay       | `gopay.svg` / `gopay.png`      |
| ShopeePay   | `shopeepay.svg` / `.png`       |
| BCA         | `bca.svg` / `bca.png`          |
| BNI         | `bni.svg` / `bni.png`          |
| BRI         | `bri.svg` / `bri.png`          |
| Mandiri     | `mandiri.svg` / `mandiri.png`  |
| Permata     | `permata.svg` / `permata.png`  |
| CIMB Niaga  | `cimb.svg` / `cimb.png`        |
| BSI         | `bsi.svg` / `bsi.png`          |

## Saran teknis

- **SVG lebih baik** daripada PNG: tajam di layar retina dan ukurannya kecil.
- Kalau hanya punya PNG, pakai tinggi minimal **80px** supaya tidak pecah.
- Logo dengan **latar transparan**, bukan kotak putih — chip-nya sudah punya
  latar sendiri, dan kotak putih di dalam kotak putih terlihat bertumpuk.
- Rapikan area kosong di sekeliling logo (trim) supaya semua logo terlihat
  seukuran di kisinya.

## Dari mana mengambil logonya

Ambil dari **asset kit resmi Midtrans untuk merchant**, atau dari halaman
brand resource bank/e-wallet masing-masing. Jangan mengambil dari hasil
pencarian gambar: kualitasnya tidak terjamin dan hak pakainya tidak jelas.

Menampilkan logo metode pembayaran yang memang kamu terima adalah pemakaian
yang lazim bagi merchant, tapi tiap merek punya aturan pemakaiannya sendiri
(jarak aman, warna, larangan mengubah bentuk). Itu sebabnya berkasnya
diserahkan ke pemilik usaha, bukan diambil sendiri oleh saya.

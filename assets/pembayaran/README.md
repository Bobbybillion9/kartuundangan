# Logo metode pembayaran

Kisi logo di footer `index.html` mencari berkas di folder ini secara
otomatis — tidak ada kode yang perlu diubah setelah berkasnya masuk.
Daftar & pengelompokannya ada di `GRUP_BAYAR` (`assets/app.js`), dan harus
tetap cocok dengan `KANAL_AKTIF` (`api/_lib/midtrans.js`).

## Keadaan sekarang

| Kelompok            | Metode      | Berkas            | Status        |
|---------------------|-------------|-------------------|---------------|
| QRIS & e-wallet     | QRIS        | `qris.svg`        | ada           |
|                     | GoPay       | `gopay.svg`       | ada           |
|                     | ShopeePay   | `shopeepay.svg`   | ada           |
| Transfer bank (VA)  | BCA         | `bca.svg`         | **belum ada** |
|                     | Mandiri     | `mandiri.svg`     | ada           |
|                     | BNI         | `bni.svg`         | ada           |
|                     | BRI         | `bri.svg`         | **belum ada** |
|                     | Permata     | `permata.svg`     | ada           |
|                     | CIMB Niaga  | `cimb.svg`        | ada           |
|                     | BSI         | `bsi.svg`         | ada           |
| Kartu debit & kredit| Visa        | `visa.svg`        | ada           |
|                     | Mastercard  | `mastercard.svg`  | ada           |

BCA dan BRI menampilkan namanya sebagai teks sampai berkasnya ditaruh di
sini. Footer tidak terlihat rusak karenanya — tapi dua chip berteks di
antara sepuluh chip berlogo memang terlihat belum selesai.

## Cara kerjanya

Urutan yang dicoba: `.svg` dulu, kalau gagal `.png`, kalau dua-duanya gagal
barulah nama metodenya ditampilkan sebagai teks. Teksnya dipasang lebih
dulu dan baru disembunyikan setelah gambarnya benar-benar berhasil dimuat,
supaya tidak ada satu momen pun chip-nya kosong.

Logo yang bentuknya mendekati kotak (rasio < 1,9 — GoPay, BSI) otomatis
diberi jatah tinggi lebih besar lewat kelas `.pay-logo-kotak`. Tanpa itu ia
tampil jauh lebih kecil daripada logo memanjang yang mentok di lebar chip.

## Saran teknis

- **SVG lebih baik** daripada PNG: tajam di layar retina dan ukurannya kecil.
- Kalau hanya punya PNG, pakai tinggi minimal **80px** supaya tidak pecah.
- Logo dengan **latar transparan**, bukan kotak putih — chip-nya sudah punya
  latar sendiri, dan kotak putih di dalam kotak putih terlihat bertumpuk.
- Rapikan area kosong di sekeliling logo (trim) supaya semua logo terlihat
  seukuran di kisinya. BSI paling terasa: berkasnya berkanvas 960×540 dengan
  margin lebar, jadi logonya tampil kecil.

## Dari mana mengambil logonya

Ambil dari **asset kit resmi Midtrans untuk merchant**, atau dari halaman
brand resource bank/e-wallet masing-masing. Jangan mengambil dari hasil
pencarian gambar: kualitasnya tidak terjamin dan hak pakainya tidak jelas.

Menampilkan logo metode pembayaran yang memang kamu terima adalah pemakaian
yang lazim bagi merchant, tapi tiap merek punya aturan pemakaiannya sendiri
(jarak aman, warna, larangan mengubah bentuk).

# SiHadir - Sistem Monitoring Kehadiran dan Pencegahan Bolos

Aplikasi web (Node.js + Express + MySQL) untuk mencatat kehadiran siswa per jam pelajaran, mendeteksi siswa yang sering alpa, mengelola izin online, dan mencatat tindak lanjut Guru BK.

Tugas Team-Based Project (TBP) mata kuliah Rekayasa Perangkat Lunak: praktik pipeline CI dengan GitHub Actions.

**Kelompok 13** (Kelas A, S1 Teknik Informatika)
1. Muh. Ammul Arridzyq (F5512510020)
2. Nurmasyita Alfatia Manaba (F5512510034)
3. Adraka Tristan (F5512520036)

## 1. Pipeline CI

Berkas workflow: `.github/workflows/ci.yml`

**Pemicu:** setiap `push` dan `pull request` ke branch `main`.

**Langkah pipeline:**

| No | Langkah | Keterangan |
|----|---------|------------|
| 1 | Checkout | Mengambil kode dari repository |
| 2 | Setup Node.js 20 | Dengan cache npm |
| 3 | `npm ci` | Memasang dependensi sesuai `package-lock.json` |
| 4 | Siapkan database | Menjalankan layanan MySQL 8 dan mengimpor `schema.sql` |
| 5 | `npm test` | Menjalankan 3 test otomatis |

**Test yang dijalankan** (`test/app.test.js`):
1. Halaman login tampil dengan status 200.
2. Dashboard tanpa login diarahkan ke halaman login.
3. Login dengan password salah ditolak.

## 2. Menjalankan Test di Komputer Lokal

Prasyarat: Node.js 20 ke atas, MySQL (Laragon) menyala.

```bash
npm install
```

Impor `schema.sql` ke MySQL (phpMyAdmin, tab SQL), lalu:

```bash
npm test
```

Hasil yang diharapkan: `tests 3`, `pass 3`, `fail 0`.

## 3. Menjalankan Aplikasi

```bash
npm run seed   # sekali saja, mengisi data contoh dan membuat akun.txt
npm start      # buka http://localhost:3000
```

Pengaturan database dibaca dari variabel lingkungan `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`. Jika tidak diatur, bawaannya `localhost`, `root`, password kosong, dan database `sihadir`.

## 4. Menjalankan CI

1. Push kode ke GitHub, atau buka Pull Request ke `main`.
2. Buka tab **Actions** di repository.
3. Pilih run terbaru, lalu klik langkah `npm test` untuk melihat log.

## 5. Bukti Eksekusi

Repository: https://github.com/ammularridzyq-coder/SiHadir_ProjectRPL

| Bukti | Keterangan | Tautan |
|-------|------------|--------|
| Run sukses awal | CI #1, push ke `main`, durasi 40 detik | [Halaman Actions](https://github.com/ammularridzyq-coder/SiHadir_ProjectRPL/actions) |
| Run gagal (sengaja) | CI #2, Pull Request #1, branch `uji-gagal`, durasi 42 detik | [Pull Request #1](https://github.com/ammularridzyq-coder/SiHadir_ProjectRPL/pull/1) |
| Run setelah perbaikan | CI #5, Pull Request #2, branch `revert-1-uji-gagal`, berhasil | [Pull Request #2](https://github.com/ammularridzyq-coder/SiHadir_ProjectRPL/pull/2) |
| Run setelah merge | CI #6, push ke `main`, berhasil | [Halaman Actions](https://github.com/ammularridzyq-coder/SiHadir_ProjectRPL/actions) |

Screenshot semua run: `bukti/actions-semua-run.png`

## 6. Ringkasan Error dan Perbaikan

| Item | Keterangan |
|------|------------|
| Penyebab kegagalan | Pada branch `uji-gagal`, test "halaman login tampil" diubah agar mengharapkan teks "Selamat tinggal", sedangkan halaman login menampilkan "Selamat datang". Pemeriksaan teks (assert) tidak cocok sehingga test gagal dan CI #2 berwarna merah. |
| Pesan error di log | [ISI: salin satu baris pesan error dari log langkah `npm test` pada CI #2] |
| Langkah perbaikan | Perubahan dibatalkan lewat Pull Request #2 (revert), sehingga test kembali mengharapkan teks "Selamat datang". |
| Hasil setelah perbaikan | CI #5 pada Pull Request #2 berhasil. Setelah di-merge ke `main`, CI #6 juga berhasil dengan 3 test lulus. |

## 7. Pembagian Peran

| Nama | NIM | Peran |
|------|-----|-------|
| Muh. Ammul Arridzyq | F5512510020 | Menyiapkan repository dan struktur proyek, menulis dan memperbaiki workflow `ci.yml` |
| Nurmasyita Alfatia Manaba | F5512510034 | Menulis dan menjalankan test lokal, membuat kegagalan sengaja dan memperbaikinya |
| Adraka Tristan | F5512520036 | Dokumentasi error, screenshot bukti run, dan README |

## Struktur Proyek

```
sihadir-node/
  .github/workflows/ci.yml   workflow CI
  test/app.test.js           test otomatis
  public/style.css           tampilan
  server.js, fitur.js        aplikasi
  db.js                      koneksi database
  schema.sql, seed.js        database dan data contoh
```

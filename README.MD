# SiHadir - Sistem Monitoring Kehadiran dan Pencegahan Bolos

Aplikasi web (Node.js + Express + MySQL) untuk mencatat kehadiran siswa per jam pelajaran, mendeteksi siswa yang sering alpa, mengelola izin online, dan mencatat tindak lanjut Guru BK.

Tugas Team-Based Project (TBP) mata kuliah Rekayasa Perangkat Lunak: praktik pipeline Continuous Integration (CI) dengan GitHub Actions.

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
| 2 | Setup Node.js 20 | Menyiapkan lingkungan Node.js dengan cache npm |
| 3 | `npm ci` | Memasang dependensi sesuai `package-lock.json` |
| 4 | Siapkan database | Menjalankan layanan MySQL 8 dan mengimpor `schema.sql` |
| 5 | `npm test` | Menjalankan 3 test otomatis |

**Test yang dijalankan** (`test/app.test.js`):

1. Halaman login tampil dengan status 200.
2. Dashboard tanpa login diarahkan ke halaman login.
3. Login dengan password salah ditolak.

## 2. Menjalankan Test di Komputer Lokal

**Prasyarat:**
- Node.js versi 20 atau lebih baru.
- MySQL aktif melalui Laragon.
- Repository SiHadir sudah diunduh atau di-clone.

Pasang dependensi terlebih dahulu:

```bash
npm install
```

Impor file `schema.sql` ke MySQL melalui phpMyAdmin pada tab SQL.

Setelah database siap, jalankan:

```bash
npm test
```

**Hasil yang diharapkan:**

```text
tests 3
pass 3
fail 0
```

## 3. Menjalankan Aplikasi

Jalankan perintah berikut:

```bash
npm run seed
npm start
```

Perintah `npm run seed` dijalankan sekali untuk mengisi data contoh dan membuat file `akun.txt`.

Setelah server berjalan, buka alamat berikut di browser:

```text
http://localhost:3000
```

**Konfigurasi database**

Pengaturan database dibaca dari variabel lingkungan:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

Jika tidak diatur, nilai bawaan adalah:

| Pengaturan | Nilai bawaan |
|------------|--------------|
| Host | `localhost` |
| User | `root` |
| Password | Kosong |
| Database | `sihadir` |

## 4. Menjalankan CI dengan GitHub Actions

1. Lakukan perubahan kode pada project.
2. Simpan perubahan dan lakukan `commit`.
3. Push perubahan ke repository GitHub atau buat Pull Request menuju branch `main`.
4. Buka tab **Actions** pada repository.
5. Pilih workflow CI terbaru.
6. Periksa setiap langkah pipeline, khususnya `npm test`, untuk melihat hasil dan log pengujian.

Repository GitHub:

https://github.com/ammularridzyq-coder/SiHadir_ProjectRPL

Halaman GitHub Actions:

https://github.com/ammularridzyq-coder/SiHadir_ProjectRPL/actions

## 5. Bukti Eksekusi

| Bukti | Tautan |
|-------|--------|
| Repository | [SiHadir Project RPL](https://github.com/ammularridzyq-coder/SiHadir_ProjectRPL) |
| Run sukses awal | [CI #1 - Project SiHadir + CI](https://github.com/ammularridzyq-coder/SiHadir_ProjectRPL/actions/runs/43815235709) |
| Run gagal (pengujian sengaja) | [CI #2 - Kegagalan Pada Selamat Tinggal](https://github.com/ammularridzyq-coder/SiHadir_ProjectRPL/actions/runs/43816090706) |
| Run setelah perbaikan | [CI #5 - Perbaikan Kegagalan Selamat Tinggal Menjadi Selamat Datang](https://github.com/ammularridzyq-coder/SiHadir_ProjectRPL/actions/runs/43817416305) |

Screenshot bukti eksekusi dapat disimpan dalam folder `bukti/`, meliputi:

- Tampilan workflow CI yang berhasil.
- Tampilan workflow CI yang gagal.
- Tampilan workflow setelah perbaikan.
- Log hasil pengujian otomatis.

## 6. Ringkasan Error dan Perbaikan

| Item | Keterangan |
|------|------------|
| Penyebab kegagalan | Test mengharapkan teks "Selamat Tinggal", sedangkan halaman login menampilkan teks "Selamat datang". |
| Pesan error di log | Proses pengujian gagal dengan `Process completed with exit code 1`. |
| Langkah perbaikan | Memperbaiki teks yang diharapkan pada test agar sesuai dengan teks yang ditampilkan oleh halaman login. |
| Hasil setelah perbaikan | Workflow CI berhasil dijalankan kembali dan 3 test dinyatakan lulus. |

Pengujian kegagalan sengaja dilakukan untuk membuktikan bahwa GitHub Actions dapat mendeteksi kesalahan pada proses pengujian. Setelah kesalahan diperbaiki, perubahan dikirim kembali ke repository dan pipeline dijalankan ulang hingga berhasil.

## 7. Pembagian Peran

| Nama | NIM | Peran |
|------|-----|-------|
| Muh. Ammul Arridzyq | F5512510020 | Menyiapkan repository dan struktur proyek, menulis serta memperbaiki workflow `ci.yml`. |
| Nurmasyita Alfatia Manaba | F5512510034 | Menulis dan menjalankan test lokal, membuat kegagalan pengujian secara sengaja, serta memperbaikinya. |
| Adraka Tristan | F5512520036 | Menyusun dokumentasi error, mengambil screenshot bukti eksekusi, dan membuat README. |

## 8. Struktur Proyek

```text
sihadir-node/
├── .github/
│   └── workflows/
│       └── ci.yml          # Konfigurasi pipeline CI
├── test/
│   └── app.test.js         # Test otomatis
├── public/
│   └── style.css           # Tampilan aplikasi
├── server.js               # Server aplikasi
├── fitur.js                # Fitur aplikasi
├── db.js                   # Koneksi database
├── schema.sql              # Struktur database
├── seed.js                 # Pengisian data contoh
├── package.json            # Konfigurasi dan dependensi
└── package-lock.json       # Versi dependensi
```

---

**SiHadir - Kelompok 13**  
Team-Based Project (TBP)  
Mata Kuliah Rekayasa Perangkat Lunak  
S1 Teknik Informatika - Kelas A

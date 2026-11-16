DROP DATABASE IF EXISTS sihadir;
CREATE DATABASE sihadir CHARACTER SET utf8mb4;
USE sihadir;
CREATE TABLE users(id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(40) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, nama VARCHAR(60) NOT NULL, role ENUM('admin','guru','wali','bk','ortu') NOT NULL, siswa_id INT NULL);
CREATE TABLE kelas(id INT AUTO_INCREMENT PRIMARY KEY, nama VARCHAR(20) NOT NULL, wali_id INT NULL, FOREIGN KEY(wali_id) REFERENCES users(id));
CREATE TABLE siswa(id INT AUTO_INCREMENT PRIMARY KEY, nis VARCHAR(15) UNIQUE NOT NULL, nama VARCHAR(60) NOT NULL, kelas_id INT NOT NULL, no_hp_ortu VARCHAR(20), FOREIGN KEY(kelas_id) REFERENCES kelas(id));
CREATE TABLE absensi(id INT AUTO_INCREMENT PRIMARY KEY, siswa_id INT NOT NULL, tanggal DATE NOT NULL, jam_ke TINYINT NOT NULL, mapel VARCHAR(40) NOT NULL, status ENUM('hadir','izin','sakit','alpa') NOT NULL, guru_id INT NOT NULL,
 UNIQUE KEY uq(siswa_id,tanggal,jam_ke), FOREIGN KEY(siswa_id) REFERENCES siswa(id), FOREIGN KEY(guru_id) REFERENCES users(id));
CREATE TABLE izin(id INT AUTO_INCREMENT PRIMARY KEY, siswa_id INT NOT NULL, tanggal DATE NOT NULL, jenis ENUM('izin','sakit') NOT NULL, alasan VARCHAR(255) NOT NULL, status ENUM('menunggu','disetujui','ditolak') DEFAULT 'menunggu', dibuat TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(siswa_id) REFERENCES siswa(id));
CREATE TABLE tindak_lanjut(id INT AUTO_INCREMENT PRIMARY KEY, siswa_id INT NOT NULL, bk_id INT NOT NULL, catatan TEXT NOT NULL, status ENUM('proses','selesai') DEFAULT 'proses', dibuat TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(siswa_id) REFERENCES siswa(id), FOREIGN KEY(bk_id) REFERENCES users(id));
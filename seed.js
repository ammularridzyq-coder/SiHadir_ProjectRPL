// Jalankan sekali setelah schema.sql: npm run seed. Daftar akun tersimpan di akun.txt
const bcrypt = require('bcryptjs'), crypto = require('crypto'), fs = require('fs'), db = require('./db');
const depan = ['Andi','Budi','Citra','Dewi','Eko','Fajar','Gita','Hendra','Intan','Joko','Kiki','Lia','Mario','Nadia','Oka','Putri','Qori','Rizky','Sinta','Tegar','Umar','Vina','Wahyu','Xena','Yusuf','Zahra','Aldi','Bella','Dimas','Elsa'];
const belakang = ['Pratama','Santoso','Lestari','Wijaya','Saputra','Anggraini','Hidayat','Kurniawan','Ramadhan','Putri','Nugraha','Maharani'];
const slug = s => s.toLowerCase().replace(/[^a-z]+/g, '.');
const sil = ['ka','lo','mi','ra','tu','be','sa','no','vi','zu'], sim = '!@#$%&*';
const acak = () => sil[crypto.randomInt(10)] + sil[crypto.randomInt(10)].toUpperCase() + sil[crypto.randomInt(10)] + crypto.randomInt(10, 99) + sim[crypto.randomInt(7)] + crypto.randomInt(10, 99);
const akun = [];
async function user(username, nama, role, pass, siswa_id = null) {
  const [r] = await db.query('INSERT INTO users(username,password,nama,role,siswa_id) VALUES(?,?,?,?,?)', [username, bcrypt.hashSync(pass, 8), nama, role, siswa_id]);
  akun.push(`${role.padEnd(6)} ${username.padEnd(26)} ${pass}   (${nama})`);
  return r.insertId;
}
(async () => {
  await user('admin', 'Administrator', 'admin', 'Admin@2026');
  const guru1 = await user('sari', 'Sari Wulandari', 'guru', 'Mtk!Sari88');
  await user('budi', 'Budi Hartono', 'guru', 'Bio$Budi21');
  const w1 = await user('hasan', 'Hasan Basri', 'wali', 'Hasan#XA7');
  const w2 = await user('maya', 'Maya Sulistyo', 'wali', 'Maya@XB42');
  const bk = await user('rina', 'Rina Marlina', 'bk', 'Rina*BK2026');
  const siswaIds = [];
  for (const [k, nama, wali] of [[1, 'X-A', w1], [2, 'X-B', w2]]) {
    const [kr] = await db.query('INSERT INTO kelas(nama,wali_id) VALUES(?,?)', [nama, wali]);
    for (let i = 0; i < 30; i++) {
      const sn = depan[(i + (k - 1) * 11) % 30] + ' ' + belakang[(i * 3 + k * 5) % 12];
      const [sr] = await db.query('INSERT INTO siswa(nis,nama,kelas_id,no_hp_ortu) VALUES(?,?,?,?)', [`2026${k}${String(i + 1).padStart(2, '0')}`, sn, kr.insertId, '08' + crypto.randomInt(1e9, 2e9 - 1)]);
      siswaIds.push({ id: sr.insertId, i, nama: sn });
      await user('ortu.' + slug(sn) + k, 'Orang tua ' + sn, 'ortu', acak(), sr.insertId);
    }
  }
  const mapel = ['Matematika', 'Bahasa Indonesia'], rows = [];
  for (let d = 30; d >= 1; d--) {
    const t = new Date(Date.now() - d * 864e5);
    if ([0, 6].includes(t.getDay())) continue;
    const tgl = t.toISOString().slice(0, 10);
    for (const s of siswaIds) for (let j = 0; j < 2; j++) {
      const r = Math.random(), pa = s.i % 8 === 0 ? 0.22 : s.i % 8 === 3 ? 0.06 : 0.02;
      const st = r < pa ? 'alpa' : r < pa + 0.03 ? 'izin' : r < pa + 0.06 ? 'sakit' : 'hadir';
      rows.push([s.id, tgl, j + 1, mapel[j], st, guru1]);
    }
  }
  await db.query('INSERT INTO absensi(siswa_id,tanggal,jam_ke,mapel,status,guru_id) VALUES ?', [rows]);
  const hari = new Date().toISOString().slice(0, 10);
  await db.query('INSERT INTO izin(siswa_id,tanggal,jenis,alasan) VALUES (?,?,?,?),(?,?,?,?)', [siswaIds[4].id, hari, 'sakit', 'Demam sejak semalam', siswaIds[36].id, hari, 'izin', 'Menghadiri acara keluarga']);
  await db.query('INSERT INTO tindak_lanjut(siswa_id,bk_id,catatan) VALUES (?,?,?)', [siswaIds[0].id, bk, 'Pemanggilan awal: siswa sering tidak masuk jam pelajaran kedua.']);
  fs.writeFileSync('akun.txt', 'DAFTAR AKUN SIHADIR\n' + akun.join('\n') + '\n');
  console.log(`Selesai: ${akun.length} akun, ${siswaIds.length} siswa, ${rows.length} data absensi. Lihat akun.txt`);
  process.exit();
})();

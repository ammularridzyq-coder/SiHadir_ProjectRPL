const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({ secret: 'ganti-dengan-rahasia-anda', resave: false, saveUninitialized: false }));

const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const cap = s => s[0].toUpperCase() + s.slice(1);
const ROLE = { admin: 'Administrator', guru: 'Guru Mata Pelajaran', wali: 'Wali Kelas', bk: 'Guru BK' };
const FONT = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">';
const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 12l3 3 5-6"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10"/></svg>'
};
const S = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
ICON.chart = S('M4 20V10M10 20V4M16 20v-7M22 20H2');
ICON.mail = S('M4 5h16v14H4zM4 7l8 6 8-6');
ICON.note = S('M9 4h6v3H9zM6 5H5v16h14V5h-1M9 13h6M9 17h4');

function page(u, title, active, body) {
  const nav = (href, key, icon, label) => `<a href="${href}" class="${active === key ? 'on' : ''}">${ICON[icon]}${label}</a>`;
  const has = (...r) => r.includes(u.role);
  const absen = (has('guru','wali','admin') ? nav('/absensi','absensi','check','Absensi') : '') + (has('admin','guru','wali','bk') ? nav('/rekap','rekap','chart','Rekap') : '') + (has('admin','wali','ortu') ? nav('/izin','izin','mail','Izin') : '') + (has('admin','wali','bk') ? nav('/tindak','tindak','note','Tindak lanjut') : '');
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} - SiHadir</title>${FONT}<link rel="stylesheet" href="/style.css"></head><body><div class="app"><aside><div class="logo"><i>S</i>SiHadir</div>${nav('/dashboard','dash','home','Dashboard')}${absen}${nav('/logout','x','out','Keluar')}<div class="me"><b>${e(u.nama)}</b>${ROLE[u.role] || u.role}</div></aside><main>${body}</main></div></body></html>`;
}
const need = (roles = []) => (req, res, next) => {
  if (!req.session.u) return res.redirect('/');
  if (roles.length && !roles.includes(req.session.u.role)) return res.status(403).send('Akses ditolak');
  next();
};

require('./fitur')(app, { db, e, cap, page, need });

const loginPage = err => `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Masuk - SiHadir</title>${FONT}<link rel="stylesheet" href="/style.css"></head><body><div class="login"><section class="brand"><h1>Setiap siswa, setiap jam pelajaran.</h1><p>Pantau kehadiran dan temukan siswa yang mulai sering bolos sebelum terlambat.</p></section><section class="form"><form method="post" action="/login"><div><h1>Selamat datang</h1><p class="mute">Masuk untuk melanjutkan.</p></div>${err ? `<div class="err">${e(err)}</div>` : ''}<label>Username<input name="username" required autofocus></label><label>Password<input type="password" name="password" required></label><button class="btn">Masuk</button></form></section></div></body></html>`;

app.get('/', (req, res) => res.send(loginPage('')));
app.post('/login', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM users WHERE username=?', [req.body.username || '']);
  const u = rows[0];
  if (u && bcrypt.compareSync(req.body.password || '', u.password)) {
    req.session.u = { id: u.id, nama: u.nama, role: u.role, siswa_id: u.siswa_id };
    return res.redirect('/dashboard');
  }
  res.send(loginPage('Username atau password salah. Periksa lalu coba lagi.'));
});
app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

app.get('/dashboard', need(), async (req, res) => {
  const c = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  const [hari] = await db.query('SELECT status, COUNT(*) n FROM absensi WHERE tanggal=CURDATE() GROUP BY status');
  hari.forEach(r => c[r.status] = r.n);
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const pct = total ? Math.round(c.hadir / total * 100) : 0;
  const [risiko] = await db.query(`SELECT s.id, s.nama, s.no_hp_ortu, k.nama kelas, COUNT(*) n
    FROM absensi a JOIN siswa s ON s.id=a.siswa_id JOIN kelas k ON k.id=s.kelas_id
    WHERE a.status='alpa' AND a.tanggal>=CURDATE()-INTERVAL 30 DAY GROUP BY s.id HAVING n>=3 ORDER BY n DESC`);
  const h = new Date().getHours();
  const sapa = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  const chips = Object.entries(c).map(([k, n]) => `<span class="chip" style="--c:var(--${k})">${cap(k)} ${n}</span>`).join('');
  const list = risiko.length ? risiko.map(r => `<div class="row"><div class="av">${e(r.nama[0])}</div><div class="grow"><b>${e(r.nama)}</b> <span class="mute">Kelas ${e(r.kelas)} &middot; Orang tua ${e(r.no_hp_ortu)}</span><div class="bar"><i style="width:${Math.min(r.n * 15, 100)}%"></i></div></div><span class="badge">${r.n} kali alpa</span>${['admin','wali','bk'].includes(req.session.u.role) ? `<a class="btn sm ghost" href="/tindak?siswa_id=${r.id}">Tindak lanjut</a>` : ''}</div>`).join('')
    : '<div class="empty">Belum ada siswa yang berisiko. Kebiasaan hadir kelas Anda sedang baik.</div>';
  const hero = total
    ? `<div class="ring" style="--p:${pct}"><b>${pct}%</b></div><div><h2>Kehadiran hari ini</h2><p>${c.hadir} dari ${total} data absensi tercatat hadir.</p><div class="chips">${chips}</div></div>`
    : `<div class="ring"><b>0%</b></div><div><h2>Belum ada absensi hari ini</h2><p>Mulai catat kehadiran agar ringkasan muncul di sini.</p><div class="chips"><a class="btn" style="background:var(--sun);color:var(--ink)" href="/absensi">Catat absensi</a></div></div>`;
  res.send(page(req.session.u, 'Dashboard', 'dash', `<div class="top"><h1>${sapa}, ${e(req.session.u.nama.split(' ')[0])}</h1><p class="mute">Ringkasan kehadiran sekolah.</p></div><section class="hero">${hero}</section><section class="card"><h2>Siswa perlu perhatian</h2><p class="mute" style="margin:-.5rem 0 .6rem">Alpa 3 kali atau lebih dalam 30 hari terakhir.</p>${list}</section>`));
});

app.all('/absensi', need(['guru', 'wali', 'admin']), async (req, res) => {
  let toast = '';
  if (req.method === 'POST' && req.body.status) {
    const { tanggal, jam_ke, mapel, status } = req.body;
    for (const [sid, st] of Object.entries(status)) {
      if (!['hadir','izin','sakit','alpa'].includes(st)) continue;
      await db.query(`INSERT INTO absensi(siswa_id,tanggal,jam_ke,mapel,status,guru_id) VALUES(?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE status=VALUES(status), mapel=VALUES(mapel), guru_id=VALUES(guru_id)`,
        [Number(sid), tanggal, Number(jam_ke), mapel.trim(), st, req.session.u.id]);
    }
    toast = '<div class="toast" role="status">Absensi tersimpan.</div>';
  }
  const kid = Number(req.query.kelas_id || req.body.kelas_id || 0);
  const [kelas] = await db.query('SELECT * FROM kelas');
  let form = '';
  if (kid) {
    const [siswa] = await db.query('SELECT * FROM siswa WHERE kelas_id=? ORDER BY nama', [kid]);
    const [iz] = await db.query("SELECT siswa_id, jenis FROM izin WHERE status='disetujui' AND tanggal=CURDATE()");
    const izm = Object.fromEntries(iz.map(r => [r.siswa_id, r.jenis]));
    const baris = siswa.map(s => `<div class="row s"><div class="av">${e(s.nama[0])}</div><div class="grow"><b>${e(s.nama)}</b><div class="mute">NIS ${e(s.nis)}</div></div><div class="seg">${['hadir','izin','sakit','alpa'].map(st =>
      `<label style="--c:var(--${st})"><input type="radio" name="status[${s.id}]" value="${st}" ${st === (izm[s.id] || 'hadir') ? 'checked' : ''}><span>${cap(st)}</span></label>`).join('')}</div></div>`).join('');
    form = `<form method="post" action="/absensi" id="f"><input type="hidden" name="kelas_id" value="${kid}">
      <div class="card"><div class="fields"><label>Tanggal<input type="date" name="tanggal" value="${new Date().toISOString().slice(0,10)}" required></label><label>Jam pelajaran ke<input type="number" name="jam_ke" min="1" max="10" value="1" required style="width:90px"></label><label>Mata pelajaran<input name="mapel" placeholder="Contoh: Matematika" required></label></div></div>
      <div class="card">${baris}</div>
      <div class="bottom"><div class="sum" id="sum"></div><button type="button" class="btn ghost" id="all">Semua hadir</button><button class="btn">Simpan absensi</button></div></form>
      <script>const f=document.getElementById('f'),sum=document.getElementById('sum');
      function hitung(){const c={hadir:0,izin:0,sakit:0,alpa:0};f.querySelectorAll('input[type=radio]:checked').forEach(r=>c[r.value]++);sum.textContent='Hadir '+c.hadir+' \\u00b7 Izin '+c.izin+' \\u00b7 Sakit '+c.sakit+' \\u00b7 Alpa '+c.alpa}
      f.addEventListener('change',hitung);document.getElementById('all').onclick=()=>{f.querySelectorAll('input[value=hadir]').forEach(r=>r.checked=true);hitung()};hitung();</script>`;
  } else {
    form = '<div class="card empty">Pilih kelas terlebih dahulu untuk menampilkan daftar siswa.</div>';
  }
  const opsi = kelas.map(k => `<option value="${k.id}" ${k.id === kid ? 'selected' : ''}>${e(k.nama)}</option>`).join('');
  res.send(page(req.session.u, 'Absensi', 'absensi', `${toast}<div class="top"><h1>Input absensi</h1><p class="mute">Tandai kehadiran setiap siswa pada jam pelajaran ini.</p></div>
    <form class="card" method="get" action="/absensi"><div class="fields"><label>Kelas<select name="kelas_id" onchange="this.form.submit()"><option value="">Pilih kelas</option>${opsi}</select></label></div></form>${form}`));
});

if (require.main === module) app.listen(3000, () => console.log('SiHadir berjalan di http://localhost:3000'));
module.exports = app;
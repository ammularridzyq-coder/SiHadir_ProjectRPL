// Fitur tambahan: dashboard orang tua, rekap, izin online, tindak lanjut BK
module.exports = (app, { db, e, cap, page, need }) => {
  const tgl = d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const pill = (s, c = s) => `<span class="pill" style="--c:var(--${c})">${cap(s)}</span>`;
  const warna = { menunggu: 'izin', disetujui: 'hadir', ditolak: 'alpa', proses: 'izin', selesai: 'hadir' };
  const hariIni = () => new Date().toISOString().slice(0, 10);
  const kelasOpsi = (kelas, kid) => kelas.map(k => `<option value="${k.id}" ${k.id === kid ? 'selected' : ''}>${e(k.nama)}</option>`).join('');

  // Dashboard orang tua
  app.get('/dashboard', async (req, res, next) => {
    const u = req.session.u;
    if (!u || u.role !== 'ortu') return next();
    const [[s]] = await db.query('SELECT s.nama, s.nis, k.nama kelas FROM siswa s JOIN kelas k ON k.id=s.kelas_id WHERE s.id=?', [u.siswa_id]);
    const c = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    (await db.query('SELECT status, COUNT(*) n FROM absensi WHERE siswa_id=? AND tanggal>=CURDATE()-INTERVAL 30 DAY GROUP BY status', [u.siswa_id]))[0].forEach(r => c[r.status] = r.n);
    const t = Object.values(c).reduce((a, b) => a + b, 0), pct = t ? Math.round(c.hadir / t * 100) : 0;
    const [alpa] = await db.query("SELECT tanggal, jam_ke, mapel FROM absensi WHERE siswa_id=? AND status='alpa' AND tanggal>=CURDATE()-INTERVAL 7 DAY ORDER BY tanggal DESC, jam_ke", [u.siswa_id]);
    const [rec] = await db.query('SELECT tanggal, jam_ke, mapel, status FROM absensi WHERE siswa_id=? ORDER BY tanggal DESC, jam_ke DESC LIMIT 10', [u.siswa_id]);
    const warn = alpa.length ? `<div class="notice"><b>${e(s.nama)} tercatat alpa ${alpa.length} jam pelajaran dalam 7 hari terakhir.</b><br>${alpa.map(a => `${tgl(a.tanggal)}, jam ke-${a.jam_ke} (${e(a.mapel)})`).join(' &middot; ')}<br><a href="/izin">Ajukan izin jika ada keterangan</a></div>` : '';
    const chips = Object.entries(c).map(([k, n]) => `<span class="chip" style="--c:var(--${k})">${cap(k)} ${n}</span>`).join('');
    const rows = rec.map(r => `<div class="row"><div class="grow"><b>${tgl(r.tanggal)}</b> <span class="mute">Jam ke-${r.jam_ke} &middot; ${e(r.mapel)}</span></div>${pill(r.status)}</div>`).join('') || '<div class="empty">Belum ada riwayat kehadiran.</div>';
    res.send(page(u, 'Dashboard', 'dash', `<div class="top"><h1>${e(s.nama)}</h1><p class="mute">Kelas ${e(s.kelas)} &middot; NIS ${e(s.nis)}</p></div>${warn}<section class="hero"><div class="ring" style="--p:${pct}"><b>${pct}%</b></div><div><h2>Kehadiran 30 hari terakhir</h2><p>${c.hadir} dari ${t} jam pelajaran tercatat hadir.</p><div class="chips">${chips}</div></div></section><section class="card"><h2>Riwayat terbaru</h2>${rows}</section>`));
  });

  // Rekap kehadiran per kelas
  app.get('/rekap', need(['admin', 'guru', 'wali', 'bk']), async (req, res) => {
    const [kelas] = await db.query('SELECT * FROM kelas');
    const kid = Number(req.query.kelas_id || kelas[0].id), hari = [7, 30, 90].includes(Number(req.query.hari)) ? Number(req.query.hari) : 30;
    const [d] = await db.query(`SELECT s.nis, s.nama, COALESCE(SUM(a.status='hadir'),0) h, COALESCE(SUM(a.status='izin'),0) i, COALESCE(SUM(a.status='sakit'),0) sk, COALESCE(SUM(a.status='alpa'),0) al, COUNT(a.id) t
      FROM siswa s LEFT JOIN absensi a ON a.siswa_id=s.id AND a.tanggal>=CURDATE()-INTERVAL ? DAY WHERE s.kelas_id=? GROUP BY s.id ORDER BY s.nama`, [hari, kid]);
    const p = r => r.t ? Math.round(r.h / r.t * 100) : 0;
    if (req.query.csv) return res.type('text/csv').attachment('rekap-kehadiran.csv').send('\ufeffNIS,Nama,Hadir,Izin,Sakit,Alpa,Persen\n' + d.map(r => [r.nis, r.nama, r.h, r.i, r.sk, r.al, p(r) + '%'].join(',')).join('\n'));
    const baris = d.map(r => { const x = p(r); return `<tr><td>${e(r.nama)}</td><td class="n">${r.h}</td><td class="n">${r.i}</td><td class="n">${r.sk}</td><td class="n">${r.al}</td><td class="n">${pill(x + '%', x >= 90 ? 'hadir' : x >= 75 ? 'izin' : 'alpa')}</td></tr>`; }).join('');
    const hOpsi = [7, 30, 90].map(x => `<option value="${x}" ${x === hari ? 'selected' : ''}>${x} hari terakhir</option>`).join('');
    res.send(page(req.session.u, 'Rekap', 'rekap', `<div class="top"><h1>Rekap kehadiran</h1><p class="mute">Persentase hadir per siswa. Merah berarti di bawah 75%.</p></div>
      <form class="card" method="get"><div class="fields"><label>Kelas<select name="kelas_id" onchange="this.form.submit()">${kelasOpsi(kelas, kid)}</select></label><label>Periode<select name="hari" onchange="this.form.submit()">${hOpsi}</select></label><a class="btn ghost" style="align-self:end" href="/rekap?kelas_id=${kid}&hari=${hari}&csv=1">Unduh CSV</a></div></form>
      <div class="card scroll"><table class="tbl"><tr><th>Nama</th><th class="n">Hadir</th><th class="n">Izin</th><th class="n">Sakit</th><th class="n">Alpa</th><th class="n">Persen</th></tr>${baris}</table></div>`));
  });

  // Izin online
  app.get('/izin', need(['admin', 'wali', 'ortu']), async (req, res) => {
    const u = req.session.u;
    if (u.role === 'ortu') {
      const [riw] = await db.query('SELECT * FROM izin WHERE siswa_id=? ORDER BY id DESC LIMIT 10', [u.siswa_id]);
      const list = riw.map(z => `<div class="row"><div class="grow"><b>${tgl(z.tanggal)}</b> <span class="mute">${cap(z.jenis)}: ${e(z.alasan)}</span></div>${pill(z.status, warna[z.status])}</div>`).join('') || '<div class="empty">Belum ada pengajuan.</div>';
      return res.send(page(u, 'Izin', 'izin', `<div class="top"><h1>Pengajuan izin</h1><p class="mute">Wali kelas akan memeriksa pengajuan Anda.</p></div>
        <form class="card" method="post" action="/izin"><div class="fields"><label>Tanggal<input type="date" name="tanggal" value="${hariIni()}" required></label><label>Jenis<select name="jenis"><option value="sakit">Sakit</option><option value="izin">Izin</option></select></label></div><p style="margin:1rem 0 .4rem"><label class="mute" for="al"><b>Alasan</b></label></p><textarea id="al" name="alasan" maxlength="250" required></textarea><p style="margin-top:1rem"><button class="btn">Kirim pengajuan</button></p></form>
        <section class="card"><h2>Riwayat pengajuan</h2>${list}</section>`));
    }
    const [z] = await db.query(`SELECT z.*, s.nama, k.nama kelas FROM izin z JOIN siswa s ON s.id=z.siswa_id JOIN kelas k ON k.id=s.kelas_id WHERE ?=1 OR k.wali_id=? ORDER BY z.status='menunggu' DESC, z.id DESC LIMIT 30`, [u.role === 'admin' ? 1 : 0, u.id]);
    const list = z.map(r => `<div class="row s"><div class="av">${e(r.nama[0])}</div><div class="grow"><b>${e(r.nama)}</b> <span class="mute">${e(r.kelas)} &middot; ${tgl(r.tanggal)}</span><div class="mute">${cap(r.jenis)}: ${e(r.alasan)}</div></div>${r.status === 'menunggu'
      ? `<div class="acts"><form method="post" action="/izin/${r.id}/setuju"><button class="btn sm">Setujui</button></form><form method="post" action="/izin/${r.id}/tolak"><button class="btn sm warn">Tolak</button></form></div>` : pill(r.status, warna[r.status])}</div>`).join('') || '<div class="empty">Belum ada pengajuan izin.</div>';
    res.send(page(u, 'Izin', 'izin', `<div class="top"><h1>Persetujuan izin</h1><p class="mute">Izin yang disetujui otomatis mengubah status alpa pada tanggal itu.</p></div><section class="card">${list}</section>`));
  });
  app.post('/izin', need(['ortu']), async (req, res) => {
    const { tanggal, jenis, alasan } = req.body;
    if (['izin', 'sakit'].includes(jenis) && alasan?.trim()) await db.query('INSERT INTO izin(siswa_id,tanggal,jenis,alasan) VALUES(?,?,?,?)', [req.session.u.siswa_id, tanggal, jenis, alasan.trim()]);
    res.redirect('/izin');
  });
  app.post('/izin/:id/:aksi', need(['admin', 'wali']), async (req, res) => {
    const u = req.session.u, setuju = req.params.aksi === 'setuju';
    const [[z]] = await db.query('SELECT z.* FROM izin z JOIN siswa s ON s.id=z.siswa_id JOIN kelas k ON k.id=s.kelas_id WHERE z.id=? AND (?=1 OR k.wali_id=?)', [req.params.id, u.role === 'admin' ? 1 : 0, u.id]);
    if (z && z.status === 'menunggu') {
      await db.query('UPDATE izin SET status=? WHERE id=?', [setuju ? 'disetujui' : 'ditolak', z.id]);
      if (setuju) await db.query("UPDATE absensi SET status=? WHERE siswa_id=? AND tanggal=? AND status='alpa'", [z.jenis, z.siswa_id, z.tanggal]);
    }
    res.redirect('/izin');
  });

  // Tindak lanjut BK
  app.get('/tindak', need(['admin', 'wali', 'bk']), async (req, res) => {
    const sid = Number(req.query.siswa_id || 0);
    const [[s]] = sid ? await db.query('SELECT s.id, s.nama, k.nama kelas FROM siswa s JOIN kelas k ON k.id=s.kelas_id WHERE s.id=?', [sid]) : [[]];
    const [t] = await db.query(`SELECT t.*, s.nama, k.nama kelas, u.nama bk FROM tindak_lanjut t JOIN siswa s ON s.id=t.siswa_id JOIN kelas k ON k.id=s.kelas_id JOIN users u ON u.id=t.bk_id ORDER BY t.status='proses' DESC, t.id DESC LIMIT 30`);
    const form = s ? `<form class="card" method="post" action="/tindak"><h2>Catat tindak lanjut untuk ${e(s.nama)} (${e(s.kelas)})</h2><input type="hidden" name="siswa_id" value="${s.id}"><textarea name="catatan" placeholder="Contoh: Konseling pertama, orang tua dihubungi." required></textarea><p style="margin-top:1rem"><button class="btn">Simpan catatan</button></p></form>` : '';
    const list = t.map(r => `<div class="row s"><div class="av">${e(r.nama[0])}</div><div class="grow"><b>${e(r.nama)}</b> <span class="mute">${e(r.kelas)} &middot; ${tgl(r.dibuat)} &middot; ${e(r.bk)}</span><div>${e(r.catatan)}</div></div>${r.status === 'proses' ? `<form method="post" action="/tindak/${r.id}/selesai"><button class="btn sm ghost">Tandai selesai</button></form>` : pill('selesai', 'hadir')}</div>`).join('') || '<div class="empty">Belum ada catatan. Mulai dari daftar siswa di dashboard.</div>';
    res.send(page(req.session.u, 'Tindak lanjut', 'tindak', `<div class="top"><h1>Tindak lanjut siswa</h1><p class="mute">Catatan pembinaan untuk siswa yang sering alpa.</p></div>${form}<section class="card">${list}</section>`));
  });
  app.post('/tindak', need(['admin', 'wali', 'bk']), async (req, res) => {
    if (req.body.catatan?.trim()) await db.query('INSERT INTO tindak_lanjut(siswa_id,bk_id,catatan) VALUES(?,?,?)', [Number(req.body.siswa_id), req.session.u.id, req.body.catatan.trim()]);
    res.redirect('/tindak');
  });
  app.post('/tindak/:id/selesai', need(['admin', 'wali', 'bk']), async (req, res) => {
    await db.query("UPDATE tindak_lanjut SET status='selesai' WHERE id=?", [req.params.id]);
    res.redirect('/tindak');
  });
};

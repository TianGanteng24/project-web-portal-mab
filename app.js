const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const db = require('./db.js');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'Aa$12345', // This is the secret key
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Use secure cookies in production
    httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

app.get('/', (req, res) => {
  res.render('login');
});

app.post("/login", async (req, res) => {
  console.log(res);
  const { email, password } = req.body;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.render("login", { error: "Invalid email or password" });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.render("login", { error: "email atau password salah" });
    }

    req.session.user = user;
    req.session.success = "Login berhasil";
    return res.redirect("/dashboard-admin?login=success");
  } catch (err) {
    console.error('Login error:', err);
    return res.redirect("/?login=error");
  }
});

// HALAMAN ADMIN

app.get('/dashboard-admin', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/');

  try {
    // Total Member dari user ini
    const [members] = await db.execute(
      "SELECT COUNT(*) AS total FROM member_data WHERE user_id = ?",
      [user.id]
    );

    // Recent Submission - 5 data terbaru
    const [recent] = await db.execute(
      "SELECT * FROM submit_case WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
      [user.id]
    );

    // Data chart per bulan
    const [chart] = await db.execute(`
      SELECT MONTH(created_at) AS bulan, COUNT(*) AS total
      FROM submit_case
      WHERE user_id = ?
      GROUP BY MONTH(created_at)
      ORDER BY bulan ASC
    `, [user.id]);

    // Static values untuk cards
    const staticData = {
      caseSubmitted: 24,
      underReview: 8,
      completed: 15,
      reports: 2
    };

    res.render('admin/admin-dashboard', { 
      user,
      totalMember: members[0].total,
      recent,
      chart,
      ...staticData
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.redirect('/');
  }
});

app.get('/member-data', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/');

  try {
    const [members] = await db.execute(
      "SELECT * FROM member_data WHERE user_id = ?",
      [user.id]
    );

    res.render('admin/member-data', { user, members });
  } catch (err) {
    console.error('Member data error:', err);
    res.redirect('/');
  }
});

app.post('/member-data/upload', upload.single('csvfile'), (req, res) => {
  const results = [];
  const user = req.session.user;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      results.push([
        row.nik,
        row.bpjs,
        row.nama,
        row.tgl_lahir,
        row.nama_produk,
        row.nomor_polis,
        row.issued_date,
        user.id        
      ]);
    })
    .on('end', async () => {
      try {
        await db.query(
          `INSERT INTO member_data 
          (nik, bpjs, nama, tgl_lahir, nama_produk, nomor_polis, issued_date, user_id) 
           VALUES ?`,
          [results]
        );

        fs.unlinkSync(req.file.path);
        res.redirect('/member-data?upload=success');
      } catch (err) {
        console.error('Upload error:', err);
        res.redirect('/member-data?upload=error');
      }
    });
});

app.get('/api/member-search', async (req, res) => {
  const keyword = `%${req.query.keyword}%`;
  const user = req.session.user;

  if (!user) return res.json([]);

  try {
    const [data] = await db.execute(
      "SELECT * FROM member_data WHERE user_id = ? AND nik LIKE ? LIMIT 10",
      [user.id, keyword]
    );

    res.json(data);
  } catch (err) {
    console.error('Search error:', err);
    res.json([]);
  }
});

app.get('/submit-case', (req, res ) => {
  const user = req.session.user;
    if (!user) return res.redirect('/');
  res.render('admin/submit-case', { user });
});
app.post('/submit-case', upload.array('documents'), async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/');

  try {
    await db.execute(`
      INSERT INTO submit_case
        (user_id, nik, nama, usia, nama_produk, jenis_kasus, rs, tanggal_masuk, tanggal_keluar, ringkasan, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      user.id,
      req.body.nik,
      req.body.nama,
      req.body.usia,
      req.body.nama_produk,
      req.body.jenis_kasus,
      req.body.rs,
      req.body.tanggal_masuk,
      req.body.tanggal_keluar,
      req.body.ringkasan
    ]);

    res.redirect('/submit-case?submit=success');
  } catch (err) {
    console.error('Submit case error:', err);
    res.redirect('/submit-case?submit=error');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
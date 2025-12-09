const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const db = require('./db.js');
const session = require('express-session');
const bcrypt = require('bcrypt');

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

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, rows) => {
      if (err) {
        req.session.error = err.message;
        return res.redirect("/login?login=error");
      }

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
    }
  );
});

// HALAMAN ADMIN

app.get('/dashboard-admin', (req, res) => {
  const user = req.session.user;
    if (!user) return res.redirect('/');
  res.render('admin/admin-dashboard.ejs', { user });
});

app.get('/member-data', (req, res ) => {
  const user = req.session.user;
    if (!user) return res.redirect('/');
  res.render('admin/member-data', { user });
});
app.get('/submit-case', (req, res ) => {
  const user = req.session.user;
    if (!user) return res.redirect('/');
  res.render('admin/member-data', { user });
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
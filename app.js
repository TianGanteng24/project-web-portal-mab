const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Welcome to MAB Project');
});


// HALAMAN ADMIN

app.get('/dashboard-admin', (req, res) => {
  res.render('admin/admin-dashboard.ejs');
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});

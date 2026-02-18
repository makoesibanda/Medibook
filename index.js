// Load environment variables (.env)/...
require("dotenv").config();

// Core dependencies
const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const path = require("path");

// Initialize express app
const app = express();

/*
================================
VIEW ENGINE CONFIG
================================
*/

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/*
================================
MIDDLEWARE
================================
*/

// Serve static files (css, images, js)
app.use(express.static(path.join(__dirname, "public")));

// Parse form data
app.use(express.urlencoded({ extended: true }));

/*
================================
SESSION CONFIG
================================
*/

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

/*
================================
DATABASE CONNECTION
================================
*/

const db = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

global.db = db;

/*
================================
ROUTES (MODULAR)
================================
*/

// Authentication (login/register/logout)
app.use("/", require("./routes/auth"));

// Patient related routes
app.use("/patient", require("./routes/patient"));

app.use("/practitioner", require("./routes/practitioner"));


// Admin related routes
app.use("/admin", require("./routes/admin"));

/*
================================
ROOT REDIRECT
================================
/*
================================
LANDING PAGE
================================
*/

app.get("/", (req, res) => {
  res.render("index", {
    user: req.session.user || null
  });
});

/*
================================
START SERVER
================================
*/

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log("MEDIBOOK running on http://localhost:" + PORT);
});

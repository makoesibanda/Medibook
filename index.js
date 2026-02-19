// =====================================
// LOAD ENV VARIABLES
// =====================================
require("dotenv").config();

// Core dependencies
const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const path = require("path");

// Initialize express app
const app = express();


// =====================================
// BASE PATH CONFIG
// =====================================
// This lets the app run:
// Local -> /
// Server -> /www/350/medibook

const BASE_PATH = process.env.BASE_PATH || "";


// =====================================
// VIEW ENGINE CONFIG
// =====================================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// =====================================
// GLOBAL VARIABLES FOR ALL VIEWS
// =====================================
// makes BASE_PATH usable inside EJS
app.use((req,res,next)=>{
  res.locals.BASE_PATH = process.env.BASE_PATH || "";
  next();
});





// =====================================
// MIDDLEWARE
// =====================================

// Serve static files (css, images, js)
app.use(BASE_PATH, express.static(path.join(__dirname, "public")));

// Parse form data
app.use(express.urlencoded({ extended: true }));


// =====================================
// SESSION CONFIG
// =====================================
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);


// =====================================
// DATABASE CONNECTION
// =====================================
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Make DB available everywhere
global.db = db;


// =====================================
// ROUTES (MODULAR)
// =====================================

// Auth routes
app.use(BASE_PATH + "/", require("./routes/auth"));

// Patient routes
app.use(BASE_PATH + "/patient", require("./routes/patient"));

// Practitioner routes
app.use(BASE_PATH + "/practitioner", require("./routes/practitioner"));

// Admin routes
app.use(BASE_PATH + "/admin", require("./routes/admin"));


// =====================================
// LANDING PAGE
// =====================================
app.get(BASE_PATH + "/", (req, res) => {
  res.render("index", {
    user: req.session.user || null
  });
});


// =====================================
// START SERVER
// =====================================
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log("MEDIBOOK running on port " + PORT);
});

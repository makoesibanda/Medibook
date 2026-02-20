require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const path = require("path");

const app = express();

/*
=====================================
BASE PATH FOR DEPLOYMENT
=====================================
Local: ""
Goldsmiths: "/www/350/medibook"
*/
const BASE_PATH = process.env.BASE_PATH || "";

// Make BASE_PATH available in EJS
app.locals.BASE_PATH = BASE_PATH;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/*
=====================================
STATIC FILES
=====================================
Must be mounted EXACTLY like this:
*/
app.use(BASE_PATH, express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

// Make BASE_PATH + user available in templates
app.use((req, res, next) => {
  res.locals.BASE_PATH = BASE_PATH;
  res.locals.user = req.session?.user || null;
  next();
});

// Database
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

global.db = db;

/*
=====================================
ROUTES
=====================================
Mount ALL routes under BASE_PATH
*/
app.use(`${BASE_PATH}/`, require("./routes/auth"));
app.use(`${BASE_PATH}/patient`, require("./routes/patient"));
app.use(`${BASE_PATH}/practitioner`, require("./routes/practitioner"));
app.use(`${BASE_PATH}/admin`, require("./routes/admin"));

// Home page
app.get(`${BASE_PATH}/`, (req, res) => {
  res.render("index");
});

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => {
  console.log("MEDIBOOK running on port " + PORT);
});

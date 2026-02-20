require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const path = require("path");

const app = express();

/* =========================
   BASE PATH CONFIG
   ========================= */
const BASE_PATH = process.env.BASE_PATH || "";

/* =========================
   VIEW ENGINE
   ========================= */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* =========================
   GLOBAL VIEW VARIABLES
   ========================= */
app.use((req,res,next)=>{
  res.locals.BASE_PATH = BASE_PATH;
  res.locals.user = req.session?.user || null;
  next();
});

/* =========================
   STATIC FILES
   ========================= */
app.use(BASE_PATH, express.static(path.join(__dirname,"public")));

/* =========================
   BODY PARSER
   ========================= */
app.use(express.urlencoded({ extended:true }));

/* =========================
   SESSION
   ========================= */
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:false
}));

/* =========================
   DATABASE
   ========================= */
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
global.db = db;

/* =========================
   ROUTES
   ========================= */
app.use(BASE_PATH + "/", require("./routes/auth"));
app.use(BASE_PATH + "/patient", require("./routes/patient"));
app.use(BASE_PATH + "/practitioner", require("./routes/practitioner"));
app.use(BASE_PATH + "/admin", require("./routes/admin"));

/* =========================
   LANDING PAGE
   ========================= */
app.get(BASE_PATH + "/", (req,res)=>{
  res.render("index");
});

/* =========================
   SERVER
   ========================= */
const PORT = process.env.PORT || 8001;

app.listen(PORT,()=>{
  console.log("Medibook running on port " + PORT);
});

require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const path = require("path");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

app.get("/notice/pending", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Application Pending</title>
    <meta http-equiv="refresh" content="3;url=/www/350/medibook/patient">
    <style>
      body{
        font-family:sans-serif;
        background:#f8f9fa;
        display:flex;
        align-items:center;
        justify-content:center;
        height:100vh;
        margin:0;
      }
      .card{
        background:white;
        padding:40px;
        border-radius:12px;
        box-shadow:0 5px 20px rgba(0,0,0,0.1);
        text-align:center;
        max-width:420px;
      }
      .msg{
        font-size:18px;
        margin-bottom:15px;
      }
      .small{
        font-size:14px;
        color:#666;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="msg">
        Your practitioner application is under review.
      </div>
      <div class="small">
        You can continue using your account as a patient.<br>
        You will be notified once approved.
      </div>
    </div>
  </body>
  </html>
  `);
});

// STEP 1: Make BASE_PATH + user available in ALL EJS templates
app.use((req, res, next) => {
  res.locals.BASE_PATH = process.env.BASE_PATH || "";
  res.locals.user = req.session?.user || null;
  next();
});

// GLOBAL FLASH NOTICE SYSTEM
app.use((req, res, next) => {
  res.locals.notice = req.session.notice || null;
  delete req.session.notice;
  next();
});

// AUTO NOTICE BANNER INJECTOR
app.use((req, res, next) => {
  const originalSend = res.send;

  res.send = function (html) {
    if (res.locals.notice && typeof html === "string") {
      html = html.replace(
        "<body>",
        `<body>
        <div style="
          background:#fff3cd;
          padding:14px;
          text-align:center;
          font-weight:600;
          border-bottom:1px solid #ffeeba;
          font-family:sans-serif;">
          ${res.locals.notice}
        </div>`
      );
    }
    return originalSend.call(this, html);
  };

  next();
});

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

global.db = db;

app.use("/", require("./routes/auth"));
app.use("/patient", require("./routes/patient"));
app.use("/practitioner", require("./routes/practitioner"));
app.use("/admin", require("./routes/admin"));

app.get("/", (req, res) => {
  res.render("index"); // user is already in res.locals.user now
});

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => {
  console.log("MEDIBOOK running on port " + PORT);
});
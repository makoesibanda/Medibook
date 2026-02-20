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
  res.render("index", {
    user: req.session.user || null
  });
});

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => {
  console.log("MEDIBOOK running on port " + PORT);
});

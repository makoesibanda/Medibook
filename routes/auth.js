const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const { sendVerificationEmail } = require("../utils/mailer");



const router = express.Router();

const BASE = process.env.BASE_PATH || "";
const withBase = p => BASE + p;

const { requireAuth } = require("../middleware/auth");


// =============================
// PASSWORD VALIDATION HELPER
// =============================
function isStrongPassword(pw) {
  // Min 8 characters
  // At least 1 lowercase
  // At least 1 uppercase
  // At least 1 number
  // At least 1 special character
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pw);
}


/*
=====================================
LOGIN PAGE
=====================================
Shows login form
*/
router.get("/login", (req, res) => {
  res.render("login", { 
    error: null,
    query: req.query
  });
});

/*
=====================================
LOGIN HANDLER
=====================================
Authenticates user and creates session
*/
router.post("/login", async (req, res) => {

  const { email, password } = req.body;

  try {

    // Find user by email
   const { rows } = await db.query(
  "SELECT * FROM users WHERE email=$1 LIMIT 1",
  [email]
);

const user = rows[0];

    if (!user) {
return res.render("login", { 
  error: "Invalid email or password",
  query: req.query
});
    }

    // Compare passwords
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
return res.render("login", { 
  error: "Invalid email or password",
  query: req.query
});
    }

    // 🚫 Block unverified users
// Block all unverified accounts
if (!user.is_verified) {

  // Generate new verification token
  const token = crypto.randomBytes(32).toString("hex");

  // Update token in database
  await db.query(`
    UPDATE users
    SET verification_token = ?
    WHERE id = ?
  `, [token, user.id]);

  // Resend verification email
  await sendVerificationEmail(user.email, token);

  return res.render("login", {
    error: "Account not verified. A new verification link has been sent to your email.",
    query: req.query
  });
}



    // Store minimal user info in session
    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };

    // Redirect based on role
 if (user.role === "admin") {
return res.redirect(withBase("/admin"));
}

if (user.role === "pending_practitioner") {
  return res.redirect("/login?info=pending");
}

// If practitioner, allow mode selection
if (user.role === "practitioner") {
  return res.redirect("/select-mode");
}

// default patient
return res.redirect("/patient");


  } catch (err) {
    console.error(err);
res.render("login", { 
  error: "Something went wrong.",
  query: req.query
});
  }

});


/*
=====================================
PRACTITIONER REGISTRATION PAGE
=====================================
*/
router.get("/practitioner/register", async (req, res) => {
  try {
    const [services] = await db.query(`
      SELECT id, name
      FROM services
      ORDER BY name
    `);

    res.render("auth/practitioner-register", {
  error: null,
  services,
  formData: {}
});


  } catch (err) {
    console.error(err);
    res.render("auth/practitioner-register", {
      error: "Failed to load services.",
      services: []
    });
  }
});


/*
=====================================
PRACTITIONER REGISTRATION HANDLER
Creates pending practitioner
=====================================
*/
router.post("/practitioner/register", async (req, res) => {
const { full_name, email, password, confirm_password, bio, service_id } = req.body;

  try {
    // ALWAYS load services first
    const [services] = await db.query(`
      SELECT id, name
      FROM services
      ORDER BY name
    `);

   if (!full_name || !email || !password || !service_id) {
  return res.render("auth/practitioner-register", {
    error: "All required fields must be filled.",
    services,
    formData: { full_name, email, service_id, bio }
  });
}


    // Password confirmation check
if (password !== confirm_password) {
  return res.render("auth/practitioner-register", {
    error: "Passwords do not match.",
    services,
    formData: { full_name, email, service_id, bio }
  });
}


// Password strength check
if (!isStrongPassword(password)) {
  return res.render("auth/practitioner-register", {
    error: "Password must be at least 8 characters and include uppercase, lowercase, number and special character.",
    services,
    formData: { full_name, email, service_id, bio }
  });
}


    const [[existing]] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

   if (existing) {

  const [[existingUser]] = await db.query(
    "SELECT is_verified FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  if (!existingUser.is_verified) {

    const token = crypto.randomBytes(32).toString("hex");

    await db.query(`
      UPDATE users
      SET verification_token = ?
      WHERE email = ?
    `, [token, email]);

    await sendVerificationEmail(email, token);

    return res.render("auth/practitioner-register", {
      error: "Account exists but not verified. Verification email resent.",
      services
    });
  }

  return res.render("auth/practitioner-register", {
  error: "Email already exists.",
  services,
  formData: { full_name, email, service_id, bio }
});

}


    const hash = await bcrypt.hash(password, 10);

    const token = crypto.randomBytes(32).toString("hex");

const [result] = await db.query(`
  INSERT INTO users 
  (full_name, email, password, role, is_verified, verification_token)
  VALUES (?, ?, ?, 'pending_practitioner', FALSE, ?)
`, [full_name, email, hash, token]);

// Send verification email
await sendVerificationEmail(email, token);


    await db.query(`
      INSERT INTO practitioner_applications (user_id, service_id, bio, status)
      VALUES (?, ?, ?, 'pending')
    `, [result.insertId, service_id, bio || null]);

res.redirect("/login?info=verify_email");

  } catch (err) {
    console.error(err);

    const [services] = await db.query(`
      SELECT id, name
      FROM services
      ORDER BY name
    `);


    res.render("auth/practitioner-register", {
      error: "Registration failed.",
      services
    });
  }
});





/*
=====================================
REGISTER PAGE
=====================================
*/
router.get("/register", (req, res) => {
  res.render("register", { 
    error: null,
    formData: {}
  });
});

/*
=====================================
REGISTER HANDLER
Creates new patient account
=====================================
*/
router.post("/register", async (req, res) => {

const { full_name, email, password, confirm_password } = req.body;

  try {
if (!full_name || !email || !password) {
  return res.render("register", { 
    error: "All fields required.",
    formData: { full_name, email }
  });
}

    // Password confirmation check
if (password !== confirm_password) {
  return res.render("register", {
    error: "Passwords do not match.",
    formData: { full_name, email }
  });
}


// Password strength check
if (!isStrongPassword(password)) {
  return res.render("register", {
    error: "Password must be at least 8 characters and include uppercase, lowercase, number and special character.",
    formData: { full_name, email }
  });
}




    const [[existing]] = await db.query(
      "SELECT id FROM users WHERE email=? LIMIT 1",
      [email]
    );

  if (existing) {

  const [[existingUser]] = await db.query(
    "SELECT is_verified FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  // If NOT verified → resend email
  if (!existingUser.is_verified) {

    const token = crypto.randomBytes(32).toString("hex");

    await db.query(`
      UPDATE users
      SET verification_token = ?
      WHERE email = ?
    `, [token, email]);

    await sendVerificationEmail(email, token);

   return res.render("register", {
  error: "Account exists but not verified. Verification email resent.",
  formData: { full_name, email }
});

  }

  return res.render("register", {
  error: "Email already registered.",
  formData: { full_name, email }
});

}


    const hash = await bcrypt.hash(password, 10);

    const token = crypto.randomBytes(32).toString("hex");

    await db.query(`
      INSERT INTO users 
      (full_name, email, password, role, is_verified, verification_token)
      VALUES (?, ?, ?, 'patient', FALSE, ?)
    `, [full_name, email, hash, token]);

    await sendVerificationEmail(email, token);

    return res.redirect("/login?info=verify_email");

  } catch (err) {
    console.error(err);
    return res.render("register", { error: "Registration failed." });
  }

});


//redirect 

/*
=====================================
MODE SELECTION
=====================================
*/
router.get("/select-mode", requireAuth, (req, res) => {

  // Only practitioners need mode selection
  if (req.session.user.role !== "practitioner") {
    return res.redirect("/patient");
  }

  res.render("select-mode", {
    user: req.session.user
  });
});


/*
=====================================
EMAIL VERIFICATION
=====================================
*/
router.get("/verify", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.redirect("/login");
  }

  try {
    const [[user]] = await db.query(`
      SELECT id
      FROM users
      WHERE verification_token = ?
      LIMIT 1
    `, [token]);

    if (!user) {
      return res.redirect("/login?error=invalid_token");
    }

    await db.query(`
      UPDATE users
      SET is_verified = TRUE,
          verification_token = NULL
      WHERE id = ?
    `, [user.id]);

    res.redirect("/login?success=verified");

  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
});


/*
=====================================
LOGOUT
=====================================
Destroys session
*/
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;

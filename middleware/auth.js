/*
=====================================
AUTH & ROLE MIDDLEWARE
=====================================
Central place for access control
*/

// Require user to be logged in
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/www/350/medibook/login");
  }
  next();
}

// Require admin role
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.redirect("/www/350/medibook/login");
  }
  next();
}

// Require practitioner role
function requirePractitioner(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/www/350/medibook/login");
  }

  // Block pending practitioners
  if (req.session.user.role === "pending_practitioner") {
    return res.redirect("/www/350/medibook/login?info=pending");
  }

  // Only allow approved practitioners
  if (req.session.user.role !== "practitioner") {
    return res.redirect("/www/350/medibook/login");
  }

  next();
}


module.exports = {
  requireAuth,
  requireAdmin,
  requirePractitioner
};

const BASE = process.env.BASE_PATH || "";
const withBase = (p) => (BASE ? `${BASE}${p}` : p);

// ADMIN CHECK
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.redirect(withBase("/login"));
  }
  next();
}

// PRACTITIONER CHECK
function requirePractitioner(req, res, next) {
  if (!req.session.user || req.session.user.role !== "practitioner") {
    return res.redirect(withBase("/login"));
  }
  next();
}

module.exports = { requireAdmin, requirePractitioner };

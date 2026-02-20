const BASE = process.env.BASE_PATH || "";
const withBase = p => BASE + p;


function requireAdmin(req,res,next){
  if(!req.session.user || req.session.user.role !== "admin"){
    return res.redirect(withBase("/login"));
  }
  next();
}


function requirePractitioner(req,res,next){
  if(!req.session.user || req.session.user.role !== "practitioner"){
    return res.redirect(withBase("/login"));
  }
  next();
}

module.exports = { requireAdmin, requirePractitioner };

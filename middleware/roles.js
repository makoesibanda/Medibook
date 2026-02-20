function requireAdmin(req,res,next){
  if(req.session.user.role !== "admin"){
    return res.redirect("/login");
  }
  next();
}

function requirePractitioner(req,res,next){
  if(req.session.user.role !== "practitioner"){
    return res.redirect("/login");
  }
  next();
}

module.exports = { requireAdmin, requirePractitioner };

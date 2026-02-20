function requireAdmin(req,res,next){
  if(req.session.user.role !== "admin"){
    return res.redirect("/www/350/medibook/login");
  }
  next();
}

function requirePractitioner(req,res,next){
  if(req.session.user.role !== "practitioner"){
    return res.redirect("/www/350/medibook/login");
  }
  next();
}

module.exports = { requireAdmin, requirePractitioner };

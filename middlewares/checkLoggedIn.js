const checkLoggedIn = (req, res, next) => {
  if (req.isAuthenticated() && req.path !== "/check-username") {
    return res.redirect("/home");
  }
  next();
};

module.exports = checkLoggedIn;

const checkLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/home');
  }
  next();
};

module.exports = checkLoggedIn;
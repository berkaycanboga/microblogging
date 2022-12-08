const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/user.model');

const initialize = (passport) => {
  passport.use(new LocalStrategy(User.authenticate()));
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());
}

module.exports = initialize;
const User = require('../models/user.model');

const getCurrentPagesUserByUsername = async req => {
  const user = await User.findOne({
    username: req.path.slice(1),
  });
  return user;
};

module.exports = getCurrentPagesUserByUsername;
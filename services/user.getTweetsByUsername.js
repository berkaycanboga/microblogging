const Tweets = require('../models/tweet.model');

const getTweetsByUsername = async req => {
  const user = await Tweets.findOne({
    username: req.user.username
  })
  return user;
};

module.exports = getTweetsByUsername;
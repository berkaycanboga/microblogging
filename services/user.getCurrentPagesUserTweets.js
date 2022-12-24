const Tweets = require('../models/tweet.model');

const getCurrentPagesUserTweets = async req => {
  const user = await Tweets.findOne({
    username: req.path.slice(1),
  })
  return user;
};

module.exports = getCurrentPagesUserTweets;
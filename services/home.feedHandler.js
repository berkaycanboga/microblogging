const getRecentTweets = require('../services/user.getRecentTweets');
const getTweetsByUsername = require('../services/user.getTweetsByUsername');

const homeFeedHandler = async (req, res, next) => {
  const followingTweets = await getRecentTweets(req.user.username);
  const loggedUserTweets = await getTweetsByUsername(req);

  const feed = {
    tweets:
      followingTweets.length > 0
        ? followingTweets[0].tweets.concat(loggedUserTweets.tweets)
        : loggedUserTweets.tweets,
  };
  return res.render('home', { feed, username: req.user.username });
};

module.exports = homeFeedHandler;
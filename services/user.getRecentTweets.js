const Tweets = require('../models/tweet.model');

const getRecentTweets = async username => {
  return await Tweets.aggregate([
    { $match: { 'followers.user': { $in: [username] } } },
    { $unwind: '$tweets' },
    { $group: { _id: null, tweetArr: { $push: '$tweets' } } },
    { $project: { _id: 0, tweets: '$tweetArr' } },
  ]);
};

module.exports = getRecentTweets;
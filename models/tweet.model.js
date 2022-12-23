const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tweetSchema = new Schema(
  {
    username: {
      type: String,
      index: { unique: true },
    },
    followers: [
      {
        _id: false,
        user: String,
      },
    ],
    following: [
      {
        _id: false,
        user: String,
      },
    ],
    tweets: [
      {
        tweet: {
          type: String,
        },
        likedUsers: Array,
      },
    ],
  },
  { collection: 'tweets', timestamps: true }
);

const Tweets = mongoose.model('tweets', tweetSchema);

module.exports = Tweets;
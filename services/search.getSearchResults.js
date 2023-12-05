const Tweets = require("../models/tweet.model");
const User = require("../models/user.model");

const getSearchResults = async (req, res, next) => {
  try {
    const query = req.body.query;

    let users = [];
    let tweets = [];

    if (query) {
      users = await User.find({
        username: { $regex: new RegExp(query, "i") },
      });

      tweets = await Tweets.find({
        "tweets.tweet": { $regex: new RegExp(query, "i") },
      });

      tweets = tweets
        .map((tweetObject) =>
          tweetObject.tweets.map((tweet) => ({
            _id: tweet._id,
            tweetOwner: tweet.tweetOwner,
            tweet: tweet.tweet,
            likedUsers: tweet.likedUsers,
          }))
        )
        .flat();

      tweets = tweets.filter((tweet) => tweet.tweet.includes(query));
    }

    req.searchResults = { users, tweets, searchQuery: query };
    console.log("Search Results:", req.searchResults);

    next();
  } catch (error) {
    console.error("Error during search:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during search.",
    });
  }
};

module.exports = getSearchResults;

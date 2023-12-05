const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const passport = require("../passport.config");

const User = require("../models/user.model");
const Tweets = require("../models/tweet.model");

const getCurrentPagesUserByUsername = require("../services/user.getCurrentPagesUserByUsername");
const getCurrentPagesUserTweets = require("../services/user.getCurrentPagesUserTweets");
const getTweetsByUsername = require("../services/user.getTweetsByUsername");
const homeFeedHandler = require("../services/home.feedHandler");
const getSearchResults = require("../services/search.getSearchResults");
const {
  getFollowersByUsername,
  getFollowingByUsername,
} = require("../services/followlist.getFollowListByUsername");

const checkAuthenticated = require("../middlewares/checkAuthenticated");
const checkLoggedIn = require("../middlewares/checkLoggedIn");

router.get("/", checkLoggedIn, (req, res, next) => {
  res.render("index");
});

router.get("/home", checkAuthenticated, homeFeedHandler);

router.post("/home", checkAuthenticated, async (req, res) => {
  const ObjectId = new mongoose.Types.ObjectId();
  const reqAdd = req.body.reqAdd;
  if (reqAdd) {
    await Tweets.collection.updateOne(
      { username: req.user.username },
      {
        $push: {
          tweets: {
            tweetOwner: req.user.username,
            tweet: req.body.tweet,
            likedUsers: [],
            _id: ObjectId.toString(),
            likeCount: 0,
          },
        },
      }
    );
    res.redirect("/home");
  }
});

router.get("/:username", checkAuthenticated, async (req, res) => {
  const requestedUser = req.params.username;
  const getUserTweets = await getTweetsByUsername(req);

  if (requestedUser === req.user?.username) {
    return res.render("own-profile", { user: req.user, getUserTweets });
  }

  if (requestedUser.toLowerCase() === "search") {
    return res.render("search");
  }

  const checkIfUserExists = await User.collection.findOne({
    username: requestedUser,
  });

  if (checkIfUserExists === null) {
    const error = { status: 404 };
    return res.status(404).render("error", { error });
  }

  const user = await getCurrentPagesUserByUsername(req);
  const currentPageUserTweets = await getCurrentPagesUserTweets(req);

  return res.render("user-profile.pug", {
    user,
    currentPageUserTweets,
    username: req.user.username,
  });
});

router.post("/follow", checkAuthenticated, async (req, res) => {
  const reqFollowButton = req.body.reqFollowButton;

  try {
    await User.collection.updateOne(
      { username: req.user.username },
      { $addToSet: { following: { user: reqFollowButton } } }
    );

    await User.collection.updateOne(
      { username: reqFollowButton },
      { $addToSet: { followers: { user: req.user.username } } }
    );

    await Tweets.collection.updateOne(
      { username: req.user.username },
      { $addToSet: { following: { user: reqFollowButton } } }
    );

    await Tweets.collection.updateOne(
      { username: reqFollowButton },
      { $addToSet: { followers: { user: req.user.username } } }
    );

    return res.redirect(`/${reqFollowButton}`);
  } catch (error) {
    console.error("Error during follow:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during follow.",
    });
  }
});

router.post("/unfollow", checkAuthenticated, async (req, res) => {
  const reqFollowButton = req.body.reqFollowButton;

  try {
    await User.collection.updateOne(
      { username: reqFollowButton },
      { $pull: { followers: { user: req.user.username } } }
    );

    await User.collection.updateOne(
      { username: req.user.username },
      { $pull: { following: { user: reqFollowButton } } }
    );

    await Tweets.collection.updateOne(
      { username: req.user.username },
      { $pull: { following: { user: reqFollowButton } } }
    );

    await Tweets.collection.updateOne(
      { username: reqFollowButton },
      { $pull: { followers: { user: req.user.username } } }
    );

    return res.redirect(`/${reqFollowButton}`);
  } catch (error) {
    console.error("Error during unfollow:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during unfollow.",
    });
  }
});

router.get("/:username/followers", checkAuthenticated, async (req, res) => {
  const username = req.params.username;

  try {
    const followers = await getFollowersByUsername(username);
    res.render("follow-list.pug", {
      pageTitle: "Followers",
      activeTab: "followers",
      users: followers,
      username: username,
    });
  } catch (error) {
    console.error("Error getting followers:", error);
    res.status(500).render("error.pug", { error: { status: 500 } });
  }
});

router.get("/:username/following", checkAuthenticated, async (req, res) => {
  const username = req.params.username;

  try {
    const following = await getFollowingByUsername(username);
    res.render("follow-list.pug", {
      pageTitle: "Following",
      activeTab: "following",
      users: following,
      username: username,
    });
  } catch (error) {
    console.error("Error getting following:", error);
    res.status(500).render("error.pug", { error: { status: 500 } });
  }
});

router.post("/add", checkAuthenticated, async (req, res) => {
  const ObjectId = new mongoose.Types.ObjectId();
  const reqAdd = req.body.reqAdd;
  const reqHome = req.body.reqHome;
  const username = req.user.username;

  if (reqAdd) {
    await Tweets.collection.updateOne(
      { username: req.user.username },
      {
        $push: {
          tweets: {
            tweetOwner: req.user.username,
            tweet: req.body.tweet,
            likedUsers: [],
            _id: ObjectId.toString(),
            likeCount: 0,
          },
        },
      }
    );

    if (reqHome) {
      return res.status(200).redirect("/home");
    }
    return res.redirect(`/${username}`);
  }
});

router.post("/delete", checkAuthenticated, async (req, res) => {
  const tweetId = req.body.reqDelete;
  const requestSource = new URL(req.headers.referer).pathname;
  const username = req.user.username;

  if (tweetId) {
    await Tweets.collection.updateOne(
      { username: username },
      { $pull: { tweets: { _id: tweetId } } }
    );

    const targetSource =
      requestSource === "/search"
        ? "/search"
        : !requestSource || requestSource.startsWith("/home")
        ? "/home"
        : `/${username}`;

    res.redirect(targetSource);
  } else {
    res.redirect("/home");
  }
});

router.post("/like", checkAuthenticated, async (req, res) => {
  try {
    const tweetId = req.body.tweetId;

    await Tweets.collection.updateOne(
      {
        "tweets._id": tweetId,
        "tweets.$.likedUsers": { $ne: req.user.username },
      },
      {
        $push: { "tweets.$.likedUsers": req.user.username },
      }
    );

    const requestSource = new URL(req.headers.referer).pathname;
    let targetSource = "";

    if (requestSource.startsWith("/search")) {
      targetSource = "/search";
    } else {
      targetSource =
        !requestSource || requestSource.startsWith("/home")
          ? "/home"
          : `/${req.user.username}`;
    }

    res.redirect(targetSource);
  } catch (error) {
    console.error("Error during like:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during like.",
    });
  }
});

router.post("/unlike", checkAuthenticated, async (req, res) => {
  try {
    const tweetId = req.body.tweetId;

    await Tweets.collection.updateOne(
      {
        "tweets._id": tweetId,
      },
      {
        $pull: { "tweets.$.likedUsers": req.user.username },
      }
    );

    const requestSource = new URL(req.headers.referer).pathname;
    let targetSource = "";

    if (requestSource.startsWith("/search")) {
      targetSource = "/search";
    } else {
      targetSource =
        !requestSource || requestSource.startsWith("/home")
          ? "/home"
          : `/${req.user.username}`;
    }

    res.redirect(targetSource);
  } catch (error) {
    console.error("Error during unlike:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during unlike.",
    });
  }
});

router.post("/login", checkLoggedIn, async (req, res, next) => {
  const reqLogin = req.body.formLoginType;
  if (reqLogin) {
    if (!req.body.username || !req.body.password) {
      const loginError = "Please fill in all the fields.";
      return res.render("index", { loginError, loginErrorField: null });
    }

    try {
      const user = await User.findByUsername(req.body.username);
      if (!user) {
        const loginError = "Username not found.";
        return res.render("index", { loginError, loginErrorField: "username" });
      }

      user.authenticate(req.body.password, (err, authenticated) => {
        if (err) {
          console.error("Error during authentication:", err);
          return res.status(500).json({
            success: false,
            message: "Internal server error during login.",
          });
        }

        if (!authenticated) {
          const loginError = "Incorrect password.";
          return res.render("index", {
            loginError,
            loginErrorField: "password",
          });
        }

        req.login(user, (err) => {
          if (err) {
            console.error("Error during login:", err);
            return res.status(500).json({
              success: false,
              message: "Internal server error during login.",
            });
          }
          return res.redirect("/home");
        });
      });
    } catch (error) {
      console.error("Error during login:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during login.",
      });
    }
  }
});

router.post("/register", checkLoggedIn, async (req, res, next) => {
  const reqRegister = req.body.formRegisterType;

  if (reqRegister) {
    if (!req.body.username || !req.body.password) {
      return res.status(400).render("register", {
        registerError: "Please fill in all the fields.",
        registerErrorField: null,
      });
    }

    try {
      const existingUser = await User.findOne({ username: req.body.username });
      if (existingUser) {
        return res.status(400).render("register", {
          registerError: "Username already taken. Please choose another one.",
          registerErrorField: "username",
        });
      }

      const newTweetSchema = new Tweets({
        username: req.body.username,
      });
      newTweetSchema.save();

      User.register(
        new User({ username: req.body.username }),
        req.body.password,
        (err, user) => {
          if (err) {
            console.error("Error during registration:", err);
            return res.status(500).render("register", {
              registerError: "Account could not be saved. Error: " + err,
              registerErrorField: null,
            });
          }

          req.login(user, (err) => {
            if (err) {
              console.error("Error during login:", err);
              return res.status(500).render("register", {
                registerError: "Error during login.",
                registerErrorField: null,
              });
            }

            return res.redirect("/home");
          });
        }
      );
    } catch (error) {
      console.error("Error during registration:", error);
      return res.status(500).render("register", {
        registerError: "Internal server error during registration.",
        registerErrorField: null,
      });
    }
  }
});

router.post(
  "/search",
  checkAuthenticated,
  getSearchResults,
  async (req, res) => {
    try {
      res.render("search", {
        searchResults: req.searchResults,
        username: req.user.username,
      });
    } catch (error) {
      console.error("Error during search:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during search.",
      });
    }
  }
);

router.delete("/logout", (req, res) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

module.exports = router;

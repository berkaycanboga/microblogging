const express = require('express');
const { default: mongoose } = require('mongoose');
const router = express.Router();
const passport = require('../passport.config');

// models
const User = require('../models/user.model');
const Tweets = require('../models/tweet.model')

// services
const getCurrentPagesUserByUsername = require('../services/user.getCurrentPagesUserByUsername')
const getCurrentPagesUserTweets = require('../services/user.getCurrentPagesUserTweets');
const getTweetsByUsername = require('../services/user.getTweetsByUsername')
const homeFeedHandler = require('../services/home.feedHandler');

// middlewares
const checkAuthenticated = require('../middlewares/checkAuthenticated');
const checkLoggedIn = require('../middlewares/checkLoggedIn');

router.get('/', checkLoggedIn, (req, res, next) => {
  res.render('index');
});

router.get('/home', checkAuthenticated, homeFeedHandler);

router.post('/home', checkAuthenticated, async (req, res) => {
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
      },
    );
    res.redirect('/home');
  }
});

router.get('/:username', checkAuthenticated, async (req, res) => {
  const requestedUser = req.params.username;
  const getUserTweets = await getTweetsByUsername(req);
  if (requestedUser === req.user?.username) {
    return res.render('own-profile', { user: req.user, getUserTweets });
  }
  const checkIfUserExists = await User.collection.findOne({ username: requestedUser })
  if (checkIfUserExists === null) {
    const error = {
      status: 404,
    }
    return res.status(404).render("error", { error });
  }
  const user = await getCurrentPagesUserByUsername(req);
  const currentPageUserTweets = await getCurrentPagesUserTweets(req);
  return res.render('user-profile.pug', { user, currentPageUserTweets, username: req.user.username });
});

router.post('/follow', (req, res) => {
  const reqFollowButton = req.body.reqFollowButton;
    User.collection.updateOne(
      { username: req.user.username },
      { $addToSet: { following: { user: reqFollowButton } } },
    );
    User.collection.updateOne(
      { username: reqFollowButton },
      { $addToSet: { followers: { user: req.user.username } } },
    );
    Tweets.collection.updateOne(
      { username: req.user.username },
      { $addToSet: { following: { user: reqFollowButton } } },
    );
    Tweets.collection.updateOne(
      { username: reqFollowButton },
      { $addToSet: { followers: { user: req.user.username } } },
    );
    return res.redirect(`/${reqFollowButton}`);
});

router.post('/unfollow', checkAuthenticated, (req, res) => {
  const reqFollowButton = req.body.reqFollowButton;
    User.collection.updateOne(
      { username: reqFollowButton },
      { $pull: { followers: { user: req.user.username } } },
    );
    User.collection.updateOne(
      { username: req.user.username },
      { $pull: { following: { user: reqFollowButton } } },
    );
    Tweets.collection.updateOne(
      { username: reqFollowButton },
      { $pull: { followers: { user: req.user.username } } },
    );
    Tweets.collection.updateOne(
      { username: req.user.username },
      { $pull: { following: { user: reqFollowButton } } },
    );
    return res.redirect(`/${reqFollowButton}`);
});

router.post('/add', checkAuthenticated, async (req, res) => {
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
      },
    );

    if (reqHome) {
      return res.status(200).redirect('/home');
    }
    return res.redirect(`/${username}`);
  }
});

router.post('/delete', checkAuthenticated, async (req, res) => {
  const reqDelete = req.body.reqDelete;
  const reqHome = req.body.reqHome;
  const username = req.user.username;
  if (reqDelete) {
    await Tweets.collection.updateOne(
      { username: username },
      { $pull: { tweets: { _id: reqDelete } } },
    );
    if (reqHome) {
      res.redirect('/home');
    } else {
      res.redirect(`/${username}`);
    }
  }
});

router.post('/like', checkAuthenticated, async (req, res) => {
  const tweetId = req.body.tweetId;
  const reqCurrentUsername = req.body.reqUsername;
  await Tweets.collection.updateOne(
    {
      'tweets._id': tweetId,
      'tweets.$.likedUsers': { $ne: req.user.username },
    },
    {
      $push: { 'tweets.$.likedUsers': req.user.username },
    },
  );

  if (reqCurrentUsername) {
    res.redirect(`${reqCurrentUsername}`)
  } else {
    const requestSource = new URL(req.headers.referer).pathname;

    const targetSource =
      !requestSource || requestSource.startsWith('/home') 
      ? '/home'
      : `/${req.user.username}`;

    return res.redirect(targetSource);
  }
});

router.post('/unlike', checkAuthenticated, async (req, res) => {
  const tweetId = req.body.tweetId;
  const reqCurrentUsername = req.body.reqUsername;
  await Tweets.collection.updateOne(
    {
      'tweets._id': tweetId,
    },
    {
      $pull: { 'tweets.$.likedUsers': req.user.username },
    },
  );
  if (reqCurrentUsername) {
    res.redirect(`${reqCurrentUsername}`)
  } else {
    const requestSource = new URL(req.headers.referer).pathname;
    const targetSource =
      !requestSource || requestSource.startsWith('/home') 
      ? '/home' 
      : `/${req.user.username}`;

    return res.redirect(targetSource);
  }
});

router.post('/login', checkLoggedIn, async (req, res, next) => {
  const reqLogin = req.body.formLoginType;
  if (reqLogin) {
    passport.authenticate('local', {
      successRedirect: '/home',
      failureRedirect: '/',
    })(req, res, next);
  }
});

router.post('/register', checkLoggedIn, async (req, res, next) => {
  const reqRegister = req.body.formRegisterType;
  if (reqRegister) {
    await Tweets.findOne({ username: req.body.username }).then((user) => {
      if (!user) {
        const newTweetSchema = new Tweets({
          username: req.body.username,
      });
      newTweetSchema.save();
      }
    })
    User.register(new User({ username: req.body.username }), req.body.password, (err, user) => {
      if (err) {
        res.render('index', { message: 'Account could not be saved. Error: ' + err })
      } else {
        req.login(user, err => {
          if (err) {
            res.json({ success: false, message: err });
          } else {
            res.redirect('/');
          }
        });
      }
    });
  }
});

router.delete('/logout', (req, res) => {
  req.logOut(err => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

module.exports = router;
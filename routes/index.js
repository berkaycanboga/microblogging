const express = require('express');
const { default: mongoose } = require('mongoose');
const router = express.Router();
const passport = require('../passport.config');
const User = require('../models/user.model');
const Tweets = require('../models/tweet.model')

// # Middlewares
const checkAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect('/');
};

const checkLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/home');
  }
  next();
};

// TODO: Middlewares above should be in a separate file
router.get('/', checkLoggedIn, (req, res, next) => {
  res.render('index');
});

// services/user.js.getUserByUsername
const getCurrentPagesUserByUsername = async req => {
  const user = await User.findOne({
    username: req.path.slice(1),
  });
  return user;
};

const getRecentTweets = async username => {
  return await Tweets.aggregate([
    { $match: { 'followers.user': { $in: [username] } } },
    { $unwind: '$tweets' },
    { $group: { _id: null, tweetArr: { $push: '$tweets' } } },
    { $project: { _id: 0, tweets: '$tweetArr' } },
  ]);
};

const getTweetsByUsername = async req => {
  const user = await Tweets.findOne({
    username: req.user.username
  })
  return user;
};

const getCurrentPagesUserTweets = async req => {
  const user = await Tweets.findOne({
    username: req.path.slice(1),
  })
  return user;
};

const homeFeedHandler = async (req, res, next) => {
  const followingTweets = await getRecentTweets(req.user.username);
  const loggedUserTweets = await getTweetsByUsername(req);

  const feed = {
    tweets:
      followingTweets.length > 0
        ? followingTweets[0].tweets.concat(loggedUserTweets.tweets)
        : loggedUserTweets.tweets,
  };
  console.log(feed);
  return res.render('home', { feed, username: req.user.username });
};

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

  const user = await getCurrentPagesUserByUsername(req);
  const currentPageUserTweets = await getCurrentPagesUserTweets(req);
  return res.render('user-profile.pug', { user, currentPageUserTweets });
});

router.post('/follow', (req, res) => {
  const reqFollowButton = req.body.reqFollowButton;
  if (reqFollowButton) {
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
  }
});

router.post('/unfollow', checkAuthenticated, (req, res) => {
  const reqUnfollowButton = req.body.reqUnfollowButton;
  if (reqUnfollowButton) {
    User.collection.updateOne(
      { username: reqUnfollowButton },
      { $pull: { followers: { user: req.user.username } } },
    );
    User.collection.updateOne(
      { username: req.user.username },
      { $pull: { following: { user: reqUnfollowButton } } },
    );
    Tweets.collection.updateOne(
      { username: reqUnfollowButton },
      { $pull: { followers: { user: req.user.username } } },
    );
    Tweets.collection.updateOne(
      { username: req.user.username },
      { $pull: { following: { user: reqUnfollowButton } } },
    );
    return res.redirect(`/${reqUnfollowButton}`);
  }
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
      !requestSource || requestSource.startsWith('/home') ? '/home' : `/${req.user.username}`;

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
        res.json({ success: false, message: 'Account could not be saved. Error: ' + err });
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

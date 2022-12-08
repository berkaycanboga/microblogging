const express = require('express');
const { default: mongoose } = require('mongoose');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user.model');


const initializePassport = require('../passport.config');
initializePassport(
  passport, 
  username => User.find(user => user.username === username),
  _id => User.find(user => user._id === _id)
);

const checkAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
};

const checkLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/home')
  }
  next()
};

router.get('/', checkLoggedIn, (req, res, next) => {
  res.render('index');
});

router.get('/home', checkAuthenticated, async (req, res, next) => {
  const getUsername = req.user.username;
  User.find({ username: req.user.username })
    const followingTweets = await User.aggregate([
      { $match: { 'followers.user': { '$in': [getUsername] } } },
      { $unwind: "$tweets" },
      { $group: { _id: null, tweetArr: { $push : "$tweets" } } },
      { $project: { _id: 0, tweets: "$tweetArr" } }
    ])
    if (followingTweets.length === 0) {
      const allTweets = { tweets: req.user.tweets };
      res.render('home', { allTweets, getUsername })
    } else {
      const allTweets = { tweets: followingTweets[0].tweets.concat(req.user.tweets) }
      res.render('home', { allTweets, getUsername })
    }
});

router.post('/home', async (req, res) => {
  const ObjectId = new mongoose.Types.ObjectId;
  const reqAdd = req.body.reqAdd;
  if (reqAdd) {
    await User.collection.updateOne(
      { _id: req.user._id },
      { $push: { tweets: { tweetOwner: req.user.username, tweet: req.body.tweet, likedUsers: [], _id: ObjectId.toString(), likeCount: 0 } } }
    )
    res.redirect('/home')
  }
});

router.get('/:username', async (req, res) => {
  if (req.url === `/${req.user.username}`) {
    const getUserTweets = await req.user.tweets;
    if (!getUserTweets || getUserTweets === null) {
      return res.render('own-profile');
    } else {
      res.render('own-profile', { getUserTweets });
    }
  } else {
    const currentUser = await User.collection.findOne({ username: req.params.username }).then((user) => {
      return user;
    });
    res.render('user-profile.pug', { currentUser });
  };
});

router.post('/follow', (req, res) => {
  const reqFollowButton = req.body.reqFollowButton;
  if (reqFollowButton) {
    User.collection.updateOne(
      { _id: req.user._id },
      { $addToSet: { following: { user: reqFollowButton } } }
    )
    User.collection.updateOne(
      { username: reqFollowButton },
      { $addToSet: { followers: { user: req.user.username } } }
    )
    return res.redirect(`/${reqFollowButton}`);
  };
});

router.post('/unfollow', (req, res) => {
  const reqUnfollowButton = req.body.reqUnfollowButton;
  if (reqUnfollowButton) {
    User.collection.updateOne(
      { username: reqUnfollowButton},
      { $pull: { 'followers': { user: req.user.username} } }
    )
    User.collection.updateOne(
      { _id: req.user._id },
      { $pull: { 'following': { user: reqUnfollowButton } } }
    )
    return res.redirect(`/${reqUnfollowButton}`);
  };
});

router.post('/add', (req, res) => {
  const ObjectId = new mongoose.Types.ObjectId;
  const reqAdd = req.body.reqAdd;
  const reqHome = req.body.reqHome;
  const username = req.user.username;
  if (reqAdd) {
    User.collection.updateOne(
      { _id: req.user._id },
      { $push: { tweets: { tweetOwner: req.user.username, tweet: req.body.tweet, likedUsers: [], _id: ObjectId.toString(), likeCount: 0 } } }
    )
    if (reqHome) {
      res.redirect('/home')
    } else {
      res.redirect(`/${username}`)
    }
  };
});

router.post('/delete', async (req, res) => {
  const reqDelete = req.body.reqDelete;
  const reqHome = req.body.reqHome;
  const username = req.user.username;
  if (reqDelete) {
    await User.collection.updateOne(
      { _id: req.user._id },
      { $pull: { 'tweets': { _id: reqDelete } } }
    )
    if (reqHome) {
      res.redirect('/home')
    } else {
      res.redirect(`/${username}`)
    }
  };
});

router.post('/like', async (req, res) => {
  const reqLike = req.body.reqLike;
  const reqHome = req.body.reqHome;
  const reqUsername = req.body.reqUsername;
  if (reqLike) {
    await User.collection.updateOne(
      { "tweets._id": reqLike },
      { $addToSet: { "tweets.$.likedUsers": { user: req.user.username } } },
    )
    if (reqHome) {
      res.redirect('/home')
    } else if (reqUsername) {
      res.redirect(`/${reqUsername}`)
    }
  };
});

router.post('/unlike', async (req, res) => {
  const reqUnlike = req.body.reqUnlike;
  const reqHome = req.body.reqHome;
  const reqUsername = req.body.reqUsername;
  if (reqUnlike) {
    await User.collection.updateOne(
      { "tweets._id": reqUnlike },
      { $pull: { "tweets.$.likedUsers": { user: req.user.username } } },
    )
    await User.collection.updateOne(
      { "tweets._id": reqUnlike }, 
      [{ $set: { tweets: { likeCount: { $size: { $arrayElemAt : [ '$tweets.likedUsers', 0] } } } } }]
    )
    if (reqHome) {
      res.redirect('/home')
    } else if (reqUsername) {
      res.redirect(`/${reqUsername}`)
    }
  };
})

router.post('/login', checkLoggedIn, async (req, res, next) => {
  const reqLogin = req.body.formLoginType;
  if (reqLogin) {
    passport.authenticate('local', {
      successRedirect: '/home',
      failureRedirect: '/',
    })(req, res, next);
  };
});

router.post('/register', checkLoggedIn, async (req, res, next) => {
  const reqRegister = req.body.formRegisterType;
  if (reqRegister) {
    User.register(new User({ username: req.body.username }), req.body.password, (err, user) => {
      if (err) {
        res.json({ success: false, message: "Account could not be saved. Error: " + err })
      } else {
        req.login(user, (err) => {
          if (err) {
            res.json({ success: false, message: err });
          } else {
            res.redirect('/');
          };
        });
      };
    });
  };
});

router.delete('/logout', (req, res) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});


module.exports = router;
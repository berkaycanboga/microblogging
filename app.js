if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const createError = require('http-errors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
// const flash = require('express-flash');
const session = require('express-session');
const passport = require('passport');
const methodOverride = require('method-override');
const { CONFIG } = require('./config');
const indexRouter = require('./routes/index');
const mongoose = require('mongoose');

const app = express();

mongoose.connect(CONFIG.DB_URL); // TODO: this should be in .env file

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger(CONFIG.NODE_ENV)); // TODO: this should be in .env file
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? 'hehe_secret_hehe', // TODO: what if there is no SESSION_SECRET in .env file?
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

app.use('/', indexRouter); // TODO: instead of grouping all resources under one file, we should group them by resource type (userRoutes, tweetRoutes, feedRoutes, etc.)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === CONFIG.NODE_ENV ? err : {}; // TODO: this won't work properly. Because you are expecting "env" to be both "dev" and "development". You should use a single value for both.

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

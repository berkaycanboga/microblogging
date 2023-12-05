if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const createError = require("http-errors");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const session = require("express-session");
const passport = require("passport");
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const cors = require("cors");
const { CONFIG } = require("./config");
const indexRouter = require("./routes/index");

const app = express();

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};

app.use(cors(corsOptions));

mongoose.connect(CONFIG.DB_URL);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger(CONFIG.NODE_ENV));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "hehe_secret_hehe",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));

app.use("/", indexRouter);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === CONFIG.NODE_ENV ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;

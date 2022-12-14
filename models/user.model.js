const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
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
  },
  { collection: 'user', timestamps: true },
);

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('user', userSchema);

module.exports = User;

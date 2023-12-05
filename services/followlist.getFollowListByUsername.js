const User = require("../models/user.model");

const getFollowersByUsername = async (username) => {
  try {
    const user = await User.findOne({ username });
    return user ? user.followers.map((follower) => follower.user) : [];
  } catch (error) {
    console.error("Error getting followers:", error);
    return [];
  }
};

const getFollowingByUsername = async (username) => {
  try {
    const user = await User.findOne({ username });
    return user ? user.following.map((following) => following.user) : [];
  } catch (error) {
    console.error("Error getting following:", error);
    return [];
  }
};

module.exports = { getFollowersByUsername, getFollowingByUsername };

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userName: String,
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  terms: Boolean,
  avatar: String,
});

const User = mongoose.model("User", userSchema, "users");

module.exports = User;

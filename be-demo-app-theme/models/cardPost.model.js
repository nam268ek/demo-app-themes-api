const mongoose = require("mongoose");

const cardPostSchema = new mongoose.Schema({
  title: String,
  body: String,
  image: String,
  datetime: Date,
});

const CardPost = mongoose.model('CardPost', cardPostSchema, 'cardposts');

module.exports = CardPost;
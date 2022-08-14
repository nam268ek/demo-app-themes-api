const mongoose = require("mongoose");

const themeSchema = new mongoose.Schema({
  name: String,
  description: String,
  image: String,
  price: Number,
  version: String,
});

const Themes = mongoose.model('Themes', themeSchema, 'themes');

module.exports = Themes;
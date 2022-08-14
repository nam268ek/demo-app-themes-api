const mongoose = require("mongoose");

const detailSchema = new mongoose.Schema({
  name: String,
  image: String,
  createdAt: Number,
});

const Detail = mongoose.model('Detail', detailSchema, 'detail');

module.exports = Detail;
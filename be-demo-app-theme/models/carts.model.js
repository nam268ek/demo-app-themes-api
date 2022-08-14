const mongoose = require("mongoose");

const cartsSchema = new mongoose.Schema({
  userId: String,
  products: Array,
  total: Number,
});

const Carts = mongoose.model("Carts", cartsSchema, "carts");

module.exports = Carts;

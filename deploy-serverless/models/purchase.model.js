const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  userId: String,
  products: Array,
  total: Number,
  createdAt: { type: Date, default: Date.now },
});

const Purchase = mongoose.model("Purchase", purchaseSchema, "purchase");

module.exports = Purchase;

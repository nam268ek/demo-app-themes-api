const mongoose = require("mongoose");

const showCaseSchema = new mongoose.Schema({
  image: String,
});

const ShowCase = mongoose.model("ShowCase", showCaseSchema, "showcase");

module.exports = ShowCase;

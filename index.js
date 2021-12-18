require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const PORT = process.env.PORT || 5000;
const db = mongoose.connection;

const { authenticateToken } = require("./middleware/auth.middleware");

const dbThemes = require("./models/themes.model");
const dbShowcases = require("./models/showcase.model");
const dbDetails = require("./models/detail.model");
const dbCardPost = require("./models/cardPost.model");
const dbUser = require("./models/user.model");
const dbCarts = require("./models/carts.model");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static("public"));

mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Connected to mongodb server.");
});

app.get("/themes", async (req, res) => {
  try {
    const { _start, _limit } = req.query;
    let result = await dbThemes.find();
    req.query ? (result = result.slice(_start, _limit)) : result;

    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ message: error });
  }
});

app.get("/themes/:id", async (req, res) => {
  try {
    const result = await dbThemes.findById(req.params.id);
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ message: error });
  }
});

app.get("/showcase", async (req, res) => {
  try {
    const { _start, _limit } = req.query;
    let result = await dbShowcases.find();
    req.query ? (result = result.slice(_start, _limit)) : result;

    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ message: error });
  }
});

app.get("/showcase/:id", async (req, res) => {
  try {
    const result = await dbShowcases.findById(req.params.id);
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/detail", async (req, res) => {
  try {
    const result = await dbDetails.find();
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ message: error });
  }
});

app.get("/detail/:id", async (req, res) => {
  const result = await dbDetails.findById(req.params.id, (err, detail) =>
    err ? res.status(500).send(err) : detail
  );
  return res.status(200).send(result);
});

app.get("/cardposts", async (req, res) => {
  try {
    const { _start, _limit } = req.query;
    let result = await dbCardPost.find();
    req.query ? (result = result.slice(_start, _limit)) : result;

    res.status(200).send(result);
  } catch (error) {
    res.status(500).send({ message: error });
  }
});

app.get("/cardposts/:id", async (req, res) => {
  dbCardPost.findById(req.params.id, (err, cardPost) => {
    if (err) return res.status(500).send(err);
    return res.status(200).send(cardPost);
  });
});

app.get("/user", async (req, res) => {
  dbUser.find({}, (err, user) => {
    if (err) return res.status(500).send(err);
    return res.status(200).send(user);
  });
});

app.get("/user/:id", async (req, res) => {
  dbUser.findById(req.params.id, (err, user) => {
    if (err) return res.status(500).send(err);
    return res.status(200).send(user);
  });
});

app.post("/user", async (req, res) => {
  dbUser.create(req.body, (err, user) => {
    if (err) return res.status(500).send(err);
    return res.status(200).send(user);
  });
});

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body.params;
    const isUser = await dbUser.findOne({ email });

    if (isUser) {
      return res.status(402).send({ message: "User is registered." });
    } else {
      const encryptPassword = await bcrypt.hash(password, 10);
      const user = { ...req.body.params, password: encryptPassword };

      await dbUser.create(user, (err, user) => {
        if (err) return res.status(402).send(err);
        return res.status(200);
      });
    }
  } catch (error) {
    return res.status(500).send(error);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body.params;
    // const { email, password } = req.body;
    let isUser = await dbUser.findOne({ email });

    if (isUser) {
      await bcrypt.compare(password, isUser.password, (err, result) => {
        if (err) return res.status(500).send(err);
        const auth = jwt.sign({ _id: isUser._id }, process.env.SECRET_KEY, {
          expiresIn: 60 * 5,
        });

        return result
          ? res.status(200).send({ _id: isUser._id, auth })
          : res.status(401).send({ message: "Invalid email or password" });
      });
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/logout", authenticateToken, async (req, res) => {
  return res.status(200).send({ message: "Logout success" });
});

app.get("/cart", authenticateToken, async (req, res) => {
  try {
    const { _id } = req.user;
    const isItem = await dbCarts.findOne({ userId: _id });
    isItem ? res.status(200).send(isItem) : res.status(200).send({});
  } catch (error) {
    return res.status(500).send(error);
  }
});

app.post("/cart", authenticateToken, async (req, res) => {
  try {
    const { userId, products, total } = req.body.params;
    console.log(typeof req.body.params);
    await dbCarts.findOneAndUpdate(
      { userId },
      { $set: { userId, products, total } },
      { upsert: true, new: true }
    );
    return res.status(200).send({ message: "Cart update" });
  } catch (error) {
    return res.status(500).send(error);
  }
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}.`));

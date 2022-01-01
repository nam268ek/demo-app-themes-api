require("dotenv").config();
const express = require("express");
const serverless = require("serverless-http");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary");
const formData = require("express-form-data");
// const PORT = process.env.PORT || 5000;
const db = mongoose.connection;

const { authenticateToken } = require("./middleware/auth.middleware");

const dbThemes = require("./models/themes.model");
const dbShowcases = require("./models/showcase.model");
const dbDetails = require("./models/detail.model");
const dbCardPost = require("./models/cardPost.model");
const dbUser = require("./models/user.model");
const dbCarts = require("./models/carts.model");
const dbPurchase = require("./models/purchase.model");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

app.use(formData.parse());
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

app.get("/", (req, res) => {
  res.send({status: "success", code: 200,  message: "Demo API theme."});
});

app.post("/image-upload", authenticateToken, (req, res) => {
  const values = Object.values(req.files);
  const promises = values.map((image) =>
    cloudinary.uploader.upload(image.path)
  );

  Promise.all(promises)
    .then((data) => {
      if (req.files.avatar) {
        dbUser.findOneAndUpdate(
          req.user._id,
          {
            $set: {
              avatar: data[0].secure_url,
            },
          },
          { new: true, upsert: true },
          (err, user) => {
            if (err)
              return res
                .status(400)
                .send({ status: "error", code: 400, message: err });
            return res.status(200).send({
              status: "success",
              code: 200,
              message: "Uploaded successfully",
            });
          }
        );
      }
    })
    .catch((err) =>
      res.status(400).send({ status: "error", code: 400, message: err })
    );
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

app.get("/user/:id", authenticateToken, async (req, res) => {
  try {
    const user = await dbUser.findById(req.params.id);
    console.log(user);
    user
      ? res.status(200).send({
          status: "success",
          code: 200,
          data: {
            _id: user.Id,
            userName: user.userName,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatar: user.avatar,
          },
        })
      : res.status(404).send({ status: "error", code: 404, message: error });
  } catch (error) {
    res.status(500).send({ status: "error", code: 500, message: error });
  }
});

app.put("/user/update", authenticateToken, async (req, res) => {
  console.log("profile:", req.body);

  try {
    const { firstName, lastName, email } = req.body.params;
    const user = await dbUser.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          firstName,
          lastName,
          email,
        },
      },
      { new: true, upsert: true }
    );

    return !user
      ? res
          .status(404)
          .send({ status: "error", code: 404, message: "Update user error." })
      : res.status(200).send({
          status: "success",
          code: 200,
          data: {
            _id: user.Id,
            userName: user.userName,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatar: user.avatar,
          },
        });
  } catch (error) {
    return res.status(500).send({ status: "error", code: 500, message: error });
  }
});

app.put("/user/update-pass", authenticateToken, async (req, res) => {
  try {
    const { password, oldPassword, confirmPassword } = req.body.params;
    const user = await dbUser.findById(req.user._id);
    let isMatch = await bcrypt.compare(oldPassword, user.password);

    if (isMatch && password.localeCompare(confirmPassword) != -1) {
      const hash = await bcrypt.hash(password, 10);
      const newUser = await dbUser.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            password: hash,
          },
        },
        { new: true, upsert: true }
      );

      return !newUser
        ? res
            .status(404)
            .send({ status: "error", code: 404, message: "Update user error." })
        : res.status(200).send({
            status: "success",
            code: 200,
            message: "Update user success.",
          });
    }
  } catch (error) {
    return res.status(500).send({ status: "error", code: 500, message: error });
  }
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
      return res
        .status(402)
        .send({ code: 402, message: "User is registered." });
    } else {
      const encryptPassword = await bcrypt.hash(password, 10);
      const user = { ...req.body.params, password: encryptPassword };

      await dbUser.create(user, (err, user) => {
        if (err) return res.status(402).send(err);
        return res
          .status(200)
          .send({ code: 200, message: "Register success." });
      });
    }
  } catch (error) {
    return res.status(500).send(error);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body.params;
    const isUser = await dbUser.findOne({ email });

    if (isUser) {
      await bcrypt.compare(password, isUser.password, (err, result) => {
        if (err) return res.status(500).send(err);

        const token = jwt.sign({ _id: isUser._id }, process.env.SECRET_KEY, {
          expiresIn: process.env.TOKEN_EXPIRE,
        });

        const refreshToken = jwt.sign(
          { _id: isUser._id },
          process.env.SECRET_KEY,
          {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRE,
          }
        );

        return result
          ? res.status(200).send({
              status: "success",
              code: 200,
              message: "Login success.",
              data: {
                _id: isUser._id,
                token,
                refreshToken,
              },
            })
          : res.status(401).send({
              status: "error",
              code: 401,
              message: "Invalid email or password",
            });
      });
    } else
      res
        .status(401)
        .send({ status: "error", code: 401, message: "Email not registered" });
  } catch (error) {
    res.status(500).send({ status: "error", code: 500, message: error });
  }
});

//==========================================================
var allRefreshTokens = {};
// refresh jwt token expire time
app.post("/auth/refresh", authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body.params;
    const { _id } = req.user;

    if (refreshToken && refreshToken in allRefreshTokens) {
      const token = jwt.sign({ _id }, process.env.SECRET_KEY, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRE,
      });

      const refreshToken = jwt.sign({ _id }, process.env.SECRET_KEY, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRE,
      });

      allRefreshTokens[refreshToken].token = token;

      return res
        .status(200)
        .send({ status: "success", code: 200, data: { token, refreshToken } });
    }

    return res
      .status(401)
      .send({ status: "error", code: 401, message: "Invalid token" });
  } catch (error) {
    res.status(500).send({ status: "error", code: 500, message: error });
  }
});

//=========================================================
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

app.get("/checkout", authenticateToken, async (req, res) => {
  try {
    const { _id } = req.user;
    const isItem = await dbPurchase.find({ userId: _id });

    isItem
      ? res.status(200).send({ status: "success", code: 200, data: isItem })
      : res
          .status(401)
          .send({ status: "error", code: 401, message: "User not purchase" });
  } catch (error) {
    return res.status(500).send(error);
  }
});

app.post("/checkout", authenticateToken, async (req, res) => {
  try {
    const { userId, products, total } = req.body.params;

    await dbPurchase.create({ userId, products, total }, (err, purchase) => {
      if (err)
        return res
          .status(402)
          .send({ status: "error", code: 402, message: "Checkout error." });
      return res
        .status(200)
        .send({ status: "success", code: 200, message: "Checkout success." });
    });
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

// app.listen(PORT, () => console.log(`Server is running on port ${PORT}.`));

module.exports.handler = serverless(app);// deploy to serverless platform

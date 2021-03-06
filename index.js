require("dotenv").config();
const express = require("express");
// const serverless = require("serverless-http");

const helmet = require("helmet");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary");
const formData = require("express-form-data");
const PORT = process.env.PORT || 5000;
const db = mongoose.connection;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const { authenticateToken } = require("./middleware/auth.middleware");

const dbThemes = require("./models/themes.model");
const dbShowcases = require("./models/showcase.model");
const dbDetails = require("./models/detail.model");
const dbCardPost = require("./models/cardPost.model");
const dbUser = require("./models/user.model");
const dbCarts = require("./models/carts.model");
const dbPurchase = require("./models/purchase.model");
const dbOrder = require("./models/order.model");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

app.use(formData.parse());
app.use("/webhook", express.raw({ type: "*/*" }));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());
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
  res.send("Hello World!");
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

app.get("/user", authenticateToken, async (req, res) => {
  try {
    const user = await dbUser.findById(req.user._id);
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
          // expiresIn: process.env.TOKEN_EXPIRE,
          expiresIn: 60 * 60,
        });

        const refreshToken = jwt.sign(
          { _id: isUser._id },
          process.env.SECRET_KEY,
          {
            // expiresIn: process.env.REFRESH_TOKEN_EXPIRE,
            expiresIn: 60 * 50,
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

//=========================refresh token=================================
var allRefreshTokens = {};
// refresh jwt token expire time
app.post("/auth/refresh", async (req, res) => {
  try {
    const oldToken = req.body.refreshToken;

    if (oldToken) {
      //check token request on server
      const verifyToken = jwt.verify(
        oldToken,
        process.env.SECRET_KEY,
        (err, decoded) => {
          if (err) return err;
          return decoded;
        }
      );

      const { _id } = verifyToken;
      if (_id) {
        // token is valid
        const token = await jwt.sign({ _id }, process.env.SECRET_KEY, {
          // expiresIn: process.env.REFRESH_TOKEN_EXPIRE,
          expiresIn: 60 * 20,
        });

        const refreshToken = await jwt.sign({ _id }, process.env.SECRET_KEY, {
          // expiresIn: process.env.REFRESH_TOKEN_EXPIRE,
          expiresIn: 60 * 40,
        });

        //save refresh token
        // allRefreshTokens[refreshToken].token = token;
        console.log("refreshToken:", token);
        return res.status(200).send({
          status: "success",
          code: 200,
          data: { token, refreshToken },
        });
      }
    } else
      return res
        .status(401)
        .send({ status: "error", code: 401, message: "Invalid token" });
  } catch (error) {
    return res.status(500).send({ status: "error", code: 500, message: error });
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
    return res.status(500).send({ status: "error", code: 500, message: error });
  }
});

app.get("/checkout", authenticateToken, async (req, res) => {
  try {
    const { _id } = req.user;
    const isItem = await dbPurchase.find({ userId: _id });

    isItem.length
      ? res.status(200).send({ status: "success", code: 200, data: isItem })
      : res
          .status(401)
          .send({ status: "error", code: 401, message: "User not purchase" });
  } catch (error) {
    return res.status(500).send({ status: "error", code: 500, message: error });
  }
});

app.get("/order/canceled", authenticateToken, async (req, res) => {
  try {
    const { _id } = req.user;
    const isItem = await dbOrder.find({ userId: _id });

    isItem.length
      ? res.status(200).send({ status: "success", code: 200, data: isItem })
      : res.status(401).send({
          status: "error",
          code: 401,
          message: "User not order cancel",
        });
  } catch (error) {
    return res.status(500).send({ status: "error", code: 500, message: error });
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

//============================
var productsSessionPayment = {
  userId: "61c5834030e56bd51cf3d52e",
  products: [
    {
      _id: "61ae27807eee1c6f667bb82f",
      name: "Ubud",
      description:
        "A newsletter-integrated and personal Ghost theme. Choose from six homepage styles and customize them with your favorite colors.",
      image: "https://aspirethemes.com/images/themes/ubud/preview.webp",
      price: 149,
      version: "1.0.4",
      qty: 1,
    },
  ],
  total: 149,
};

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { email } = req.body.params;
    // handle data for create checkout session API
    const filterDataPayment = (data) => {
      //temporary assign products for user payment to variable => handle webhook next.
      productsSessionPayment = Object.assign({}, data);
      // filter data for create checkout session API
      return data.products.map((item) => {
        return {
          name: item.name,
          description: item.description,
          images: [item.image],
          amount: Number(item.price.toString() + "00"),
          currency: "usd",
          quantity: item.qty,
        };
      });
    };
    console.log("email:", email);
    // create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      line_items: filterDataPayment(req.body.params),
      mode: "payment",
      success_url: `${process.env.ENTRY_POINT_DOMAIN}?success=true`,
      cancel_url: `${process.env.ENTRY_POINT_DOMAIN}?canceled=true`,
    });

    return res
      .status(200)
      .send({ status: "success", code: 200, data: session });
  } catch (error) {
    return res.status(500).send({ status: "error", code: 500, message: error });
  }
});

//============================webhook==============================
// handle webhook payment intent success
const handlePaymentIntentSucceeded = async (
  productsSessionPayment,
  paymentIntent
) => {
  if (paymentIntent.status === "succeeded") {
    //update save products payment to database
    const { userId, products, total } = productsSessionPayment;
    if (userId && products && total) {
      await dbPurchase.create({ userId, products, total });
      //clear productsSessionPayment
      productsSessionPayment = {};
    }
  }
};
// handle webhook payment intent failed
const handlePaymentCanceled = async (
  productsSessionPayment,
  paymentIntentCreate
) => {
  if (paymentIntentCreate.status === "requires_payment_method") {
    const { userId, products, total } = productsSessionPayment;
    if (userId && products && total)
      await dbOrder.create({ userId, products, total });
    //clear productsSessionPayment
    productsSessionPayment = {};
  }
};

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event = req.body;

    if (process.env.ENDPOINT_STRIPE_WEBHOOK_SECRET) {
      const signature = req.headers["stripe-signature"];
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.ENDPOINT_STRIPE_WEBHOOK_SECRET
        );
      } catch (error) {
        res.status(400).send(`Webhook Error: ${error.message}`);
      }
    }
    // Handle the event
    switch (event.type) {
      case "payment_intent.created":
        const paymentIntentCreate = event.data.object;
        //handle webhook payment intent created cancel
        // handlePaymentCanceled(productsSessionPayment, paymentIntentCreate);
        break;
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        // Then define and call a method to handle the successful payment intent.
        handlePaymentIntentSucceeded(productsSessionPayment, paymentIntent);
        break;
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}.`);
    }
    // Return a 200 response to acknowledge receipt of the event
    res.send();
  }
);

app.listen(PORT, () => console.log(`Server is running on port ${PORT}.`));
// module.exports.handler = serverless(app);// deploy to serverless platform

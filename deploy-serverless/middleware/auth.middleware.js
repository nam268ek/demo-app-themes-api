const jwt = require("jsonwebtoken");

//Middleware authentication
module.exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (token == null)
    return res
      .status(401)
      .send({ status: "auth", code: 401, message: "Unauthorized" });

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) return res.status(403).send({ status: "auth", code: 403, message: "Unauthorized token" });
    req.user = user;
    next();
  });
};

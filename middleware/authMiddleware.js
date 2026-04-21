const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Access denied. No token provided" });
    }

    // 🔥 Bearer token extract
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ message: "Invalid token format" });
    }

    const token = authHeader.split(" ")[1];

    const verified = jwt.verify(token, process.env.JWT_SECRET);

    req.user = verified;

    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
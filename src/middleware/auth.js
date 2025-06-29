import jwt from "jsonwebtoken";
import User from "../models/User.js";


export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded); // Log decoded payload
      if (!decoded.userId) {
        console.error("No userId in token payload:", decoded);
        return res.status(401).json({ message: "Invalid token payload" });
      }
      req.user = { userId: decoded.userId };
      console.log("Set req.user.userId:", req.user.userId);
      next();
    } catch (error) {
      console.error("Auth error:", error.message, error.stack);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

import jwt from "jsonwebtoken";
import User from "../models/User.js";


export const protect = async (req, res, next) => {
  let token;

  // Check for Authorization: Bearer <token>
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET); // 👈 Make sure this matches the secret used in login

      // Attach user info to request object
      // req.user = { userId: decoded.id }; // 👈 Must match login payload
      req.user = { userId: decoded.userId }; // 👈 Fix: match payload


      next();
    } catch (error) {
      console.error("Auth error:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

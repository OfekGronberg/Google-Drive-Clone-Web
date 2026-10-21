"use strict";

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

module.exports = function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: "missing token" });

  try {
    const decoded = jwt.verify(m[1], JWT_SECRET);
    req.user = decoded; // { userId, username, iat, exp }
    return next();
  } catch (e) {
    return res.status(401).json({ error: "invalid token" });
  }
};

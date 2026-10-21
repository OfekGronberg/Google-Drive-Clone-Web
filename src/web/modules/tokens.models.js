"use strict";

const jwt = require("jsonwebtoken");
const usersModel = require("./users.models");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

exports.createToken = (username, password) => {
  const user = usersModel.findUserByUsername(username);
  if (!user || user.password !== password){
    return { error: "invalid credentials", status: 401 };
  }

  // keep payload minimal (don’t put password, image, etc.)
  const payload = { userId: String(user.id), username: String(user.username) };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token };
};

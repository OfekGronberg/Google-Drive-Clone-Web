"use strict";

const tokensModel = require("../modules/tokens.models");

exports.createToken = (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (typeof username !== "string" || username.trim() === "") {
      return res.status(400).json({ error: "username is required" });
    }
    if (typeof password !== "string" || password.trim() === "") {
      return res.status(400).json({ error: "password is required" });
    }

    const result = tokensModel.createToken(username.trim(), password.trim());

    if (result.error){
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.status(200).json({ token: result.token });
  } catch (err) {
    return res.status(500).json({ error: "internal error" });
  }
};

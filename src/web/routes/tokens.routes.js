"use strict";

const express = require("express");
const router = express.Router();

const tokensController = require("../controllers/tokens.controller");

// /api/tokens
router.post("/", tokensController.createToken);

module.exports = router;

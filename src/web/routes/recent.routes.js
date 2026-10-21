"use strict";

const express = require("express");
const router = express.Router();

const recentController = require("../controllers/recent.controller");

// /api/recent
router.get("/", recentController.getRecentFiles);

module.exports = router;

"use strict";

const express = require("express");
const router = express.Router();

const starredController = require("../controllers/starred.controller");

// /api/starred
router.get("/", starredController.getStarredFiles);

module.exports = router;

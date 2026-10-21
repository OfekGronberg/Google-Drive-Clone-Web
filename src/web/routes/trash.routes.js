"use strict";

const express = require("express");
const router = express.Router();

const trashController = require("../controllers/trash.controller");

// /api/trash
router.get("/", trashController.getTrashedFiles);

module.exports = router;

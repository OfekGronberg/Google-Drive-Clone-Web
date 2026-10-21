"use strict";

const express = require("express");
const router = express.Router();

const filesController = require("../controllers/files.controller");
const starredController = require("../controllers/starred.controller");
const requireAuth = require("../middleware/auth.middleware");

// /api/files
router.get("/", filesController.listTopLevel);
router.post("/", filesController.createFileOrFolder);

// /api/files/:id
router.get("/:id", filesController.getById);
router.patch("/:id", filesController.updateById);
router.delete("/:id", filesController.deleteById);
router.post("/:id/restore", filesController.restoreById);
router.put("/:id/star", requireAuth, starredController.starFile);
router.delete("/:id/star", requireAuth, starredController.unstarFile);

module.exports = router;

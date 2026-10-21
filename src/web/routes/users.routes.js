"use strict";

const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth.middleware");

const usersController = require("../controllers/users.controller");

// /api/users
router.post("/", usersController.createUser);

// Specific routes must come before /:id to avoid route conflicts
// /api/users/:id/root - Get root ("My Drive") folder for user
router.get("/:id/root", usersController.getRoot);

// /api/users/:id/mydrive - Get "My Drive" folder
router.get("/:id/mydrive", usersController.getMyDriveFolder);

// /api/users/:id/shared - Get "Shared with me" folder
router.get("/:id/shared", usersController.getSharedFolder);

// /api/users/:id/recent - Get "Recent" folder
router.get("/:id/recent", usersController.getRecentFolder);

// /api/users/:id/starred - Get "Starred" folder
router.get("/:id/starred", usersController.getStarredFolder);

// /api/users/:id/trash - Get "Trash" folder
router.get("/:id/trash", usersController.getTrashFolder);

// /api/users/:id - Get user by ID (must be last)
router.get("/:id", usersController.getUserById);
router.patch("/:id", requireAuth, usersController.updateUser);

module.exports = router;

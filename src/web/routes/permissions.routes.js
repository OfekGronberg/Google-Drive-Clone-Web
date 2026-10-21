"use strict";

const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth.middleware");

const permissionsController = require("../controllers/permissions.controller");

// /api/files/:id/permissions
router.get("/:id/permissions", requireAuth, permissionsController.listPermissions);
router.post("/:id/permissions", requireAuth, permissionsController.createPermission);

// /api/files/:id/permissions/:pId
router.patch("/:id/permissions/:pId", requireAuth, permissionsController.updatePermission);
router.delete("/:id/permissions/:pId", requireAuth, permissionsController.deletePermission);

module.exports = router;

"use strict";

const recentModel = require("../modules/recent.models");

// GET /api/recent - Get recently accessed files for the authenticated user
exports.getRecentFiles = (req, res) => {
  try {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit) || 50;
    
    const files = recentModel.getRecentFiles(userId, limit);
    return res.status(200).json(files);
  } catch (e) {
    return res.status(500).json({ error: "internal server error" });
  }
};

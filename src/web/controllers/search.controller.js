"use strict";

const Search = require("../modules/search.models");

// GET /api/search/:query
exports.search = async (req, res) => {
  try {
    const query = String(req.params.query || "").trim();
    if (!query) return res.status(400).json({ error: "query is required" });

    const userId = req.user?.userId; // Get userId from authenticated token
    const results = await Search.searchFiles(query, userId);

    // Recommended REST behavior: always 200 + array
    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ error: "internal server error" });
  }
};

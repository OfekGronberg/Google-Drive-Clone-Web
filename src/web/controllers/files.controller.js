"use strict";

const filesModel = require("../modules/files.models");

// GET /api/files
exports.listTopLevel = (req, res) => {
  try {
    const userId = req.user?.userId;
    const items = filesModel.listTopLevel(userId);
    return res.status(200).json(items);
  } catch (e) {
    return res.status(500).json({ error: "internal server error" });
  }
};

// POST /api/files
// body: { "name": "Doc1", "type": "file", "parentId": "2" }  (parentId is optional)
exports.createFileOrFolder = async (req, res) => {
  try {
    const { name, type, parentId, content } = req.body || {};

    // Validate "name"
    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "name is required" });
    }

    // Validate "type"
    if (type !== "file" && type !== "folder") {
      return res.status(400).json({ error: "type must be 'file' or 'folder'" });
    }

    // If parentId provided, validate it exists and is a folder
    if (parentId) {
      const parent = await filesModel.getById(parentId);
      if (!parent || parent.type !== "folder") {
        return res.status(400).json({ error: "invalid parentId or parent is not a folder" });
      }
    }

    const userId = req.user?.userId;
    const newItem = await filesModel.createFileOrFolder(name.trim(), type, userId, parentId, content);

    return res
      .status(201)
      .location(`/api/files/${newItem.id}`)
      .json(newItem);
  } catch (e) {
    // Respect model-provided status codes (e.g., 409 from EX2 conflict)
    const status = e && e.status ? e.status : 500;

    if (status === 409) {
      return res.status(409).json({ error: "file already exists" });
    }

    return res.status(500).json({ error: "internal server error" });
  }
};

// GET /api/files/:id
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const item = await filesModel.getById(id, userId);
    if (!item) {
      return res.status(404).json({ error: "not found" });
    }

    return res.status(200).json(item);
  } catch (e) {
    if (e.status === 403) {
      return res.status(403).json({ error: "permission denied" });
    }
    return res.status(500).json({ error: "internal server error" });
  }
};

// PATCH /api/files/:id (supports name, starred, parentId for moving, and content for files)
exports.updateById = async (req, res) => {
  const { id } = req.params; // Move outside try block so it's available in catch
  try {
    const { name, starred, parentId, content } = req.body || {};
    const userId = req.user?.userId;

    if (name === undefined && starred === undefined && parentId === undefined && content === undefined) {
      return res.status(400).json({ error: "nothing to update" });
    }

    const patch = {};
    
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({ error: "name must be a non-empty string" });
      }
      patch.name = name.trim();
    }

    if (starred !== undefined) {
      patch.starred = Boolean(starred);
    }

    if (parentId !== undefined) {
      // parentId can be null (move to root) or a valid folder ID
      patch.parentId = parentId === null ? null : String(parentId);
    }

    if (content !== undefined) {
      patch.content = String(content);
    }

    const updated = await filesModel.updateById(id, patch, userId);

    if (!updated) {
      return res.status(404).json({ error: "not found" });
    }

    return res.status(204).end();
  } catch (e) {
    if (e.status === 403) {
      return res.status(403).json({ error: "permission denied" });
    }
    if (e.status === 404) {
      return res.status(404).json({ error: e.message });
    }
    if (e.status === 400) {
      return res.status(400).json({ error: e.message });
    }
    return res.status(500).json({ error: "internal server error" });
  }
};

// DELETE /api/files/:id
exports.deleteById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const ok = await filesModel.deleteById(id, userId);
    if (!ok) {
      return res.status(404).json({ error: "not found" });
    }

    return res.status(204).end();
  } catch (e) {
    if (e.status === 403) {
      return res.status(403).json({ error: "permission denied" });
    }
    return res.status(500).json({ error: "internal server error" });
  }
};
// POST /api/files/:id/restore
exports.restoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const restored = await filesModel.restoreById(id, userId);
    if (!restored) {
      return res.status(404).json({ error: "not found" });
    }

    return res.status(200).json(restored);
  } catch (e) {
    if (e.status === 403) {
      return res.status(403).json({ error: "permission denied" });
    }
    return res.status(500).json({ error: "internal server error" });
  }
};
"use strict";

const usersModel = require("../modules/users.models");

exports.createUser = async (req, res) => {
  try {
    const { username, password, name, imageUrl } = req.body || {};

    if (typeof username !== "string" || username.trim() === "") {
      return res.status(400).json({ error: "username is required" });
    }
    if (typeof password !== "string" || password.trim() === "") {
      return res.status(400).json({ error: "password is required" });
    }

    const result = await usersModel.createUser({
      username: username.trim(),
      password: password.trim(),
      name: typeof name === "string" ? name.trim() : undefined,
      imageUrl: typeof imageUrl === "string" ? imageUrl.trim() : undefined
    });

    if (result.error){
      // Check if it's a conflict (username exists) or infrastructure error
      const statusCode = result.error.includes("already exists") ? 409 : 500;
      return res.status(statusCode).json({ error: result.error });
    }

    res.status(201);
    res.location(`/api/users/${result.user.id}`);
    return res.json(result.user);
  } catch (err) {
    return res.status(500).json({ error: "internal error" });
  }
};

exports.getUserById = (req, res) => {
  try {
    const { id } = req.params;
    const user = usersModel.getUserById(id);
    if (!user) return res.status(404).json({ error: "not found" });
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ error: "internal error" });
  }
};

// GET /api/users/:id/root - Returns the "My Drive" folder ID
exports.getRoot = async (req, res) => {
  try {
    const { id } = req.params;
    const user = usersModel.getUserById(id);
    if (!user) return res.status(404).json({ error: "not found" });
    
    // Return the My Drive folder ID
    const folder = await usersModel.getUserFolder(id, "myDrive");
    if (!folder) return res.status(404).json({ error: "root folder not found" });
    
    return res.status(200).json(folder);
  } catch (err) {
    return res.status(500).json({ error: "internal error" });
  }
};

// GET /api/users/:id/mydrive - Returns the actual "My Drive" folder
exports.getMyDriveFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await usersModel.getUserFolder(id, "myDrive");
    if (!folder) return res.status(404).json({ error: "not found" });
    return res.status(200).json(folder);
  } catch (err) {
    return res.status(500).json({ error: "internal error" });
  }
};

// GET /api/users/:id/shared - Returns the actual "Shared with me" folder
exports.getSharedFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await usersModel.getUserFolder(id, "shared");
    if (!folder) return res.status(404).json({ error: "not found" });
    return res.status(200).json(folder);
  } catch (err) {
    return res.status(500).json({ error: "internal error" });
  }
};

// GET /api/users/:id/recent - Returns the actual "Recent" folder
exports.getRecentFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await usersModel.getUserFolder(id, "recent");
    if (!folder) return res.status(404).json({ error: "not found" });
    return res.status(200).json(folder);
  } catch (err) {
    return res.status(500).json({ error: "internal error" });
  }
};

// GET /api/users/:id/starred - Returns the actual "Starred" folder
exports.getStarredFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await usersModel.getUserFolder(id, "starred");
    if (!folder) return res.status(404).json({ error: "not found" });
    return res.status(200).json(folder);
  } catch (err) {
    return res.status(500).json({ error: "internal error" });
  }
};

// GET /api/users/:id/trash - Returns the actual "Trash" folder
exports.getTrashFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await usersModel.getUserFolder(id, "trash");
    if (!folder) return res.status(404).json({ error: "not found" });
    return res.status(200).json(folder);
      } catch (err) {
    return res.status(500).json({ error: "internal error" });
  }
};
// PATCH /api/users/:id
// body: { "username"?, "password"?, "imageUrl"?, "theme"? }
exports.updateUser = (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, imageUrl, theme } = req.body || {};

    // Only the logged-in user can update their own profile
    if (!req.user || String(req.user.userId) !== String(id)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const patch = {};

    if (username !== undefined) {
      if (typeof username !== "string" || username.trim() === "") {
        return res.status(400).json({ error: "username must be a non-empty string" });
      }
      patch.username = username.trim();
    }

    if (password !== undefined) {
      if (typeof password !== "string" || password.trim() === "") {
        return res.status(400).json({ error: "password must be a non-empty string" });
      }
      patch.password = password; // don't trim passwords unless assignment says so
    }

    if (imageUrl !== undefined) {
      if (typeof imageUrl !== "string") {
        return res.status(400).json({ error: "imageUrl must be a string" });
      }
      patch.imageUrl = imageUrl.trim();
    }

    if (theme !== undefined) {
      // Accept the three supported themes: light, dark, bball
      if (theme !== "light" && theme !== "dark" && theme !== "bball") {
        return res.status(400).json({ error: "theme must be 'light', 'dark' or 'bball'" });
      }
      patch.theme = theme;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "nothing to update" });
    }

    const result = usersModel.updateUser(id, patch);

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.status(200).json(result.user);
  } catch (err) {
    return res.status(500).json({ error: "internal error" });
  }
};

"use strict";

const memoryStore = require("../lib/memoryStore");
const filesModel = require("./files.models");

// Create 5 default folders for every new user
// Each folder is a REAL File entity with type="folder"
async function createDefaultUserFolders(userId) {
  try {
    // 1. Create "My Drive" (root folder)
    const myDrive = await filesModel.createFileOrFolder("My Drive", "folder", userId);
    const myDriveFile = memoryStore.getFiles().find(f => f.id === myDrive.id);
    if (myDriveFile) {
      myDriveFile.isSystem = true;
      myDriveFile.isRoot = true;
    }

    // 2. Create "Shared with me" (real folder)
    const shared = await filesModel.createFileOrFolder("Shared with me", "folder", userId);
    const sharedFile = memoryStore.getFiles().find(f => f.id === shared.id);
    if (sharedFile) {
      sharedFile.isSystem = true;
    }

    // 3. Create "Recent" (real folder)
    const recent = await filesModel.createFileOrFolder("Recent", "folder", userId);
    const recentFile = memoryStore.getFiles().find(f => f.id === recent.id);
    if (recentFile) {
      recentFile.isSystem = true;
    }

    // 4. Create "Starred" (real folder)
    const starred = await filesModel.createFileOrFolder("Starred", "folder", userId);
    const starredFile = memoryStore.getFiles().find(f => f.id === starred.id);
    if (starredFile) {
      starredFile.isSystem = true;
    }

    // 5. Create "Trash" (real folder)
    const trash = await filesModel.createFileOrFolder("Trash", "folder", userId);
    const trashFile = memoryStore.getFiles().find(f => f.id === trash.id);
    if (trashFile) {
      trashFile.isSystem = true;
    }

    // Store folder IDs in user record for easy access
    const user = memoryStore.getUsers().find(u => u.id === String(userId));
    if (user) {
      user.myDriveFolderId = myDrive.id;
      user.sharedFolderId = shared.id;
      user.recentFolderId = recent.id;
      user.starredFolderId = starred.id;
      user.trashFolderId = trash.id;
    }

    return {
      myDriveId: myDrive.id,
      sharedId: shared.id,
      recentId: recent.id,
      starredId: starred.id,
      trashId: trash.id
    };
  } catch (err) {
    throw new Error(`Failed to create default user folders: ${err.message}`);
  }
}

exports.createUser = async ({ username, password, name, imageUrl }) => {
  const users = memoryStore.getUsers();
  const exists = users.some(u => u.username === username);
  if (exists){
    return { error: "username already exists" };
  }

  const user = {
    id: memoryStore.newUserId(),
    username: username,
    password: password,
    name: name || username,
    imageUrl: imageUrl || "",
    theme: "light",
  };

  memoryStore.addUser(user);

  // Create 5 default folders for every new user (server-side, during signup)
  // This must happen for EVERY signup, automatically
  try {
    await createDefaultUserFolders(user.id);
  } catch (err) {
    // Rollback: remove the user if folder creation fails
    // Signup should fail if folder creation fails
    const userIndex = memoryStore.getUsers().findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      memoryStore.getUsers().splice(userIndex, 1);
    }
    return { error: err.message };
  }

  const safe = {
    id: user.id,
    username: user.username,
    name: user.name,
    imageUrl: user.imageUrl,
    theme: user.theme
  };
  return { user: safe };
};

exports.getUserById = (id) => {
  const u = memoryStore.getUserById(id);
  if (!u) return null;
  const { password: _pw, ...safe } = u;
  return safe;
};

exports.findUserByUsername = (username) => {
  const users = memoryStore.getUsers();
  return users.find(u => u.username === username) || null;
};

// Get default folder by type for a user
exports.getUserFolder = async (userId, folderType) => {
  const user = memoryStore.getUsers().find(u => u.id === String(userId));
  if (!user) {
    return null;
  }

  const folderIdMap = {
    "myDrive": user.myDriveFolderId,
    "shared": user.sharedFolderId,
    "recent": user.recentFolderId,
    "starred": user.starredFolderId,
    "trash": user.trashFolderId
  };

  const folderId = folderIdMap[folderType];
  if (!folderId) {
    return null;
  }

  const filesModel = require("./files.models");
  const result = await filesModel.getById(folderId, userId);
  return result;
};
/**
 * Update user profile: username, password, imageUrl, theme
 * @param {string} id
 * @param {Object} patch - { username?, password?, imageUrl?, theme? }
 * @returns {{ error?: string, status?: number, user?: Object }}
 */
exports.updateUser = (id, patch) => {
  const user = memoryStore.getUserById(id);
  if (!user) return { error: "user not found", status: 404 };

  // username
  if (patch.username !== undefined) {
    if (typeof patch.username !== "string" || patch.username.trim() === "") {
      return { error: "username must be a non-empty string", status: 400 };
    }
    const newUsername = patch.username.trim();
    if (newUsername !== user.username) {
      const exists = memoryStore.getUsers().some(u => u.username === newUsername);
      if (exists) return { error: "username already exists", status: 409 };
      user.username = newUsername;
    }
  }

  // password (allow update only if provided and non-empty string)
  if (patch.password !== undefined) {
    if (typeof patch.password !== "string" || patch.password === "") {
      return { error: "password must be a non-empty string", status: 400 };
    }
    user.password = patch.password;
  }

  // imageUrl
  if (patch.imageUrl !== undefined) {
    if (typeof patch.imageUrl !== "string") {
      return { error: "imageUrl must be a string", status: 400 };
    }
    user.imageUrl = patch.imageUrl;
  }

  // theme
  if (patch.theme !== undefined) {
    // Accept the three supported themes: light, dark, bball
    if (patch.theme !== "light" && patch.theme !== "dark" && patch.theme !== "bball") {
      return { error: "theme must be 'light', 'dark' or 'bball'", status: 400 };
    }
    user.theme = patch.theme;
  }

  const { password: _pw, ...safe } = user;
  return { user: safe, status: 200 };
};

"use strict";

const memoryStore = require("../lib/memoryStore");

/**
 * Toggle starred status of a file
 * @param {string} fileId - The file ID to toggle
 * @returns {boolean|null} - New starred status, or null if file not found
 */
exports.toggleStarred = (fileId) => {
  const item = memoryStore.getFileById(fileId);
  if (!item) return null;

  // Toggle starred status
  item.starred = !item.starred;
  
  return item.starred;
};

/**
 * Set starred status of a file and create/remove shortcut in Starred folder
 * @param {string} fileId - The file ID
 * @param {boolean} starred - The starred status to set
 * @param {string} userId - The user ID to create shortcut for
 * @returns {boolean|null} - New starred status, or null if file not found
 */
exports.setStarred = (fileId, starred, userId = null) => {
  const item = memoryStore.getFileById(fileId);
  if (!item) return null;

  // Set the starred flag on the file itself
  item.starred = Boolean(starred);

  // If userId provided, create/remove shortcut in user's Starred folder
  if (userId) {
    const user = memoryStore.getUsers().find(u => u.id === String(userId));
    if (user && user.starredFolderId) {
      if (starred) {
        // Create a shortcut to this file in the Starred folder
        createShortcutInStarred(fileId, user.starredFolderId, userId);
      } else {
        // Remove the shortcut from Starred folder
        removeShortcutFromStarred(fileId, user.starredFolderId);
      }
    }
  }
  
  return item.starred;
};

// Helper: Create a shortcut to a file in the Starred folder
const createShortcutInStarred = (targetFileId, starredFolderId, userId) => {
  const originalFile = memoryStore.getFileById(targetFileId);
  if (!originalFile) return;

  // Check if shortcut already exists
  const starredFolder = memoryStore.getFileById(starredFolderId);
  if (!starredFolder || starredFolder.type !== "folder") return;

  const children = memoryStore.getChildrenOf(starredFolderId);
  const shortcutExists = children.some(child => 
    child.type === "shortcut" && child.targetId === targetFileId
  );

  if (shortcutExists) return; // Already starred

  // Create new shortcut
  const shortcutId = String(memoryStore.newFileId());
  const shortcut = {
    id: shortcutId,
    name: originalFile.name,
    type: "shortcut",
    targetId: targetFileId,
    parentId: starredFolderId,
    starred: false, // Shortcuts themselves aren't starred
  };

  memoryStore.addFile(shortcut);

  // Create owner permission for the shortcut
  const permissionsModel = require("./permissions.models");
  permissionsModel.create(shortcutId, userId, "owner");
};

// Helper: Remove shortcut from Starred folder
const removeShortcutFromStarred = (targetFileId, starredFolderId) => {
  try {
    const starredFolder = memoryStore.getFileById(starredFolderId);
    if (!starredFolder || starredFolder.type !== "folder") return;

    const children = memoryStore.getChildrenOf(starredFolderId);
    const shortcut = children.find(child => 
      child.type === "shortcut" && child.targetId === targetFileId
    );

    if (shortcut) {
      memoryStore.removeFileById(shortcut.id);
    }
  } catch (err) {
    console.error("removeShortcutFromStarred error:", err);
  }
};

/**
 * Get all starred files for a user (shortcuts in their Starred folder)
 * @param {string} userId - The user ID
 * @returns {Array} - Array of starred file objects (shortcuts and their targets)
 */
exports.getStarredFiles = (userId) => {
  const user = memoryStore.getUsers().find(u => u.id === String(userId));
  if (!user || !user.starredFolderId) return [];

  // Get all shortcuts in the user's Starred folder
  const shortcuts = memoryStore.getChildrenOf(user.starredFolderId);
  
  const result = shortcuts
    .filter(shortcut => {
      // Only include shortcuts
      if (shortcut.type !== "shortcut") return false;
      
      // Check that target exists and is not deleted
      if (!shortcut.targetId) return false;
      const target = memoryStore.getFileById(shortcut.targetId);
      if (!target || target.deletedAt) return false;
      
      return true;
    })
    .map(shortcut => {
      const target = memoryStore.getFileById(shortcut.targetId);
      return {
        id: shortcut.id,
        name: target.name,
        type: target.type,
        starred: true,
        targetId: shortcut.targetId
      };
    });
  
  return result;
};
